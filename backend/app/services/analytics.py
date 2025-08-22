from __future__ import annotations

from datetime import datetime, time, timedelta, timezone
from zoneinfo import ZoneInfo

from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.models.models import Cliente, Usuario
from sqlalchemy import case, func
from sqlalchemy.orm import Session

TZ_LOCAL = ZoneInfo("America/Sao_Paulo")

# --- Helpers de período -------------------------------------------------------


def _periodo_local(desde: str | None, ate: str | None) -> tuple[datetime, datetime]:
    """
    Constrói [start_local, end_local] (timezone America/Sao_Paulo)
    - se não vierem datas, assume últimos 30 dias (fechados) até o dia atual local.
    - start_local: 00:00:00, end_local: 23:59:59.999999
    """
    now_local = datetime.now(TZ_LOCAL)

    if not desde or not ate:
        end_local = datetime.combine(now_local.date(), time.max, tzinfo=TZ_LOCAL)
        start_local = end_local - timedelta(days=29)  # 30 dias incluindo hoje
        start_local = datetime.combine(start_local.date(), time.min, tzinfo=TZ_LOCAL)
        return start_local, end_local

    d0 = datetime.fromisoformat(desde).date()
    d1 = datetime.fromisoformat(ate).date()

    start_local = datetime.combine(d0, time.min, tzinfo=TZ_LOCAL)
    end_local = datetime.combine(d1, time.max, tzinfo=TZ_LOCAL)
    return start_local, end_local


def _local_to_utc(dt_local: datetime) -> datetime:
    """
    Converte datetime aware (America/Sao_Paulo) para UTC.
    """
    return dt_local.astimezone(timezone.utc)


def _periodo_utc(desde: str | None, ate: str | None) -> tuple[datetime, datetime]:
    """
    Período em UTC para colunas timestamp (ex.: enviado_at, delivered_at).
    """
    start_local, end_local = _periodo_local(desde, ate)
    return _local_to_utc(start_local), _local_to_utc(end_local)


def _periodo_payload(desde: datetime, ate: datetime) -> dict:
    """
    Normaliza o contrato de resposta do período sempre como datas (YYYY-MM-DD) em TZ local.
    """
    d0 = desde.astimezone(TZ_LOCAL).date().isoformat()
    d1 = ate.astimezone(TZ_LOCAL).date().isoformat()
    return {"desde": d0, "ate": d1}


# --- Endpoints de serviço -----------------------------------------------------


def overview(db: Session, usuario: Usuario, desde: str | None, ate: str | None):
    # Para DATEs (pagamento/vencimento) usamos o range em datas locais
    start_local, end_local = _periodo_local(desde, ate)
    d0, d1 = start_local.date(), end_local.date()

    # Para TIMESTAMPs (envios/entregas) usamos o range em UTC
    start_utc, end_utc = _periodo_utc(desde, ate)

    # Filtros por usuario_id
    uid = usuario.id

    clientes_total = (
        db.query(func.count(Cliente.id)).filter(Cliente.usuario_id == uid).scalar()
    )

    faturas_abertas = (
        db.query(func.count(Fatura.id))
        .filter(Fatura.usuario_id == uid)
        .filter(
            Fatura.status.in_([FaturaStatusEnum.pendente, FaturaStatusEnum.atrasado])
        )
        .scalar()
    )

    faturas_pagas = (
        db.query(func.count(Fatura.id))
        .filter(Fatura.usuario_id == uid)
        .filter(
            Fatura.status == FaturaStatusEnum.pago,
            Fatura.data_pagamento.between(d0, d1),
        )
        .scalar()
    )

    valor_pago = (
        db.query(func.coalesce(func.sum(Fatura.valor), 0))
        .filter(Fatura.usuario_id == uid)
        .filter(
            Fatura.status == FaturaStatusEnum.pago,
            Fatura.data_pagamento.between(d0, d1),
        )
        .scalar()
    )

    lembretes_ativos = (
        db.query(func.count(Lembrete.id))
        .filter(Lembrete.usuario_id == uid, Lembrete.ativa.is_(True))
        .scalar()
    )

    # Envio/Entrega são timestamps → UTC
    envios = (
        db.query(func.count(LembreteOcorrencia.id))
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(Lembrete.usuario_id == uid)
        .filter(LembreteOcorrencia.enviado_at.isnot(None))
        .filter(LembreteOcorrencia.enviado_at.between(start_utc, end_utc))
        .scalar()
    )

    entregues = (
        db.query(func.count(LembreteOcorrencia.id))
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(Lembrete.usuario_id == uid)
        .filter(LembreteOcorrencia.delivered_at.isnot(None))
        .filter(LembreteOcorrencia.delivered_at.between(start_utc, end_utc))
        .scalar()
    )

    taxa_sucesso = (float(entregues) / envios) if envios else 0.0

    return {
        "periodo": _periodo_payload(start_local, end_local),
        "clientes_total": int(clientes_total or 0),
        "faturas_abertas": int(faturas_abertas or 0),
        "faturas_pagas_periodo": int(faturas_pagas or 0),
        "valor_pago_periodo": float(valor_pago or 0),
        "lembretes_ativos": int(lembretes_ativos or 0),
        "envios_periodo": int(envios or 0),
        "entregues_periodo": int(entregues or 0),
        "taxa_sucesso": taxa_sucesso,
    }


