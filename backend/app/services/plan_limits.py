# app/services/plan_limits.py
from app.models.enums import CanalLembreteEnum  # mesmo enum usado no model Lembrete
from app.models.lembretes import Lembrete
from app.models.models import Usuario
from app.models.planos import Plano
from fastapi import HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session


def _canon_canal(canal_in) -> str:
    """
    Normaliza o canal vindo do payload (str ou Enum) para 'whatsapp' | 'email' | 'sms'.
    """
    if isinstance(canal_in, CanalLembreteEnum):
        return canal_in.value.lower()
    return str(canal_in or "").strip().lower()


def _canal_permitido(plano: Plano, canal: str) -> bool:
    """
    Verifica se o plano permite o canal informado.
    """
    if canal == "whatsapp":
        return bool(plano.usa_zap)
    if canal == "email":
        return bool(plano.usa_email)
    if canal == "sms":
        return bool(plano.usa_sms)
    # canal desconhecido
    return False


def _qtd_lembretes_ativos(db: Session, usuario_id):
    """
    Conta lembretes 'ativos' do usuário.
    Definição fornecida: ativa=True (independente de status/rrule/proxima_execucao_at).
    """
    return (
        db.query(func.count(Lembrete.id))
        .filter(Lembrete.usuario_id == usuario_id)
        .filter(Lembrete.ativa.is_(True))
        .scalar()
    )


def assert_can_create_lembrete(db: Session, user: Usuario, canal_in) -> None:
    """
    - Garante que o canal é permitido pelo plano do usuário.
    - Garante que o usuário não excedeu o limite de lembretes ativos do plano.
    - Lança HTTPException (400/403) em caso de violação.
    """
    canal = _canon_canal(canal_in)

    # garante plano carregado
    plano = getattr(user, "plano", None)
    if plano is None:
        # fallback: carrega via join (se necessário)
        plano = (
            db.query(Plano)
            .join(Usuario, Usuario.plano_id == Plano.id)
            .filter(Usuario.id == user.id)
            .first()
        )

    if not plano:
        raise HTTPException(status_code=400, detail="Plano do usuário não definido.")

    # 1) Canal permitido
    if not _canal_permitido(plano, canal):
        raise HTTPException(
            status_code=403, detail=f"Canal '{canal}' não incluso no seu plano."
        )

    # 2) Limite de lembretes ativos
    if plano.limites is None:
        return  # ilimitado

    usados = _qtd_lembretes_ativos(db, user.id)
    if usados >= plano.limites:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de lembretes ativos atingido ({usados}/{plano.limites}).",
        )


def assert_can_activate_lembrete(
    db: Session, user: Usuario, canal_in, lembrete_id=None
) -> None:
    """
    Use quando for reativar um lembrete (ativa=False -> True) ou trocar o canal.
    Não conta o próprio lembrete se ele já está ativo (evita off-by-one em updates inócuos).
    """
    canal = _canon_canal(canal_in)

    plano = getattr(user, "plano", None)
    if plano is None:
        plano = (
            db.query(Plano)
            .join(Usuario, Usuario.plano_id == Plano.id)
            .filter(Usuario.id == user.id)
            .first()
        )

    if not plano:
        raise HTTPException(status_code=400, detail="Plano do usuário não definido.")

    if not _canal_permitido(plano, canal):
        raise HTTPException(
            status_code=403, detail=f"Canal '{canal}' não incluso no seu plano."
        )

    if plano.limites is None:
        return

    q = (
        db.query(func.count(Lembrete.id))
        .filter(Lembrete.usuario_id == user.id)
        .filter(Lembrete.ativa.is_(True))
    )
    if lembrete_id:
        q = q.filter(Lembrete.id != lembrete_id)

    usados = q.scalar()
    if usados >= plano.limites:
        raise HTTPException(
            status_code=403,
            detail=f"Limite de lembretes ativos atingido ({usados}/{plano.limites}).",
        )
