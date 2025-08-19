from uuid import UUID

from app.core.dependencies import get_current_user, get_db
from app.crud.cobrancas import (
    create_cobranca,
    delete_cobranca,
    get_cobranca,
    list_cobrancas,
    update_cobranca,
)
from app.models.models import Usuario
from app.schemas.cobrancas import CobrancaCreate, CobrancaOut, CobrancaUpdate
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Cobranças"])


@router.get("/", response_model=list[CobrancaOut])
def listar(db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)):
    return list_cobrancas(db, usuario.id)


@router.get("/{cobranca_id}", response_model=CobrancaOut)
def obter(
    cobranca_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = get_cobranca(db, usuario.id, cobranca_id)

    if not obj:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    return obj


@router.post("/", response_model=CobrancaOut, status_code=201)
def criar(
    payload: CobrancaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return create_cobranca(db, usuario.id, payload)


@router.put("/{cobranca_id}", response_model=CobrancaOut)
def atualizar(
    cobranca_id: UUID,
    payload: CobrancaUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = update_cobranca(db, usuario.id, cobranca_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    return obj


@router.delete("/{cobranca_id}", status_code=204)
def excluir(
    cobranca_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ok = delete_cobranca(db, usuario.id, cobranca_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada")
    return
