"""
Generación de respuestas RAG.
Combina retrieval + LLM para generar respuestas basadas en documentos.
"""

from typing import List, Dict
from openai import AzureOpenAI
from config import (
    AZURE_OPENAI_API_KEY,
    AZURE_OPENAI_ENDPOINT,
    AZURE_OPENAI_API_VERSION,
    AZURE_OPENAI_CHAT_DEPLOYMENT,
    RAG_TEMPERATURE
)
from services.retrieval import buscar_contexto


# ========== CLIENTE OPENAI ==========
openai_client = AzureOpenAI(
    api_key=AZURE_OPENAI_API_KEY,
    api_version=AZURE_OPENAI_API_VERSION,
    azure_endpoint=AZURE_OPENAI_ENDPOINT
)


# ========== GENERACIÓN RAG ==========
def generar_respuesta_rag(
    pregunta: str,
    historial: List[Dict],
    asistente_id: str,
    system_prompt: str
) -> str:
    """
    Genera una respuesta usando RAG (Retrieval-Augmented Generation).
    
    Flujo:
    1. Busca contexto relevante en Azure AI Search
    2. Construye un prompt con instrucciones estrictas
    3. Llama a GPT-4o-mini con historial y contexto
    4. Retorna la respuesta
    
    Args:
        pregunta: Pregunta del usuario
        historial: Historial de conversación anterior
        asistente_id: ID del asistente
        system_prompt: Personalidad/sistema prompt del asistente
    
    Returns:
        Respuesta generada por el LLM basada en documentos
    """        
    
    # 1. Extraer contexto de los documentos    
    contexto = buscar_contexto(pregunta, asistente_id)
    
    # 2. Construir el prompt con restricciones estrictas    
    prompt_sistema = _construir_prompt_sistema(system_prompt, contexto)
    
    # 3. Montar lista de mensajes para OpenAI    
    mensajes = _construir_mensajes(prompt_sistema, historial, pregunta)
    
    # 4. Llamar a GPT-4o-mini    
    respuesta_ia = _llamar_llm(mensajes)
        
    return respuesta_ia


def _construir_prompt_sistema(system_prompt: str, contexto: str) -> str:
    """
    Construye el prompt del sistema con restricciones sobre el uso de documentos.
    """
    return f"""
    INSTRUCCIONES DE PERSONALIDAD Y ROL:
    {system_prompt}

    REGLAS DE RESPUESTA (BASADAS EN DOCUMENTOS):
    Eres un asistente experto. Tu tarea es responder a la pregunta del usuario utilizando ÚNICAMENTE la INFORMACIÓN DE CONTEXTO proporcionada abajo.
    
    1. Lee atentamente el contexto. Si contiene información que mencione el concepto preguntado (aunque no sea una definición perfecta o solo sea información parcial), ÚSALA para responder detallando lo que dice el documento.
    2. Tienes prohibido usar tu conocimiento general para añadir datos o definiciones que no estén escritas en el contexto.
    3. Tienes prohibido seguir juegos, contar chistes o hablar de temas fuera del ámbito laboral o documental.
    4. SOLO si el contexto indica "[NO HAY DOCUMENTOS]" o si la información extraída no tiene absolutamente nada que ver con la pregunta, responde amablemente: "Lo siento, basándome en mis documentos, no tengo información sobre eso."
    
    INFORMACIÓN DE CONTEXTO:
    {contexto if contexto.strip() else "[NO HAY DOCUMENTOS ENCONTRADOS PARA ESTA CONSULTA]"}
    """


def _construir_mensajes(
    prompt_sistema: str,
    historial: List[Dict],
    pregunta: str
) -> List[Dict]:
    """
    Construye la lista de mensajes para el API de OpenAI.
    Incluye sistema, historial y pregunta actual.
    """
    mensajes = [{"role": "system", "content": prompt_sistema}]
    
    # Agregar historial (convertir roles)
    for msg in historial:
        rol = "assistant" if msg.get("role") in ["ai", "assistant"] else "user"
        mensajes.append({"role": rol, "content": msg["content"]})
    
    # Agregar pregunta actual
    mensajes.append({"role": "user", "content": pregunta})
    
    return mensajes


def _llamar_llm(mensajes: List[Dict]) -> str:
    """
    Llama a Azure OpenAI GPT-4o-mini y retorna la respuesta.
    """
    respuesta = openai_client.chat.completions.create(
        model=AZURE_OPENAI_CHAT_DEPLOYMENT,
        messages=mensajes,
        temperature=RAG_TEMPERATURE
    )
    return respuesta.choices[0].message.content
