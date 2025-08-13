from datetime import datetime, timedelta

from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.models.models import Cliente
from sqlalchemy import case, func
from sqlalchemy.orm import Session


def _parse_period(desde: str | None, ate: str | None) -> tuple[datetime, datetime]:
    # espera ISO YYYY-MM-DD; se não vier, assume últimos 30 dias
    now = datetime.utcnow()
    if not desde or not ate:
        end = now
        start = now - timedelta(days=30)
        return start, end
    start = datetime.fromisoformat(desde)
    end = datetime.fromisoformat(ate) + timedelta(days=1) - timedelta(seconds=1)
    return start, end


def overview(db: Session, desde: str | None, ate: str | None):
    start, end = _parse_period(desde, ate)

    clientes_total = db.query(func.count(Cliente.id)).scalar()

    faturas_abertas = (
        db.query(func.count(Fatura.id))
        .filter(
            Fatura.status.in_([FaturaStatusEnum.pendente, FaturaStatusEnum.atrasado])
        )
        .scalar()
    )

    faturas_pagas = (
        db.query(func.count(Fatura.id))
        .filter(
            Fatura.status == FaturaStatusEnum.pago,
            Fatura.data_pagamento.between(start.date(), end.date()),
        )
        .scalar()
    )

    valor_pago = (
        db.query(func.coalesce(func.sum(Fatura.valor), 0))
        .filter(
            Fatura.status == FaturaStatusEnum.pago,
            Fatura.data_pagamento.between(start.date(), end.date()),
        )
        .scalar()
    )

    lembretes_ativos = (
        db.query(func.count(Lembrete.id)).filter(Lembrete.ativa.is_(True)).scalar()
    )

    envios = (
        db.query(func.count(LembreteOcorrencia.id))
        .filter(LembreteOcorrencia.enviado_at.between(start, end))
        .scalar()
    )

    entregues = (
        db.query(func.count(LembreteOcorrencia.id))
        .filter(
            LembreteOcorrencia.delivered_at.isnot(None),
            LembreteOcorrencia.delivered_at.between(start, end),
        )
        .scalar()
    )

    taxa_sucesso = float(entregues) / envios if envios else 0.0

    return {
        "periodo": {"desde": start.isoformat(), "ate": end.isoformat()},
        "clientes_total": int(clientes_total or 0),
        "faturas_abertas": int(faturas_abertas or 0),
        "faturas_pagas_periodo": int(faturas_pagas or 0),
        "valor_pago_periodo": float(valor_pago or 0),
        "lembretes_ativos": int(lembretes_ativos or 0),
        "envios_periodo": int(envios or 0),
        "entregues_periodo": int(entregues or 0),
        "taxa_sucesso": taxa_sucesso,
    }


def envios_timeseries(db: Session, desde: str | None, ate: str | None):
    start, end = _parse_period(desde, ate)
    # join p/ pegar canal do lembrete
    q = (
        db.query(
            func.date_trunc("day", LembreteOcorrencia.enviado_at).label("dia"),
            Lembrete.canal.label("canal"),
            func.count(LembreteOcorrencia.id).label("envios"),
        )
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(LembreteOcorrencia.enviado_at.isnot(None))
        .filter(LembreteOcorrencia.enviado_at.between(start, end))
        .group_by("dia", "canal")
        .order_by("dia", "canal")
    )
    rows = q.all()
    series = {}
    for dia, canal, envios in rows:
        key = canal or "desconhecido"
        d = dia.date().isoformat()
        series.setdefault(d, {})[key] = int(envios)
    # normaliza p/ lista [{date, whatsapp, email, sms}]
    datas = sorted(series.keys())
    result = []
    for d in datas:
        item = {"date": d}
        item.update({k: series[d].get(k, 0) for k in ["whatsapp", "email", "sms"]})
        result.append(item)
    return {
        "periodo": {"desde": start.date().isoformat(), "ate": end.date().isoformat()},
        "items": result,
    }


def faturas_status_monthly(db: Session, desde: str | None, ate: str | None):
    start, end = _parse_period(desde, ate)
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
        .filter(Fatura.vencimento.between(start.date(), end.date()))
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
    return {"items": items}


def conversao_envio_pagamento(
    db: Session, desde: str | None, ate: str | None, janela_dias: int = 7
):
    start, end = _parse_period(desde, ate)
    data_pag = getattr(Fatura, "data_pagamento", getattr(Fatura, "data_atualizacao"))
    # puxa os envios ligados a fatura
    rows = (
        db.query(LembreteOcorrencia.enviado_at, data_pag, Fatura.status)
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .join(Fatura, Fatura.id == Lembrete.fatura_id)
        .filter(LembreteOcorrencia.enviado_at.isnot(None))
        .filter(LembreteOcorrencia.enviado_at.between(start, end))
        .all()
    )
    # agrega em python (mais simples; otimizar depois se precisar)
    from collections import defaultdict

    by_day = defaultdict(lambda: {"envios": 0, "pagos": 0})
    total_envios = 0
    total_pagos = 0
    for enviado_at, data_pagamento, status in rows:
        dkey = enviado_at.date().isoformat()
        by_day[dkey]["envios"] += 1
        total_envios += 1
        ok = False
        if status == FaturaStatusEnum.pago and data_pagamento:
            # normaliza: se vier Date, vira datetime no meio-dia
            if isinstance(data_pagamento, datetime):
                dp = data_pagamento
            else:
                dp = datetime.combine(data_pagamento, datetime.min.time())
            delta = (dp - enviado_at).days
            if 0 <= delta <= int(janela_dias):
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
        "periodo": {"desde": start.isoformat(), "ate": end.isoformat()},
        "janela_dias": int(janela_dias),
        "envios_relacionados": total_envios,
        "pagamentos_apos_envio": total_pagos,
        "taxa": taxa,
        "items": series,
    }
