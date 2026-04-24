# 🔗 IMPORTACIONES Y CÓMO USARLAS

## Importaciones en main.py (Referencia)

```python
# Librerías estándar
import uuid
import os
from datetime import datetime, timezone
from typing import Optional, List

# FastAPI
from fastapi import FastAPI, Depends, HTTPException, status, UploadFile, File, Form
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordRequestForm

# Pydantic
from pydantic import BaseModel, EmailStr

# SQLAlchemy
from sqlalchemy.orm import Session

# ========== IMPORTACIONES PROPIAS ==========

# 1. Configuración
from config import ALLOWED_ORIGINS, AZURE_STORAGE_CONTAINER

# 2. Modelos
from models.database import (
    engine, Base, Usuario, Asistente, Documento, MensajeChat, 
    get_db, SessionLocal
)
from models.index import asegurar_indice_existe

# 3. Servicios
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

# 4. Azure
from azure.storage.blob import BlobServiceClient
from config import AZURE_STORAGE_CONNECTION_STRING, AZURE_STORAGE_CONTAINER
```

---

## Importaciones por Módulo

### 1️⃣ config.py

**No importa nada de nuestro código.**

```python
from dotenv import load_dotenv
import os

# Lee variables de .env
# Las exporta como constantes
```

**Usado por:** main.py, models/database.py, models/index.py, services/*

---

### 2️⃣ models/database.py

```python
# Estándar
from datetime import datetime, timezone
from typing import Generator

# SQLAlchemy
from sqlalchemy import create_engine, Column, String, DateTime, ForeignKey, Text
from sqlalchemy.orm import declarative_base, sessionmaker, Session, relationship
from sqlalchemy.exc import OperationalError

# Tenacity (reintentos)
from tenacity import retry, stop_after_attempt, wait_fixed, retry_if_exception_type

# ========== IMPORTACIONES PROPIAS ==========
from config import DATABASE_URL
```

**Usado por:** main.py (get_db, modelos)

---

### 3️⃣ models/index.py

```python
# Azure
from azure.core.credentials import AzureKeyCredential
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.indexes.models import (
    SearchIndex,
    SimpleField,
    SearchableField,
    SearchField,
    SearchFieldDataType,
    VectorSearch,
    HnswAlgorithmConfiguration,
    VectorSearchProfile,
)

# ========== IMPORTACIONES PROPIAS ==========
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME
```

**Se ejecuta automáticamente** al importar el módulo (crea índice si no existe)

---

### 4️⃣ services/auth.py

```python
# Estándar
from datetime import datetime, timedelta, timezone
from typing import Optional

# FastAPI
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer

# JWT
from jose import jwt, JWTError

# Hashing
import bcrypt

# ========== IMPORTACIONES PROPIAS ==========
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES
```

**Usado por:**
- main.py (get_password_hash, verify_password, create_access_token, get_current_user_id)
- Decorador: `user_id: str = Depends(get_current_user_id)`

---

### 5️⃣ services/text_extractor.py

```python
# Estándar
import io

# Librerías de extracción
import fitz  # PyMuPDF
import docx  # python-docx
import pptx  # python-pptx
```

**Usado por:** services/document_ingestion.py

**Función:**
```python
def extraer_texto(file_content: bytes, filename: str) -> str:
    # Retorna: texto extraído del archivo
```

---

### 6️⃣ services/embeddings.py

```python
# Estándar
from typing import List, Dict
import uuid

# NLP
import tiktoken

# OpenAI
from openai import AzureOpenAI

# ========== IMPORTACIONES PROPIAS ==========
from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
)
```

**Usado por:**
- services/document_ingestion.py
- services/retrieval.py

**Funciones:**
```python
def dividir_en_chunks(texto: str) -> List[str]
def generar_embedding(texto: str) -> List[float]
def generar_embeddings_lote(textos: List[str]) -> List[List[float]]
def preparar_documentos_para_search(chunks, filename, asistente_id, doc_id) -> List[Dict]
```

---

### 7️⃣ services/document_ingestion.py

```python
# Azure
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

# ========== IMPORTACIONES PROPIAS ==========
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME
from services.text_extractor import extraer_texto
from services.embeddings import dividir_en_chunks, preparar_documentos_para_search
```

**Usado por:** main.py

**Función:**
```python
def procesar_e_ingestar_documento(
    file_content: bytes,
    filename: str,
    asistente_id: str,
    doc_id: str
) -> None
```

---

### 8️⃣ services/retrieval.py

```python
# Azure
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery

# ========== IMPORTACIONES PROPIAS ==========
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME, RETRIEVAL_TOP_K
from services.embeddings import generar_embedding
```

**Usado por:** services/response_generation.py

**Función:**
```python
def buscar_contexto(pregunta: str, asistente_id: str, top_k: int = RETRIEVAL_TOP_K) -> str
```

---

### 9️⃣ services/response_generation.py

```python
# Estándar
from typing import List, Dict

# OpenAI
from openai import AzureOpenAI

# ========== IMPORTACIONES PROPIAS ==========
from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT,
    RAG_TEMPERATURE
)
from services.retrieval import buscar_contexto
```

**Usado por:** main.py

**Función:**
```python
def generar_respuesta_rag(
    pregunta: str,
    historial: List[Dict],
    asistente_id: str,
    system_prompt: str
) -> str
```

---

### 🔟 services/vector_cleanup.py

```python
# Azure
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient

# ========== IMPORTACIONES PROPIAS ==========
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME
```

**Usado por:** main.py

**Funciones:**
```python
def eliminar_documento_del_indice(doc_id: str) -> None
def eliminar_asistente_del_indice(asistente_id: str) -> None
```

---

## 📊 Gráfico de Dependencias (Simplificado)

```
main.py
├── config ────────────────────────────────────────────┐
├── models/database                                    │
├── models/index                                       │
├── services/auth                                      │
├── services/document_ingestion                        │
├── services/response_generation                       │
├── services/vector_cleanup                           │
└── Azure SDK                                          │
                                                       │
config ◄───────────────────────────────────────────────┘
├── AZURE_SEARCH_ENDPOINT
├── AZURE_OPENAI_API_KEY
├── DATABASE_URL
├── CHUNK_SIZE
└── ... (otros)

models/database
├── config (DATABASE_URL)
├── SQLAlchemy
└── tenacity

models/index
├── config (Azure Search credenciales)
└── Azure SDK

services/auth
├── config (JWT)
├── bcrypt
└── FastAPI

services/text_extractor
├── fitz, docx, pptx
└── (sin dependencias propias)

services/embeddings
├── config (OpenAI credenciales)
├── tiktoken
└── Azure OpenAI

services/document_ingestion
├── config
├── services/text_extractor
├── services/embeddings
└── Azure SDK

services/retrieval
├── config
├── services/embeddings
└── Azure SDK

services/response_generation
├── config
├── services/retrieval
└── Azure OpenAI

services/vector_cleanup
├── config
└── Azure SDK
```

---

## 🚀 Cómo Importar en Tus Propios Módulos

### Si quieres crear un nuevo servicio

```python
# services/mi_nuevo_servicio.py

from config import AZURE_OPENAI_API_KEY
from services.embeddings import generar_embedding
from services.retrieval import buscar_contexto

def mi_funcion():
    # Tu código aquí
    pass
```

### Si quieres agregar un nuevo endpoint

```python
# En main.py

from services.mi_nuevo_servicio import mi_funcion

@app.get("/mi-endpoint")
def mi_endpoint():
    resultado = mi_funcion()
    return resultado
```

---

## ⚠️ Qué NO Hagas

### ❌ Importar de main.py en servicios
```python
# MALO
from main import app
```

### ❌ Importar entre servicios (en general)
```python
# MALO (puede crear dependencias circulares)
from services.auth import get_current_user_id
from services.text_extractor import extraer_texto
```

Excepción: OK importar servicios de nivel más bajo en servicios de nivel más alto
```python
# OK
# response_generation.py importa retrieval.py
from services.retrieval import buscar_contexto
```

### ❌ Hardcodear credenciales
```python
# MALO
API_KEY = "sk-..."

# BIEN
from config import AZURE_OPENAI_API_KEY
API_KEY = AZURE_OPENAI_API_KEY
```

---

## ✅ Qué SÍ Hagas

### ✅ Centralizar importaciones en config
```python
# config.py
AZURE_SEARCH_ENDPOINT = os.getenv("...")
SECRET_KEY = os.getenv("...")

# Cualquier módulo
from config import AZURE_SEARCH_ENDPOINT, SECRET_KEY
```

### ✅ Usar Dependency Injection en FastAPI
```python
# main.py
@app.get("/ruta")
def mi_endpoint(user_id: str = Depends(get_current_user_id), 
                db: Session = Depends(get_db)):
    # Automáticamente inyectado
    pass
```

### ✅ Importar solo lo que necesitas
```python
# BIEN
from services.embeddings import generar_embedding

# Menos bien
from services import embeddings
embedding = embeddings.generar_embedding(...)
```

---

## 🧪 Importaciones para Tests

Cuando agregues tests:

```python
# tests/test_auth.py
import pytest
from services.auth import get_password_hash, verify_password

def test_password_hash():
    pwd = "test123"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed)
```

```python
# tests/test_embeddings.py
from services.embeddings import dividir_en_chunks

def test_chunking():
    texto = "Lorem " * 1000
    chunks = dividir_en_chunks(texto)
    assert len(chunks) > 1
```

---

## 📝 Resumen

### Jerarquía de Importaciones

```
Nivel 0 (Externo)
├── FastAPI, Pydantic, SQLAlchemy
├── Azure SDK
└── Librerías de terceros

Nivel 1 (Propio)
└── config.py (solo importa de Nivel 0)

Nivel 2 (Modelos)
├── models/database.py (importa config + Nivel 0)
└── models/index.py (importa config + Nivel 0)

Nivel 3 (Servicios de utilidad)
├── services/auth.py (importa config + Nivel 0)
├── services/text_extractor.py (importa Nivel 0)
└── services/embeddings.py (importa config + Nivel 0)

Nivel 4 (Servicios de coordinación)
├── services/document_ingestion.py (importa servicios Nivel 3)
├── services/retrieval.py (importa servicios Nivel 3)
└── services/response_generation.py (importa servicios Nivel 3)

Nivel 5 (Aplicación principal)
└── main.py (importa modelos + servicios)
```

**Regla:** Un módulo puede importar de su nivel o inferior, pero NO de niveles superiores.

---

**Las importaciones están bien organizadas para evitar caos arquitectónico ✨**
