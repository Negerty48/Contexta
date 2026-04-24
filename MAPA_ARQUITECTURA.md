# 🗺️ MAPA DE DEPENDENCIAS Y FLUJOS

## 📊 Diagrama de Componentes

```
┌─────────────────────────────────────────────────────────────┐
│                        FRONTEND (React)                      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTP/JSON
                      ↓
┌─────────────────────────────────────────────────────────────┐
│                    FastAPI (main.py)                         │
│  ┌──────────────────────────────────────────────────────┐  │
│  │ Endpoints:                                           │  │
│  │ • POST /auth/registro, /auth/token                  │  │
│  │ • GET /api/asistentes                               │  │
│  │ • POST /api/asistentes                              │  │
│  │ • PUT /api/asistentes/{id}                          │  │
│  │ • DELETE /api/asistentes/{id}                       │  │
│  │ • POST /api/asistentes/{id}/chat                    │  │
│  │ • GET /api/asistentes/{id}/historial               │  │
│  └──────────────────────────────────────────────────────┘  │
└──────────┬────────────────────────────────────┬────────────┘
           │                                    │
           ↓                                    ↓
    ┌─────────────────┐             ┌──────────────────────┐
    │  Servicios RAG  │             │  Servicios de Auth   │
    └─────────────────┘             └──────────────────────┘
```

---

## 🔀 Flujo de Ingesta (Documento)

```
                    Frontend
                       │
                       │ POST /api/asistentes
                       │ [file: documento.pdf]
                       ↓
                    main.py
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
   Blob Storage              document_ingestion
   (guardar archivo)                 │
                         ┌───────────┴───────────┐
                         ↓                       ↓
                   text_extractor          embeddings
                   (PDF→texto)             (chunking)
                         │                       │
                         └───────────┬───────────┘
                                     ↓
                            embeddings (OpenAI)
                                     │
                                     ↓
                            Azure Search
                            (subir chunks)
                                     │
                         ┌───────────┴───────────┐
                         ↓                       ↓
                    Database              Búsqueda lista
                 (guardar doc_id)
```

---

## 🤖 Flujo de Chat (RAG)

```
                    Frontend
                       │
                       │ POST /api/asistentes/{id}/chat
                       │ {pregunta: "¿Qué es...?"}
                       ↓
                    main.py
                       │
          response_generation
                       │
        ┌──────────────┴──────────────┐
        ↓                             ↓
   retrieval               _construir_prompt_sistema
   (búsqueda)                        │
        │                  ┌─────────┴─────────┐
        │                  ↓                   ↓
        │            embeddings         _construir_mensajes
        │            (embedding de                │
        │             la pregunta)      ┌────────┴────────┐
        │                  │            ↓                 ↓
        │            Azure Search    Historial        Pregunta
        │            (hybrid search)     │              actual
        │                  │             │
        └──────────┬───────┴─────────────┴──────────┐
                   ↓                                ↓
             Contexto de documentos       _llamar_llm
                   │                            │
                   └───────────┬────────────────┘
                               ↓
                        Azure OpenAI
                        (GPT-4o-mini)
                               │
                               ↓
                         Respuesta RAG
                               │
                               ↓
                        main.py (guardar)
                               │
                               ↓
                          Database
                        (historial)
                               │
                               ↓
                           Frontend
```

---

## 🏗️ Arquitectura en Capas

```
┌──────────────────────────────────────────────────────────┐
│                     PRESENTATION                          │
│  FastAPI (main.py)                                       │
│  • Endpoints                                             │
│  • Request/Response models (Pydantic)                    │
│  • HTTP status codes                                     │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                      BUSINESS LOGIC                       │
│  Services/                                               │
│  • response_generation.py    (Orchestration)             │
│  • retrieval.py              (Search)                    │
│  • document_ingestion.py      (Pipeline)                 │
│  • embeddings.py             (NLP)                       │
│  • text_extractor.py         (Parsing)                   │
│  • auth.py                   (Security)                  │
│  • vector_cleanup.py         (Cleanup)                   │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                    DATA ACCESS LAYER                      │
│  Models/                                                 │
│  • database.py               (SQLAlchemy)                │
│  • index.py                  (Azure Search)              │
│  • config.py                 (Configuration)             │
└──────────────────────────────────────────────────────────┘
                          ↓
┌──────────────────────────────────────────────────────────┐
│                   EXTERNAL SERVICES                       │
│  • Azure SQL Database                                    │
│  • Azure AI Search                                       │
│  • Azure OpenAI (GPT-4o-mini)                            │
│  • Azure OpenAI (Embeddings)                             │
│  • Azure Blob Storage                                    │
└──────────────────────────────────────────────────────────┘
```

