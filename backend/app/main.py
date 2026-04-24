import uuid
import os
from datetime import datetime, timezone
from typing import Optional, List

from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm
from pydantic import BaseModel, EmailStr
from sqlalchemy.orm import Session

# Importar configuración
from config import ALLOWED_ORIGINS, AZURE_STORAGE_CONTAINER
from models.database import (
    engine, Base, Usuario, Asistente, Documento, MensajeChat, 
    get_db, SessionLocal
)
from models.index import asegurar_indice_existe

# Importar servicios
from services.auth import (
    get_password_hash,
    verify_password,
    create_access_token,
    get_current_user_id,
)
from services.document_ingestion import procesar_e_ingestar_documento
from services.response_generation import generar_respuesta_rag
from services.vector_cleanup import (
    eliminar_documento_del_indice,
    eliminar_asistente_del_indice
)

# Azure Blob Storage
from azure.storage.blob import BlobServiceClient
from config import AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER

# ========== INICIALIZACIÓN DE APLICACIÓN ==========
app = FastAPI(
    title="Contexta RAG - Azure Edition",
    description="Backend RAG modularizado con Azure OpenAI y AI Search"
)

# ========== MIDDLEWARE CORS ==========
app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
    expose_headers=["*"],  # Exponer todos los headers
    max_age=600,  # Cache CORS por 10 minutos
)

# ========== INICIALIZACIÓN DE BLOB STORAGE ==========
blob_service_client = BlobServiceClient.from_connection_string(AZURE_STORAGE_CONNECTION_STRING)

# Crear contenedor si no existe
try:
    blob_service_client.create_container(AZURE_STORAGE_CONTAINER)
except Exception:
    pass  # Ya existe


# ========== MODELOS PYDANTIC ==========
class MensajeHistorial(BaseModel):
    role: str
    content: str


class RequestChat(BaseModel):
    pregunta: str
    historial: List[MensajeHistorial] = []


class UsuarioRegistro(BaseModel):
    nombre: str
    email: EmailStr
    password: str


class UsuarioLogin(BaseModel):
    email: EmailStr
    password: str


# ========== ENDPOINTS DE AUTENTICACIÓN ==========
@app.post("/auth/registro", status_code=status.HTTP_201_CREATED, tags=["Autenticación"])
def registrar_usuario(user: UsuarioRegistro, db: Session = Depends(get_db)):
    """
    Registra un nuevo usuario en el sistema.
    
    - **nombre**: Nombre del usuario
    - **email**: Email único
    - **password**: Contraseña (se hashea con bcrypt)
    """
    if db.query(Usuario).filter(Usuario.email == user.email).first():
        raise HTTPException(status_code=400, detail="El email ya está registrado")
    
    nuevo_usuario = Usuario(
        id=str(uuid.uuid4()),
        nombre=user.nombre,
        email=user.email,
        hashed_password=get_password_hash(user.password)
    )
    db.add(nuevo_usuario)
    db.commit()
    
    return {"mensaje": "Usuario creado con éxito"}


