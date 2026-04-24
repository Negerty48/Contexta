# 📋 Documentación de la Arquitectura Modularizada

## 🏗️ Estructura del Backend

```
backend/app/
├── config.py                      # ⚙️ Configuración centralizada
├── main.py                        # 🚀 NUEVO: Aplicación principal refactorizada
├── main_backup.py                 # 📦 Copia de seguridad del main.py original
├── rag_engine_backup.py           # 📦 Copia de seguridad del rag_engine.py original
│
├── models/                        # 📊 Modelos de datos
│   ├── __init__.py
│   ├── database.py                # SQLAlchemy: Usuario, Asistente, Documento, MensajeChat
│   └── index.py                   # Azure AI Search: Creación y gestión del índice
│
└── services/                      # 🔧 Lógica de negocio y servicios
    ├── __init__.py
    ├── auth.py                    # 🔐 JWT, hashing de contraseñas, autenticación
    ├── text_extractor.py          # 📄 Extracción de texto (PDF, DOCX, PPTX, TXT, MD)
    ├── embeddings.py              # 🧮 Chunking y generación de embeddings
    ├── document_ingestion.py       # 📥 Pipeline de ingesta de documentos
    ├── retrieval.py               # 🔍 Búsqueda híbrida en Azure AI Search
    ├── response_generation.py      # 🤖 Generación RAG (LLM + Retrieval)
    └── vector_cleanup.py          # 🧹 Eliminación de vectores
```

---

## 📦 Módulos Principales

### 1. **config.py** ⚙️
Centraliza todas las variables de entorno y constantes globales.

**Responsabilidades:**
- Cargar variables de entorno desde `.env`
- Proporcionar constantes para todas las capas

**Uso:**
```python
from config import AZURE_SEARCH_ENDPOINT, CHUNK_SIZE, SECRET_KEY
```

---

### 2. **models/database.py** 📊
Define la estructura de la base de datos PostgreSQL/SQL Server.

**Responsabilidades:**
- Modelos SQLAlchemy: `Usuario`, `Asistente`, `Documento`, `MensajeChat`
- Inicialización de tablas
- Dependency injection con `get_db()`

**Modelos:**
- `Usuario`: Usuarios registrados
- `Asistente`: Agentes RAG personalizados
- `Documento`: Archivos ingestados
- `MensajeChat`: Historial de conversaciones

**Uso:**
```python
from models.database import get_db, Usuario
from fastapi import Depends
from sqlalchemy.orm import Session

@app.get("/usuarios")
def get_usuarios(db: Session = Depends(get_db)):
    usuarios = db.query(Usuario).all()
    return usuarios
```

---

### 3. **models/index.py** 🔍
Gestiona el índice vectorial en Azure AI Search.

**Responsabilidades:**
- Crear el índice si no existe
- Definir estructura de campos (id, assistant_id, doc_id, filename, chunk_text, content_vector)
- Configurar búsqueda vectorial (HNSW algorithm)

**Flujo:**
1. Se ejecuta automáticamente al importar el módulo
2. Verifica si el índice existe
3. Si no existe, lo crea con la estructura necesaria

**Uso:**
```python
from models.index import asegurar_indice_existe
asegurar_indice_existe()  # Garantiza que el índice existe
```

---

### 4. **services/auth.py** 🔐
Manejo de autenticación, JWT y hashing de contraseñas.

**Responsabilidades:**
- Crear hash de contraseñas con bcrypt
- Verificar contraseñas
- Generar tokens JWT
- Extraer user_id/email de tokens

**Funciones:**
- `get_password_hash()`: Hashea contraseñas
- `verify_password()`: Valida contraseñas
- `create_access_token()`: Crea JWT
- `get_current_user_id()`: Dependency para proteger endpoints
- `get_current_user_email()`: Extrae email del token

