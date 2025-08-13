from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Usuario
from app.services import analytics as svc
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/analytics", tags=["Analytics"])


@router.get("/overview")
def overview(
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    ate: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return svc.overview(db, desde, ate)


@router.get("/envios-timeseries")
def envios_timeseries(
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    ate: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return svc.envios_timeseries(db, desde, ate)


@router.get("/faturas-status")
def faturas_status(
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    ate: str | None = Query(None, description="YYYY-MM-DD"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return svc.faturas_status_monthly(db, desde, ate)


@router.get("/conversao")
def conversao(
    desde: str | None = Query(None, description="YYYY-MM-DD"),
    ate: str | None = Query(None, description="YYYY-MM-DD"),
    janela_dias: int = Query(7, ge=1, le=60),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    return svc.conversao_envio_pagamento(db, desde, ate, janela_dias)
