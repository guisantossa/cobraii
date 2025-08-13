from typing import List
from uuid import UUID

from app.core.dependencies import get_current_user
from app.crud.lembretes import (
    atualizar_lembrete,
    criar_lembrete,
    inativar_lembrete,
    listar_lembretes,
    obter_lembrete,
    preview_execucoes,
)
from app.db.session import get_db
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.schemas.lembretes import (
    LembreteCreate,
    LembreteOut,
    LembreteUpdate,
    PreviewRequest,
    PreviewResponse,
)
from app.schemas.lembretes_ocorrencias import LembreteOcorrenciaOut
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session, selectinload

router = APIRouter(prefix="", tags=["Lembretes"])


@router.post("/", response_model=LembreteOut)
def create_lembrete(
    data: LembreteCreate,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return criar_lembrete(db, usuario.id, data)


@router.get("/", response_model=List[LembreteOut])
def list_lembretes(db: Session = Depends(get_db), usuario=Depends(get_current_user)):
    return listar_lembretes(db, usuario.id)


@router.get("/{lembrete_id}", response_model=LembreteOut)
def get_lembrete(
    lembrete_id: UUID, db: Session = Depends(get_db), usuario=Depends(get_current_user)
):
    lembrete = obter_lembrete(db, usuario.id, lembrete_id)
    if not lembrete:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")
    return lembrete


@router.put("/{lembrete_id}", response_model=LembreteOut)
def update_lembrete(
    lembrete_id: UUID,
    data: LembreteUpdate,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return atualizar_lembrete(db, usuario.id, lembrete_id, data)


@router.delete("/{lembrete_id}")
def delete_lembrete(
    lembrete_id: UUID, db: Session = Depends(get_db), usuario=Depends(get_current_user)
):
    inativar_lembrete(db, usuario.id, lembrete_id)
    return {"ok": True}


@router.post("/{lembrete_id}/preview", response_model=PreviewResponse)
def preview(
    lembrete_id: UUID,
    req: PreviewRequest,
    db: Session = Depends(get_db),
    usuario=Depends(get_current_user),
):
    return preview_execucoes(db, usuario.id, lembrete_id, req.limit)


@router.get("/{lembrete_id}/ocorrencias", response_model=list[LembreteOcorrenciaOut])
def listar_ocorrencias(
    lembrete_id: UUID,
    limit: int = Query(100, ge=1, le=500),
    db: Session = Depends(get_db),
):
    # (opcional) valida existência do lembrete
    existe = db.query(Lembrete.id).filter(Lembrete.id == lembrete_id).first()
    if not existe:
        raise HTTPException(404, "Lembrete não encontrado")

    ocorrencias = (
        db.query(LembreteOcorrencia)
        .filter(LembreteOcorrencia.lembrete_id == lembrete_id)
        .order_by(LembreteOcorrencia.scheduled_at.asc())
        .limit(limit)
        .all()
    )
    return ocorrencias


@router.get("/{lembrete_id}/grupo", response_model=list[LembreteOut])
def obter_grupo(
    lembrete_id: UUID,
    db: Session = Depends(get_db),
):
    base: Lembrete | None = (
        db.query(Lembrete)
        .options(selectinload(Lembrete.cliente))  # para trazer nome no JSON
        .filter(Lembrete.id == lembrete_id)
        .first()
    )
    if not base:
        raise HTTPException(404, "Lembrete não encontrado")

    is_periodico = bool(base.rrule)

    q = (
        db.query(Lembrete)
        .options(selectinload(Lembrete.cliente))
        .filter(
            Lembrete.cliente_id == base.cliente_id,
            Lembrete.titulo == base.titulo,
        )
    )

    if is_periodico:
        q = q.filter(Lembrete.rrule.isnot(None))
    else:
        q = q.filter(Lembrete.rrule.is_(None), Lembrete.fatura_id == base.fatura_id)

    # opcional: ordenar por canal para consistência na UI
    grupo = q.order_by(Lembrete.canal.asc()).all()
    return grupo
