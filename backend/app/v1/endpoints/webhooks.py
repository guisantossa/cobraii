# app/api/v1/webhooks.py
from __future__ import annotations

from datetime import datetime

from app.db.session import get_db
from app.models.enums import CanalEnvioEnum, StatusOcorrenciaEnum
from app.models.lembretes import LembreteOcorrencia, LembreteOcorrenciaCanalLog
from app.schemas.webhooks import EmailWebhookIn, EvolutionMessageIn, SmsWebhookIn
from fastapi import APIRouter, Depends, Header
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Webhooks"])


# (opcional) proteção simples por token
def require_webhook_token(
    x_webhook_token: str | None = Header(None, convert_underscores=False)
):
    # defina WEBHOOK_TOKEN no .env, se quiser
    return True


# ---------- helpers ----------
def _finish_occurrence_from_log(
    db: Session,
    protocolo: str,
    canal: CanalEnvioEnum,
    final_status: StatusOcorrenciaEnum,
    codigo: str | None,
    mensagem: str | None,
):
    log = (
        db.query(LembreteOcorrenciaCanalLog)
        .filter(LembreteOcorrenciaCanalLog.protocolo_externo == protocolo)
        .order_by(LembreteOcorrenciaCanalLog.dt_evento.desc())
        .first()
    )
    if not log:
        return False
    occ = (
        db.query(LembreteOcorrencia)
        .filter(LembreteOcorrencia.id == log.ocorrencia_id)
        .first()
    )
    if not occ:
        return False

    # atualiza ocorrência
    now = datetime.utcnow()
    if final_status == StatusOcorrenciaEnum.entregue:
        occ.status = StatusOcorrenciaEnum.entregue
        occ.canal_usado = canal
        occ.dt_envio = occ.dt_envio or now
        occ.dt_entrega = now
        occ.ultimo_erro = None
    elif final_status == StatusOcorrenciaEnum.falhou:
        occ.status = StatusOcorrenciaEnum.falhou
        occ.canal_usado = occ.canal_usado or canal
        occ.ultimo_erro = codigo or "FAILED"

    # adiciona um log de confirmação do provider
    prov_log = LembreteOcorrenciaCanalLog(
        ocorrencia_id=occ.id,
        canal=canal,
        tentativa=log.tentativa,  # reaproveita tentativa mais recente
        codigo=codigo,
        mensagem=mensagem,
        protocolo_externo=protocolo,
        payload_resumido={"webhook": True},
    )
    db.add(prov_log)
    db.commit()
    return True


# ---------- Evolution (WhatsApp) ----------
_EVOLUTION_OK = {"delivered", "read"}  # considere "sent" como ok se quiser
_EVOLUTION_FAIL = {"failed"}


@router.post("/evolution")
def evolution_webhook(
    body: EvolutionMessageIn,
    db: Session = Depends(get_db),
    _=Depends(require_webhook_token),
):
    protocolo = body.messageId or (body.payload or {}).get("id")
    if not protocolo:
        return {"accepted": True, "reason": "no messageId"}

    status_lower = (body.status or body.event or "").lower()
    if status_lower in _EVOLUTION_OK:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.whatsapp,
            StatusOcorrenciaEnum.entregue,
            None,
            f"evolution:{status_lower}",
        )
        return {"ok": True}
    if status_lower in _EVOLUTION_FAIL:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.whatsapp,
            StatusOcorrenciaEnum.falhou,
            "WHATS_FAILED",
            f"evolution:{status_lower}",
        )
        return {"ok": True}

    # outros eventos — ignore com 202
    return {"accepted": True, "event": status_lower}


# ---------- Email (genérico/SES/SendGrid/SMTP) ----------
_EMAIL_OK = {"delivered", "delivered_event"}
_EMAIL_FAIL = {"bounced", "complaint", "failed", "rejected"}


@router.post("/email")
def email_webhook(
    body: EmailWebhookIn,
    db: Session = Depends(get_db),
    _=Depends(require_webhook_token),
):
    protocolo = body.message_id or (body.meta or {}).get("messageId")
    if not protocolo:
        return {"accepted": True, "reason": "no message_id"}
    st = (body.status or "").lower()
    if st in _EMAIL_OK:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.email,
            StatusOcorrenciaEnum.entregue,
            None,
            f"email:{st}",
        )
        return {"ok": True}
    if st in _EMAIL_FAIL:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.email,
            StatusOcorrenciaEnum.falhou,
            "EMAIL_FAILED",
            f"email:{st}",
        )
        return {"ok": True}
    return {"accepted": True, "status": st}


# ---------- SMS (genérico/Twilio/Zenvia) ----------
_SMS_OK = {"delivered", "sent"}
_SMS_FAIL = {"failed", "undelivered", "rejected"}


@router.post("/sms")
def sms_webhook(
    body: SmsWebhookIn, db: Session = Depends(get_db), _=Depends(require_webhook_token)
):
    protocolo = body.message_id or (body.meta or {}).get(
        "messageSid"
    )  # Twilio usa MessageSid
    if not protocolo:
        return {"accepted": True, "reason": "no message_id"}
    st = (body.status or "").lower()
    if st in _SMS_OK:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.sms,
            StatusOcorrenciaEnum.entregue,
            None,
            f"sms:{st}",
        )
        return {"ok": True}
    if st in _SMS_FAIL:
        _finish_occurrence_from_log(
            db,
            protocolo,
            CanalEnvioEnum.sms,
            StatusOcorrenciaEnum.falhou,
            "SMS_FAILED",
            f"sms:{st}",
        )
        return {"ok": True}
    return {"accepted": True, "status": st}
