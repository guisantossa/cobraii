from __future__ import annotations

from datetime import datetime
from typing import Optional, Set

from app.db.session import get_db
from app.models.enums import CanalEnvioEnum, StatusOcorrenciaEnum
from app.models.lembretes import (
    Lembrete,
    LembreteDestinatario,
    LembreteOcorrencia,
    LembreteOcorrenciaCanalLog,
)
from app.schemas.internal import ClaimItem, ClaimOut, ResultIn
from app.services.deps_internal import require_internal_api_key
from app.services.template_renderer import render_message
from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy import text
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Internal"])

# -------- util --------


def _channels_order(lembrete: Lembrete) -> list[str]:
    ativos = [c for c in sorted(lembrete.canais, key=lambda x: x.ordem) if c.habilitado]
    return [c.canal.value for c in ativos]


def _dest_dict(d: LembreteDestinatario) -> dict:
    return {
        "id": str(d.id),
        "cliente_id": str(d.cliente_id) if d.cliente_id else None,
        "nome": d.nome,
        "telefone": d.telefone,
        "email": d.email,
    }


def _render_for_dest(lembrete: Lembrete, dest: LembreteDestinatario) -> str:
    msg = (lembrete.conteudo or {}).get("mensagem") or ""
    # contexto mínimo: cliente.nome / primeiro_nome
    nome = dest.nome or ""
    if not nome and dest.cliente_id:
        # se quiser, faça um join com Cliente pra buscar nome; v1 mantém simples
        pass
    primeiro = (nome or "").split(" ")[0] if nome else ""
    context = {"cliente": {"nome": nome, "primeiro_nome": primeiro}}
    # payload básico + subtipo
    payload = dict(lembrete.payload or {})
    if lembrete.cobranca:
        payload.setdefault("valor", float(lembrete.cobranca.valor))
        payload.setdefault("vencimento", lembrete.cobranca.vencimento.isoformat())
        if lembrete.cobranca.link_pagamento:
            payload.setdefault("link_pagamento", lembrete.cobranca.link_pagamento)
    return render_message(msg, payload, context=context)


def _parse_channels_param(channels_param: Optional[str]) -> Set[CanalEnvioEnum]:
    if not channels_param:
        return set()
    raw = [c.strip().lower() for c in channels_param.split(",") if c.strip()]
    out: Set[CanalEnvioEnum] = set()
    for c in raw:
        out.add(CanalEnvioEnum(c))
    return out


def _has_eligible_channel(
    lembrete: Lembrete, filter_channels: Set[CanalEnvioEnum]
) -> bool:
    enabled = [c.canal for c in lembrete.canais if c.habilitado]
    if not filter_channels:
        return len(enabled) > 0
    return any(c in filter_channels for c in enabled)


