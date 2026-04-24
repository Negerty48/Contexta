"""
Limpieza y eliminación de vectores de Azure AI Search.
Responsable de mantener el índice limpio cuando se borran documentos/asistentes.
"""

from azure.core.credentials import AzureKeyCredential
from azure.search.documents import SearchClient
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME


# ========== CLIENTE DE BÚSQUEDA ==========
search_client = SearchClient(
    endpoint=AZURE_SEARCH_ENDPOINT,
    index_name=AZURE_SEARCH_INDEX_NAME,
    credential=AzureKeyCredential(AZURE_SEARCH_ADMIN_KEY)
)


# ========== LIMPIEZA Y GARBAGE COLLECTION ==========
def eliminar_documento_del_indice(doc_id: str):
    """
    Busca y elimina TODOS los chunks de un documento de Azure AI Search.
    
    Args:
        doc_id: ID del documento a eliminar
    """
    
    try:                
        # 1. Buscar todos los chunks del documento
        resultados = search_client.search(
            search_text="*",
            filter=f"doc_id eq '{doc_id}'",
            select="id",
            top=1000  # Azure Search Basic permite hasta 1000 por búsqueda
        )
        
        documentos_a_borrar = [{"id": doc["id"]} for doc in resultados]
        
        # 2. Eliminar los chunks encontrados
        if documentos_a_borrar:
            search_client.delete_documents(documents=documentos_a_borrar)            
        else:
            print(f"  ℹ No se encontraron chunks para este documento")            
    except Exception as e:
        print(f"  ⚠ Error eliminando documento: {str(e)}")
        raise


def eliminar_asistente_del_indice(asistente_id: str):
    """
    Busca y elimina TODOS los chunks de un asistente de Azure AI Search.
    Se usa cuando se elimina un asistente completo.
    
    Args:
        asistente_id: ID del asistente a eliminar
    """
    
    try:                
        # 1. Buscar todos los chunks del asistente
        resultados = search_client.search(
            search_text="*",
            filter=f"assistant_id eq '{asistente_id}'",
            select="id",
            top=1000
        )
        
        documentos_a_borrar = [{"id": doc["id"]} for doc in resultados]
        
        # 2. Eliminar en lotes (Azure Search tiene límites por lote)
        if documentos_a_borrar:
            # Dividir en lotes de 1000 para asegurar compatibilidad
            tamaño_lote = 1000
            for i in range(0, len(documentos_a_borrar), tamaño_lote):
                lote = documentos_a_borrar[i:i + tamaño_lote]
                search_client.delete_documents(documents=lote)                        
        else:
            print(f"  ℹ No se encontraron chunks para este asistente")
            
    except Exception as e:
        print(f"  ⚠ Error eliminando asistente: {str(e)}")
        raise
