# app/services/lembretes.py
from datetime import date, datetime, time, timedelta
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

from app.audit.diff import diff_simple, obj_snapshot
from app.audit.logger import audit_log
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.schemas.lembretes import LembreteCreate, LembreteUpdate, PreviewResponse
from dateutil.rrule import rrulestr
from fastapi import HTTPException
from sqlalchemy.orm import Session

# =========================
# Helpers de regra
# =========================


def _assert_exclusividade(
    rrule: Optional[str], fatura_id: Optional[UUID], offsets: Optional[list]
) -> None:
    """
    Garante a regra de negócio de exclusividade entre os dois tipos de lembrete.

    - Lembrete Periódico (RRULE):
        * Obrigatório ter `rrule` (e `dtstart` no objeto) e NÃO pode ter `fatura_id` nem `offsets`.
    - Lembrete de Fatura (OFFSETS):
        * Obrigatório ter `fatura_id` E `offsets` e NÃO pode ter `rrule`.
    """
    has_rrule = rrule is not None
    has_fatura = fatura_id is not None
    has_offsets = offsets is not None and len(offsets) > 0

    if has_rrule and (has_fatura or has_offsets):
        raise HTTPException(400, "RRULE não pode coexistir com fatura/offsets.")
    if not has_rrule and not (has_fatura and has_offsets):
        raise HTTPException(
            400, "Lembrete de fatura exige fatura_id e offsets (sem RRULE)."
        )


def _hhmm_to_time(hhmm: Optional[str]) -> Optional[time]:
    """Converte string 'HH:MM' para `datetime.time` (24h)."""
    if not hhmm:
        return None
    h, m = hhmm.split(":")
    return time(int(h), int(m))


def _tipo_lembrete(rrule: Optional[str], fatura_id: Optional[UUID]) -> str:
    return "periodico" if rrule else "fatura" if fatura_id else "desconhecido"


def _jsonify(o):
    """Converte recursivamente objetos não-JSON (datetime/date/UUID) para formatos serializáveis."""
    if isinstance(o, (datetime, date)):
        return o.isoformat()
    if isinstance(o, UUID):
        return str(o)
    if isinstance(o, dict):
        return {k: _jsonify(v) for k, v in o.items()}
    if isinstance(o, list):
        return [_jsonify(v) for v in o]
    if isinstance(o, tuple):
        return tuple(_jsonify(v) for v in o)
    return o


def expand_rrule(lembrete: Lembrete, limit: int) -> List[datetime]:
    """
    Expande as próximas N execuções a partir de uma RRULE.
    Pré-requisitos: `lembrete.rrule` e `lembrete.dtstart`.
    """
    if not lembrete.rrule or not lembrete.dtstart:
        return []

    tz = ZoneInfo(lembrete.tz or "America/Sao_Paulo")

    # Garante dtstart com timezone coerente
    dtstart = lembrete.dtstart
    if dtstart.tzinfo is None:
        dtstart = dtstart.replace(tzinfo=tz)
    else:
        dtstart = dtstart.astimezone(tz)

    rule = rrulestr(lembrete.rrule, dtstart=dtstart)
    times = list(rule[:limit])

    # Garante tz em cada elemento
    fixed = []
    for dt in times:
        if dt.tzinfo is None:
            fixed.append(dt.replace(tzinfo=tz))
        else:
            fixed.append(dt.astimezone(tz))
    return fixed


