import uvicorn
import os
import uuid
from datetime import datetime, timedelta, timezone
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm, OAuth2PasswordBearer

from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import OperationalError

from pydantic import BaseModel, EmailStr
import bcrypt
from jose import jwt, JWTError
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
from dotenv import load_dotenv
from azure.storage.blob import BlobServiceClient

# Cargar variables
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# --- CONFIGURACIÓN BLOB STORAGE ---
blob_service_client = BlobServiceClient.from_connection_string(os.getenv("AZURE_STORAGE_CONNECTION_STRING"))
CONTAINER_NAME = os.getenv("AZURE_STORAGE_CONTAINER")

# Crear el contenedor si no existe (ideal para la primera vez)
try:
    blob_service_client.create_container(CONTAINER_NAME)
except Exception:
    pass # Ya existe

app = FastAPI(title="Contexta RAG - Azure Edition")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://localhost:8000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- BASE DE DATOS ---
engine = create_engine(DATABASE_URL, pool_pre_ping=True, pool_size=5, max_overflow=10)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

class Usuario(Base):
    __tablename__ = 'usuarios'
    id = Column(String(36), primary_key=True, index=True)
    nombre = Column(String(100))
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relación
    asistentes = relationship("Asistente", back_populates="propietario", cascade="all, delete-orphan")

class Asistente(Base):
    __tablename__ = 'asistentes'
    id = Column(String(36), primary_key=True, index=True)
    usuario_id = Column(String(36), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(255))
    system_prompt = Column(String(2000), nullable=False)
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    propietario = relationship("Usuario", back_populates="asistentes")
    # Si borro un asistente, borra sus documentos en SQL automáticamente
    documentos = relationship("Documento", back_populates="asistente", cascade="all, delete-orphan")

class Documento(Base):
    __tablename__ = 'documentos'
    id = Column(String(36), primary_key=True, index=True)
    asistente_id = Column(String(36), ForeignKey('asistentes.id', ondelete="CASCADE"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    blob_path = Column(String(500), nullable=False) # Ruta en Azure Blob

    asistente = relationship("Asistente", back_populates="documentos")

Base.metadata.create_all(bind=engine)

@retry(stop=stop_after_attempt(5), wait=wait_fixed(3), retry=retry_if_exception_type(OperationalError))
def get_db():
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1")) 
        yield db
    finally:
        db.close()

# --- SEGURIDAD ---
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")

def get_password_hash(password: str) -> str:
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

def verify_password(plain_password: str, hashed_password: str) -> bool:
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))

