from typing import List
from uuid import UUID

from app.core.dependencies import get_current_user
from app.crud.clientes import create_cliente, get_cliente, list_clientes
from app.crud.clientes import (
    update_cliente as svc_update_cliente,  # delete_cliente as svc_delete_cliente,  # opcional
)
from app.db.session import get_db
from app.models.models import Usuario
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
    return create_cliente(db, usuario.id, cliente)


# GET /clientes/
@router.get("/", response_model=List[ClienteOut])
def listar_clientes_endpoint(
    db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
):
    return list_clientes(db, usuario.id)


# GET /clientes/{id}
@router.get("/{id}", response_model=ClienteOut)
def obter_cliente_endpoint(
    id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = get_cliente(db, usuario.id, id)
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
    cliente = svc_update_cliente(db, usuario.id, id, dados)
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")
    return cliente


# DELETE /clientes/{id}  (opcional — só expor quando quiser no front)
# @router.delete("/{id}", status_code=204)
# def remover_cliente(
#     id: UUID,
#     db: Session = Depends(get_db),
#     usuario: Usuario = Depends(get_current_user),
# ):
#     ok = svc_delete_cliente(db, usuario.id, id)
#     if not ok:
#         raise HTTPException(status_code=404, detail="Cliente não encontrado.")
#     return Response(status_code=204)
