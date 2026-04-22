# 🧠 Contexta

> Aplicación Full-Stack de Asistentes RAG (Multi-asistente).

## 🎯 Objetivo del Proyecto

Este proyecto es una solución basada en IA generativa. Su objetivo principal es permitir la creación y gestión de múltiples asistentes virtuales personalizados, cada uno con su propia base de conocimiento (documentos) y reglas de comportamiento. 

La aplicación utiliza la arquitectura **RAG** para garantizar que cada asistente responda de forma precisa, citando sus fuentes y con un **aislamiento total** de la información entre los distintos asistentes.

## ✨ Funcionalidades Core (En desarrollo)

* **Gestión Multi-Asistente:** Creación, edición y eliminación de asistentes con instrucciones (System Prompts) personalizadas.
* **Gestión Documental Aislada:** Subida y procesamiento de documentos (PDF, TXT, etc.) vinculados exclusivamente a un asistente específico.
* **Motor RAG Seguro:** Vectorización y *chunking* de documentos garantizando que durante el chat el sistema solo recupera información del asistente seleccionado.
* **Chat Inteligente con Memoria:** Interfaz de chat conversacional que mantiene el historial de la sesión para dar respuestas contextualizadas.
* **Control de Alucinaciones y Citas:** El asistente está configurado para no inventar información si no la encuentra en sus documentos y proporciona referencias al texto origen.

## 🛠️ Stack Tecnológico Previsto

* **Frontend:** React / Next.js (con Tailwind CSS)
* **Backend:** Python con FastAPI
* **Base de Datos / Vectorial:** Azure SQL y Azure AI Search
* **Modelos de IA:** Azure OpenAI Service (`text-embedding-3-small` para embeddings y `gpt-4o-mini` para generación).

## 🚀 Instalación y Ejecución Local

*(Esta sección se detallará al finalizar el desarrollo)*

**IMPORTANTE: Ejecutar la terminal como administrador**


1. Clonar el repositorio
```bash
git clone https://github.com/Negerty48/Contexta.git
```
2. Instalar y compilar el Frontend
```bash
# Entrar a la carpeta del frontend
cd Contexta
```
3. Crear el entorno virtual (venv)
```bash
python -m venv venv
```
4. Activar el entorno virtual
```bash
# (Windows)
.\venv\Scripts\activate
```
```bash
# (macOS/Linux)
source venv/bin/activate
```
5. Instalar las dependecias
```bash
pip install -r requirements.txt
```
6. Integrar Node.js y npm dentro del entorno virtual
```bash
# Instalar Node.js en el entorno virtual actual (-p)
nodeenv -p

# Verificar que npm se ha instalado correctamente
npm -v
```
7. Instalar y compilar el Frontend
```bash
# Entrar a la carpeta del frontend
cd frontend

# Instalar las dependencias de React/Vite (node_modules)
npm install

# Compilar el proyecto para producción (creará la carpeta /dist)
npm run build

# Volver a la raíz del proyecto
cd ..
```
8. Ejecutar la aplicación
```bash
python .\.main.py
```

## 🚧 Estado del Proyecto

Este proyecto se encuentra actualmente en fase de **desarrollo activo**. Este README será actualizado con diagramas de arquitectura, decisiones de diseño y guías paso a paso de ejecución una vez se consolide la versión final (v1.0).