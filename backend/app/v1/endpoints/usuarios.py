from app.core.dependencies import get_current_user
from app.core.security import create_access_token

# usa o CRUD separado
from app.crud.usuarios import authenticate_user, create_usuario
from app.db.session import get_db
from app.models.models import Usuario
from app.schemas.token import Token
from app.schemas.usuarios import UsuarioCreate, UsuarioOut
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/", response_model=UsuarioOut)
def criar_usuario_endpoint(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    return create_usuario(db, usuario)


@router.post("/login", response_model=Token, tags=["Auth"])
def login_endpoint(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)
    if not user:
        raise HTTPException(status_code=401, detail="Credenciais inválidas")
    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UsuarioOut)
def perfil_usuario(user: Usuario = Depends(get_current_user)):
    return user
