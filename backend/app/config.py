"""
Configuración centralizada para la aplicación.
Carga variables de entorno y proporciona constantes globales.
"""

import os
from dotenv import load_dotenv

load_dotenv()

# ========== CONFIGURACIÓN DE BASE DE DATOS ==========
DATABASE_URL = os.getenv("DATABASE_URL")

# ========== CONFIGURACIÓN DE SEGURIDAD ==========
SECRET_KEY = os.getenv("SECRET_KEY", "fallback_secret_key")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 1440

# ========== CONFIGURACIÓN DE AZURE BLOB STORAGE ==========
AZURE_STORAGE_CONNECTION_STRING = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
AZURE_STORAGE_CONTAINER = os.getenv("AZURE_STORAGE_CONTAINER")

# ========== CONFIGURACIÓN DE AZURE AI SEARCH ==========
AZURE_SEARCH_ENDPOINT = os.getenv("AZURE_SEARCH_ENDPOINT")
AZURE_SEARCH_ADMIN_KEY = os.getenv("AZURE_SEARCH_ADMIN_KEY")
AZURE_SEARCH_INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX_NAME")

# ========== CONFIGURACIÓN DE AZURE OPENAI ==========
AZURE_OPENAI_API_KEY = os.getenv("AZURE_OPENAI_API_KEY")
AZURE_OPENAI_ENDPOINT = os.getenv("AZURE_OPENAI_ENDPOINT")
AZURE_OPENAI_API_VERSION = "2023-05-15"
AZURE_OPENAI_CHAT_DEPLOYMENT = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")
AZURE_OPENAI_EMBEDDING_DEPLOYMENT = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")

# ========== CONFIGURACIÓN DE FASTAPI ==========
ALLOWED_ORIGINS = [
    "https://contexta-theta.vercel.app",
    "http://localhost:3000",
    "http://localhost:5173",
    "http://127.0.0.1:3000",
    "http://127.0.0.1:5173",
    "http://localhost:8000",
    "http://127.0.0.1:8000",
]

# ========== CONFIGURACIÓN DE RAG ==========
CHUNK_SIZE = 1000  # Tokens por chunk
CHUNK_OVERLAP = 100  # Solapamiento entre chunks
EMBEDDING_VECTOR_DIMENSIONS = 1536  # Dimensiones de embeddings de Azure OpenAI
RETRIEVAL_TOP_K = 3  # Número de chunks a recuperar
RAG_TEMPERATURE = 0.3  # Temperatura para generación de respuestas