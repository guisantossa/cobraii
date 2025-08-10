from __future__ import annotations

from datetime import datetime, timedelta
from typing import Iterable

from app.models.enums import StatusOcorrenciaEnum
from app.models.lembretes import Lembrete, LembreteDestinatario, LembreteOcorrencia
from app.services.recurrence_service import (
    next_occurrences,
    normalize_dt,
    parse_timezone,
    within_quiet_hours,
)
from sqlalchemy.orm import Session

DEFAULT_HORIZON_DAYS = 14


class OccurrenceError(Exception):
    pass


def ensure_future_window(
    db: Session,
    lembrete: Lembrete,
    horizon_days: int = DEFAULT_HORIZON_DAYS,
    per_dest_limit: int = 50,
) -> int:
    """
    Gera ocorrências futuras (JIT) até um horizonte (ex.: 14 dias), para cada destinatário.
    - Não duplica instantes já existentes.
    - Respeita quiet hours marcando a ocorrência com status
        'skip_por_quiet_hours' (ou apenas não cria? v1: cria com status específico).
    Retorna a quantidade de ocorrências criadas.
    """
    if lembrete.estado not in ("agendado",):
        return 0

    tzname = lembrete.timezone or "America/Sao_Paulo"
    tzinfo = parse_timezone(tzname)

    now_tz = datetime.now(tzinfo)
    window_end = now_tz + timedelta(days=horizon_days)

    # Buscar datas futuras via RRULE (ou one-shot)
    instantes: list[datetime] = []
    if lembrete.recorrente and lembrete.rrule:
        instantes = next_occurrences(
            lembrete.rrule, lembrete.dt_inicio, tzname, limit=per_dest_limit * 2
        )
        # corta pelo horizonte
        instantes = [d for d in instantes if d <= window_end]
    else:
        # one-shot: só dt_inicio
        inst = normalize_dt(lembrete.dt_inicio, tzname)
        if inst >= now_tz and inst <= window_end:
            instantes = [inst]

    if not instantes:
        return 0

    # Para cada destinatário, crie ocorrências ausentes
    criadas = 0
    dests: Iterable[LembreteDestinatario] = lembrete.destinatarios

    # Cache de existentes por (dest_id, dt_programada)
    existentes = {
        (o.destinatario_id, o.dt_programada.replace(microsecond=0)): True
        for o in db.query(LembreteOcorrencia).filter(
            LembreteOcorrencia.lembrete_id == lembrete.id,
            LembreteOcorrencia.dt_programada >= now_tz - timedelta(days=1),
        )
    }

    for dest in dests:
        count_dest = 0
        for dt_inst in instantes:
            key = (dest.id, dt_inst.replace(microsecond=0))
            if key in existentes:
                continue
            status = StatusOcorrenciaEnum.enfileirado
            if within_quiet_hours(
                dt_inst, lembrete.quiet_hours_start, lembrete.quiet_hours_end, tzname
            ):
                status = StatusOcorrenciaEnum.skip_por_quiet_hours

            occ = LembreteOcorrencia(
                lembrete_id=lembrete.id,
                destinatario_id=dest.id,
                dt_programada=dt_inst,
                status=status,
            )
            db.add(occ)
            criadas += 1
            count_dest += 1
            if count_dest >= per_dest_limit:
                break

    db.flush()
    return criadas
