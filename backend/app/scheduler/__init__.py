# app/scheduler/__init__.py

"""
Scheduler bootstrap para lembretes/cobranças.

Responsabilidades:
- Criar um singleton do APScheduler (BackgroundScheduler).
- Registrar o job periódico que aciona `tick_scheduler`.
- Integrar ciclo de vida ao FastAPI (startup/shutdown).

Variáveis de ambiente relevantes:
- SCHED_MAX_WORKERS: int, threads do executor (default: 4).
- APP_TZ: str, timezone IANA (default: America/Sao_Paulo).
- LEMBRETES_TICK_INTERVAL_MIN: int, minutos entre ticks (default: 1).
"""

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
    """Retorna uma instância singleton de BackgroundScheduler.

    Cria o scheduler caso ainda não exista, com:
      - JobStore: memória (adequado a 1 instância do app).
      - Executor: ThreadPoolExecutor leve.
      - Defaults: coalesce, max_instances, misfire_grace_time.

    Returns:
        BackgroundScheduler: Instância única compartilhada no processo.
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
        "max_instances": 2,  # evita concorrência do mesmo job
        "misfire_grace_time": 30,  # tolerância a "atraso" do agendador
    }

    _scheduler = BackgroundScheduler(
        jobstores=jobstores,
        executors=executors,
        job_defaults=job_defaults,
        timezone=os.getenv("APP_TZ", "America/Sao_Paulo"),
    )
    return _scheduler


def _tick_job():
    """Job invocado pelo APScheduler.

    Abre uma sessão DB, executa `tick_scheduler` e garante fechamento.

    Efeitos colaterais:
        - Logs de métricas do ciclo.
        - Persistência de mudanças em ocorrências/lembretes.
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
    """Conecta o scheduler ao ciclo de vida FastAPI.

    Registra o job `lembretes_tick` com intervalo em minutos, inicia o
    scheduler no startup e finaliza no shutdown.

    Exemplo (app/main.py):
        from app.scheduler import start_scheduler
        start_scheduler(app)

    Args:
        app (FastAPI): Instância do seu aplicativo FastAPI.
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
