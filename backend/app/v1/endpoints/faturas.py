from datetime import date
from uuid import UUID

from app.core.dependencies import get_current_user, get_db
from app.crud.faturas import (
    create_fatura,
    delete_fatura,
    get_fatura,
    list_faturas,
    marcar_fatura_paga,
    update_fatura,
)
from app.models.enums import FaturaStatusEnum
from app.models.models import Usuario
from app.schemas.faturas import FaturaCreate, FaturaOut, FaturaUpdate
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Faturas"])


@router.get("/", response_model=list[FaturaOut])
def listar(
    cobranca_id: UUID | None = Query(default=None),
    status: FaturaStatusEnum | None = Query(default=None),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return list_faturas(db, usuario.id, cobranca_id=cobranca_id, status=status)


@router.get("/{fatura_id}", response_model=FaturaOut)
def obter(
    fatura_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = get_fatura(db, usuario.id, fatura_id)
    if not obj:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    return obj


@router.post("/", response_model=FaturaOut, status_code=201)
def criar(
    payload: FaturaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    # força usuario_id do payload ser o do token
    payload.usuario_id = usuario.id
    obj = create_fatura(db, usuario.id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Cobrança inválida para o usuário")
    return obj


@router.put("/{fatura_id}", response_model=FaturaOut)
def atualizar(
    fatura_id: UUID,
    payload: FaturaUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = update_fatura(db, usuario.id, fatura_id, payload)
    if not obj:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    return obj


@router.delete("/{fatura_id}", status_code=204)
def excluir(
    fatura_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ok = delete_fatura(db, usuario.id, fatura_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    return


@router.patch("/{fatura_id}/marcar-paga", response_model=FaturaOut)
def marcar_paga(
    fatura_id: UUID,
    data_pagamento: date,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = marcar_fatura_paga(db, usuario.id, fatura_id, data_pagamento)
    if not obj:
        raise HTTPException(status_code=404, detail="Fatura não encontrada")
    return obj
