# app/scheduler/lembretes_tick.py
"""
Loop de agendamento/entrega de lembretes/cobranças.

Fluxo do `tick_scheduler`:
  1) Atualiza `proxima_execucao_at` dos Lembretes (RRULE ou offsets/fatura).
  2) Materializa LembreteOcorrencias na janela [now - tol, now + lookahead].
  3) Despacha ocorrências pendentes vencidas p/ n8n, com backoff e quiet hours.

Contrato com o n8n:
- Envio: POST JSON para N8N_WEBHOOK_URL.
- Autenticação: HMAC-SHA256 opcional no campo `assinatura`.
- Resposta: 2xx = sucesso; qualquer outra resposta = erro/retry (até MAX_TENTATIVAS).
"""
from __future__ import annotations

import hashlib
import hmac
import json
import os
from datetime import datetime, time, timedelta
from typing import Iterable, List, Optional, Tuple
from uuid import UUID
from zoneinfo import ZoneInfo

import requests

# Reaproveitamos utilidades já definidas
from app.crud.lembretes import (  # rrule faremos aqui com after/between
    _hhmm_to_time,
    expand_offsets,
)
from app.models.enums import FaturaStatusEnum
from app.models.faturas import Fatura

# Models / Enums
from app.models.lembretes import Lembrete
from app.models.lembretes_ocorrencias import LembreteOcorrencia
from dateutil.rrule import rrulestr
from fastapi import HTTPException
from sqlalchemy import or_
from sqlalchemy.orm import Session

# =========================
# Config
# =========================

TZ_DEFAULT = os.getenv("APP_TZ", "America/Sao_Paulo")

LOOKAHEAD_MIN = int(
    os.getenv("LEMBRETES_LOOKAHEAD_MIN", "3")
)  # minutos adiante para materializar
TOLERANCE_SEC = int(
    os.getenv("LEMBRETES_TOLERANCE_SEC", "60")
)  # pega atrasados até N segundos

DISPATCH_BATCH_LIMIT = int(os.getenv("LEMBRETES_DISPATCH_LIMIT", "100"))

# Backoff linear (minutos) = min(BASE * tentativas, CAP)
BACKOFF_BASE_MIN = int(os.getenv("LEMBRETES_BACKOFF_BASE_MIN", "5"))
BACKOFF_CAP_MIN = int(os.getenv("LEMBRETES_BACKOFF_CAP_MIN", "60"))
MAX_TENTATIVAS = int(os.getenv("LEMBRETES_MAX_TENTATIVAS", "5"))

# Quiet hours (opcional). Formato "HH:MM". Se não setado, desabilitado.
QUIET_START = os.getenv("QUIET_HOURS_START")  # ex "22:00"
QUIET_END = os.getenv("QUIET_HOURS_END")  # ex "07:00"

# N8n
N8N_WEBHOOK_URL = os.getenv("N8N_WEBHOOK_URL", "").strip()  # obrigatório no envio
N8N_BASIC_USER = os.getenv("N8N_BASIC_USER", "").strip()
N8N_BASIC_PASS = os.getenv("N8N_BASIC_PASS", "").strip()
N8N_TIMEOUT = float(os.getenv("N8N_TIMEOUT", "10.0"))


# =========================
# Helpers
# =========================


def _tz(tz_name: Optional[str]) -> ZoneInfo:
    """Resolve e retorna a timezone.

    Args:
        tz_name (Optional[str]): Nome IANA desejado. Se None, usa TZ_DEFAULT.

    Returns:
        ZoneInfo: Objeto de timezone.
    """
    return ZoneInfo(tz_name or TZ_DEFAULT)


def _now(tz_name: Optional[str] = None) -> datetime:
    """Retorna o instante atual com timezone.

    Args:
        tz_name (Optional[str]): Nome IANA. Se None, usa TZ_DEFAULT.

    Returns:
        datetime: Agora com tzinfo.
    """
    return datetime.now(_tz(tz_name or TZ_DEFAULT))


