import os
import secrets
from datetime import datetime, timedelta

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from jose import jwt
from passlib.context import CryptContext

# Configs
SECRET_KEY = os.getenv("SECRET_KEY")
ALGORITHM = "HS256"
JWT_EXPIRE_HOURS = int(os.getenv("JWT_EXPIRE_HOURS", 5))

N8N_BASIC_USER = os.getenv("N8N_BASIC_USER")
N8N_BASIC_PASS = os.getenv("N8N_BASIC_PASS")

_security_basic = HTTPBasic(realm="lembretes-callback")


pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


def hash_password(password: str):
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str):
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(data: dict, expires_delta: timedelta = None):
    to_encode = data.copy()
    expire = datetime.utcnow() + (expires_delta or timedelta(hours=JWT_EXPIRE_HOURS))
    to_encode.update({"exp": expire})
    return jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)


def require_callback_basic(
    credentials: HTTPBasicCredentials = Depends(_security_basic),
) -> None:
    """
    Autenticação HTTP Basic para callbacks do n8n.
    Lança 401 se usuário/senha não conferirem.
    """
    ok_user = secrets.compare_digest(credentials.username, N8N_BASIC_USER)
    ok_pass = secrets.compare_digest(credentials.password, N8N_BASIC_PASS)
    if not (ok_user and ok_pass):
        # WWW-Authenticate força o n8n/cliente a enviar credenciais
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Unauthorized - teste",
            headers={"WWW-Authenticate": 'Basic realm="lembretes-callback"'},
        )