---

## 📍 Localización de Funcionalidades

### Autenticación
```
Config Variables  ← config.py
        ↓
    JWT Token    ← services/auth.py
        ↓
  Contraseña     ← services/auth.py
        ↓
      Usuario    ← models/database.py
```

### Extracción de Documentos
```
Documento (PDF)  ← Frontend
        ↓
 text_extractor  ← services/text_extractor.py
        ↓
  Texto limpio
        ↓
  Dividir chunks ← services/embeddings.py
        ↓
  Embeddings     ← services/embeddings.py + Azure OpenAI
        ↓
 Subir a Search  ← services/document_ingestion.py
        ↓
  Almacenar BD   ← models/database.py
```

### Búsqueda y Respuesta (RAG)
```
Pregunta         ← Frontend
        ↓
 Embeddings      ← services/embeddings.py
        ↓
  Azure Search   ← services/retrieval.py
        ↓
 Contexto Docs
        ↓
  GPT-4o-mini    ← services/response_generation.py
        ↓
  Respuesta      ← Frontend
        ↓
  Historial BD   ← models/database.py
```

---

## 🔗 Gráfico de Importaciones

```
main.py
├── config.py
├── models/
│   ├── database.py (engine, Base, modelos)
│   └── index.py (asegurar_indice_existe)
├── services/
│   ├── auth.py (get_password_hash, verify_password, etc)
│   ├── document_ingestion.py (procesar_e_ingestar_documento)
│   ├── response_generation.py (generar_respuesta_rag)
│   └── vector_cleanup.py (eliminar_documento, eliminar_asistente)
└── Azure SDK
    ├── BlobServiceClient
    ├── SearchClient
    ├── SearchIndexClient
    └── AzureOpenAI

document_ingestion.py
├── text_extractor.py
├── embeddings.py
└── Azure SearchClient

retrieval.py
├── embeddings.py
└── Azure SearchClient

response_generation.py
├── retrieval.py
└── Azure OpenAI

services/auth.py
├── jose (JWT)
└── bcrypt
```

---

## 💾 Flujo de Datos de Base de Datos

```
┌─────────────────────────────────────────┐
│           SQL Database                   │
├─────────────────────────────────────────┤
│  Tabla: usuarios                        │
│  ├─ id (PK)                             │
│  ├─ email (UNIQUE)                      │
│  ├─ hashed_password                     │
│  └─ nombre                              │
├─────────────────────────────────────────┤
│  Tabla: asistentes                      │
│  ├─ id (PK)                             │
│  ├─ usuario_id (FK)  ────┐              │
│  ├─ nombre                │              │
│  ├─ descripcion           │ 1:N          │
│  └─ system_prompt         │              │
├─────────────────────────────────────────┤
│  Tabla: documentos                      │
│  ├─ id (PK)                             │
│  ├─ asistente_id (FK)  ──┬─────┐        │
│  ├─ nombre_archivo        │     1:N     │
│  └─ blob_path  ─────┐     │     │       │
├─────────────────────┼─────┤     │       │
│  Tabla: mensajes    │     │     │       │
│  ├─ id (PK)         │     │     │       │
│  ├─ asistente_id    │     │     └──→    │
│  ├─ role            │     │             │
│  └─ content         │     └─────┐       │
└─────────────┬───────┼───────────┘       │
              │       │                    │
              ↓       ↓                    │
        ┌─────────────────┐               │
        │ Azure Blob      │               │
        │ /asistente_id/  │               │
        │  ├─ doc1.pdf    │←──────────────┘
        │  ├─ doc2.docx   │
        │  └─ doc3.pptx   │
        └─────────────────┘
              ↓
        ┌─────────────────┐
        │ Azure Search    │
        │ Índice Vectorial│
        │ ┌─────────────┐ │
        │ │  Chunks +   │ │
        │ │  Vectors    │ │
        │ │  (1536 dims)│ │
        │ └─────────────┘ │
        └─────────────────┘
```

