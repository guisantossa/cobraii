# app/api/v1/routers/admin_lembretes.py
from app.core.dependencies import (  # se quiser restringir a admins, ajuste aqui
    get_current_user,
)
from app.db.session import get_db
from app.scheduler.lembretes_tick import tick_scheduler
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/admin/lembretes", tags=["Admin Lembretes"])


@router.post("/tick")
def run_tick_manual(db: Session = Depends(get_db), _user=Depends(get_current_user)):
    """
    Roda o tick do scheduler manualmente e retorna as métricas do ciclo.
    Recomendado para DEV/HOMOLOG ao ajustar regras, sem esperar o intervalo.
    """
    stats = tick_scheduler(db)
    return {"ok": True, "stats": stats}
