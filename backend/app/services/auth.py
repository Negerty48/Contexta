"""
Manejo de autenticación y seguridad.
JWT, hashing de contraseñas y validación de usuarios.
"""

from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import jwt, JWTError
import bcrypt
from config import SECRET_KEY, ALGORITHM, ACCESS_TOKEN_EXPIRE_MINUTES


# ========== ESQUEMA DE SEGURIDAD ==========
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/token")


# ========== FUNCIONES DE CONTRASEÑA ==========
def get_password_hash(password: str) -> str:
    """
    Hash una contraseña usando bcrypt.
    
    Args:
        password: Contraseña en texto plano
    
    Returns:
        Contraseña hasheada
    """
    return bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """
    Verifica una contraseña contra su hash bcrypt.
    
    Args:
        plain_password: Contraseña en texto plano
        hashed_password: Hash bcrypt para comparar
    
    Returns:
        True si coinciden, False en caso contrario
    """
    return bcrypt.checkpw(plain_password.encode('utf-8'), hashed_password.encode('utf-8'))


# ========== MANEJO DE TOKENS JWT ==========
def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
    """
    Crea un token JWT firmado.
    
    Args:
        data: Diccionario con datos a codificar (ej: {"sub": email, "id": user_id})
        expires_delta: Tiempo de expiración (default: ACCESS_TOKEN_EXPIRE_MINUTES)
    
    Returns:
        Token JWT firmado
    """
    to_encode = data.copy()
    
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def get_current_user_id(token: str = Depends(oauth2_scheme)) -> str:
    """
    Extrae el user_id de un token JWT válido.
    Úsalo como dependency en endpoints protegidos:
    
    @app.get("/mi-endpoint")
    def mi_endpoint(user_id: str = Depends(get_current_user_id)):
        ...
    
    Args:
        token: Token JWT proporcionado en Authorization header
    
    Returns:
        ID del usuario
    
    Raises:
        HTTPException: Si el token es inválido o expirado
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id: str = payload.get("id")
        if user_id is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    return user_id


def get_current_user_email(token: str = Depends(oauth2_scheme)) -> str:
    """
    Extrae el email de un token JWT válido.
    
    Args:
        token: Token JWT
    
    Returns:
        Email del usuario
    
    Raises:
        HTTPException: Si el token es inválido
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Credenciales inválidas",
    )
    
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    return email