---

## 🎯 Casos de Uso: Dónde va el código

### "Quiero cambiar cómo se extraen PDFs"
```
→ Edita: services/text_extractor.py
```

### "Quiero agregar soporte para archivos Word"
```
→ Edita: services/text_extractor.py
→ Agrega: _extraer_texto_docx() ya existe, mejorarla
```

### "Quiero cambiar el tamaño de chunks"
```
→ Edita: config.py (CHUNK_SIZE)
→ Automáticamente aplica en todo el sistema
```

### "Quiero mejorar la búsqueda"
```
→ Edita: services/retrieval.py
→ Prueba cambios sin afectar ingesta o generación
```

### "Quiero cambiar el modelo de LLM"
```
→ Edita: config.py (AZURE_OPENAI_CHAT_DEPLOYMENT)
→ O mejora: services/response_generation.py
```

### "Quiero agregar caché"
```
→ Crea: services/cache.py
→ Úsalo en: services/retrieval.py
```

---

## 📈 Escalabilidad: Agregar Nuevas Funciones

### Opción 1: Nuevo Servicio
```
# services/text_to_speech.py
def convertir_respuesta_a_audio(texto: str) -> bytes:
    # Usar Azure Cognitive Services
    pass

# main.py
from services.text_to_speech import convertir_respuesta_a_audio

@app.post("/api/asistentes/{id}/chat-audio")
def chat_audio(...):
    respuesta = generar_respuesta_rag(...)
    audio = convertir_respuesta_a_audio(respuesta)
    return audio
```

### Opción 2: Nuevo Modelo de BD
```
# models/database.py
class Evaluacion(Base):
    __tablename__ = 'evaluaciones'
    # ...

# main.py
# Usar Evaluacion en endpoints
```

### Opción 3: Nueva Lógica en Servicio Existente
```
# services/retrieval.py
def buscar_contexto_con_filtros(pregunta, asistente_id, 
                                filtro_fecha=None):
    # Mejorado con filtros
    pass

# main.py
contexto = buscar_contexto_con_filtros(...)
```

---

## ✨ Principios de Diseño Visualizados

### Single Responsibility
```
❌ ANTES:
class RAGEngine:
    def extraer()
    def chunking()
    def embeddings()
    def search()
    def generar_respuesta()

✅ DESPUÉS:
class TextExtractor → extraer()
class Embeddings → chunking(), generar()
class Retrieval → search()
class ResponseGeneration → generar()
```

### Composition
```
❌ ANTES:
response = rag_engine.generar(pregunta)

✅ DESPUÉS:
contexto = retrieval.buscar(pregunta)
response = response_generation.generar(
    pregunta,
    contexto,
    historial
)
```

### Dependency Inversion
```
❌ ANTES:
main.py depende directamente de rag_engine

✅ DESPUÉS:
main.py importa servicios abstractos
servicios importan config (no están hardcodeados)
```

---

## 🚀 Resumen Visual

```
┌─────────────────────────────────────────────────────────┐
│  Modulación = Claridad × Mantenibilidad × Escalabilidad │
└─────────────────────────────────────────────────────────┘

De esto:                    A esto:

main.py (400)           ├─ config.py (40)
rag_engine.py (260)     ├─ models/
                        │  ├─ database.py (90)
❌ Confuso               │  └─ index.py (50)
❌ Difícil de mantener   ├─ services/
❌ No escalable          │  ├─ auth.py (70)
                        │  ├─ text_extractor.py (60)
                        │  ├─ embeddings.py (80)
                        │  ├─ document_ingestion.py (40)
                        │  ├─ retrieval.py (50)
                        │  ├─ response_generation.py (100)
                        │  └─ vector_cleanup.py (60)
                        └─ main.py (250)

                        ✅ Claro
                        ✅ Mantenible
                        ✅ Escalable
```

---

**Tu backend ahora es una arquitectura profesional 🏛️**
