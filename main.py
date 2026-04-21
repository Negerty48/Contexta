import uvicorn
from fastapi import FastAPI
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

app = FastAPI(title="RAG Multi-Agent API")

# Ruta donde se compilará el frontend de React (Vite dist folder)
FRONTEND_DIST = os.path.join(os.path.dirname(__file__), "frontend", "dist")

# Configuración para servir el SPA (Single Page Application)
if os.path.isdir(FRONTEND_DIST):
    app.mount("/assets", StaticFiles(directory=os.path.join(FRONTEND_DIST, "assets")), name="assets")

    @app.get("/{catchall:path}")
    def serve_react_app(catchall: str):
        # Redirige todo el tráfico no API al index.html de React
        return FileResponse(os.path.join(FRONTEND_DIST, "index.html"))
else:
    @app.get("/")
    def no_frontend():
        return {"message": "El frontend no está compilado. Ejecuta 'npm run build' en la carpeta frontend."}

if __name__ == "__main__":
    # Ejecución con Uvicorn
    print("Iniciando servidor RAG Platform...")
    uvicorn.run("main:app", host="localhost", port=8001, reload=True)