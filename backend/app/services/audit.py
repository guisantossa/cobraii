from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from typing import Optional
from uuid import UUID
from zoneinfo import ZoneInfo

from app.models.audit_logs import AuditLog
from app.models.cobrancas import Cobranca  # ajuste o import se o nome do módulo variar
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.models.models import Cliente, Usuario
from sqlalchemy import and_, exists, literal, or_
from sqlalchemy.orm import Session

TZ_LOCAL = ZoneInfo("America/Sao_Paulo")

# -------- período/TZ (igual padrão que alinhamos no analytics) --------


def _periodo_local(desde: Optional[str], ate: Optional[str]):
    now_local = datetime.now(TZ_LOCAL)
    if not desde or not ate:
        end_local = datetime.combine(now_local.date(), time.max, tzinfo=TZ_LOCAL)
        start_local = datetime.combine(
            (now_local.date() - timedelta(days=6)), time.min, tzinfo=TZ_LOCAL
        )
        return start_local, end_local

    d0 = datetime.fromisoformat(desde)
    d1 = datetime.fromisoformat(ate)

    if d0.tzinfo is None:
        d0 = datetime.combine(d0.date(), time.min, tzinfo=TZ_LOCAL)
    if d1.tzinfo is None:
        d1 = datetime.combine(d1.date(), time.max, tzinfo=TZ_LOCAL)

    if d0 > d1:
        d0, d1 = d1, d0
    return d0, d1


def _to_utc(dt_local: datetime) -> datetime:
    return dt_local.astimezone(timezone.utc)


def _periodo_utc(desde: Optional[str], ate: Optional[str]):
    sL, eL = _periodo_local(desde, ate)
    return _to_utc(sL), _to_utc(eL), sL, eL


def _periodo_payload(sL: datetime, eL: datetime) -> dict:
    return {"desde": sL.date().isoformat(), "ate": eL.date().isoformat()}


# -------- predicate: entidade pertence ao usuário --------


def _predicate_entidade_do_usuario(current_user_id, AuditLog):
    """
    Gera um OR de EXISTS por entidade conhecida, garantindo que o log
    só aparece se a entidade logada pertencer ao usuário.
    """
    preds = []

    # Fatura
    preds.append(
        exists().where(
            and_(
                AuditLog.entidade_tipo == literal("fatura"),
                Fatura.id == AuditLog.entidade_id,
                Fatura.usuario_id == current_user_id,
            )
        )
    )

    # Lembrete
    preds.append(
        exists().where(
            and_(
                AuditLog.entidade_tipo == literal("lembrete"),
                Lembrete.id == AuditLog.entidade_id,
                Lembrete.usuario_id == current_user_id,
            )
        )
    )

    # Cobranca
    preds.append(
        exists().where(
            and_(
                AuditLog.entidade_tipo == literal("cobranca"),
                Cobranca.id == AuditLog.entidade_id,
                Cobranca.usuario_id == current_user_id,
            )
        )
    )

    # Cliente
    preds.append(
        exists().where(
            and_(
                AuditLog.entidade_tipo == literal("cliente"),
                Cliente.id == AuditLog.entidade_id,
                Cliente.usuario_id == current_user_id,
            )
        )
    )

    # Se no futuro tiver outras entidades: adicione novos EXISTS aqui.

    # Se o log não referencia uma entidade (entidade_tipo/entidade_id nulos),
    # por segurança NÃO mostra (evita vazar logs globais).
    return or_(*preds) if preds else literal(False)


# -------- service --------


def list_audit_logs(
    db: Session,
    current_user: Usuario,
    *,
    entidade_tipo: Optional[str] = None,
    entidade_id: Optional[UUID] = None,
    acao: Optional[str] = None,
    usuario_id: Optional[
        UUID
    ] = None,  # ainda aceito, mas será ignorado salvo se admin (opcional)
    desde: Optional[str] = None,
    ate: Optional[str] = None,
    page: int = 1,
    page_size: int = 20,
    include_system: bool = True,
    scope: str = "actor",  # "actor" ou "all" — ambos ficam limitados ao TENANT do usuário
) -> dict:
    # período
    start_utc, end_utc, start_local, end_local = _periodo_utc(desde, ate)

    q = db.query(AuditLog)

    # período
    q = q.filter(AuditLog.criado_em.between(start_utc, end_utc))

    # filtros diretos
    if entidade_tipo:
        q = q.filter(AuditLog.entidade_tipo == entidade_tipo)
    if entidade_id:
        q = q.filter(AuditLog.entidade_id == entidade_id)
    if acao:
        q = q.filter(AuditLog.acao == acao)

    # ===== Escopo de TENANT =====
    # Sempre restringe aos logs do "meu espaço":
    # (1) ator sou eu
    # OR (2) entidade pertence a mim (inclui system e ações de outros)
    tenant_pred = or_(
        AuditLog.usuario_id == current_user.id,
        _predicate_entidade_do_usuario(current_user.id, AuditLog),
    )
    q = q.filter(tenant_pred)

    # include_system só afeta visual quando "actor": se quiser esconder system, filtra
    if scope == "actor" and not include_system:
        q = q.filter(AuditLog.usuario_id == current_user.id)

    # paginação/ordenação
    total = q.count()
    q = q.order_by(AuditLog.criado_em.desc(), AuditLog.id.desc())

    page = max(1, int(page))
    page_size = max(1, min(100, int(page_size)))
    items = q.offset((page - 1) * page_size).limit(page_size).all()

    return {
        "periodo": _periodo_payload(start_local, end_local),
        "scope": scope,
        "include_system": bool(include_system),
        "page": page,
        "page_size": page_size,
        "total": total,
        "items": [
            {
                "id": str(r.id),
                "usuario_id": str(r.usuario_id) if r.usuario_id else None,
                "entidade_tipo": r.entidade_tipo,
                "entidade_id": str(r.entidade_id) if r.entidade_id else None,
                "acao": r.acao,
                "detalhes": r.detalhes,
                "ip": r.ip,
                "user_agent": r.user_agent,
                "criado_em": r.criado_em.isoformat() if r.criado_em else None,
            }
            for r in items
        ],
    }
