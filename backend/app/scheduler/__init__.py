# app/scheduler/__init__.py
from __future__ import annotations

import logging
import os

# from datetime import datetime
from typing import Optional

from app.db.session import SessionLocal  # ajuste se seu projeto usar outro nome
from app.scheduler.lembretes_tick import tick_scheduler
from apscheduler.executors.pool import ThreadPoolExecutor
from apscheduler.jobstores.memory import MemoryJobStore
from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

# Scheduler global do módulo
_scheduler: Optional[BackgroundScheduler] = None


def _get_scheduler() -> BackgroundScheduler:
    """
    Cria (se necessário) e retorna uma instância singleton do BackgroundScheduler.
    - JobStore em memória (suficiente para 1 instance).
    - Executor thread pool leve.
    """
    global _scheduler
    if _scheduler is not None:
        return _scheduler

    jobstores = {"default": MemoryJobStore()}
    executors = {
        "default": ThreadPoolExecutor(
            max_workers=int(os.getenv("SCHED_MAX_WORKERS", "4"))
        )
    }
    job_defaults = {
        "coalesce": True,  # se atrasar, roda uma vez consolidando
        "max_instances": 1,  # evita concorrência do mesmo job
        "misfire_grace_time": 30,
    }

    _scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone=os.getenv("APP_TZ", "America/Sao_Paulo"),
    )
    return _scheduler


def _tick_job():
    """
    Função chamada pelo APScheduler.
    Abre uma sessão DB, executa o tick e fecha a sessão (sempre).
    """
    db = SessionLocal()
    try:
        stats = tick_scheduler(db)
        logger.info("[LembretesTick] %s", stats)
    except Exception as e:
        logger.exception("Erro no tick_scheduler: %s", e)
    finally:
        db.close()


def start_scheduler(app):
    """
    Pluga o scheduler no ciclo de vida do FastAPI.
    Use no seu app.main:
        from app.scheduler import start_scheduler
        start_scheduler(app)
    """
    sched = _get_scheduler()
    interval_min = int(os.getenv("LEMBRETES_TICK_INTERVAL_MIN", "1"))

    def on_startup():
        # Evita job duplicado se hot-reload
        if not sched.get_jobs():
            sched.add_job(
                _tick_job,
                trigger="interval",
                minutes=interval_min,
                id="lembretes_tick",
                replace_existing=True,
            )
            logger.info("Job 'lembretes_tick' registrado (cada %s min).", interval_min)
        if not sched.running:
            sched.start()
            logger.info("Scheduler iniciado.")

    def on_shutdown():
        if sched and sched.running:
            sched.shutdown(wait=False)
            logger.info("Scheduler finalizado.")

    app.add_event_handler("startup", on_startup)
    app.add_event_handler("shutdown", on_shutdown)