def create_access_token(data: dict):
    to_encode = data.copy()
    to_encode.update({"exp": datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)

# NUEVO: Función para sacar el usuario logueado a partir del token JWT
def get_current_user_id(token: str = Depends(oauth2_scheme)):
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("id")
        if user_id is None:
            raise HTTPException(status_code=401, detail="Token inválido")
        return user_id
    except JWTError:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

class UsuarioRegistro(BaseModel):
    nombre: str
    email: EmailStr
    password: str

@app.post("/auth/registro", status_code=status.HTTP_201_CREATED)
def registrar_usuario(user: UsuarioRegistro, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == user.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    nuevo_usuario = Usuario(id=str(uuid.uuid4()), nombre=user.nombre, email=user.email, hashed_password=get_password_hash(user.password))
    db.add(nuevo_usuario)
    db.commit()
    return {"mensaje": "Usuario creado con éxito"}

@app.post("/auth/token")
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no registrado")
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    access_token = create_access_token(data={"sub": user.email, "id": user.id})
    return {"access_token": access_token, "token_type": "bearer", "nombre": user.nombre}


# ==========================================
# ENDPOINTS DE ASISTENTES (CRUD)
# ==========================================

# 1. LISTAR Asistentes del usuario
@app.get("/api/asistentes")
def listar_asistentes(db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    asistentes = db.query(Asistente).filter(Asistente.usuario_id == user_id).all()
    # Formateamos la respuesta para que el frontend (React) la consuma fácilmente
    resultado = []
    for a in asistentes:
        resultado.append({
            "id": a.id,
            "name": a.nombre,
            "description": a.descripcion,
            "systemPrompt": a.system_prompt,
            "files": [{"id": d.id, "name": d.nombre_archivo} for d in a.documentos]
        })
    return resultado

# 2. CREAR Asistente (multipart/form-data porque lleva archivos)
@app.post("/api/asistentes")
async def crear_asistente(
    name: str = Form(...),
    description: str = Form(""),
    systemPrompt: str = Form(...),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    asistente_id = str(uuid.uuid4())
    nuevo_asistente = Asistente(
        id=asistente_id, usuario_id=user_id, nombre=name, 
        descripcion=description, system_prompt=systemPrompt
    )
    db.add(nuevo_asistente)

    container_client = blob_service_client.get_container_client(CONTAINER_NAME)

    if files:
        for file in files:
            # Usamos el ID del asistente como prefijo (Carpeta) para mantener orden en Blob
            blob_path = f"{asistente_id}/{file.filename}"
            
            # Subir a Azure Blob Storage
            blob_client = container_client.get_blob_client(blob_path)
            blob_client.upload_blob(file.file, overwrite=True)

            # Guardar en SQL
            nuevo_doc = Documento(
                id=str(uuid.uuid4()), asistente_id=asistente_id, 
                nombre_archivo=file.filename, blob_path=blob_path
            )
            db.add(nuevo_doc)

    db.commit()
    return {"mensaje": "Asistente creado", "id": asistente_id}

# 3. ACTUALIZAR Asistente (PUT)
@app.put("/api/asistentes/{asistente_id}")
async def actualizar_asistente(
    asistente_id: str,
    name: str = Form(...),
    description: str = Form(""),
    systemPrompt: str = Form(...),
    files: List[UploadFile] = File(None), # Archivos nuevos opcionales
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    # 1. Validar que el asistente existe y es del usuario
    asistente = db.query(Asistente).filter(Asistente.id == asistente_id, Asistente.usuario_id == user_id).first()
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado o no tienes permiso")

    # 2. Actualizar los campos de texto
    asistente.nombre = name
    asistente.descripcion = description
    asistente.system_prompt = systemPrompt

    # 3. Subir documentos nuevos (si el usuario ha añadido alguno en esta edición)
    if files:
        container_client = blob_service_client.get_container_client(CONTAINER_NAME)
        for file in files:
            blob_path = f"{asistente_id}/{file.filename}"
            
            # Subir a Azure
            blob_client = container_client.get_blob_client(blob_path)
            blob_client.upload_blob(file.file, overwrite=True)

            # Guardar registro en SQL
            nuevo_doc = Documento(
                id=str(uuid.uuid4()), asistente_id=asistente_id, 
                nombre_archivo=file.filename, blob_path=blob_path
            )
            db.add(nuevo_doc)

    db.commit()
    return {"mensaje": "Asistente actualizado con éxito"}

# 4. BORRAR Asistente Entero
@app.delete("/api/asistentes/{asistente_id}")
def borrar_asistente(asistente_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    asistente = db.query(Asistente).filter(Asistente.id == asistente_id, Asistente.usuario_id == user_id).first()
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    
    container_client = blob_service_client.get_container_client(CONTAINER_NAME)
    
    # 1. Borrar todos sus archivos físicos de Azure Blob Storage
    for doc in asistente.documentos:
        blob_client = container_client.get_blob_client(doc.blob_path)
        if blob_client.exists():
            blob_client.delete_blob()

    # 2. Borrar de SQL (Borrará los documentos en cascada por la configuración de SQLAlchemy)
    db.delete(asistente)
    db.commit()
    return {"mensaje": "Asistente y documentos eliminados"}

# 5. BORRAR Documento Individual (Desde el modal de edición)
@app.delete("/api/asistentes/{asistente_id}/documentos/{doc_id}")
def borrar_documento(asistente_id: str, doc_id: str, db: Session = Depends(get_db), user_id: str = Depends(get_current_user_id)):
    # Validamos que el asistente pertenece al usuario
    asistente = db.query(Asistente).filter(Asistente.id == asistente_id, Asistente.usuario_id == user_id).first()
    if not asistente:
        raise HTTPException(status_code=403, detail="No autorizado")

    doc = db.query(Documento).filter(Documento.id == doc_id, Documento.asistente_id == asistente_id).first()
    if doc:
        # Borrar de Azure Blob
        blob_client = blob_service_client.get_blob_client(container=CONTAINER_NAME, blob=doc.blob_path)
        if blob_client.exists():
            blob_client.delete_blob()
        
        # Borrar de SQL
        db.delete(doc)
        db.commit()
    
    return {"mensaje": "Documento eliminado"}


# --- FRONTEND ---
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def no_frontend():
        return {"message": "Frontend no detectado."}

if __name__ == "__main__":
    uvicorn.run("main:app", host="localhost", port=8000, reload=True)