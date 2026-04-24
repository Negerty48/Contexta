# 🔄 GUÍA DE MIGRACIÓN A ARQUITECTURA MODULARIZADA

## Versión Actual
- ❌ **Monolítica**: Todo en `main.py` (~400 líneas) y `rag_engine.py` (~260 líneas)
- ❌ Difícil de mantener, testear y escalar

## Versión Nueva
- ✅ **Modularizada**: Separado en 11 módulos con responsabilidades claras
- ✅ Fácil de mantener, testear y escalar

---

## 📋 Checklist de Migración

### Pre-migración
- [ ] Backup de todos los archivos
- [ ] Verificar que todas las dependencias están en `requirements.txt`
- [ ] `.env` tiene todas las variables necesarias

### Durante la migración
- [ ] Crear carpetas `models/` y `services/`
- [ ] Crear archivos modularizados
- [ ] Reemplazar `main.py`
- [ ] Eliminar `rag_engine.py`
- [ ] Verificar estructura

### Post-migración
- [ ] Instalar dependencias
- [ ] Testear endpoints
- [ ] Verificar logs

---

## 🚀 Pasos Detallados

### PASO 1: Preparación

```bash
# 1.1 Navega al directorio del proyecto
cd c:\Users\Alumno_AI\Desktop\Contexta

# 1.2 Verifica que tienes VS Code abierto con la carpeta
# (Deberías ver la estructura en el sidebar)

# 1.3 Copia de seguridad manual (opcional)
# Crea una carpeta backup/ y copia backend/app/
```

### PASO 2: Crear estructura modularizada

**Ya está creada en los pasos anteriores. Verifica que existen:**

```
backend/app/
├── config.py                          ✓
├── models/
│   ├── __init__.py                    ✓
│   ├── database.py                    ✓
│   └── index.py                       ✓
├── services/
│   ├── __init__.py                    ✓
│   ├── auth.py                        ✓
│   ├── text_extractor.py              ✓
│   ├── embeddings.py                  ✓
│   ├── document_ingestion.py           ✓
│   ├── retrieval.py                   ✓
│   ├── response_generation.py          ✓
│   └── vector_cleanup.py              ✓
└── main_new.py                        ✓
```

### PASO 3: Reemplazar main.py

```bash
# Opción A: Manualmente en VS Code
# 1. Renombra backend/app/main.py → backend/app/main_backup.py
# 2. Renombra backend/app/main_new.py → backend/app/main.py

# Opción B: PowerShell
cd c:\Users\Alumno_AI\Desktop\Contexta\backend\app
Rename-Item -Path main.py -NewName main_backup.py
Rename-Item -Path main_new.py -NewName main.py
```

### PASO 4: Eliminar/Respaldar rag_engine.py

```bash
# PowerShell
cd c:\Users\Alumno_AI\Desktop\Contexta\backend\app
Rename-Item -Path rag_engine.py -NewName rag_engine_backup.py

# Nota: La lógica de rag_engine.py ya está distribuida en services/
```

### PASO 5: Verificar imports

En VS Code, abre `backend/app/main.py` y verifica que:
- ✓ Todos los imports están en verde (sin errores rojos)
- ✓ Los modules se encuentran correctamente

Si hay errores rojos, puede ser porque:
- Las rutas relativas de importación están mal
- Falta crear algún archivo

### PASO 6: Instalar dependencias

```bash
# PowerShell
cd c:\Users\Alumno_AI\Desktop\Contexta

# Crear virtual environment (si no existe)
python -m venv venv
.\venv\Scripts\Activate

# Instalar dependencias
pip install -r requirements.txt
```

### PASO 7: Probar la aplicación

```bash
# PowerShell (asegúrate de estar en venv)
cd c:\Users\Alumno_AI\Desktop\Contexta\backend

# Iniciar uvicorn
python -m uvicorn app.main:app --reload --host 0.0.0.0 --port 8000

# Debería ver:
# INFO:     Uvicorn running on http://0.0.0.0:8000
# INFO:     Application startup complete
```

### PASO 8: Probar endpoints

En otra terminal:

```bash
# PowerShell
# 1. Health check
curl http://localhost:8000/health

# 2. Ver documentación Swagger
# Abre en navegador: http://localhost:8000/docs
```

---

## ✅ Validación Post-Migración

### 1. Estructura de carpetas
```bash
# Verifica que existen todos los archivos
Get-ChildItem -Path c:\Users\Alumno_AI\Desktop\Contexta\backend\app -Recurse -Include *.py
```

### 2. Imports correctos
```python
# En Python REPL
cd c:\Users\Alumno_AI\Desktop\Contexta\backend

python
>>> from app.config import SECRET_KEY
>>> from app.models.database import Usuario
>>> from app.services.auth import get_password_hash
# Debería importar sin errores
```

### 3. Endpoints funcionales

