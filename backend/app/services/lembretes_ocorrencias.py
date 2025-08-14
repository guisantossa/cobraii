# app/services/lembretes_ocorrencias.py
from __future__ import annotations

from datetime import datetime

from app.models.enums import (  # pendente | enviado | erro  (ajuste se for 'falhou')
    StatusOcorrenciaEnum,
)
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from app.schemas.callbacks import CallbackOcorrenciaIn
from sqlalchemy.orm import Session


def _map_status_gateway_to_enum(gw_status: str | None) -> StatusOcorrenciaEnum:
    """
    Normaliza status do provedor para o enum interno.
    """
    s = (gw_status or "").lower()
    if s in {"ok", "success", "sucesso", "sent", "delivered"}:
        return StatusOcorrenciaEnum.enviado
    if s in {"fail", "failed", "error", "erro", "timeout"}:
        return StatusOcorrenciaEnum.erro
    # fallback: pendente não muda (mas podemos manter pendente se vier vazio)
    return StatusOcorrenciaEnum.pendente


def aplicar_callback_ocorrencia(
    db: Session,
    ocorrencia_id,
    data: CallbackOcorrenciaIn,
) -> LembreteOcorrencia:
    oc: LembreteOcorrencia | None = (
        db.query(LembreteOcorrencia)
        .filter(LembreteOcorrencia.id == ocorrencia_id)
        .first()
    )
    if not oc:
        from fastapi import HTTPException

        raise HTTPException(404, "Ocorrência não encontrada")

    novo_status = _map_status_gateway_to_enum(data.status)

    # Se já estava 'enviado' e o callback repetir 'success', só atualiza campos informativos
    if oc.status != StatusOcorrenciaEnum.enviado:
        oc.status = novo_status

    if data.sent_at:
        oc.enviado_at = data.sent_at
    elif novo_status == StatusOcorrenciaEnum.enviado and not oc.enviado_at:
        oc.enviado_at = datetime.utcnow()

    if data.message_id:
        oc.canal_message_id = data.message_id

    if data.error_message and novo_status != StatusOcorrenciaEnum.enviado:
        oc.motivo_skip = data.error_message

    # guarda o retorno bruto (acrescentando, sem perder histórico prévio)
    raw_prev = oc.retorno_gateway or {}
    try:
        raw_prev = dict(raw_prev)
    except Exception:
        raw_prev = {"_prev": str(raw_prev)}
    if data.raw:
        raw_prev["last_callback"] = data.raw
    if data.status:
        raw_prev["status_normalizado"] = str(novo_status)
        raw_prev["status_gateway"] = data.status
    oc.retorno_gateway = raw_prev

    db.add(oc)
    db.commit()
    db.refresh(oc)
    return oc
