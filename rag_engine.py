import os
import io
import uuid
import tiktoken
from dotenv import load_dotenv

# Extractores
import fitz  
import docx  
import pptx  

# Azure AI
from openai import AzureOpenAI
from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.indexes import SearchIndexClient
from azure.search.documents.models import VectorizedQuery
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

load_dotenv()

# --- CLIENTES ---
# Cliente para crear el Índice
index_client = SearchIndexClient(
    endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
    credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_ADMIN_KEY"))
)

# Cliente para subir documentos al Índice
search_client = SearchClient(
    endpoint=os.getenv("AZURE_SEARCH_ENDPOINT"),
    index_name=os.getenv("AZURE_SEARCH_INDEX_NAME"),
    credential=AzureKeyCredential(os.getenv("AZURE_SEARCH_ADMIN_KEY"))
)

# Cliente para generar los vectores (Embeddings)
openai_client = AzureOpenAI(
    api_key=os.getenv("AZURE_OPENAI_API_KEY"),
    api_version="2023-05-15",
    azure_endpoint=os.getenv("AZURE_OPENAI_ENDPOINT")
)

CHAT_MODEL = os.getenv("AZURE_OPENAI_CHAT_DEPLOYMENT")
EMBEDDING_MODEL = os.getenv("AZURE_OPENAI_EMBEDDING_DEPLOYMENT")
INDEX_NAME = os.getenv("AZURE_SEARCH_INDEX_NAME")

# --- 1. CREACIÓN DEL ÍNDICE (Si no existe) ---
def asegurar_indice_existe():
    try:
        index_client.get_index(INDEX_NAME)        
    except Exception:        
        # Estructura del índice vectorial
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SimpleField(name="assistant_id", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="doc_id", type=SearchFieldDataType.String, filterable=True),
            SearchableField(name="filename", type=SearchFieldDataType.String),
            SearchableField(name="chunk_text", type=SearchFieldDataType.String),
            SearchField(name="content_vector", type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                        searchable=True, vector_search_dimensions=1536, vector_search_profile_name="myHnswProfile")
        ]

        vector_search = VectorSearch(
            algorithms=[HnswAlgorithmConfiguration(name="myHnsw")],
            profiles=[VectorSearchProfile(name="myHnswProfile", algorithm_configuration_name="myHnsw")]
        )

        index = SearchIndex(name=INDEX_NAME, fields=fields, vector_search=vector_search)
        index_client.create_index(index)        

# Ejecutar al importar para asegurar que la base de datos de IA existe
asegurar_indice_existe()


# --- 2. EXTRACCIÓN UNIVERSAL DE TEXTO ---
def extraer_texto(file_content: bytes, filename: str) -> str:
    ext = filename.split('.')[-1].lower()
    text = ""
    
    try:
        if ext == "pdf":
            doc = fitz.open(stream=file_content, filetype="pdf")
            for page in doc:
                text += page.get_text() + "\n"
        elif ext == "docx":
            doc = docx.Document(io.BytesIO(file_content))
            text = "\n".join([p.text for p in doc.paragraphs])
        elif ext == "pptx":
            prs = pptx.Presentation(io.BytesIO(file_content))
            for slide in prs.slides:
                for shape in slide.shapes:
                    if hasattr(shape, "text"):
                        text += shape.text + "\n"
        elif ext in ["txt", "md"]:
            text = file_content.decode('utf-8', errors='ignore')
        else:
            raise ValueError(f"Formato no soportado para extracción: {ext}")      
    except Exception as e:        
        raise ValueError(f"Error extrayendo texto de {filename}: {str(e)}")

    return text.strip()


# --- 3. PROCESAMIENTO E INGESTA (El flujo principal) ---
def procesar_e_ingestar_documento(file_content: bytes, filename: str, asistente_id: str, doc_id: str):    
    
    # 1. Extraer texto
    texto_completo = extraer_texto(file_content, filename)
    if not texto_completo:
        raise ValueError(f"El documento '{filename}' no contenía texto legible.")        

    # 2. Chunking (Cortar en pedazos de ~1000 tokens)
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(texto_completo)
    
    chunk_size = 1000
    overlap = 100
    chunks = []
    
    for i in range(0, len(tokens), chunk_size - overlap):
        chunk_tokens = tokens[i:i + chunk_size]
        chunk_text = enc.decode(chunk_tokens)
        chunks.append(chunk_text)    

    # 3. Generar vectores y preparar documentos para Search
    documentos_para_search = []
    for chunk in chunks:
        # Llamada a Azure OpenAI para el vector
        respuesta = openai_client.embeddings.create(input=[chunk], model=EMBEDDING_MODEL)
        vector = respuesta.data[0].embedding
        
        # Objeto final para Azure Search
        documentos_para_search.append({
            "id": str(uuid.uuid4()),
            "assistant_id": asistente_id,
            "doc_id": doc_id,
            "filename": filename,
            "chunk_text": chunk,
            "content_vector": vector
        })

    # 4. Subir a Azure AI Search en lotes
    search_client.upload_documents(documents=documentos_para_search)    

