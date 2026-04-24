# 🗂️ MATRIZ DE RESPONSABILIDADES

## 📊 Tabla: Qué módulo hace qué

| Funcionalidad | Módulo | Líneas | Descripción |
|---------------|--------|--------|-------------|
| **Configuración** | `config.py` | 40 | ⚙️ Variables de entorno centralizadas |
| **JWT** | `services/auth.py` | 70 | 🔐 Tokens, hasheo de contraseñas |
| **Modelos de BD** | `models/database.py` | 90 | 📊 Usuario, Asistente, Documento, Mensaje |
| **Índice AI Search** | `models/index.py` | 50 | 🔍 Crear y gestionar índice vectorial |
| **Extracción de Texto** | `services/text_extractor.py` | 60 | 📄 PDF, DOCX, PPTX, TXT, MD |
| **Chunking** | `services/embeddings.py` | 80 | 🧮 Dividir en chunks, generar vectores |
| **Ingesta** | `services/document_ingestion.py` | 40 | 📥 Orquestar: extracción → embeddings → subida |
| **Búsqueda** | `services/retrieval.py` | 50 | 🔍 Búsqueda híbrida en Azure Search |
| **Generación RAG** | `services/response_generation.py` | 100 | 🤖 LLM + Retrieval |
| **Limpieza** | `services/vector_cleanup.py` | 60 | 🧹 Eliminar vectores obsoletos |
| **Rutas API** | `main.py` | 250 | 🚀 Endpoints y coordinación |

---

## 🔄 Matriz de Dependencias

¿Quién depende de quién?

```
main.py
  ├─ depends on → config
  ├─ depends on → models/database
  ├─ depends on → models/index
  ├─ depends on → services/auth
  ├─ depends on → services/document_ingestion
  ├─ depends on → services/response_generation
  └─ depends on → services/vector_cleanup

config
  └─ depends on → (solo .env, nada de código propio)

models/database
  ├─ depends on → config
  └─ depends on → SQLAlchemy

models/index
  ├─ depends on → config
  └─ depends on → Azure Search SDK

services/auth
  ├─ depends on → config
  ├─ depends on → FastAPI
  └─ depends on → bcrypt/jose

services/text_extractor
  └─ depends on → (librerías externas: fitz, docx, pptx)

services/embeddings
  ├─ depends on → config
  ├─ depends on → tiktoken
  └─ depends on → Azure OpenAI SDK

services/document_ingestion
  ├─ depends on → config
  ├─ depends on → services/text_extractor
  ├─ depends on → services/embeddings
  └─ depends on → Azure Search SDK

services/retrieval
  ├─ depends on → config
  ├─ depends on → services/embeddings
  └─ depends on → Azure Search SDK

services/response_generation
  ├─ depends on → config
  ├─ depends on → services/retrieval
  └─ depends on → Azure OpenAI SDK

services/vector_cleanup
  ├─ depends on → config
  └─ depends on → Azure Search SDK
```

---

## 🎯 Matriz: Dónde va cada funcionalidad

Si quieres implementar... **→ edita este módulo:**

| Funcionalidad | Módulo | Ejemplo |
|---------------|--------|---------|
| Cambiar modelo de LLM | `config.py` | `AZURE_OPENAI_CHAT_DEPLOYMENT = "gpt-4"`  |
| Agregar OAuth | `services/auth.py` | Agregar función `authenticate_oauth()` |
| Agregar BD nueva | `models/database.py` | Agregar clase `Notificacion(Base)` |
| Agregar formato archivo | `services/text_extractor.py` | Agregar `_extraer_xlsx()` |
| Cambiar tamaño chunks | `config.py` | `CHUNK_SIZE = 2000` |
| Mejorar búsqueda | `services/retrieval.py` | Cambiar parámetros de búsqueda |
| Cambiar prompt RAG | `services/response_generation.py` | Editar `_construir_prompt_sistema()` |
| Agregar caché | Crear `services/cache.py` | Nueva función |
| Agregar notificaciones | Crear `services/notifications.py` | Nueva función |
| Agregar logs | Crear `services/logger.py` | Nueva función |

---

## 📈 Flujo de Datos: Quién habla con quién

### Flujo de Ingesta
```
Frontend
    ↓
main.py
    ↓
services/document_ingestion
    ├→ services/text_extractor
    └→ services/embeddings
        └→ Azure OpenAI
            └→ Azure Search
```

### Flujo de Chat
```
Frontend
    ↓
main.py
    ↓
services/response_generation
    ├→ services/retrieval
    │   └→ services/embeddings
    │       └→ Azure OpenAI
    │           └→ Azure Search
    └→ Azure OpenAI
        └→ Frontend
```

### Flujo de Eliminación
```
Frontend
    ↓
main.py
    ↓
services/vector_cleanup
    └→ Azure Search
```

---

## 🧩 Matriz: Qué módulos puedo usar juntos

| Combinación | Propósito | Resultado |
|-------------|-----------|-----------|
| text_extractor + embeddings | Procesar documento | Chunks con vectores |
| embeddings + retrieval | Buscar en documentos | Contexto relevante |
| retrieval + response_generation | Chat RAG | Respuesta basada en docs |
| document_ingestion + vector_cleanup | Ciclo completo | Ingesta y limpieza |
| auth + main.py | Proteger endpoints | Endpoints seguros |