def _hmac_signature(payload: dict) -> str:
    """Gera HMAC-SHA256 do payload JSON (ordenado) usando `N8N_HMAC_SECRET`.

    Args:
        payload (dict): Dicionário a ser assinado.

    Returns:
        str: Hex digest da assinatura ou string vazia se o segredo não estiver setado.
    """
    if not N8N_BASIC_PASS:
        return ""
    # JSON determinístico
    body = json.dumps(
        payload, ensure_ascii=False, separators=(",", ":"), sort_keys=True
    ).encode("utf-8")
    return hmac.new(N8N_BASIC_PASS, body, hashlib.sha256).hexdigest()


def _in_quiet_hours(
    dt: datetime, start_hhmm: Optional[str], end_hhmm: Optional[str]
) -> bool:
    """Verifica se `dt` está dentro da janela de silêncio [start, end).

    Suporta faixas que cruzam meia-noite (ex.: 22:00–07:00).

    Args:
        dt (datetime): Instante alvo.
        start_hhmm (Optional[str]): "HH:MM" início da janela.
        end_hhmm (Optional[str]): "HH:MM" fim da janela.

    Returns:
        bool: True se dentro da janela; False caso contrário.
    """
    if not start_hhmm or not end_hhmm:
        return False

    st = _hhmm_to_time(start_hhmm)
    en = _hhmm_to_time(end_hhmm)
    if not st or not en:
        return False

    t = dt.timetz()
    if st < en:
        # mesma data
        return st <= t < en
    else:
        # cruza meia-noite: [st, 24h) U [0, en)
        return t >= st or t < en


def _next_after_rrule(lembrete: Lembrete, after_dt: datetime) -> Optional[datetime]:
    """Computa a próxima ocorrência (>= after_dt) para um lembrete com RRULE.

    Args:
        lembrete (Lembrete): Lembrete com `rrule` e `dtstart`.
        after_dt (datetime): Referência temporal.

    Returns:
        Optional[datetime]: Próxima ocorrência ou None.
    """
    if not lembrete.rrule or not lembrete.dtstart:
        return None
    tz = _tz(lembrete.tz)
    dtstart = lembrete.dtstart
    if dtstart.tzinfo is None:
        dtstart = dtstart.replace(tzinfo=tz)
    else:
        dtstart = dtstart.astimezone(tz)

    rule = rrulestr(lembrete.rrule, dtstart=dtstart)
    nxt = rule.after(after_dt.astimezone(tz), inc=True)
    if not nxt:
        return None
    return nxt if nxt.tzinfo else nxt.replace(tzinfo=tz)


def _between_rrule(
    lembrete: Lembrete, start: datetime, end: datetime
) -> List[datetime]:
    """Lista ocorrências de RRULE em [start, end].

    Args:
        lembrete (Lembrete): Lembrete com `rrule` e `dtstart`.
        start (datetime): Início da janela.
        end (datetime): Fim da janela.

    Returns:
        List[datetime]: Ocorrências (com tzinfo).
    """
    if not lembrete.rrule or not lembrete.dtstart:
        return []
    tz = _tz(lembrete.tz)
    dtstart = lembrete.dtstart
    if dtstart.tzinfo is None:
        dtstart = dtstart.replace(tzinfo=tz)
    else:
        dtstart = dtstart.astimezone(tz)

    rule = rrulestr(lembrete.rrule, dtstart=dtstart)
    occs = rule.between(start.astimezone(tz), end.astimezone(tz), inc=True)
    return [dt if dt.tzinfo else dt.replace(tzinfo=tz) for dt in occs]


