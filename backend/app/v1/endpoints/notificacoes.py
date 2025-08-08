from datetime import datetime
from typing import List
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Cobranca, Notificacao, Usuario
from app.schemas.notificacao import (
    CanalEnvioEnum,
    NotificacaoOut,
    StatusNotificacaoEnum,
)
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/", status_code=201)
def registrar_notificacao(
    cobranca_id: UUID,
    canal: CanalEnvioEnum,
    status: StatusNotificacaoEnum,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == cobranca_id, Cobranca.usuario_id == usuario.id)
        .first()
    )

    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")

    tentativa = (
        db.query(Notificacao).filter(Notificacao.cobranca_id == cobranca.id).count() + 1
    )

    nova_notificacao = Notificacao(
        cobranca_id=cobranca.id,
        canal=canal,
        status=status,
        enviado_em=datetime.now(),
        tentativa=tentativa,
    )

    db.add(nova_notificacao)
    db.commit()
    return {"message": "Notificação registrada."}


@router.get("/{cobranca_id}", response_model=List[NotificacaoOut])
def listar_notificacoes(
    cobranca_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == cobranca_id, Cobranca.usuario_id == usuario.id)
        .first()
    )

    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")

    return db.query(Notificacao).filter(Notificacao.cobranca_id == cobranca.id).all()
