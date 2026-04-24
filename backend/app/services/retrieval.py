"""
Retrieval (búsqueda) de información en Azure AI Search.
Convierte preguntas en vectores y busca chunks relevantes.
"""

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from azure.search.documents.models import VectorizedQuery
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME, RETRIEVAL_TOP_K
from services.embeddings import generar_embedding


# ========== CLIENTE DE BÚSQUEDA ==========
search_client = SearchClient(
    endpoint=AZURE_SEARCH_ENDPOINT,
    index_name=AZURE_SEARCH_INDEX_NAME,
    credential=AzureKeyCredential(AZURE_SEARCH_ADMIN_KEY)
)


# ========== RETRIEVAL ==========
def buscar_contexto(pregunta: str, asistente_id: str, top_k: int = RETRIEVAL_TOP_K) -> str:
    """
    Busca chunks relevantes en Azure AI Search para una pregunta.
    Usa búsqueda híbrida (texto + vectorial).
    
    Args:
        pregunta: Pregunta del usuario
        asistente_id: ID del asistente (para filtrar por contexto)
        top_k: Número de chunks a recuperar
    
    Returns:
        Contexto formateado con los chunks encontrados
    """
    
    try:
        # 1. Convertir la pregunta a vector        
        vector_pregunta = generar_embedding(pregunta)
        
        # 2. Configurar búsqueda vectorial
        vector_query = VectorizedQuery(
            vector=vector_pregunta,
            k_nearest_neighbors=top_k,
            fields="content_vector"
        )
        
        # 3. Búsqueda híbrida (Texto + Vector) filtrando por asistente        
        resultados = search_client.search(
            search_text=pregunta,
            vector_queries=[vector_query],
            filter=f"assistant_id eq '{asistente_id}'",
            top=top_k
        )
        
        # 4. Agrupar chunks encontrados
        textos_recuperados = []
        for doc in resultados:
            textos_recuperados.append(
                f"📄 Documento origen: {doc['filename']}\n{doc['chunk_text']}"
            )
        
        if not textos_recuperados:            
            contexto_final = "[NO HAY DOCUMENTOS ENCONTRADOS PARA ESTA CONSULTA]"
        else:
            contexto_final = "\n\n---\n\n".join(textos_recuperados)            
        
        return contexto_final
        
    except Exception as e:        
        return "[ERROR: No se pudo buscar contexto]"