def expand_offsets(
    lembrete: Lembrete, vencimento: datetime, status_pago: bool, limit: int
) -> List[Tuple[datetime, str]]:
    """
    Expande execuções a partir de OFFSETS relativos ao `vencimento` (somente lembretes de Fatura).
    Retorna lista de tuplas (scheduled_at, "offset").
    """
    tz = ZoneInfo(lembrete.tz or "America/Sao_Paulo")
    execucoes: List[Tuple[datetime, str]] = []

    for item in lembrete.offsets or []:
        cond = item.get("condicao") or lembrete.condicao
        if cond == "se_nao_cumprido" and status_pago:
            # pula se já pago
            continue

        days = int(item["days"])
        base = vencimento
        if item["when"] == "before":
            base = vencimento - timedelta(days=days)
        elif item["when"] == "after":
            base = vencimento + timedelta(days=days)

        hora = _hhmm_to_time(item.get("hora"))
        if hora:
            scheduled = datetime.combine(base.date(), hora, tz)
        else:
            # se não há hora no item, usa hora de dtstart; se não houver, usa 09:00
            default_hora = lembrete.dtstart.timetz() if lembrete.dtstart else time(9, 0)
            scheduled = datetime.combine(base.date(), default_hora, tz)

        execucoes.append((scheduled, "offset"))

    execucoes.sort(key=lambda x: x[0])
    return execucoes[:limit]


# =========================
# CRUD + Preview (com auditoria)
# =========================


def criar_lembrete(db: Session, usuario_id: UUID, data: LembreteCreate) -> Lembrete:
    """
    Cria um Lembrete assegurando a exclusividade de tipo (RRULE xor Fatura+Offsets).
    Faz auditoria 'create' no mesmo commit.
    """
    _assert_exclusividade(data.rrule, data.fatura_id, data.offsets)

    lembrete = Lembrete(
        usuario_id=usuario_id,
        cliente_id=data.cliente_id,
        fatura_id=data.fatura_id,
        titulo=data.titulo,
        corpo=data.corpo,
        canal=data.canal,
        event_date=data.event_date,
        rrule=data.rrule,
        dtstart=data.dtstart,
        tz=data.tz or "America/Sao_Paulo",
        offsets=(
            [o.model_dump() for o in (data.offsets or [])] if data.offsets else None
        ),
        condicao=data.condicao,
        meta=data.meta,
        ativa=data.ativa,
    )
    db.add(lembrete)
    db.flush()  # garante ID para o log

    detalhes = _jsonify(
        {
            "tipo": _tipo_lembrete(lembrete.rrule, lembrete.fatura_id),
            "cliente_id": lembrete.cliente_id,
            "fatura_id": lembrete.fatura_id,
            "canal": lembrete.canal,
            "rrule": lembrete.rrule,
            "dtstart": lembrete.dtstart,
            "offsets_len": len(lembrete.offsets or []),
            "ativa": lembrete.ativa,
        }
    )
    audit_log(db, "lembrete", lembrete.id, "create", detalhes)

    db.commit()
    db.refresh(lembrete)
    return lembrete


def listar_lembretes(db: Session, usuario_id: UUID) -> List[Lembrete]:
    """Lista lembretes do usuário logado (mais novo → mais antigo)."""
    return (
        db.query(Lembrete)
        .filter(Lembrete.usuario_id == usuario_id)
        .order_by(Lembrete.created_at.desc())
        .all()
    )


def obter_lembrete(
    db: Session, usuario_id: UUID, lembrete_id: UUID
) -> Optional[Lembrete]:
    """Recupera um Lembrete do usuário por id."""
    return (
        db.query(Lembrete)
        .filter(Lembrete.usuario_id == usuario_id, Lembrete.id == lembrete_id)
        .first()
    )


