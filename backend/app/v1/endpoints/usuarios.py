from app.core.dependencies import get_current_user
from app.core.security import create_access_token, hash_password, verify_password
from app.db.session import get_db
from app.models.models import Usuario
from app.schemas.token import Token
from app.schemas.usuarios import UsuarioCreate, UsuarioOut
from fastapi import APIRouter, Depends, HTTPException
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/", response_model=UsuarioOut)
def criar_usuario(usuario: UsuarioCreate, db: Session = Depends(get_db)):
    if db.query(Usuario).filter(Usuario.email == usuario.email).first():
        raise HTTPException(status_code=400, detail="Email já cadastrado.")
    if db.query(Usuario).filter(Usuario.documento == usuario.documento).first():
        raise HTTPException(status_code=400, detail="Documento já cadastrado.")

    novo_usuario = Usuario(
        nome=usuario.nome,
        email=usuario.email,
        telefone=usuario.telefone,
        tipo_usuario=usuario.tipo_usuario,
        documento=usuario.documento,
        banco=usuario.banco,
        conta=usuario.conta,
        chave_pix=usuario.chave_pix,
        senha_hash=hash_password(usuario.senha),
    )
    db.add(novo_usuario)
    db.commit()
    db.refresh(novo_usuario)
    return novo_usuario


@router.post("/login", response_model=Token, tags=["Auth"])
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = db.query(Usuario).filter(Usuario.email == form_data.username).first()

    if not user or not verify_password(form_data.password, user.senha_hash):
        raise HTTPException(status_code=401, detail="Credenciais inválidas")

    token = create_access_token({"sub": str(user.id)})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UsuarioOut)
def perfil_usuario(user: Usuario = Depends(get_current_user)):
    return user
