# app/v1/endpoints/relatorios.py
from datetime import date, datetime
from typing import List, Literal, Optional
from uuid import UUID

from app.core.dependencies import get_current_user, get_db
from app.models.cobrancas import Cobranca
from app.models.faturas import Fatura
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.models.models import Cliente, Usuario
from fastapi import APIRouter, Depends, Query
from sqlalchemy import and_, asc, desc, func, or_
from sqlalchemy.orm import Session

router = APIRouter(prefix="/relatorios", tags=["Relatórios"])


# -------- helpers --------
def _parse_date(s: Optional[str]) -> Optional[date]:
    if not s:
        return None
    return datetime.fromisoformat(s).date()


def _order_by(col, direction: str):
    return asc(col) if (direction or "").lower() == "asc" else desc(col)


# -------- /relatorios/cobrancas --------
@router.get("/cobrancas")
def relatorio_cobrancas(
    # período
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    data_base: Literal["vencimento", "criacao", "atualizacao"] = Query("vencimento"),
    # filtros
    status: Optional[List[str]] = Query(None),  # Fatura.status
    cliente_id: Optional[UUID] = None,  # Cobranca.cliente_id
    recorrencia: Optional[List[str]] = Query(None),  # Cobranca.recorrencia
    min_valor: Optional[float] = None,  # Fatura.valor
    max_valor: Optional[float] = None,
    # ordenação/paginação
    sort_by: Literal["vencimento", "valor", "created_at", "updated_at"] = Query(
        "vencimento"
    ),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    base_col = {
        "vencimento": Fatura.vencimento,
        "criacao": Fatura.data_criacao,
        "atualizacao": Fatura.data_atualizacao,
    }[data_base]

    order_col = {
        "vencimento": Fatura.vencimento,
        "valor": Fatura.valor,
        "created_at": Fatura.data_criacao,
        "updated_at": Fatura.data_atualizacao,
    }[sort_by]

    s_date = _parse_date(start_date)
    e_date = _parse_date(end_date)

    conds = [Fatura.usuario_id == usuario.id]
    if s_date:
        conds.append(base_col >= s_date)
    if e_date:
        conds.append(base_col <= e_date)
    if status:
        conds.append(Fatura.status.in_(status))
    if cliente_id:
        conds.append(Cobranca.cliente_id == cliente_id)
    if recorrencia:
        conds.append(Cobranca.recorrencia.in_(recorrencia))
    if min_valor is not None:
        conds.append(Fatura.valor >= min_valor)
    if max_valor is not None:
        conds.append(Fatura.valor <= max_valor)
    cond = and_(*conds)

    # por_status
    q_status = (
        db.query(
            Fatura.status.label("status"),
            func.count(Fatura.id).label("count"),
            func.coalesce(func.sum(Fatura.valor), 0).label("total_valor"),
        )
        .join(Cobranca, Cobranca.id == Fatura.cobranca_id)
        .filter(cond)
        .group_by(Fatura.status)
        .order_by(Fatura.status)
    )
    por_status = [
        {"status": s, "count": int(c), "total_valor": float(v)}
        for (s, c, v) in q_status.all()
    ]

    # evolução
    dia = func.date_trunc("day", base_col)
    q_evol = (
        db.query(
            dia.label("date"),
            func.count(Fatura.id).label("count"),
            func.coalesce(func.sum(Fatura.valor), 0).label("total_valor"),
        )
        .join(Cobranca, Cobranca.id == Fatura.cobranca_id)
        .filter(cond)
        .group_by(dia)
        .order_by(dia)
    )
    evolucao = [
        {"date": d.date().isoformat(), "count": int(c), "total_valor": float(v)}
        for (d, c, v) in q_evol.all()
    ]

    # total
    total = int(
        db.query(func.count(Fatura.id))
        .join(Cobranca, Cobranca.id == Fatura.cobranca_id)
        .filter(cond)
        .scalar()
        or 0
    )

    # itens (usamos Fatura como “linha”; join pra cliente)
    q_itens = (
        db.query(
            Fatura.id.label("id"),
            Cobranca.titulo.label("cobranca_titulo"),
            Cliente.nome.label("cliente"),
            Fatura.valor.label("valor"),
            Fatura.vencimento.label("vencimento"),
            Fatura.status.label("status"),
        )
        .join(Cobranca, Cobranca.id == Fatura.cobranca_id)
        .join(Cliente, Cliente.id == Cobranca.cliente_id)
        .filter(cond)
        .order_by(_order_by(order_col, sort_dir))
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    itens = [
        {
            "id": rid,
            "cobranca_titulo": cobranca_titulo,
            "cliente": cliente,
            "valor": float(valor) if valor is not None else 0.0,
            "vencimento": v.isoformat() if v else None,
            "status": status,
            # campos que o front mostra mas não existem aqui — devolvemos null
            "canal_envio": None,
            "forma_pagamento": None,
        }
        for rid, cobranca_titulo, cliente, valor, v, status in q_itens.all()
    ]

    return {
        "por_status": por_status,
        "evolucao": evolucao,
        "itens": itens,
        "total": total,
    }


# -------- /relatorios/lembretes --------
SUCESSO = {"enviado", "entregue"}
FALHA = {"erro", "cancelado"}
PENDENTE = {"pendente", "skipped"}


def _map_status_envio(st: Optional[str]) -> str:
    if not st:
        return "pendente"
    if st in SUCESSO:
        return "sucesso"
    if st in FALHA:
        return "falha"
    return "pendente"


@router.get("/lembretes")
def relatorio_lembretes(
    # período
    start_date: str = Query(..., description="YYYY-MM-DD"),
    end_date: str = Query(..., description="YYYY-MM-DD"),
    data_base: Literal["enviado_em", "criacao"] = Query("enviado_em"),
    # filtros
    cliente_id: Optional[UUID] = None,
    fatura_id: Optional[UUID] = None,
    canal: Optional[List[str]] = Query(None),  # Lembrete.canal
    status_envio: Optional[List[str]] = Query(
        None
    ),  # sucesso|falha|pendente → mapeia pra ocorrências
    tipo: Optional[List[str]] = Query(
        None
    ),  # manual|automatico (derivado de rrule/offsets)
    condicao: Optional[List[str]] = Query(None),  # Lembrete.condicao
    # ordenação/paginação
    sort_by: Literal["enviado_em", "created_at"] = Query("enviado_em"),
    sort_dir: Literal["asc", "desc"] = Query("desc"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=500),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    base_col = (
        LembreteOcorrencia.enviado_at
        if data_base == "enviado_em"
        else LembreteOcorrencia.created_at
    )
    order_col = (
        LembreteOcorrencia.enviado_at
        if sort_by == "enviado_em"
        else LembreteOcorrencia.created_at
    )

    s_date = _parse_date(start_date)
    e_date = _parse_date(end_date)

    conds = [Lembrete.usuario_id == usuario.id]
    if s_date:
        conds.append(base_col >= datetime.combine(s_date, datetime.min.time()))
    if e_date:
        conds.append(base_col <= datetime.combine(e_date, datetime.max.time()))
    if cliente_id:
        conds.append(Lembrete.cliente_id == cliente_id)
    if fatura_id:
        conds.append(Lembrete.fatura_id == fatura_id)
    if canal:
        conds.append(Lembrete.canal.in_(canal))
    if condicao:
        conds.append(Lembrete.condicao.in_(condicao))
    if tipo:
        tset = set(tipo)
        if "manual" in tset and "automatico" not in tset:
            conds.append(
                and_(
                    Lembrete.rrule.is_(None),
                    func.coalesce(func.jsonb_array_length(Lembrete.offsets), 0) == 0,
                )
            )
        elif "automatico" in tset and "manual" not in tset:
            conds.append(
                or_(
                    Lembrete.rrule.isnot(None),
                    func.coalesce(func.jsonb_array_length(Lembrete.offsets), 0) > 0,
                )
            )
    if status_envio:
        groups = set(status_envio)
        allowed = set()
        if "sucesso" in groups:
            allowed |= SUCESSO
        if "falha" in groups:
            allowed |= FALHA
        if "pendente" in groups:
            allowed |= PENDENTE
        conds.append(LembreteOcorrencia.status.in_(list(allowed)))

    cond = and_(*conds)

    # por_canal
    q_canal = (
        db.query(
            Lembrete.canal.label("canal"),
            func.count(LembreteOcorrencia.id).label("count"),
        )
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(cond)
        .group_by(Lembrete.canal)
        .order_by(Lembrete.canal)
    )
    por_canal = [{"canal": canal, "count": int(c)} for (canal, c) in q_canal.all()]

    # evolução
    dia = func.date_trunc("day", base_col)
    q_evol = (
        db.query(dia.label("date"), func.count(LembreteOcorrencia.id).label("count"))
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(cond)
        .group_by(dia)
        .order_by(dia)
    )
    evolucao = [
        {"date": d.date().isoformat(), "count": int(c)} for (d, c) in q_evol.all()
    ]

    # total
    total = int(
        db.query(func.count(LembreteOcorrencia.id))
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(cond)
        .scalar()
        or 0
    )

    # itens (ocorrências)
    q_itens = (
        db.query(
            LembreteOcorrencia.id.label("id"),
            Cliente.nome.label("cliente"),
            Lembrete.canal.label("canal"),
            LembreteOcorrencia.status.label("status_raw"),
            LembreteOcorrencia.enviado_at.label("enviado_em"),
            Lembrete.rrule.label("rrule"),
            Lembrete.offsets.label("offsets"),
            Lembrete.fatura_id.label("fatura_id"),
        )
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .join(Cliente, Cliente.id == Lembrete.cliente_id)
        .filter(cond)
        .order_by(_order_by(order_col, sort_dir))
        .limit(page_size)
        .offset((page - 1) * page_size)
    )

    itens = []
    for r in q_itens.all():
        tipo_inferido = (
            "automatico"
            if (r.rrule is not None or (r.offsets and len(r.offsets) > 0))
            else "manual"
        )
        itens.append(
            {
                "id": r.id,
                "cliente": r.cliente,
                "canal": r.canal,
                "status_envio": _map_status_envio(r.status_raw),
                "enviado_em": r.enviado_em.isoformat(sep=" ") if r.enviado_em else None,
                "tipo": tipo_inferido,
                "fatura_id": str(r.fatura_id) if r.fatura_id else None,
            }
        )

    return {
        "por_canal": por_canal,
        "evolucao": evolucao,
        "itens": itens,
        "total": total,
    }