**Uso:**
```python
from services.auth import get_current_user_id
from fastapi import Depends

@app.get("/mi-ruta")
def mi_endpoint(user_id: str = Depends(get_current_user_id)):
    # user_id está garantizado, endpoint protegido
    pass
```

---

### 5. **services/text_extractor.py** 📄
Extrae texto de diferentes formatos de archivo.

**Responsabilidades:**
- Detectar formato del archivo por extensión
- Extraer texto de: PDF, DOCX, PPTX, TXT, MD

**Funciones:**
- `extraer_texto()`: Función principal
- `_extraer_texto_pdf()`: Extracción de PDFs
- `_extraer_texto_docx()`: Extracción de Word
- `_extraer_texto_pptx()`: Extracción de PowerPoint

**Uso:**
```python
from services.text_extractor import extraer_texto

file_content = await file.read()  # bytes
texto = extraer_texto(file_content, "documento.pdf")
print(texto)  # Texto extraído
```

---

### 6. **services/embeddings.py** 🧮
Genera embeddings y procesa el chunking de documentos.

**Responsabilidades:**
- Dividir texto en chunks de ~1000 tokens con solapamiento
- Generar embeddings usando Azure OpenAI
- Preparar documentos para Azure Search

**Funciones:**
- `dividir_en_chunks()`: Tokeniza y divide
- `generar_embedding()`: Embedding de un texto
- `generar_embeddings_lote()`: Embeddings de múltiples textos (más eficiente)
- `preparar_documentos_para_search()`: Estructura final para Azure Search

**Uso:**
```python
from services.embeddings import preparar_documentos_para_search

chunks = dividir_en_chunks(texto)
docs = preparar_documentos_para_search(
    chunks=chunks,
    filename="documento.pdf",
    asistente_id="123",
    doc_id="456"
)
# docs = [{"id": "...", "assistant_id": "...", "vector": [...], ...}]
```

---

### 7. **services/document_ingestion.py** 📥
Pipeline completo de ingesta de documentos.

**Responsabilidades:**
- Orquestar todo el flujo: extracción → chunking → embeddings → subida
- Coordinar entre módulos
- Manejar errores en cada etapa

**Funciones:**
- `procesar_e_ingestar_documento()`: Pipeline completo

**Flujo:**
1. Extrae texto del documento
2. Divide en chunks
3. Genera embeddings
4. Sube a Azure AI Search

**Uso:**
```python
from services.document_ingestion import procesar_e_ingestar_documento

file_content = await file.read()
procesar_e_ingestar_documento(
    file_content=file_content,
    filename="documento.pdf",
    asistente_id="123",
    doc_id="456"
)
# Documento está listo para búsqueda RAG
```

---

### 8. **services/retrieval.py** 🔍
Busca chunks relevantes en Azure AI Search.

**Responsabilidades:**
- Convertir preguntas a vectores
- Ejecutar búsqueda híbrida (texto + vectorial)
- Filtrar por asistente
- Formatear resultados

**Funciones:**
- `buscar_contexto()`: Busca y recupera chunks relevantes

**Busca Híbrida:**
- Vectorial: Busca semánticamente similar
- Textual: Coincidencia de keywords
- Filtro: Solo documentos del asistente actual

**Uso:**
```python
from services.retrieval import buscar_contexto

contexto = buscar_contexto(
    pregunta="¿Qué es una red neural?",
    asistente_id="123"
)
print(contexto)  # "Documento origen: ...\nContenido: ..."
```

---

### 9. **services/response_generation.py** 🤖
Genera respuestas usando RAG (Retrieval-Augmented Generation).

**Responsabilidades:**
- Orquestar el flujo RAG completo
- Construir prompts con restricciones
- Llamar a GPT-4o-mini
- Asegurar que responde solo basándose en documentos

**Funciones:**
- `generar_respuesta_rag()`: Pipeline RAG completo
- `_construir_prompt_sistema()`: Prompt con restricciones
- `_construir_mensajes()`: Estructura de conversación
- `_llamar_llm()`: Invoca Azure OpenAI

