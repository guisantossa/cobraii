from typing import List
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Cliente, Usuario
from app.schemas.clientes import ClienteCreate, ClienteOut
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


# POST /clientes/
@router.post("/", response_model=ClienteOut)
def criar_cliente(
    cliente: ClienteCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    novo_cliente = Cliente(
        usuario_id=usuario.id,
        nome=cliente.nome,
        email=cliente.email,
        telefone=cliente.telefone,
        documento=cliente.documento,
    )
    db.add(novo_cliente)
    db.commit()
    db.refresh(novo_cliente)
    return novo_cliente


# GET /clientes/
@router.get("/", response_model=List[ClienteOut])
def listar_clientes(
    db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
):
    return db.query(Cliente).filter(Cliente.usuario_id == usuario.id).all()


# GET /clientes/{id}
@router.get("/{id}", response_model=ClienteOut)
def obter_cliente(
    id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = (
        db.query(Cliente)
        .filter(Cliente.id == id, Cliente.usuario_id == usuario.id)
        .first()
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente


# PUT /clientes/{id}
@router.put("/{id}", response_model=ClienteOut)
def atualizar_cliente(
    id: UUID,
    dados: ClienteCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = (
        db.query(Cliente)
        .filter(Cliente.id == id, Cliente.usuario_id == usuario.id)
        .first()
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    cliente.nome = dados.nome
    cliente.email = dados.email
    cliente.telefone = dados.telefone
    cliente.documento = dados.documento

    db.commit()
    db.refresh(cliente)
    return cliente
