"""
Modelos SQLAlchemy para la base de datos.
Define todas las tablas: Usuarios, Asistentes, Documentos y Mensajes de Chat.
"""

from datetime import datetime, timezone
from typing import Generator
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, Text, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import OperationalError
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type
from config import DATABASE_URL

# ========== INICIALIZACIÓN DE BD ==========
engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,
    pool_size=5,
    max_overflow=10
)
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()


# ========== MODELOS ==========
class Usuario(Base):
    """Usuarios registrados en el sistema"""
    __tablename__ = 'usuarios'
    
    id = Column(String(36), primary_key=True, index=True)
    nombre = Column(String(100))
    email = Column(String(100), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    
    # Relaciones
    asistentes = relationship("Asistente", back_populates="propietario", cascade="all, delete-orphan")


class Asistente(Base):
    """Agentes de IA personalizados por usuario"""
    __tablename__ = 'asistentes'
    
    id = Column(String(36), primary_key=True, index=True)
    usuario_id = Column(String(36), ForeignKey('usuarios.id', ondelete="CASCADE"), nullable=False)
    nombre = Column(String(100), nullable=False)
    descripcion = Column(String(255))
    system_prompt = Column(Text, nullable=False)
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    propietario = relationship("Usuario", back_populates="asistentes")    
    documentos = relationship("Documento", back_populates="asistente", cascade="all, delete-orphan")
    mensajes = relationship("MensajeChat", back_populates="asistente", cascade="all, delete-orphan")


class Documento(Base):
    """Documentos ingesta dos en asistentes"""
    __tablename__ = 'documentos'
    
    id = Column(String(36), primary_key=True, index=True)
    asistente_id = Column(String(36), ForeignKey('asistentes.id', ondelete="CASCADE"), nullable=False)
    nombre_archivo = Column(String(255), nullable=False)
    blob_path = Column(String(500), nullable=False)  # Ruta en Azure Blob Storage

    # Relaciones
    asistente = relationship("Asistente", back_populates="documentos")


class MensajeChat(Base):
    """Historial de conversaciones"""
    __tablename__ = 'mensajes_chat'
    
    id = Column(String(36), primary_key=True, index=True)
    asistente_id = Column(String(36), ForeignKey('asistentes.id', ondelete="CASCADE"), nullable=False)
    role = Column(String(20), nullable=False)  # 'user' o 'assistant'
    content = Column(Text, nullable=False)
    creado_en = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    # Relaciones
    asistente = relationship("Asistente", back_populates="mensajes")


# ========== INICIALIZACIÓN DE TABLAS ==========
Base.metadata.create_all(bind=engine)


# ========== DEPENDENCY INJECTION ==========
@retry(
    stop=stop_after_attempt(5),
    wait=wait_fixed(3),
    retry=retry_if_exception_type(OperationalError)
)
def get_db() -> Generator[Session, None, None]:
    """
    Proporciona una sesión de BD con reintentos.
    Úsalo en endpoints con: db: Session = Depends(get_db)
    """
    db = SessionLocal()
    try:
        db.execute(text("SELECT 1"))
        yield db
    finally:
        db.close()