**Fases del RAG:**
1. **Retrieval**: Busca documentos relevantes
2. **Construcción de Prompt**: Crea instrucciones estrictas
3. **Armado de Conversación**: Incluye historial + pregunta
4. **LLM**: GPT-4o-mini genera respuesta

**Uso:**
```python
from services.response_generation import generar_respuesta_rag

respuesta = generar_respuesta_rag(
    pregunta="¿Cuál es el capital de Francia?",
    historial=[...],  # Conversación anterior
    asistente_id="123",
    system_prompt="Eres un asistente de geografía"
)
print(respuesta)  # Respuesta basada en documentos
```

---

### 10. **services/vector_cleanup.py** 🧹
Elimina vectores obsoletos de Azure AI Search.

**Responsabilidades:**
- Buscar chunks por documento_id
- Buscar chunks por asistente_id
- Eliminar en lotes
- Manejar límites de Azure Search

**Funciones:**
- `eliminar_documento_del_indice()`: Borra todos los chunks de un documento
- `eliminar_asistente_del_indice()`: Borra todos los chunks de un asistente

**Uso:**
```python
from services.vector_cleanup import (
    eliminar_documento_del_indice,
    eliminar_asistente_del_indice
)

# Cuando el usuario elimina un documento
eliminar_documento_del_indice("doc_id_123")

# Cuando el usuario elimina un asistente completo
eliminar_asistente_del_indice("asistente_id_456")
```

---

### 11. **main.py** 🚀
Aplicación FastAPI principal con todos los endpoints.

**Responsabilidades:**
- Definir rutas API
- Proteger endpoints con JWT
- Coordinar servicios
- Manejar errores HTTP

**Rutas Principales:**

#### Autenticación
- `POST /auth/registro` - Registrar usuario
- `POST /auth/token` - Login (genera JWT)

#### Asistentes
- `GET /api/asistentes` - Listar asistentes
- `POST /api/asistentes` - Crear asistente
- `PUT /api/asistentes/{id}` - Actualizar asistente
- `DELETE /api/asistentes/{id}` - Eliminar asistente

#### Documentos
- `DELETE /api/asistentes/{id}/documentos/{doc_id}` - Eliminar documento

#### Chat (RAG)
- `POST /api/asistentes/{id}/chat` - Enviar mensaje
- `GET /api/asistentes/{id}/historial` - Recuperar historial

#### Salud
- `GET /health` - Health check

---

## 🔄 Flujos Principales

### 📥 Flujo de Ingesta de Documento

```
Frontend
  ↓
main.py: POST /api/asistentes (upload file)
  ↓
document_ingestion.procesar_e_ingestar_documento()
  ├─→ text_extractor.extraer_texto()           // Extrae texto del PDF/DOCX
  ├─→ embeddings.dividir_en_chunks()           // Divide en ~1000 tokens
  ├─→ embeddings.preparar_documentos_para_search()
  │   └─→ embeddings.generar_embeddings_lote()  // OpenAI embeddings
  └─→ Azure Search: upload_documents()         // Sube al índice
  ↓
Database: Guardar registro de Documento
```

### 🤖 Flujo de Chat (RAG)

```
Frontend (pregunta del usuario)
  ↓
main.py: POST /api/asistentes/{id}/chat
  ↓
response_generation.generar_respuesta_rag()
  ├─→ retrieval.buscar_contexto()
  │   ├─→ embeddings.generar_embedding()       // Pregunta → vector
  │   ├─→ Azure Search: Búsqueda híbrida       // Encuentra chunks
  │   └─→ Retorna contexto formateado
  │
  ├─→ response_generation._construir_prompt_sistema()
  │   └─→ Crea prompt con restricciones
  │
  ├─→ response_generation._construir_mensajes()
  │   └─→ Estructura: [system, historial..., pregunta actual]
  │
  └─→ response_generation._llamar_llm()
      └─→ Azure OpenAI GPT-4o-mini
  ↓
Respuesta basada en documentos
  ↓
Database: Guardar mensajes en historial
```