def _fatura_info(
    db: Session, usuario_id: UUID, fatura_id: UUID, tz_name: Optional[str]
) -> Tuple[datetime, bool, Optional[dict]]:
    """Carrega informações da fatura para composição das ocorrências.

    Args:
        db (Session): Sessão SQLAlchemy.
        usuario_id (UUID): Dono da fatura.
        fatura_id (UUID): Identificador da fatura.
        tz_name (Optional[str]): Timezone para compor datetime.

    Returns:
        Tuple[datetime, bool, Optional[dict]]:
            - datetime do vencimento (00:00 com TZ; hora virá de dtstart/offset).
            - bool indicando se está paga.
            - dict informativo (id, vencimento, status, valor) p/ payload.

    Raises:
        HTTPException: 400 se a fatura não for encontrada.
    """
    fatura: Optional[Fatura] = (
        db.query(Fatura)
        .filter(Fatura.id == fatura_id, Fatura.usuario_id == usuario_id)
        .first()
    )
    if not fatura:
        raise HTTPException(400, "Fatura não encontrada.")

    tz = _tz(tz_name)
    # Vamos compor a hora depois (com dtstart/hora de offset). Aqui guardamos só a data.
    vencimento_dt = datetime.combine(fatura.vencimento, time(0, 0), tz)
    status_pago = fatura.status == FaturaStatusEnum.pago
    info = {
        "id": str(fatura.id),
        "vencimento": fatura.vencimento.isoformat(),
        "status": (
            fatura.status.value
            if hasattr(fatura.status, "value")
            else str(fatura.status)
        ),
        "valor": str(fatura.valor),
    }
    return vencimento_dt, status_pago, info


def _first_future(items: Iterable[datetime], ref: datetime) -> Optional[datetime]:
    """Retorna a menor data >= ref.

    Args:
        items (Iterable[datetime]): Lista de datetimes.
        ref (datetime): Referência.

    Returns:
        Optional[datetime]: Primeiro futuro ou None.
    """
    fut = [dt for dt in items if dt >= ref]
    return min(fut) if fut else None


def _compute_next_execution(
    db: Session, lembrete: Lembrete, now: datetime
) -> Optional[datetime]:
    """Calcula a próxima execução futura (>= now) para um lembrete.

    Regras:
      - Se `rrule`, usa a próxima ocorrência da regra.
      - Se offsets/fatura, expande offsets e pega a primeira futura.

    Args:
        db (Session): Sessão SQLAlchemy.
        lembrete (Lembrete): Registro alvo.
        now (datetime): Referência.

    Returns:
        Optional[datetime]: Próxima execução ou None.
    """
    if lembrete.rrule:
        return _next_after_rrule(lembrete, now)

    # fatura/offsets
    if not lembrete.fatura_id or not lembrete.offsets:
        return None

    venc_dt, status_pago, _ = _fatura_info(
        db, lembrete.usuario_id, lembrete.fatura_id, lembrete.tz
    )

    # Usamos expand_offsets para obter possíveis datas e pegamos a primeira futura
    # Para definir a hora default quando offset não informar, expand_offsets usa dtstart->hora ou 09:00
    # Então garantir que lembrete.dtstart tenha hora adequada é importante.
    occs = [dt for (dt, _) in expand_offsets(lembrete, venc_dt, status_pago, limit=10)]
    return _first_future(occs, now)


def _occurrences_in_window(
    db: Session, lembrete: Lembrete, start: datetime, end: datetime
) -> List[datetime]:
    tz = _tz(lembrete.tz or "America/Sao_Paulo")

    # normaliza bordas p/ mesmo TZ (se vierem naive)
    if start.tzinfo is None:
        start = start.replace(tzinfo=tz)
    if end.tzinfo is None:
        end = end.replace(tzinfo=tz)

    if lembrete.rrule:
        occs = _between_rrule(lembrete, start, end)
    else:
        if not lembrete.fatura_id or not lembrete.offsets:
            return []
        venc_dt, status_pago, _ = _fatura_info(
            db, lembrete.usuario_id, lembrete.fatura_id, lembrete.tz
        )
        all_dt = [
            dt for (dt, _) in expand_offsets(lembrete, venc_dt, status_pago, limit=50)
        ]
        # normaliza cada dt p/ mesmo TZ antes do filtro
        norm = [(dt if dt.tzinfo else dt.replace(tzinfo=tz)) for dt in all_dt]
        occs = [dt for dt in norm if start <= dt <= end]

    # garante incluir a própria próxima execução quando estiver na janela
    nxt = lembrete.proxima_execucao_at
    if nxt is not None:
        if nxt.tzinfo is None:
            nxt = nxt.replace(tzinfo=tz)
        if start <= nxt <= end and nxt not in occs:
            occs.append(nxt)

    return occs


