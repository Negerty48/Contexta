# Contexta - AI Platform 🚀
Contexta es una plataforma Full-Stack de Inteligencia Artificial que permite a los usuarios crear, gestionar e interactuar con múltiples asistentes conversacionales personalizados. Basado en la arquitectura RAG, cada asistente actúa como un experto en un dominio específico, respondiendo preguntas basadas única y exclusivamente en los documentos que el usuario le ha proporcionado.

## Descripción del Producto
**¿Qué problema resuelve?**

Los modelos de lenguaje genéricos (como ChatGPT) carecen de contexto sobre información privada, manuales internos o documentación específica de una empresa, y tienden a "alucinar" respuestas cuando no conocen un dato.

**¿Qué hace Contexta?**

Permite a cualquier usuario sin conocimientos técnicos crear asistentes virtuales aislados. Un usuario puede tener un "Asistente Legal" alimentado con contratos PDF y un "Asistente de RRHH" alimentado con normativas, y chatear con ellos con la garantía de que sus respuestas estarán fundamentadas 100% en la documentación subida, manteniendo un historial persistente de la conversación.

## Stack Tecnológico
El proyecto está dividido en un frontend reactivo y un backend robusto apoyado en el ecosistema cloud de Microsoft Azure.

- **Frontend:** React (JavaScript), Vite, Tailwind CSS.
- **Backend:** Python 3.12, FastAPI, SQLAlchemy, Pydantic.
- **Base de Datos Relacional:** Azure SQL Database.
- **Almacenamiento Físico:** Azure Blob Storage.
- **Base de Datos Vectorial (RAG):** Azure AI Search.
- **Modelos de IA:** Azure OpenAI (gpt-4o-mini para inferencia, text-embedding-ada-002 para embeddings).
- **Despliegue:** Vercel (Frontend) y Azure App Service for Linux (Backend).

## Arquitectura Implementada
El flujo de información sigue un patrón RAG clásico con persistencia completa en la nube:

1. **Ingesta de Datos:** Cuando un usuario sube un documento al frontend, FastAPI lo recibe, guarda el archivo original en Azure Blob Storage, extrae el texto, lo divide en chunks, genera los embeddings usando el modelo de embeddings de Azure OpenAI, y los almacena en Azure AI Search asociados al ID de ese asistente en concreto.

2. **Conversación (Retrieval):** El usuario envía una pregunta. FastAPI convierte la pregunta en un vector y busca en Azure AI Search los fragmentos de texto más similares semánticamente, filtrando estrictamente por el ID del asistente actual.

3. **Generación:** Se construye un "Mega-Prompt" que incluye la personalidad del asistente, las reglas estrictas de no alucinar, el contexto recuperado y el historial de la conversación. Esto se envía a gpt-4o-mini.

4. **Persistencia:** La respuesta se devuelve al frontend para mostrarse en la UI y, simultáneamente, la pregunta y la respuesta se guardan en Azure SQL para mantener la memoria a largo plazo.

## Decisiones de Diseño Relevantes
- **Decisiones de Producto y UX**

  - **Doble estado de carga (UI/UX):** Se implementaron dos estados visuales distintos en el chat. Uno central ("Cargando...") mientras se recupera el historial de la base de datos al cambiar de agente, y una "burbuja de pensamiento" cuando el LLM está procesando la respuesta. Esto evita saltos bruscos en la interfaz y mejora la percepción de rendimiento.

  - **Protección contra borrados accidentales:** Acciones destructivas (como borrar un agente o eliminar un documento de la IA) requieren confirmación mediante un Modal interceptor.

  - **Prevención de "Flash of Empty State":** El frontend maneja estados internos (isFetchingAssistants) para mostrar spinners elegantes en lugar de mostrar textos de "No tienes agentes" durante los milisegundos que tarda la petición inicial al backend.