# --- 4. RECUPERACIÓN (Retrieval) ---
def buscar_contexto(pregunta: str, asistente_id: str) -> str:    
    
    # 1. Convertir la pregunta a vector
    respuesta_vector = openai_client.embeddings.create(input=[pregunta], model=EMBEDDING_MODEL)
    vector_pregunta = respuesta_vector.data[0].embedding

    # 2. Configurar la búsqueda vectorial (Queremos los 3 pedazos más relevantes)
    vector_query = VectorizedQuery(
        vector=vector_pregunta, 
        k_nearest_neighbors=3, 
        fields="content_vector"
    )

    # 3. Búsqueda Híbrida (Texto + Vector) filtrando SOLO por este asistente
    resultados = search_client.search(
        search_text=pregunta,
        vector_queries=[vector_query],
        filter=f"assistant_id eq '{asistente_id}'",
        top=3
    )

    # 4. Juntar los pedazos encontrados
    textos_recuperados = []
    for doc in resultados:
        textos_recuperados.append(f"Documento origen: {doc['filename']}\nContenido: {doc['chunk_text']}")

    contexto_final = "\n\n---\n\n".join(textos_recuperados)
    return contexto_final


# --- 5. GENERACIÓN (Augmented Generation) ---
def generar_respuesta_rag(pregunta: str, historial: list, asistente_id: str, system_prompt: str) -> str:
    # 1. Extraer los documentos de Azure AI Search
    contexto = buscar_contexto(pregunta, asistente_id)
    
    # 2. Construir el Mega-Prompt (System Prompt + Documentos + Restricciones)
    prompt_completo = f"""
    {system_prompt}

    A continuación se te proporciona información de contexto extraída de los documentos del usuario.
    Debes usar EXCLUSIVAMENTE esta información para responder a la pregunta. 
    Si la respuesta no se encuentra en el contexto, responde amablemente que no tienes esa información en tus documentos.
    
    INFORMACIÓN DE CONTEXTO:
    {contexto if contexto else "No se encontraron documentos relevantes."}
    """

    # 3. Montar la lista de mensajes para OpenAI
    mensajes = [{"role": "system", "content": prompt_completo}]
    
    # Añadimos el historial de la conversación (para que tenga memoria)
    for msg in historial:        
        rol = "assistant" if msg["role"] in ["ai", "assistant"] else "user"
        mensajes.append({"role": rol, "content": msg["content"]})
        
    # Añadimos la pregunta actual
    mensajes.append({"role": "user", "content": pregunta})

    # 4. Llamar a GPT-4o-mini
    respuesta = openai_client.chat.completions.create(
        model=CHAT_MODEL,
        messages=mensajes,
        temperature=0.3
    )

    return respuesta.choices[0].message.content

# --- 6. LIMPIEZA Y OPTIMIZACIÓN (Garbage Collection) ---

def eliminar_documento_del_indice(doc_id: str):
    """Busca todos los chunks (pedazos) de un documento y los borra de AI Search"""
    
    # 1. Buscar los IDs de todos los pedazos que pertenecen a este documento
    resultados = search_client.search(
        search_text="*",
        filter=f"doc_id eq '{doc_id}'",
        select="id",
        top=1000 # Aseguramos recuperar todos aunque el documento sea muy largo
    )
    
    documentos_a_borrar = [{"id": doc["id"]} for doc in resultados]
    
    # 2. Si encontró pedazos, los borra de la base de datos vectorial
    if documentos_a_borrar:
        search_client.delete_documents(documents=documentos_a_borrar)                    


def eliminar_asistente_del_indice(asistente_id: str):
    """Borra ABSOLUTAMENTE TODOS los vectores de un asistente cuando se elimina el agente"""    
    
    resultados = search_client.search(
        search_text="*",
        filter=f"assistant_id eq '{asistente_id}'",
        select="id",
        top=1000 
    )
    
    documentos_a_borrar = [{"id": doc["id"]} for doc in resultados]
    
    if documentos_a_borrar:
        # Azure Search tiene un límite por lote, pero para la capa Basic 1000 está perfecto
        search_client.delete_documents(documents=documentos_a_borrar)        