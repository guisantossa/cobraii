# app/scheduler/jobs.py
import logging
from datetime import datetime
from zoneinfo import ZoneInfo

from app.crud.faturas import marcar_faturas_atrasadas
from app.db.session import SessionLocal

log = logging.getLogger(__name__)
TZ = ZoneInfo("America/Sao_Paulo")


def job_marcar_faturas_atrasadas() -> None:
    """
    Marca como 'atrasado' todas as faturas 'pendente' com vencimento < hoje.
    Roda 1x/dia via APScheduler.
    """
    db = SessionLocal()
    try:
        afetadas = marcar_faturas_atrasadas(db)
        log.info(
            "job_marcar_faturas_atrasadas: %s faturas marcadas às %s",
            afetadas,
            datetime.now(TZ).isoformat(timespec="seconds"),
        )
    except Exception:
        log.exception("job_marcar_faturas_atrasadas: falha")
    finally:
        db.close()