### 🗑️ Flujo de Eliminación

```
DELETE /api/asistentes/{id}
  ├─→ Azure Blob Storage: Eliminar archivos
  ├─→ vector_cleanup.eliminar_asistente_del_indice()
  │   └─→ Azure Search: Buscar y eliminar chunks
  └─→ Database: Eliminar registros
```

---

## 🚀 Ventajas de la Modularización

✅ **Separación de responsabilidades**: Cada módulo tiene un propósito claro
✅ **Reutilización**: Importa servicios donde sea necesario
✅ **Testabilidad**: Módulos aislados son fáciles de testear
✅ **Mantenibilidad**: Cambios localizados, sin efectos secundarios
✅ **Escalabilidad**: Fácil agregar nuevos servicios
✅ **Documentación**: Código autodocumentado con docstrings
✅ **Debugging**: Errores localizados en módulos específicos

---

## 📝 Migrando del código antiguo

### Cambios necesarios:

1. **Reemplazar `main.py`**:
   ```bash
   mv backend/app/main.py backend/app/main_backup.py
   mv backend/app/main_new.py backend/app/main.py
   ```

2. **Eliminar `rag_engine.py`** (la lógica está distribuida en `services/`):
   ```bash
   mv backend/app/rag_engine.py backend/app/rag_engine_backup.py
   ```

3. **Asegurar estructura de carpetas**:
   ```
   ✓ backend/app/config.py
   ✓ backend/app/models/database.py
   ✓ backend/app/models/index.py
   ✓ backend/app/services/*.py
   ✓ backend/app/main.py
   ```

4. **Probar la aplicación**:
   ```bash
   python -m uvicorn backend.app.main:app --reload
   ```

---

## 🔧 Extensión Futura

Para agregar nuevas funcionalidades:

1. **Nuevo servicio externo** → Crear `services/mi_servicio.py`
2. **Nuevo modelo de BD** → Agregar a `models/database.py`
3. **Nuevos endpoints** → Agregar a `main.py` (importar servicios necesarios)

Ejemplo: Agregar notificaciones por email

```python
# services/notifications.py
def enviar_email_notificacion(email: str, asunto: str, mensaje: str):
    # Implementación
    pass

# main.py
from services.notifications import enviar_email_notificacion

@app.post("/api/enviar-notificacion")
def enviar_notificacion(email: str, db: Session = Depends(get_db)):
    enviar_email_notificacion(email, "Asunto", "Mensaje")
    return {"ok": True}
```

---

## 📊 Diagrama de Dependencias

```
main.py (Routes)
  ├─→ config.py
  ├─→ models/database.py
  ├─→ services/auth.py
  ├─→ services/document_ingestion.py
  │   ├─→ services/text_extractor.py
  │   ├─→ services/embeddings.py
  │   └─→ (usa SearchClient)
  ├─→ services/response_generation.py
  │   ├─→ services/retrieval.py
  │   │   ├─→ services/embeddings.py
  │   │   └─→ (usa SearchClient)
  │   └─→ (usa OpenAI)
  ├─→ services/vector_cleanup.py
  │   └─→ (usa SearchClient)
  └─→ BlobServiceClient
```

---

## ✨ Resumen

La arquitectura modularizada permite:
- **Desarrollo paralelo**: Múltiples desarrolladores en diferentes módulos
- **Testing aislado**: Testear cada servicio independientemente
- **Mantenimiento**: Cambios sin impacto en otras capas
- **Escalabilidad**: Crecer sin caos arquitectónico
- **Claridad**: Código legible y autodocumentado

🎉 **¡Backend completamente modularizado!**