@app.post("/auth/token", tags=["Autenticación"])
def login(form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    """
    Genera un token JWT para acceso a la API.
    
    - **username**: Email del usuario
    - **password**: Contraseña del usuario
    """
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()
    
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no registrado")
    
    if not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Credenciales incorrectas")
    
    access_token = create_access_token(data={"sub": user.email, "id": user.id})
    
    return {
        "access_token": access_token,
        "token_type": "bearer",
        "nombre": user.nombre
    }


# ========== ENDPOINTS DE ASISTENTES (CRUD) ==========

@app.get("/api/asistentes", tags=["Asistentes"])
def listar_asistentes(
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Lista todos los asistentes del usuario autenticado.
    """
    asistentes = db.query(Asistente).filter(Asistente.usuario_id == user_id).all()
    
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


@app.post("/api/asistentes", status_code=status.HTTP_201_CREATED, tags=["Asistentes"])
async def crear_asistente(
    name: str = Form(...),
    description: str = Form(""),
    systemPrompt: str = Form(...),
    files: List[UploadFile] = File(None),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Crea un nuevo asistente con documentos opcionales.
    
    - **name**: Nombre del asistente
    - **description**: Descripción breve
    - **systemPrompt**: Instrucciones de personalidad
    - **files**: Documentos a ingestar (PDF, DOCX, PPTX, TXT, MD)
    """
    asistente_id = str(uuid.uuid4())
    nuevo_asistente = Asistente(
        id=asistente_id,
        usuario_id=user_id,
        nombre=name,
        descripcion=description,
        system_prompt=systemPrompt
    )
    db.add(nuevo_asistente)

    container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER)

    if files:
        for file in files:
            blob_path = f"{asistente_id}/{file.filename}"
            file_content = await file.read()

            # 1. Subir a Azure Blob Storage
            blob_client = container_client.get_blob_client(blob_path)
            blob_client.upload_blob(file_content, overwrite=True)

            # 2. Guardar en SQL
            nuevo_doc_id = str(uuid.uuid4())
            nuevo_doc = Documento(
                id=nuevo_doc_id,
                asistente_id=asistente_id,
                nombre_archivo=file.filename,
                blob_path=blob_path
            )
            db.add(nuevo_doc)
            
            # 3. Ingestar en Azure AI Search
            try:
                procesar_e_ingestar_documento(
                    file_content,
                    file.filename,
                    asistente_id,
                    nuevo_doc_id
                )
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Error ingestando documento: {str(e)}")

    db.commit()
    return {"mensaje": "Asistente creado", "id": asistente_id}


@app.put("/api/asistentes/{asistente_id}", tags=["Asistentes"])
async def actualizar_asistente(
    asistente_id: str,
    name: str = Form(...),
    description: str = Form(""),
    systemPrompt: str = Form(...),
    files: List[UploadFile] = File(default=[]),
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Actualiza un asistente existente y agrega nuevos documentos.
    """
    # Validar pertenencia
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado o sin permiso")

    # Actualizar campos
    asistente.nombre = name
    asistente.descripcion = description
    asistente.system_prompt = systemPrompt

    # Procesar nuevos documentos
    if files:
        container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER)
        for file in files:
            blob_path = f"{asistente_id}/{file.filename}"
            file_content = await file.read()
            
            # Subir a Blob
            blob_client = container_client.get_blob_client(blob_path)
            blob_client.upload_blob(file_content, overwrite=True)

            # Guardar en BD
            nuevo_doc_id = str(uuid.uuid4())
            nuevo_doc = Documento(
                id=nuevo_doc_id,
                asistente_id=asistente_id,
                nombre_archivo=file.filename,
                blob_path=blob_path
            )
            db.add(nuevo_doc)
            
            # Ingestar
            try:
                procesar_e_ingestar_documento(
                    file_content,
                    file.filename,
                    asistente_id,
                    nuevo_doc_id
                )
            except Exception as e:
                db.rollback()
                raise HTTPException(status_code=400, detail=f"Error ingestando documento: {str(e)}")

    db.commit()
    return {"mensaje": "Asistente actualizado con éxito"}


@app.delete("/api/asistentes/{asistente_id}", tags=["Asistentes"])
def borrar_asistente(
    asistente_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Elimina un asistente y todos sus documentos y vectores asociados.
    """
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")
    
    container_client = blob_service_client.get_container_client(AZURE_STORAGE_CONTAINER)
    
    # 1. Borrar de Blob Storage
    for doc in asistente.documentos:
        blob_client = container_client.get_blob_client(doc.blob_path)
        if blob_client.exists():
            blob_client.delete_blob()

    # 2. Borrar de Azure AI Search
    try:
        eliminar_asistente_del_indice(asistente_id)
    except Exception as e:
        print(f"⚠ Error limpiando índice: {str(e)}")

    # 3. Borrar de BD
    db.delete(asistente)
    db.commit()
    
    return {"mensaje": "Asistente y documentos eliminados"}


@app.delete("/api/asistentes/{asistente_id}/documentos/{doc_id}", tags=["Asistentes"])
def borrar_documento(
    asistente_id: str,
    doc_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Elimina un documento específico de un asistente.
    """
    # Validar pertenencia
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=403, detail="No autorizado")

    doc = db.query(Documento).filter(
        Documento.id == doc_id,
        Documento.asistente_id == asistente_id
    ).first()
    
    if doc:
        # Borrar de Blob
        blob_client = blob_service_client.get_blob_client(
            container=AZURE_STORAGE_CONTAINER,
            blob=doc.blob_path
        )
        if blob_client.exists():
            blob_client.delete_blob()
        
        # Borrar de AI Search
        try:
            eliminar_documento_del_indice(doc_id)
        except Exception as e:
            print(f"⚠ Error limpiando índice: {str(e)}")

        # Borrar de BD
        db.delete(doc)
        db.commit()
    
    return {"mensaje": "Documento eliminado"}


# ========== ENDPOINTS DE CHAT (RAG) ==========

@app.post("/api/asistentes/{asistente_id}/chat", tags=["Chat"])
def chat_asistente(
    asistente_id: str,
    chat_req: RequestChat,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Envía un mensaje al asistente y recibe una respuesta RAG.
    
    - **pregunta**: La pregunta del usuario
    - **historial**: Mensajes anteriores de la conversación
    """
    # Validar que el asistente existe y es del usuario
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado o sin permisos")

    try:
        # Convertir historial a diccionarios
        historial_dicts = [
            {"role": msg.role, "content": msg.content}
            for msg in chat_req.historial
        ]
        
        # Generar respuesta RAG
        respuesta_ia = generar_respuesta_rag(
            pregunta=chat_req.pregunta,
            historial=historial_dicts,
            asistente_id=asistente_id,
            system_prompt=asistente.system_prompt
        )
        
        # Guardar en historial
        msg_user = MensajeChat(
            id=str(uuid.uuid4()),
            asistente_id=asistente_id,
            role="user",
            content=chat_req.pregunta
        )
        db.add(msg_user)
        db.flush()  # Asegurar que se guarda el mensaje del usuario primero
        
        msg_ia = MensajeChat(
            id=str(uuid.uuid4()),
            asistente_id=asistente_id,
            role="assistant",
            content=respuesta_ia
        )
        db.add(msg_ia)
        db.commit()
        
        return {"respuesta": respuesta_ia}
        
    except Exception as e:
        print(f"❌ Error en chat: {str(e)}")
        raise HTTPException(status_code=500, detail="Error procesando la respuesta de la IA")


@app.get("/api/asistentes/{asistente_id}/historial", tags=["Chat"])
def obtener_historial(
    asistente_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Recupera el historial de conversaciones de un asistente.
    """
    # Validar pertenencia
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")

    mensajes = db.query(MensajeChat).filter(
        MensajeChat.asistente_id == asistente_id
    ).order_by(MensajeChat.creado_en.asc()).all()
    
    return [{"role": m.role, "content": m.content} for m in mensajes]


@app.delete("/api/asistentes/{asistente_id}/historial", tags=["Chat"])
def limpiar_historial(
    asistente_id: str,
    db: Session = Depends(get_db),
    user_id: str = Depends(get_current_user_id)
):
    """
    Limpia todo el historial de conversaciones de un asistente.
    """
    # Validar pertenencia
    asistente = db.query(Asistente).filter(
        Asistente.id == asistente_id,
        Asistente.usuario_id == user_id
    ).first()
    
    if not asistente:
        raise HTTPException(status_code=404, detail="Asistente no encontrado")

    # Eliminar todos los mensajes del asistente
    db.query(MensajeChat).filter(
        MensajeChat.asistente_id == asistente_id
    ).delete()
    
    db.commit()
    
    return {"mensaje": "Historial limpiado"}


# ========== ENDPOINTS DE FRONTEND ==========
# Ruta correcta: subir dos niveles (backend/app -> backend -> raíz) + frontend/dist
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "..", "..", "frontend", "dist")

if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{catchall:path}", include_in_schema=False)
    def serve_react_app(catchall: str):
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/", include_in_schema=False)
    def no_frontend():
        return {"message": f"Frontend no detectado en: {FRONTEND_DIST}. Construye el frontend y colócalo en 'frontend/dist'"}


# ========== HEALTH CHECK ==========
@app.get("/health", tags=["Health"])
def health_check():
    """Verifica que la API está funcionando correctamente."""
    return {
        "status": "ok",
        "message": "Contexta RAG API está funcionando"
    }


# ========== MAIN ==========
if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="https://contexta.azurewebsites.net", port=8000, reload=True)
