"""
Ingesta de documentos en Azure AI Search.
Coordina extracción, chunking, embeddings y subida.
"""

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME
from services.text_extractor import extraer_texto
from services.embeddings import dividir_en_chunks, preparar_documentos_para_search


# ========== CLIENTE DE BÚSQUEDA ==========
search_client = SearchClient(
    endpoint=AZURE_SEARCH_ENDPOINT,
    index_name=AZURE_SEARCH_INDEX_NAME,
    credential=AzureKeyCredential(AZURE_SEARCH_ADMIN_KEY)
)


# ========== INGESTA DE DOCUMENTOS ==========
def procesar_e_ingestar_documento(
    file_content: bytes,
    filename: str,
    asistente_id: str,
    doc_id: str
):
    """
    Pipeline completo de ingesta:
    1. Extrae texto del documento
    2. Divide en chunks
    3. Genera embeddings
    4. Sube a Azure AI Search
    
    Args:
        file_content: Contenido del archivo en bytes
        filename: Nombre del archivo
        asistente_id: ID del asistente propietario
        doc_id: ID del documento en la BD
    
    Raises:
        ValueError: Si hay error en cualquier etapa
    """
    
    # 1. Extraer texto del documento    
    texto_completo = extraer_texto(file_content, filename)
    
    if not texto_completo:
        raise ValueError(f"El documento '{filename}' no contenía texto legible.")    
    
    # 2. Dividir en chunks
    chunks = dividir_en_chunks(texto_completo)
    
    # 3. Generar embeddings y preparar documentos
    documentos_para_search = preparar_documentos_para_search(chunks, filename, asistente_id, doc_id)    
    
    # 4. Subir a Azure Search    
    search_client.upload_documents(documents=documentos_para_search)    