def atualizar_lembrete(
    db: Session, usuario_id: UUID, lembrete_id: UUID, data: LembreteUpdate
) -> Lembrete:
    """
    Atualiza campos de um Lembrete, reforçando a exclusividade de tipo.
    Faz auditoria 'update' com diff no mesmo commit.
    """
    lembrete = obter_lembrete(db, usuario_id, lembrete_id)
    if not lembrete:
        raise HTTPException(404, "Lembrete não encontrado")

    # snapshot antes
    antes = obj_snapshot(
        lembrete,
        [
            "cliente_id",
            "fatura_id",
            "titulo",
            "corpo",
            "canal",
            "event_date",
            "rrule",
            "dtstart",
            "tz",
            "offsets",
            "condicao",
            "meta",
            "ativa",
        ],
    )

    # Validação de exclusividade com visão de "estado final"
    rrule_final = data.rrule if data.rrule is not None else lembrete.rrule
    fatura_id_final = (
        data.fatura_id if data.fatura_id is not None else lembrete.fatura_id
    )
    offsets_final = data.offsets if data.offsets is not None else lembrete.offsets
    _assert_exclusividade(rrule_final, fatura_id_final, offsets_final)

    # Aplica alterações
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "offsets" and value is not None:
            normalized = [
                o.model_dump() if hasattr(o, "model_dump") else o for o in value
            ]
            setattr(lembrete, field, normalized)
        else:
            setattr(lembrete, field, value)

    db.add(lembrete)
    db.flush()

    # snapshot depois + diff
    depois = obj_snapshot(
        lembrete,
        [
            "cliente_id",
            "fatura_id",
            "titulo",
            "corpo",
            "canal",
            "event_date",
            "rrule",
            "dtstart",
            "tz",
            "offsets",
            "condicao",
            "meta",
            "ativa",
        ],
    )
    diff = diff_simple(antes, depois)

    detalhes = _jsonify(
        {
            "tipo": _tipo_lembrete(lembrete.rrule, lembrete.fatura_id),
            "diff": diff,
        }
    )
    audit_log(db, "lembrete", lembrete.id, "update", detalhes)

    db.commit()
    db.refresh(lembrete)
    return lembrete


def inativar_lembrete(db: Session, usuario_id: UUID, lembrete_id: UUID) -> None:
    """
    Inativa (soft delete) um Lembrete do usuário.
    Faz auditoria 'inactivate' no mesmo commit.
    """
    lembrete = obter_lembrete(db, usuario_id, lembrete_id)
    if not lembrete:
        raise HTTPException(404, "Lembrete não encontrado")

    antes = obj_snapshot(lembrete, ["ativa"])
    lembrete.ativa = False
    db.add(lembrete)
    db.flush()
    depois = obj_snapshot(lembrete, ["ativa"])

    detalhes = _jsonify(
        {
            "tipo": _tipo_lembrete(lembrete.rrule, lembrete.fatura_id),
            "diff": diff_simple(antes, depois),
        }
    )
    audit_log(db, "lembrete", lembrete.id, "inactivate", detalhes)

    db.commit()


def preview_execucoes(
    db: Session, usuario_id: UUID, lembrete_id: UUID, limit: int
) -> PreviewResponse:
    """
    Gera uma prévia das próximas execuções de um Lembrete (sem auditoria).
    """
    lembrete = obter_lembrete(db, usuario_id, lembrete_id)
    if not lembrete:
        raise HTTPException(404, "Lembrete não encontrado")

    execucoes = []

    if lembrete.rrule:
        # Periódico
        for dt in expand_rrule(lembrete, limit):
            execucoes.append(
                {"scheduled_at": dt, "origem": "rrule", "motivo_skip": None}
            )
    else:
        # De Fatura (usa offsets)
        if not lembrete.fatura_id:
            raise HTTPException(400, "Lembrete de fatura precisa de fatura_id.")

        fatura: Optional[Fatura] = (
            db.query(Fatura)
            .filter(Fatura.id == lembrete.fatura_id, Fatura.usuario_id == usuario_id)
            .first()
        )
        if not fatura:
            raise HTTPException(400, "Fatura não encontrada.")

        tz = ZoneInfo(lembrete.tz or "America/Sao_Paulo")
        # Combina DATE de vencimento com hora default (usa 09:00, ou hora do primeiro offset se quiser)
        default_hora = lembrete.dtstart.timetz() if lembrete.dtstart else time(9, 0)
        vencimento_dt = datetime.combine(fatura.vencimento, default_hora, tz)

        status_pago = fatura.status == FaturaStatusEnum.pago

        execucoes_of = expand_offsets(lembrete, vencimento_dt, status_pago, limit)
        for dt, _ in execucoes_of:
            execucoes.append(
                {"scheduled_at": dt, "origem": "offset", "motivo_skip": None}
            )

    execucoes.sort(key=lambda x: x["scheduled_at"])
    execucoes = execucoes[:limit]
    return PreviewResponse(execucoes=execucoes)