def envios_timeseries(
    db: Session, usuario: Usuario, desde: str | None, ate: str | None
):
    start_utc, end_utc = _periodo_utc(desde, ate)
    start_local, end_local = _periodo_local(desde, ate)

    uid = usuario.id

    # join p/ pegar canal do lembrete + filtro por usuario
    q = (
        db.query(
            func.date_trunc("day", LembreteOcorrencia.enviado_at).label("dia"),
            Lembrete.canal.label("canal"),
            func.count(LembreteOcorrencia.id).label("envios"),
        )
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(Lembrete.usuario_id == uid)
        .filter(LembreteOcorrencia.enviado_at.isnot(None))
        .filter(LembreteOcorrencia.enviado_at.between(start_utc, end_utc))
        .group_by("dia", "canal")
        .order_by("dia", "canal")
    )
    rows = q.all()

    # Coleta dinâmica de canais
    canais = set()
    pivot = {}
    for dia, canal, envios in rows:
        key = canal or "desconhecido"
        canais.add(key)
        d = dia.date().isoformat()
        pivot.setdefault(d, {})[key] = int(envios)

    canais_ordenados = sorted(canais)  # estáveis para o front
    datas = sorted(pivot.keys())

    items = []
    for d in datas:
        item = {"date": d}
        # preenche zero para canal ausente naquele dia
        for c in canais_ordenados:
            item[c] = pivot[d].get(c, 0)
        items.append(item)

    return {
        "periodo": _periodo_payload(start_local, end_local),
        "canais": canais_ordenados,
        "items": items,
    }


def faturas_status_monthly(
    db: Session, usuario: Usuario, desde: str | None, ate: str | None
):
    start_local, end_local = _periodo_local(desde, ate)
    d0, d1 = start_local.date(), end_local.date()
    uid = usuario.id

    q = (
        db.query(
            func.date_trunc("month", Fatura.vencimento).label("mes"),
            func.sum(
                case((Fatura.status == FaturaStatusEnum.pendente, 1), else_=0)
            ).label("pendente"),
            func.sum(case((Fatura.status == FaturaStatusEnum.pago, 1), else_=0)).label(
                "pago"
            ),
            func.sum(
                case((Fatura.status == FaturaStatusEnum.atrasado, 1), else_=0)
            ).label("atrasado"),
            func.sum(
                case((Fatura.status == FaturaStatusEnum.cancelado, 1), else_=0)
            ).label("cancelado"),
        )
        .filter(Fatura.usuario_id == uid)
        .filter(Fatura.vencimento.between(d0, d1))
        .group_by("mes")
        .order_by("mes")
    )
    rows = q.all()

    items = []
    for mes, pend, pago, atr, canc in rows:
        items.append(
            {
                "month": mes.date().isoformat()[:7],  # YYYY-MM
                "pendente": int(pend or 0),
                "pago": int(pago or 0),
                "atrasado": int(atr or 0),
                "cancelado": int(canc or 0),
            }
        )

    return {
        "periodo": _periodo_payload(start_local, end_local),
        "items": items,
    }


def conversao_envio_pagamento(
    db: Session,
    usuario: Usuario,
    desde: str | None,
    ate: str | None,
    janela_dias: int = 7,
):
    # Envios são timestamps → UTC; relatório volta período normalizado em datas locais
    start_utc, end_utc = _periodo_utc(desde, ate)
    start_local, end_local = _periodo_local(desde, ate)
    uid = usuario.id

    # data_pagamento pode ser DATE; para comparar com janela de horas/dias após envio,
    # convertemos para datetime local (meio-dia) e depois para UTC (mantém coerência).
    data_pag_col = getattr(
        Fatura, "data_pagamento", getattr(Fatura, "data_atualizacao")
    )

    rows = (
        db.query(LembreteOcorrencia.enviado_at, data_pag_col, Fatura.status)
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .join(Fatura, Fatura.id == Lembrete.fatura_id)
        .filter(Lembrete.usuario_id == uid)
        .filter(LembreteOcorrencia.enviado_at.isnot(None))
        .filter(LembreteOcorrencia.enviado_at.between(start_utc, end_utc))
        .all()
    )

    from collections import defaultdict

    by_day = defaultdict(lambda: {"envios": 0, "pagos": 0})
    total_envios = 0
    total_pagos = 0
    janela = timedelta(days=int(janela_dias))

    for enviado_at, data_pagamento, status in rows:
        # enviado_at: UTC (timestamp)
        dkey = enviado_at.astimezone(TZ_LOCAL).date().isoformat()
        by_day[dkey]["envios"] += 1
        total_envios += 1

        ok = False
        if status == FaturaStatusEnum.pago and data_pagamento:
            # normaliza data_pagamento (DATE -> datetime local meio-dia; DATETIME naive -> assume local)
            if isinstance(data_pagamento, datetime):
                dp_local = (
                    data_pagamento.replace(tzinfo=TZ_LOCAL)
                    if data_pagamento.tzinfo is None
                    else data_pagamento.astimezone(TZ_LOCAL)
                )
            else:
                # é DATE -> meio-dia local para evitar ambiguidade
                dp_local = datetime.combine(
                    data_pagamento, time(12, 0), tzinfo=TZ_LOCAL
                )

            dp_utc = dp_local.astimezone(timezone.utc)

            if enviado_at <= dp_utc <= (enviado_at + janela):
                ok = True

        if ok:
            by_day[dkey]["pagos"] += 1
            total_pagos += 1

    series = [
        {"date": d, "envios": v["envios"], "pagos": v["pagos"]}
        for d, v in sorted(by_day.items())
    ]
    taxa = (total_pagos / total_envios) if total_envios else 0.0

    return {
        "periodo": _periodo_payload(start_local, end_local),
        "janela_dias": int(janela_dias),
        "envios_relacionados": total_envios,
        "pagamentos_apos_envio": total_pagos,
        "taxa": taxa,
        "items": series,
    }