def _create_occurrence_if_missing(
    db: Session, lembrete: Lembrete, scheduled_at: datetime
) -> LembreteOcorrencia:
    """Cria uma ocorrência pendente se ainda não existir (idempotente).

    Args:
        db (Session): Sessão SQLAlchemy.
        lembrete (Lembrete): Lembrete pai.
        scheduled_at (datetime): Instante programado.

    Returns:
        LembreteOcorrencia: Ocorrência existente ou recém-criada.
    """
    occ = (
        db.query(LembreteOcorrencia)
        .filter(
            LembreteOcorrencia.lembrete_id == lembrete.id,
            LembreteOcorrencia.scheduled_at == scheduled_at,
        )
        .first()
    )
    if occ:
        return occ

    occ = LembreteOcorrencia(
        lembrete_id=lembrete.id,
        scheduled_at=scheduled_at,
        status="pendente",
        tentativas="0",
        motivo_skip=None,
        payload_enviado=None,
    )
    db.add(occ)
    db.flush()  # obtém id
    return occ


def _build_payload(
    lembrete: Lembrete, occ: LembreteOcorrencia, fatura_info: Optional[dict]
) -> dict:
    """Monta o payload enviado ao n8n (com HMAC opcional).

    Args:
        lembrete (Lembrete): Lembrete.
        occ (LembreteOcorrencia): Ocorrência a despachar.
        fatura_info (Optional[dict]): Bloco informativo de fatura.

    Returns:
        dict: Payload pronto para envio.
    """
    payload = {
        "id_ocorrencia": str(occ.id),
        "lembrete_id": str(lembrete.id),
        "usuario_id": str(lembrete.usuario_id),
        "cliente_id": str(lembrete.cliente_id),
        "canal": (
            lembrete.canal.value
            if hasattr(lembrete.canal, "value")
            else str(lembrete.canal)
        ),
        "titulo": lembrete.titulo,
        "corpo": lembrete.corpo or "",
        "meta": lembrete.meta or {},
        "programado_para": occ.scheduled_at.isoformat(),
        "tipo": "periodico" if lembrete.rrule else "fatura",
    }

    if fatura_info:
        payload["fatura"] = fatura_info

    # Assinatura HMAC (se houver segredo)
    # payload["assinatura"] = _hmac_signature(payload)
    return payload


def _inativar_sem_proxima(db: Session, now: datetime):
    """Inativa lembretes que não têm mais próxima execução."""
    candidatos = db.query(Lembrete).filter(Lembrete.ativa.is_(True)).all()

    desativados = 0
    for lembrete in candidatos:
        nxt = _compute_next_execution(db, lembrete, now)

        if nxt is None:
            lembrete.ativa = False
            db.add(lembrete)
            desativados += 1

    if desativados:
        db.commit()
    return desativados


def _dispatch_one(
    occ: LembreteOcorrencia, lembrete: Lembrete, fatura_block: Optional[dict]
) -> Tuple[bool, dict]:
    """Envia uma ocorrência ao n8n.

    Args:
        occ (LembreteOcorrencia): Ocorrência a enviar.
        lembrete (Lembrete): Lembrete pai.
        fatura_block (Optional[dict]): Dados de fatura (se houver).

    Returns:
        Tuple[bool, dict]: (sucesso, resposta_json_ou_erro).
    """
    print("entrou")
    if not N8N_WEBHOOK_URL:
        return False, {"error": "N8N_WEBHOOK_URL não configurada"}

    payload = _build_payload(lembrete, occ, fatura_block)
    try:
        auth = (
            (N8N_BASIC_USER, N8N_BASIC_PASS)
            if N8N_BASIC_USER and N8N_BASIC_PASS
            else None
        )
        resp = requests.post(
            N8N_WEBHOOK_URL, json=payload, timeout=N8N_TIMEOUT, auth=auth
        )
        data = {}
        try:
            data = resp.json()
        except Exception:
            data = {"text": resp.text, "status_code": resp.status_code}

        if 200 <= resp.status_code < 300:
            return True, data
        return False, {"status_code": resp.status_code, "body": data}
    except Exception as e:
        return False, {"exception": str(e)}


