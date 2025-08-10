from __future__ import annotations

from datetime import datetime, time
from typing import List, Optional

from dateutil.rrule import rrulestr
from dateutil.tz import gettz


class RRuleError(Exception):
    pass


def parse_timezone(tz: str | None) -> object:
    tzname = tz or "America/Sao_Paulo"
    tzinfo = gettz(tzname)
    if tzinfo is None:
        raise RRuleError(f"Timezone inválido: {tzname}")
    return tzinfo


def normalize_dt(dt: datetime, tzname: str | None) -> datetime:
    tzinfo = parse_timezone(tzname)
    if dt.tzinfo is None:
        # assume local-naquele-tz
        return dt.replace(tzinfo=tzinfo)
    return dt.astimezone(tzinfo)


def validate_rrule(
    rrule_text: str, dt_start: datetime, tzname: str | None = None
) -> None:
    """
    Valida se RRULE é parseável e se gera ao menos 1 ocorrência futura.
    """
    try:
        tzinfo = parse_timezone(tzname)
        dt_start = normalize_dt(dt_start, tzname)
        rule = rrulestr(rrule_text, dtstart=dt_start)
        nxt = rule.after(datetime.now(tzinfo), inc=True)
        if not nxt:
            raise RRuleError("RRULE_NO_OCCURRENCES: não há ocorrências futuras.")
    except Exception as e:
        raise RRuleError(f"RRULE_INVALID: {e}")


def next_occurrences(
    rrule_text: str, dt_start: datetime, tzname: str | None = None, limit: int = 10
) -> List[datetime]:
    tzinfo = parse_timezone(tzname)
    dt_start = normalize_dt(dt_start, tzname)
    try:
        rule = rrulestr(rrule_text, dtstart=dt_start)
    except Exception as e:
        raise RRuleError(f"RRULE_INVALID: {e}")

    now_tz = datetime.now(tzinfo)
    occs: List[datetime] = []
    cursor = rule.after(now_tz, inc=True)
    while cursor and len(occs) < limit:
        occs.append(cursor.astimezone(tzinfo))
        cursor = rule.after(cursor, inc=False)
    return occs


def within_quiet_hours(
    dt: datetime, start: Optional[time], end: Optional[time], tzname: str | None = None
) -> bool:
    """Retorna True se dt cair dentro da janela silenciosa (suporta janela que vira o dia)."""
    if not start or not end:
        return False
    local_dt = normalize_dt(dt, tzname)
    t = local_dt.timetz().replace(tzinfo=None)
    if start <= end:
        return start <= t <= end
    # janela cruza meia-noite
    return t >= start or t <= end
