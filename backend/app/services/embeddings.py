"""
Procesamiento de chunking y generación de embeddings.
Responsable de dividir documentos en chunks y generar vectores.
"""

import uuid
import tiktoken
from typing import List, Dict
from openai import AzureOpenAI
from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_EMBEDDING_DEPLOYMENT,
    CHUNK_SIZE,
    CHUNK_OVERLAP,
    EMBEDDING_VECTOR_DIMENSIONS
)


# ========== CLIENTE OPENAI ==========
openai_client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT
)


# ========== CHUNKING ==========
def dividir_en_chunks(texto: str, chunk_size: int = CHUNK_SIZE, overlap: int = CHUNK_OVERLAP) -> List[str]:
    """
    Divide un texto en chunks de ~1000 tokens con solapamiento.
    
    Args:
        texto: Texto a dividir
        chunk_size: Tamaño del chunk en tokens
        overlap: Solapamiento entre chunks
    
    Returns:
        Lista de chunks de texto
    """
    enc = tiktoken.get_encoding("cl100k_base")
    tokens = enc.encode(texto)
    chunks = []
    
    for i in range(0, len(tokens), chunk_size - overlap):
        chunk_tokens = tokens[i:i + chunk_size]
        chunk_text = enc.decode(chunk_tokens)
        chunks.append(chunk_text)
    
    return chunks


# ========== GENERACIÓN DE EMBEDDINGS ==========
def generar_embedding(texto: str) -> List[float]:
    """
    Genera un vector embedding para un texto usando Azure OpenAI.
    
    Args:
        texto: Texto para el cual generar el embedding
    
    Returns:
        Vector de embedding (1536 dimensiones)
    """
    respuesta = openai_client.embeddings.create(
        input=[texto],
        model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )
    return respuesta.data[0].embedding


def generar_embeddings_lote(textos: List[str]) -> List[List[float]]:
    """
    Genera embeddings para múltiples textos en una sola llamada.
    
    Args:
        textos: Lista de textos
    
    Returns:
        Lista de vectores embedding
    """
    respuesta = openai_client.embeddings.create(
        input=textos,
        model=AZURE_OPENAI_EMBEDDING_DEPLOYMENT
    )
    return [item.embedding for item in respuesta.data]


# ========== PREPARACIÓN DE DOCUMENTOS PARA AZURE SEARCH ==========
def preparar_documentos_para_search(
    chunks: List[str],
    filename: str,
    asistente_id: str,
    doc_id: str
) -> List[Dict]:
    """
    Prepara chunks para ingesta en Azure Search.
    Genera embeddings y estructura los datos.
    
    Args:
        chunks: Lista de chunks de texto
        filename: Nombre del archivo
        asistente_id: ID del asistente propietario
        doc_id: ID del documento
    
    Returns:
        Lista de documentos listos para Azure Search
    """
    documentos_para_search = []
    
    # Generar embeddings en lote si es posible
    embeddings = generar_embeddings_lote(chunks)
    
    for chunk, vector in zip(chunks, embeddings):
        documentos_para_search.append({
            "id": str(uuid.uuid4()),
            "assistant_id": asistente_id,
            "doc_id": doc_id,
            "filename": filename,
            "chunk_text": chunk,
            "content_vector": vector
        })
    
    return documentos_para_search