def _apply_backoff(now: datetime, tentativas_atual: int) -> datetime:
    """Calcula o instante da próxima tentativa aplicando backoff linear.

    Args:
        now (datetime): Referência de tempo atual.
        tentativas_atual (int): Número atual de tentativas (antes de incrementar).

    Returns:
        datetime: Próximo `scheduled_at` sugerido.
    """
    nxt_min = min(BACKOFF_BASE_MIN * max(1, tentativas_atual), BACKOFF_CAP_MIN)
    return now + timedelta(minutes=nxt_min)


# =========================
# Tick principal
# =========================


def tick_scheduler(db: Session) -> dict:
    """Executa um ciclo completo do scheduler.

    Etapas:
        1) Atualiza `proxima_execucao_at` para lembretes candidatos.
        2) Materializa ocorrências na janela [now - TOLERANCE_SEC, now + LOOKAHEAD_MIN].
        3) Despacha ocorrências pendentes vencidas (<= now), aplicando backoff e quiet hours.

    Args:
        db (Session): Sessão SQLAlchemy em transação controlada pelo chamador.

    Returns:
        dict: Métricas simples do ciclo (contadores e janela).
    """

    tz = _tz(TZ_DEFAULT)  # noqa: F841
    now = _now()
    start_window = now - timedelta(seconds=TOLERANCE_SEC)
    end_window = now + timedelta(minutes=LOOKAHEAD_MIN)
    stats = {
        "updated_next": 0,
        "occ_created": 0,
        "dispatched_ok": 0,
        "dispatched_err": 0,
        "skipped_quiet": 0,
    }

    # 1) Seleciona lembretes ativos com proxima_execucao_at nula ou próxima
    candidatos = (
        db.query(Lembrete)
        .filter(
            Lembrete.ativa.is_(True),
            or_(
                Lembrete.proxima_execucao_at.is_(None),
                Lembrete.proxima_execucao_at <= end_window,
            ),
        )
        .all()
    )

    for lembrete in candidatos:
        if (
            lembrete.proxima_execucao_at is not None
            and start_window <= lembrete.proxima_execucao_at <= end_window
        ):
            continue
        nxt = _compute_next_execution(db, lembrete, end_window + timedelta(seconds=1))
        if nxt != lembrete.proxima_execucao_at:
            lembrete.proxima_execucao_at = nxt
            db.add(lembrete)
            stats["updated_next"] += 1

    db.flush()
    desativados = _inativar_sem_proxima(db, now)
    if desativados:
        print(f"[tick] inativados {desativados} lembretes sem próxima execução")
    # 2) Materializa ocorrências na janela
    ativos = (
        db.query(Lembrete)
        .filter(
            Lembrete.ativa.is_(True),
            Lembrete.proxima_execucao_at.isnot(None),
            Lembrete.proxima_execucao_at <= end_window,
        )
        .order_by(Lembrete.proxima_execucao_at.asc())
        .limit(DISPATCH_BATCH_LIMIT)
        .all()
    )

    for lembrete in ativos:
        print(lembrete.id, lembrete.titulo, lembrete.proxima_execucao_at)
        occs = _occurrences_in_window(db, lembrete, start_window, end_window)

        for dt_sched in occs:
            if (
                QUIET_START
                and QUIET_END
                and _in_quiet_hours(dt_sched, QUIET_START, QUIET_END)
            ):
                stats["skipped_quiet"] += 1
                continue

            occ = _create_occurrence_if_missing(db, lembrete, dt_sched)
            if occ.created_at is None:
                # recém-criado; não temos created_at antes do commit, então incrementamos de qualquer forma
                stats["occ_created"] += 1

        # Atualiza next após a janela
        nxt = _compute_next_execution(db, lembrete, end_window + timedelta(seconds=1))
        if nxt != lembrete.proxima_execucao_at:
            lembrete.proxima_execucao_at = nxt
            db.add(lembrete)

    db.commit()

    # 3) Despacho dos pendentes vencidos
    pendentes = (
        db.query(LembreteOcorrencia)
        .join(Lembrete, Lembrete.id == LembreteOcorrencia.lembrete_id)
        .filter(
            LembreteOcorrencia.status == "pendente",
            LembreteOcorrencia.scheduled_at <= now,
            Lembrete.ativa.is_(True),
        )
        .order_by(LembreteOcorrencia.scheduled_at.asc())
        .limit(DISPATCH_BATCH_LIMIT)
        .all()
    )

    for occ in pendentes:

        lembrete = db.query(Lembrete).filter(Lembrete.id == occ.lembrete_id).first()

        if not lembrete:
            # cancela se lembrete sumiu
            occ.status = "cancelado"
            db.add(occ)
            continue

        # Bloqueio: se cair em quiet hours exatamente agora (ex.: envio atrasado)
        if QUIET_START and QUIET_END and _in_quiet_hours(now, QUIET_START, QUIET_END):
            # adia para o fim da janela de silêncio
            # Ex.: se quiet 22:00–07:00 e agora 22:30 → reagendar 07:00 do próximo dia
            end_t = _hhmm_to_time(QUIET_END) or time(7, 0)
            next_allowed_date = now.date()
            if end_t <= now.timetz():  # se já passou a end hoje, amanhã
                next_allowed_date = (now + timedelta(days=1)).date()
            occ.scheduled_at = datetime.combine(
                next_allowed_date, end_t, _tz(lembrete.tz)
            )
            db.add(occ)
            stats["skipped_quiet"] += 1
            continue

        # Bloco fatura (opcional) pro payload
        fatura_block = None
        if lembrete.fatura_id:
            _, _, fatura_block = _fatura_info(
                db, lembrete.usuario_id, lembrete.fatura_id, lembrete.tz
            )

        ok, resp = _dispatch_one(occ, lembrete, fatura_block)
        if ok:
            occ.status = "enviado"
            occ.enviado_at = now
            occ.retorno_gateway = resp
            # se provedor retornar um id, tente preencher
            msg_id = (
                resp.get("message_id")
                or resp.get("id")
                or resp.get("data", {}).get("message_id")
            )
            if msg_id:
                occ.canal_message_id = str(msg_id)
            stats["dispatched_ok"] += 1
        else:
            # erro -> backoff, incrementa tentativas
            tent = int(occ.tentativas or "0") + 1
            if tent >= MAX_TENTATIVAS:
                occ.status = "erro"
                occ.retorno_gateway = resp
            else:
                occ.tentativas = str(tent)
                occ.retorno_gateway = resp
                occ.scheduled_at = _apply_backoff(now, tent)

            stats["dispatched_err"] += 1

        # grava snapshot do payload (após montagem) para auditoria
        # (somos econômicos: só no envio OK ou erro, não no pendente)
        try:
            # reconstruímos o payload com a data possivelmente atualizada
            snap = {
                "lembrete_id": str(lembrete.id),
                "cliente_id": str(lembrete.cliente_id),
                "canal": (
                    lembrete.canal.value
                    if hasattr(lembrete.canal, "value")
                    else str(lembrete.canal)
                ),
                "titulo": lembrete.titulo,
                "corpo": lembrete.corpo or "",
                "meta": lembrete.meta or {},
                "programado_para": occ.scheduled_at.isoformat(),
                "fatura": fatura_block,
            }
            occ.payload_enviado = snap
        except Exception:
            pass

        db.add(occ)

    db.commit()

    stats["now"] = now.isoformat()
    stats["window"] = {"start": start_window.isoformat(), "end": end_window.isoformat()}
    return stats