---

## 🚀 Matriz: Escalabilidad

¿Qué puedo hacer sin romper nada?

| Cambio | Afecta a | Riesgo |
|--------|----------|--------|
| Cambiar config | Todos (pero leve) | 🟢 Bajo |
| Cambiar services/auth | Solo autenticación | 🟢 Bajo |
| Cambiar services/retrieval | Solo búsqueda | 🟢 Bajo |
| Cambiar services/embeddings | Ingesta + búsqueda | 🟡 Medio |
| Cambiar models/database | Toda la app | 🔴 Alto |
| Cambiar main.py rutas | API del sistema | 🔴 Alto |
| Agregar nuevo servicio | Nada existente | 🟢 Bajo |

---

## 🧪 Matriz: Testabilidad

Qué módulo es más fácil de testear

| Módulo | Testabilidad | Razón |
|--------|-------------|-------|
| `services/text_extractor.py` | ⭐⭐⭐⭐⭐ | No depende de nada externo |
| `services/auth.py` | ⭐⭐⭐⭐⭐ | Lógica pura, sin BD |
| `services/embeddings.py` | ⭐⭐⭐⭐ | Depende de Azure (mockeable) |
| `models/database.py` | ⭐⭐⭐ | Requiere BD (más complejo) |
| `services/retrieval.py` | ⭐⭐⭐ | Depende de Azure Search |
| `services/response_generation.py` | ⭐⭐ | Depende de LLM (costoso testear) |
| `main.py` | ⭐⭐ | Requiere cliente HTTP |

**Patrón:** Cuanto más bajo el nivel, más fácil testear.

---

## 🔐 Matriz: Seguridad

Dónde va la lógica de seguridad

| Tipo | Módulo | Detalles |
|------|--------|---------|
| Contraseñas | `services/auth.py` | Hashing con bcrypt |
| Tokens JWT | `services/auth.py` | Generación y validación |
| Autorización | `main.py` | Decorador `@Depends(get_current_user_id)` |
| CORS | `main.py` | Configurado en app |
| Validación entrada | `main.py` | Pydantic models |
| Rate limiting | (Futuro) | Agregar middleware |
| Encriptación BD | (Futuro) | Agregar a models/database.py |

---

## 📚 Matriz: Documentación

Qué archivo leer para cada tema

| Tema | Archivo |
|------|---------|
| Overview arquitectura | `RESUMEN_EJECUTIVO.md` |
| Migración del código | `GUIA_MIGRACION.md` |
| Documentación técnica | `ARQUITECTURA_MODULARIZADA.md` |
| Diagramas y flujos | `MAPA_ARQUITECTURA.md` |
| Importaciones | `GUIA_IMPORTACIONES.md` |
| Quick start | `QUICKSTART.md` |
| Checklist | `VERIFICACION_FINAL.md` |
| Esta matriz | `MATRIZ_RESPONSABILIDADES.md` |

---

## ✨ Matriz: Próximos Pasos

Qué agregaría después

| Feature | Módulo | Esfuerzo |
|---------|--------|----------|
| Tests unitarios | `tests/test_*.py` | 🟡 Medio |
| Logging centralizado | `services/logger.py` | 🟢 Bajo |
| Caché Redis | `services/cache.py` | 🟡 Medio |
| Cola de trabajos | `services/tasks.py` | 🟠 Alto |
| Notificaciones email | `services/email.py` | 🟢 Bajo |
| OAuth2 | `services/oauth.py` | 🟡 Medio |
| Rate limiting | `services/rate_limit.py` | 🟢 Bajo |
| Monitoring | `services/monitoring.py` | 🟡 Medio |
| GraphQL | Agregar `api/graphql.py` | 🟠 Alto |

---

## 🎯 Matriz: Decisiones de Diseño

Por qué cada cosa está donde está

| Componente | Ubicación | Razón |
|-----------|-----------|-------|
| Variables de entorno | `config.py` | Acceso global centralizado |
| Modelos de BD | `models/database.py` | Relacionado con persistencia |
| Índice AI Search | `models/index.py` | Gestión de "modelo" de búsqueda |
| JWT | `services/auth.py` | Lógica de autenticación |
| Extracción texto | `services/text_extractor.py` | Servicio específico reutilizable |
| Embeddings | `services/embeddings.py` | Servicio específico reutilizable |
| Ingesta | `services/document_ingestion.py` | Orquesta otros servicios |
| Retrieval | `services/retrieval.py` | Búsqueda independiente |
| RAG | `services/response_generation.py` | Generación de respuestas |
| Endpoints | `main.py` | Punto de entrada HTTP |

---

## 🌟 Resumen Visual

```
Responsabilidad            Módulo                 Líneas
────────────────────────────────────────────────────────
Configuración            config.py                 40
Modelos de BD            models/database.py        90
Índice Search            models/index.py           50
Autenticación            services/auth.py          70
Extracción               services/text_extractor   60
Vectorización            services/embeddings       80
Ingesta                  services/document_ing     40
Búsqueda                 services/retrieval        50
Generación               services/response_gen    100
Limpieza                 services/vector_cleanup   60
Rutas API                main.py                  250
────────────────────────────────────────────────────────
TOTAL                                            ~790
```

**Cada línea hace una cosa bien. Nada más. Nada menos. ✨**