```bash
# Test 1: Health check
curl -X GET http://localhost:8000/health

# Respuesta esperada:
# {"status":"ok","message":"Contexta RAG API está funcionando"}

# Test 2: Registro de usuario
curl -X POST http://localhost:8000/auth/registro \
  -H "Content-Type: application/json" \
  -d '{
    "nombre": "Test",
    "email": "test@example.com",
    "password": "password123"
  }'

# Test 3: Login
curl -X POST http://localhost:8000/auth/token \
  -H "Content-Type: application/x-www-form-urlencoded" \
  -d "username=test@example.com&password=password123"

# Respuesta esperada:
# {"access_token":"...", "token_type":"bearer", "nombre":"Test"}
```

### 4. Documentación interactiva

Abre en navegador: `http://localhost:8000/docs`

Deberías ver:
- ✓ Todos los endpoints listados
- ✓ Documentación Swagger completa
- ✓ Capacidad de probar endpoints interactivamente

---

## 🐛 Troubleshooting

### Error: "ModuleNotFoundError: No module named 'app'"

**Solución:**
```bash
# Asegúrate de estar en la carpeta correcta
cd c:\Users\Alumno_AI\Desktop\Contexta\backend

# No en backend/app, sino en backend
python -m uvicorn app.main:app --reload
```

### Error: "Import error in config.py"

**Solución:**
```bash
# Verifica que .env existe
dir c:\Users\Alumno_AI\Desktop\Contexta\.env

# Si no existe, crea uno con variables de ejemplo
```

### Error: "Azure credentials not found"

**Solución:**
```bash
# Verifica que en .env tienes:
# - AZURE_SEARCH_ENDPOINT
# - AZURE_SEARCH_ADMIN_KEY
# - AZURE_STORAGE_CONNECTION_STRING
# - AZURE_OPENAI_ENDPOINT
# - AZURE_OPENAI_API_KEY
```

### Error: "Database connection failed"

**Solución:**
```bash
# Verifica que en .env tienes:
# - DATABASE_URL (ej: postgresql://user:pass@localhost/contexta)

# Prueba la conexión directamente
python
>>> from models.database import engine
>>> engine.connect()
```

---

## 📊 Comparación: Antes vs Después

### Antes (Monolítico)
```python
# main.py (400 líneas)
# - Modelos de BD
# - Seguridad
# - Rutas API
# ❌ Todo mezclado

# rag_engine.py (260 líneas)
# - Índice
# - Extracción
# - Chunking
# - Embeddings
# - Retrieval
# - Generación
# ❌ Demasiada responsabilidad
```

### Después (Modularizado)
```python
# config.py (40 líneas)
# - Variables de entorno
# ✓ Centralizado

# models/database.py (90 líneas)
# - Modelos SQLAlchemy
# ✓ Separado

# models/index.py (50 líneas)
# - Gestión del índice
# ✓ Específico

# services/auth.py (70 líneas)
# - Seguridad JWT
# ✓ Aislado

# services/text_extractor.py (60 líneas)
# - Extracción de texto
# ✓ Reutilizable

# services/embeddings.py (80 líneas)
# - Chunking + embeddings
# ✓ Componible

# services/document_ingestion.py (40 líneas)
# - Orquestación
# ✓ Pipeline claro

# services/retrieval.py (50 líneas)
# - Búsqueda
# ✓ Independiente

# services/response_generation.py (100 líneas)
# - RAG completo
# ✓ Autoexplicativo

# services/vector_cleanup.py (60 líneas)
# - Limpieza
# ✓ Reutilizable

# main.py (250 líneas)
# - Solo rutas y coordinación
# ✓ Limpio y claro
```

**Beneficios:**
- 📈 Más fácil de navegar
- 🧪 Más fácil de testear
- 🐛 Errores localizados
- 🚀 Escalable
- 👥 Trabajo en equipo

---

## 📚 Documentación

Después de la migración, lee:
- `ARQUITECTURA_MODULARIZADA.md` - Documentación completa de módulos
- `backend/app/config.py` - Variables de configuración
- `backend/app/main.py` - Endpoints API (con docstrings)

---

## 🎯 Próximos Pasos (Opcional)

1. **Agregar tests unitarios**
   ```python
   # tests/test_text_extractor.py
   # tests/test_retrieval.py
   # etc.
   ```

2. **Agregar logging**
   ```python
   # Usar `logging` en lugar de `print()`
   ```

3. **Agregar validación de entrada**
   ```python
   # Usar Pydantic models más estrictos
   ```

4. **Agregar manejo de errores mejorado**
   ```python
   # Custom exceptions
   # Error handlers globales
   ```

---

## ✨ Resumen

| Aspecto | Antes | Después |
|--------|-------|---------|
| Archivos | 2 | 13 |
| Líneas por archivo | ~400, ~260 | ~50-100 |
| Responsabilidades por módulo | 5+ | 1 |
| Testabilidad | Baja | Alta |
| Mantenibilidad | Baja | Alta |
| Escalabilidad | Baja | Alta |
| Claridad del código | Media | Alta |

**Resultado: ✅ Backend profesional, moderno y escalable**

---

## 🆘 Soporte

Si tienes problemas:
1. Verifica que seguiste todos los pasos
2. Lee `ARQUITECTURA_MODULARIZADA.md`
3. Revisa los logs en la terminal
4. Verifica que todas las variables de entorno estén en `.env`

¡Éxito con la migración! 🚀
