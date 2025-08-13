# app/services/lembretes.py
from datetime import datetime, time, timedelta
from typing import List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

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

    Args:
        rrule: string RRULE (ou None)
        fatura_id: UUID da fatura (ou None)
        offsets: lista de offsets (ou None)

    Raises:
        HTTPException(400): quando as combinações são inválidas.
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
    """
    Converte string "HH:MM" para `datetime.time`.

    Args:
        hhmm: string no formato "HH:MM" (24h) ou None.

    Returns:
        time ou None.

    Observações:
        - Não valida range; assume formato correto. Se quiser endurecer, adicione validação.
    """
    if not hhmm:
        return None
    h, m = hhmm.split(":")
    return time(int(h), int(m))


def expand_rrule(lembrete: Lembrete, limit: int) -> List[datetime]:
    """
    Expande as próximas N execuções a partir de uma RRULE.

    Pré-requisitos:
        - `lembrete.rrule` e `lembrete.dtstart` devem estar definidos.

    Args:
        lembrete: instância de Lembrete contendo `rrule`, `dtstart`, `tz`.
        limit: máximo de instâncias a retornar.

    Returns:
        Lista de `datetime` timezone-aware, ordenados, até `limit` itens.

    Observações:
        - Garante que os datetimes retornados estejam com timezone (ZoneInfo).
        - Se `dtstart` vier naive, forçamos o timezone do lembrete.
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

    Args:
        lembrete: instância de Lembrete contendo `offsets`, `tz` e, opcionalmente, `dtstart` (para hora default).
        vencimento: datetime base (timezone-aware) do vencimento da fatura.
        status_pago: True se a fatura já estiver paga (usado para condicao "se_nao_cumprido").
        limit: máximo de instâncias a retornar.

    Returns:
        Lista de tuplas `(scheduled_at, "offset")`, ordenada e limitada.

    Regras:
        - Cada item de `offsets` deve ter:
            * when: "before" | "after"
            * days: int >= 0
            * hora: "HH:MM" (opcional) → caso ausente, usa hora de dtstart; se ausente também, usa 09:00.
            * condicao: "sempre" | "se_nao_cumprido" (opcional; default: lembrete.condicao)
        - Se condicao == "se_nao_cumprido" e `status_pago` for True, a execução é descartada.
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
# CRUD + Preview
# =========================


def criar_lembrete(db: Session, usuario_id: UUID, data: LembreteCreate) -> Lembrete:
    """
    Cria um Lembrete assegurando a exclusividade de tipo (RRULE xor Fatura+Offsets).

    Args:
        db: sessão SQLAlchemy
        usuario_id: dono do lembrete
        data: payload validado (LembreteCreate)

    Returns:
        Lembrete recém-criado (com id).
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
    db.commit()
    db.refresh(lembrete)
    return lembrete


def listar_lembretes(db: Session, usuario_id: UUID) -> List[Lembrete]:
    """
    Lista lembretes do usuário logado (ordenados do mais novo para o mais antigo).

    Args:
        db: sessão SQLAlchemy
        usuario_id: dono dos lembretes

    Returns:
        Lista de Lembrete.
    """
    return (
        db.query(Lembrete)
        .filter(Lembrete.usuario_id == usuario_id)
        .order_by(Lembrete.created_at.desc())
        .all()
    )


def obter_lembrete(
    db: Session, usuario_id: UUID, lembrete_id: UUID
) -> Optional[Lembrete]:
    """
    Recupera um Lembrete do usuário por id.

    Args:
        db: sessão
        usuario_id: dono
        lembrete_id: id do lembrete

    Returns:
        Lembrete ou None.
    """
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

    Estratégia:
        - Carrega o lembrete.
        - Determina o estado "final" (considerando valores existentes + parciais do update).
        - Valida exclusividade RRULE xor Fatura+Offsets.
        - Persiste mudanças.

    Args:
        db: sessão SQLAlchemy
        usuario_id: dono do lembrete
        lembrete_id: id do lembrete
        data: payload parcial (LembreteUpdate)

    Returns:
        Lembrete atualizado.

    Raises:
        HTTPException(404): se não encontrar o lembrete.
        HTTPException(400): se violar exclusividade.
    """
    lembrete = obter_lembrete(db, usuario_id, lembrete_id)
    if not lembrete:
        raise HTTPException(404, "Lembrete não encontrado")

    # Aplica validação de exclusividade com visão de "estado final"
    rrule_final = data.rrule if data.rrule is not None else lembrete.rrule
    fatura_id_final = (
        data.fatura_id if data.fatura_id is not None else lembrete.fatura_id
    )
    offsets_final = data.offsets if data.offsets is not None else lembrete.offsets

    _assert_exclusividade(rrule_final, fatura_id_final, offsets_final)

    # Aplica alterações
    for field, value in data.model_dump(exclude_unset=True).items():
        if field == "offsets" and value is not None:
            # pode vir como lista de modelos pydantic; normaliza para dict
            normalized = [
                o.model_dump() if hasattr(o, "model_dump") else o for o in value
            ]
            setattr(lembrete, field, normalized)
        else:
            setattr(lembrete, field, value)

    db.add(lembrete)
    db.commit()
    db.refresh(lembrete)
    return lembrete


def inativar_lembrete(db: Session, usuario_id: UUID, lembrete_id: UUID) -> None:
    """
    Inativa (soft delete) um Lembrete do usuário.

    Args:
        db: sessão
        usuario_id: dono
        lembrete_id: id do lembrete

    Raises:
        HTTPException(404): se não encontrar o lembrete.
    """
    lembrete = obter_lembrete(db, usuario_id, lembrete_id)
    if not lembrete:
        raise HTTPException(404, "Lembrete não encontrado")

    lembrete.ativa = False
    db.add(lembrete)
    db.commit()


def preview_execucoes(
    db: Session, usuario_id: UUID, lembrete_id: UUID, limit: int
) -> PreviewResponse:
    """
    Gera uma prévia das próximas execuções de um Lembrete.

    - Se for **Periódico (RRULE)**:
        * Expande as próximas `limit` datas pela RRULE.
    - Se for **de Fatura (OFFSETS)**:
        * Busca a Fatura real (do mesmo usuário), pega `vencimento` e `status`.
        * Constrói o `vencimento` como datetime (com TZ).
        * Aplica offsets considerando condição "se_nao_cumprido".

    Args:
        db: sessão SQLAlchemy
        usuario_id: dono do lembrete
        lembrete_id: id do lembrete
        limit: máximo de execuções a retornar

    Returns:
        PreviewResponse(execucoes=[{scheduled_at, origem, motivo_skip?}, ...])

    Raises:
        HTTPException(404): se não encontrar o lembrete.
        HTTPException(400): se Fatura não for encontrada (quando exigida).
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
