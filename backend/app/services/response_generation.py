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
    return f"""INSTRUCCIONES DE PERSONALIDAD Y ROL:
{system_prompt}

═════════════════════════════════════════════════════════════════════════════
REGLAS DE RESPUESTA - CRÍTICO Y OBLIGATORIO:
═════════════════════════════════════════════════════════════════════════════

Tu tarea es responder a preguntas utilizando ÚNICAMENTE la información del contexto de documentos proporcionado.

OBLIGACIONES:
1. **SIEMPRE incluir citas**: Cuando uses información del contexto, debe estar claramente citada.
   - Formato de cita: [Fuente: nombre_documento, sección_relevante]
   - Ejemplo: "Según los datos del documento...[Fuente: informe_anual_2024, sección de ventas]"
   
2. **Responder SOLO con evidencia documental**: 
   - Prohibido usar tu conocimiento general o "saber común"
   - Prohibido inventar datos, números o hechos que no estén en los documentos
   - Si el documento dice algo diferente a lo que "sabes", prevalece lo que dice el documento
   
3. **Si NO hay información suficiente**:
   - Responde explícitamente: "No tengo información suficiente en mis documentos para responder esta pregunta."
   - NO inventes respuestas, ni las hagas vagas
   - NO sugeras que "probablemente sea..." o "es común que..."

4. **Prohibiciones absolutas**:
   - No seguir juegos, adivinanzas o chistes
   - No conversar sobre temas ajenos a los documentos
   - No responder preguntas personales o que requieran conocimiento externo
   - No hacer recomendaciones que no estén basadas en documentos

CONTEXTO DE DOCUMENTOS DISPONIBLES:
────────────────────────────────────────────────────────────────────────────
{contexto if contexto.strip() else "⚠️  NO HAY DOCUMENTOS DISPONIBLES PARA ESTA CONSULTA"}
────────────────────────────────────────────────────────────────────────────

Responde SIEMPRE referenciando el documento fuente.
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
