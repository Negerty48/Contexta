"""
Gestión del índice vectorial en Azure AI Search.
Responsable de crear y mantener el índice.
"""

import os
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
from config import AZURE_SEARCH_ENDPOINT, AZURE_SEARCH_ADMIN_KEY, AZURE_SEARCH_INDEX_NAME


# ========== CLIENTE DE ÍNDICES ==========
index_client = SearchIndexClient(
    endpoint=AZURE_SEARCH_ENDPOINT,
    credential=AzureKeyCredential(AZURE_SEARCH_ADMIN_KEY)
)


# ========== GESTIÓN DEL ÍNDICE ==========
def asegurar_indice_existe(index_name: str = AZURE_SEARCH_INDEX_NAME):
    """
    Verifica si el índice existe en Azure AI Search.
    Si no existe, lo crea con la estructura necesaria para RAG.
    
    Campos del índice:
    - id: Identificador único del chunk
    - assistant_id: ID del asistente (filtrable)
    - doc_id: ID del documento (filtrable)
    - filename: Nombre original del archivo
    - chunk_text: Contenido del chunk
    - content_vector: Embedding del contenido (1536 dimensiones)
    """
    try:
        index_client.get_index(index_name)        
    except Exception:        
        # Definir campos del índice
        fields = [
            SimpleField(name="id", type=SearchFieldDataType.String, key=True),
            SimpleField(name="assistant_id", type=SearchFieldDataType.String, filterable=True),
            SimpleField(name="doc_id", type=SearchFieldDataType.String, filterable=True),
            SearchableField(name="filename", type=SearchFieldDataType.String),
            SearchableField(name="chunk_text", type=SearchFieldDataType.String),
            SearchField(
                name="content_vector",
                type=SearchFieldDataType.Collection(SearchFieldDataType.Single),
                searchable=True,
                vector_search_dimensions=1536,
                vector_search_profile_name="myHnswProfile"
            )
        ]

        # Configurar búsqueda vectorial (HNSW algorithm)
        vector_search = VectorSearch(
            algorithms=[HnswAlgorithmConfiguration(name="myHnsw")],
            profiles=[VectorSearchProfile(name="myHnswProfile", algorithm_configuration_name="myHnsw")]
        )

        # Crear el índice
        index = SearchIndex(name=index_name, fields=fields, vector_search=vector_search)
        index_client.create_index(index)        

# Ejecutar al importar para asegurar que el índice existe
asegurar_indice_existe()
