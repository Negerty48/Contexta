import os
from sqlalchemy import create_engine, text
from azure.storage.blob import BlobServiceClient
from azure.search.documents.indexes import SearchIndexClient
from azure.core.credentials import AzureKeyCredential
from dotenv import load_dotenv

# Cargar variables de entorno
load_dotenv()

def reset_database():
    print("🚀 Iniciando limpieza total del sistema Contexta...")
    
    # 1. LIMPIEZA DE SQL
    try:
        db_url = os.getenv("DATABASE_URL")
        if not db_url:
            raise ValueError("DATABASE_URL no encontrada en el .env")
            
        engine = create_engine(db_url)
        with engine.connect() as conn:
            print("🔹 Limpiando tablas de SQL...")
            # El orden es VITAL para no violar las Foreign Keys (de hijos a padres)
            conn.execute(text("DELETE FROM mensajes_chat"))
            conn.execute(text("DELETE FROM documentos"))
            conn.execute(text("DELETE FROM asistentes"))
            conn.execute(text("DELETE FROM usuarios"))
            conn.commit()
            print("✅ Tablas SQL vaciadas con éxito.")
    except Exception as e:
        print(f"❌ Error limpiando SQL: {e}")

    # 2. LIMPIEZA DE BLOB STORAGE
    try:
        conn_str = os.getenv("AZURE_STORAGE_CONNECTION_STRING")
        container_name = os.getenv("AZURE_STORAGE_CONTAINER") # <--- Ajustado a tu .env
        
        if not conn_str or not container_name:
            raise ValueError("Faltan variables de Azure Storage en el .env")
            
        blob_service_client = BlobServiceClient.from_connection_string(conn_str)
        container_client = blob_service_client.get_container_client(container_name)
        
        print(f"🔹 Eliminando archivos del contenedor '{container_name}'...")
        blobs = container_client.list_blobs()
        for blob in blobs:
            container_client.delete_blob(blob.name)
        print("✅ Azure Blob Storage limpio.")
    except Exception as e:
        print(f"❌ Error limpiando Blobs: {e}")

    # 3. LIMPIEZA DE AI SEARCH
    try:
        endpoint = os.getenv("AZURE_SEARCH_ENDPOINT") # <--- Ajustado a tu .env
        key = os.getenv("AZURE_SEARCH_ADMIN_KEY")
        index_name = os.getenv("AZURE_SEARCH_INDEX_NAME")
        
        if not endpoint or not key or not index_name:
            raise ValueError("Faltan variables de Azure AI Search en el .env")
            
        credential = AzureKeyCredential(key)
        index_client = SearchIndexClient(endpoint=endpoint, credential=credential)
        
        print(f"🔹 Eliminando índice vectorial '{index_name}'...")
        index_client.delete_index(index_name)
        print("✅ Índice de Azure AI Search eliminado.")
    except Exception as e:
        print(f"❌ Error limpiando AI Search: {e}")

    print("\n✨ SISTEMA RESETEADO CON ÉXITO. Listo para el despliegue de producción.")

if __name__ == "__main__":
    confirmacion = input("⚠️ ADVERTENCIA: Esto borrará TODOS los datos. ¿Estás seguro? (s/n): ")
    if confirmacion.lower() == 's':
        reset_database()
    else:
        print("Operación cancelada.")