# -------- CLAIM --------
@router.get("/occurrences/claim", response_model=ClaimOut)
def claim_occurrences(
    limit: int = Query(50, ge=1, le=200),
    channels: Optional[str] = Query(None, description="ex.: whatsapp,email"),
    db: Session = Depends(get_db),
    _=Depends(require_internal_api_key),
):
    wanted_channels = _parse_channels_param(channels)

    # locka candidatas
    sql = text(
        """
        WITH cte AS (
            SELECT o.id
            FROM lembrete_ocorrencias o
            JOIN lembretes l ON l.id = o.lembrete_id
            WHERE o.status = 'enfileirado'
              AND l.estado = 'agendado'
              AND o.dt_programada <= NOW()
            ORDER BY o.dt_programada ASC
            FOR UPDATE SKIP LOCKED
            LIMIT :limit
        )
        UPDATE lembrete_ocorrencias o
        SET status = 'em_execucao'
        FROM cte
        WHERE o.id = cte.id
        RETURNING o.id;
    """
    )
    rows = db.execute(sql, {"limit": limit}).fetchall()
    if not rows:
        return {"items": []}

    ids = [r[0] for r in rows]
    ocorrs = db.query(LembreteOcorrencia).filter(LembreteOcorrencia.id.in_(ids)).all()

    items: list[ClaimItem] = []
    for o in ocorrs:
        le = o.lembrete
        d = o.destinatario

        # se não tiver canal elegível pro filtro, devolve a ocorrência
        if not _has_eligible_channel(le, wanted_channels):
            o.status = StatusOcorrenciaEnum.enfileirado
            db.flush()
            continue

        try:
            rendered = _render_for_dest(le, d)
        except Exception as e:
            # falha de render → marca falhou e não retorna
            o.status = StatusOcorrenciaEnum.falhou
            o.ultimo_erro = f"RENDER_ERROR: {e}"
            db.flush()
            continue

        ch_order = _channels_order(le)
        if wanted_channels:
            ch_order = [c for c in ch_order if CanalEnvioEnum(c) in wanted_channels]
            if not ch_order:
                # por garantia, se zerou aqui por ordem, devolve
                o.status = StatusOcorrenciaEnum.enfileirado
                db.flush()
                continue

        item: dict = {
            "ocorrencia_id": str(o.id),
            "lembrete_id": str(le.id),
            "tipo": le.tipo.value,
            "channels_order": ch_order,
            "destinatario": _dest_dict(d),
            "rendered_message": rendered,
            "payload": le.payload or {},
            "agendamento": {
                "timezone": le.timezone,
                "dt_programada": o.dt_programada.isoformat(),
            },
            "subtipo": None,
        }
        if le.cobranca:
            item["subtipo"] = {
                "cobranca": {
                    "valor": float(le.cobranca.valor),
                    "vencimento": le.cobranca.vencimento.isoformat(),
                    "link_pagamento": le.cobranca.link_pagamento,
                    "gateway": (
                        le.cobranca.gateway.value if le.cobranca.gateway else None
                    ),
                    "payment_external_id": le.cobranca.payment_external_id,
                }
            }

        items.append(ClaimItem(**item))

    db.commit()
    return {"items": items}


# -------- RESULT --------


class ResultBody(dict):
    """
    Usaremos request body como dict simples; se preferir pydantic, eu crio schema.
    Campos esperados:
    - final: bool (se true, finaliza ocorrência como 'entregue' ou 'falhou')
    - status: 'entregue'|'falhou'
    - canal_usado: 'whatsapp'|'email'|'sms'|'webhook'
    - tentativa: int
    - codigo: str (opcional)
    - mensagem: str (opcional)
    - protocolo_externo: str (opcional)
    """


@router.post("/occurrences/{ocorrencia_id}/result")
def post_result(
    ocorrencia_id: str,
    body: ResultIn,
    db: Session = Depends(get_db),
    _=Depends(require_internal_api_key),
):
    o = (
        db.query(LembreteOcorrencia)
        .filter(LembreteOcorrencia.id == ocorrencia_id)
        .first()
    )
    if not o:
        raise HTTPException(status_code=404, detail="Ocorrência não encontrada")

    canal_enum = CanalEnvioEnum(body.canal_usado)

    # log
    log = LembreteOcorrenciaCanalLog(
        ocorrencia_id=o.id,
        canal=canal_enum,
        tentativa=body.tentativa,
        codigo=body.codigo,
        mensagem=body.mensagem,
        protocolo_externo=body.protocolo_externo,
        payload_resumido={},
    )
    db.add(log)

    now = datetime.utcnow()

    if body.status == "entregue":
        o.status = StatusOcorrenciaEnum.entregue
        o.canal_usado = canal_enum
        o.dt_envio = o.dt_envio or now
        o.dt_entrega = now
        o.tentativas = body.tentativa
        o.ultimo_erro = None
    else:  # falhou
        o.tentativas = max(o.tentativas, body.tentativa)
        if body.final:
            o.status = StatusOcorrenciaEnum.falhou
            o.ultimo_erro = body.codigo or "FAILED"
        else:
            # permanece 'em_execucao' para permitir fallback no mesmo workflow
            o.status = StatusOcorrenciaEnum.em_execucao
            o.ultimo_erro = body.codigo or "RETRYING"

    db.commit()
    return {"ok": True, "ocorrencia_id": str(o.id), "status": o.status.value}