- **Decisiones Técnicas**

    - **FastAPI sobre Flask/Django:** Se eligió FastAPI por su soporte nativo asíncrono (async def), ideal para llamadas de red bloqueantes (como peticiones a OpenAI o Azure), y por la validación de datos estricta y automática que provee Pydantic.

    - **Despliegue con Gunicorn + Uvicorn:** En producción (Azure App Service), el arranque se realiza mediante gunicorn para aprovechar el rendimiento asíncrono de ASGI mientras Gunicorn gestiona los procesos (workers). Para evitar colisiones en la creación de índices vectoriales por la concurrencia de workers, se implementaron bloques try...except que capturan el ResourceExistsError.

## Guía de Ejecución Local
**Prerrequisitos**

- Python 3.10+
- Node.js v18+
- Tener configurados los recursos en Azure (SQL, Storage, AI Search) y una API Key de OpenAI.

**Pasos**

1. Abre una **terminal** como **administrador**.

2. Clona el repositorio y entra en la carpeta:
```bash
git clone https://github.com/Negerty48/Contexta.git

cd Contexta
```
3. Crea y activa un entorno virtual:
```bash
python -m venv venv

.venv\Scripts\activate #Linux/Mac (source venv/bin/activate)
```
4. Instala las dependencias:
```bash
pip install -r requirements.txt
```

5. Añade node a tu entorno virtual:
```bash
nodeenv -p
```

6. **Crea** un archivo **.env** basado en .env.example y rellena **tus credenciales**.
   
7. Navega a la carpeta del frontend:
```bash
cd frontend
```

8. Instala las dependecias a node:
```bash
npm install
```

9. Compila el frontend con node:
```bash
npm run dev
```

10. Vuelve al directorio raíz:
```bash
cd ..
```

11. Ejecuta el servidor web:
```bash
python .\main.py
```

**Consideraciones**

- Asegúrate de que las peticiones fetch apunten a http://localhost:8000.

- Se incluye un script de borrado total llamado reset_system.py en el backend para vaciar la base de datos, blobs y vectores, ideal para inicializar el sistema antes de una nueva prueba de producción.

## Cumplimiento del Core (Requisitos Clave)
- **Aislamiento por asistente en el Retrieval:** Para que un "Asistente Legal" no lea los documentos de un "Asistente de RRHH", se utiliza el campo asistente_id en la inyección y recuperación de datos. Al realizar búsquedas en Azure AI Search, el motor RAG aplica un filtro OData estricto(filter=asistente_id eq 'ID_DEL_ASISTENTE_ACTUAL'), lo que garantiza un aislamiento hermético a nivel de base de datos vectorial.
- **Persistencia del chat / Memoria:** La memoria a largo plazo se gestiona mediante una tabla relacional en Azure SQL, vinculada mediante Foreign Keys al asistente.

  - **Lectura:** Al abrir un chat en el frontend, se hace una petición GET que descarga el historial ordenado por fecha de creación y lo añade en la interfaz del chat.

  - **Inyección:** Al enviar un nuevo mensaje, el backend recupera ese historial de SQL, lo formatea como una lista de roles (user, assistant) y lo inyecta como contexto temporal en la ventana de contexto de GPT-4o-mini.

  - **Escritura:** Inmediatamente después de recibir la respuesta de OpenAI, tanto el prompt del usuario como el completion de la IA se guardan en la base de datos en una misma transacción.

- **Gestión de citas y comportamiento:** Para convertir a la IA en un analista de documentos estricto, se ha implementado una estrategia combinada de Prompt Engineering y ajuste de hiperparámetros:

    - **System Prompting:** Se inyecta una directiva de sistema inicial que incluye reglas explícitas prohibiendo el uso del conocimiento previo del modelo. Se le instruye que, en caso de no encontrar la respuesta en el bloque "INFORMACIÓN DE CONTEXTO", debe responder con una frase predefinida.

    - **Contexto Explícito Nulo:** Si la búsqueda vectorial no supera el umbral de similitud o la base de datos está vacía, el backend inyecta explícitamente el texto [NO HAY DOCUMENTOS ENCONTRADOS] en la variable de contexto. Lo que evita que el LLM intente inferir de la nada.

    - **Temperatura:** Se redujo el parámetro temperature a 0.3, reduciendo significativamente la "creatividad" del modelo y forzándolo a generar respuestas analíticas, predecibles y ceñidas al texto proporcionado.