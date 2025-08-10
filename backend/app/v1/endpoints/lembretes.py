# app/v1/endpoint/lembretes.py
from __future__ import annotations

from datetime import datetime
from typing import Any, Dict, List, Optional

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.enums import (
    CanalEnvioEnum,
    EstadoLembreteEnum,
    GatewayPagamentoEnum,
    LembreteTipoEnum,
    StatusOcorrenciaEnum,
)
from app.models.lembretes import (
    Lembrete,
    LembreteAgendamento,
    LembreteAviso,
    LembreteCanal,
    LembreteCobranca,
    LembreteDestinatario,
    LembreteDocumento,
    LembreteOcorrencia,
)
from app.models.models import Cliente, Usuario
from app.schemas.lembretes import (
    EstadoPatchIn,
    EstadoPatchOut,
    LembreteCreate,
    LembreteDetalheOut,
    LembreteUpdate,
    PageOcorrenciasOut,
    PageOut,
    PreviewIn,
    PreviewOut,
    SimularRecorrenciaIn,
    SimularRecorrenciaOut,
)
from app.services.occurrence_generator import ensure_future_window
from app.services.recurrence_service import next_occurrences, validate_rrule
from app.services.template_renderer import TemplateError, render_message
from dateutil.tz import gettz
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Lembretes"])


# --------- Helpers internos ---------
def _map_str_enum(enum_cls, value: str):
    try:
        return enum_cls(value)
    except Exception:
        raise HTTPException(
            status_code=400, detail=f"Valor inválido para enum: {value}"
        )


def _validate_destinatarios_canals(
    db: Session,
    user: Usuario,
    canais: List[LembreteCanal],
    dests: List[LembreteDestinatario],
):
    # v1 simples: se só tiver whatsapp, exige telefone; se só email, exige email; sms -> telefone
    requires_phone = any(
        c.canal in (CanalEnvioEnum.whatsapp, CanalEnvioEnum.sms) and c.habilitado
        for c in canais
    )
    requires_email = any(
        c.canal == CanalEnvioEnum.email and c.habilitado for c in canais
    )

    for d in dests:
        if d.cliente_id:
            cli = (
                db.query(Cliente)
                .filter(Cliente.id == d.cliente_id, Cliente.usuario_id == user.id)
                .first()
            )
            if not cli:
                raise HTTPException(
                    status_code=404, detail=f"Cliente {d.cliente_id} não encontrado"
                )
            # se dado avulso estiver vazio, use do cliente
            if requires_phone and not (d.telefone or cli.telefone):
                raise HTTPException(
                    status_code=422,
                    detail=f"Cliente {cli.id} sem telefone para Whats/SMS",
                )
            if requires_email and not (d.email or cli.email):
                raise HTTPException(
                    status_code=422, detail=f"Cliente {cli.id} sem email para Email"
                )
        else:
            # contato avulso
            if requires_phone and not d.telefone:
                raise HTTPException(
                    status_code=422, detail="Contato avulso sem telefone para Whats/SMS"
                )
            if requires_email and not d.email:
                raise HTTPException(
                    status_code=422, detail="Contato avulso sem email para Email"
                )


def _build_subtipo(db: Session, lembrete: Lembrete, body: LembreteCreate):
    if lembrete.tipo == LembreteTipoEnum.cobranca:
        if not body.subtipo or not body.subtipo.cobranca:
            raise HTTPException(
                status_code=400, detail="Subtipo cobranca é obrigatório"
            )
        c = body.subtipo.cobranca
        sub = LembreteCobranca(
            lembrete_id=lembrete.id,
            valor=c.valor,
            vencimento=c.vencimento,
            link_pagamento=str(c.link_pagamento) if c.link_pagamento else None,
            gateway=(
                _map_str_enum(GatewayPagamentoEnum, c.gateway) if c.gateway else None
            ),
            metadados=c.metadados or {},
        )
        db.add(sub)

    elif lembrete.tipo == LembreteTipoEnum.documento:
        d = body.subtipo.documento if body.subtipo else None
        if not d:
            raise HTTPException(
                status_code=400, detail="Subtipo documento é obrigatório"
            )
        sub = LembreteDocumento(
            lembrete_id=lembrete.id,
            lista_documentos=d.lista_documentos,
            deadline=d.deadline,
            instrucao_upload=str(d.instrucao_upload) if d.instrucao_upload else None,
        )
        db.add(sub)

    elif lembrete.tipo == LembreteTipoEnum.agendamento:
        a = body.subtipo.agendamento if body.subtipo else None
        sub = LembreteAgendamento(
            lembrete_id=lembrete.id,
            data_hora=a.data_hora if a else None,
            local=a.local if a else None,
            link_meeting=str(a.link_meeting) if a and a.link_meeting else None,
        )
        db.add(sub)

    elif lembrete.tipo == LembreteTipoEnum.aviso:
        av = body.subtipo.aviso if body.subtipo else None
        sub = LembreteAviso(lembrete_id=lembrete.id, nota=av.nota if av else None)
        db.add(sub)


def _apply_update_on_lembrete(lem: Lembrete, body: LembreteUpdate):
    # atributos simples
    if body.titulo is not None:
        lem.titulo = body.titulo
    if body.template_id is not None:
        lem.template_id = body.template_id
    if body.conteudo is not None:
        lem.conteudo = body.conteudo
    if body.payload is not None:
        lem.payload = body.payload

    # tipo (em v1 não vamos permitir trocar tipo, para simplificar)
    if body.tipo and body.tipo != lem.tipo.value:
        raise HTTPException(
            status_code=409, detail="Não é permitido alterar o tipo do lembrete"
        )


def _replace_canais(db: Session, lem: Lembrete, canais_in: List[Dict[str, Any]]):
    # apaga e recria (simples v1)
    for c in list(lem.canais):
        db.delete(c)
    db.flush()
    for c in canais_in:
        novo = LembreteCanal(
            lembrete_id=lem.id,
            canal=_map_str_enum(CanalEnvioEnum, c["canal"]),
            ordem=c.get("ordem", 1),
            habilitado=c.get("habilitado", True),
            config=c.get("config") or {},
        )
        db.add(novo)


def _replace_destinatarios(db: Session, lem: Lembrete, dests_in: List[Dict[str, Any]]):
    for d in list(lem.destinatarios):
        db.delete(d)
    db.flush()
    for d in dests_in:
        if d.get("cliente_id"):
            novo = LembreteDestinatario(lembrete_id=lem.id, cliente_id=d["cliente_id"])
        else:
            av = d.get("contato_avulso") or {}
            novo = LembreteDestinatario(
                lembrete_id=lem.id,
                nome=av.get("nome"),
                telefone=av.get("telefone"),
                email=av.get("email"),
            )
        db.add(novo)


def _replace_subtipo(
    db: Session,
    lem: Lembrete,
    body: LembreteUpdate | LembreteCreate,
    is_update: bool = False,
):
    # Em update, removemos o subtipo atual e criamos de novo conforme input
    if is_update:
        if lem.cobranca:
            db.delete(lem.cobranca)
        if lem.documento:
            db.delete(lem.documento)
        if lem.agendamento:
            db.delete(lem.agendamento)
        if lem.aviso:
            db.delete(lem.aviso)
        db.flush()

    # Reutiliza função já criada para o create
    _build_subtipo(db, lem, body)


# --------- Endpoints ---------


@router.post("", response_model=dict, status_code=201)
def criar_lembrete(
    body: LembreteCreate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    # 1) Validar/Render template
    msg = body.conteudo.get("mensagem")
    if not msg:
        raise HTTPException(status_code=400, detail="conteudo.mensagem é obrigatório")
    try:
        # preview rápido com cliente dummy
        render_message(
            msg, body.payload or {}, context={"cliente": {"primeiro_nome": "Cliente"}}
        )
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Template inválido: {e}")

    # 2) Validar RRULE se recorrente
    ag = body.agendamento
    if ag.recorrente:
        try:
            validate_rrule(ag.rrule or "", ag.dt_inicio, ag.timezone)
        except Exception as e:
            raise HTTPException(status_code=400, detail=str(e))

    # 3) Montar objeto Lembrete
    lembrete = Lembrete(
        usuario_id=user.id,
        tipo=_map_str_enum(LembreteTipoEnum, body.tipo),
        titulo=body.titulo,
        template_id=body.template_id,
        conteudo=body.conteudo,
        payload=body.payload or {},
        timezone=ag.timezone or "America/Sao_Paulo",
        dt_inicio=ag.dt_inicio,
        dt_fim=ag.dt_fim,
        rrule=ag.rrule,
        recorrente=ag.recorrente,
        quiet_hours_start=ag.quiet_hours_start,
        quiet_hours_end=ag.quiet_hours_end,
        estado=EstadoLembreteEnum.agendado,
    )
    db.add(lembrete)
    db.flush()  # gera ID

    # 4) Canais
    canais = []
    for c in body.canais:
        canal_obj = LembreteCanal(
            lembrete_id=lembrete.id,
            canal=_map_str_enum(CanalEnvioEnum, c.canal),
            ordem=c.ordem,
            habilitado=c.habilitado,
            config=c.config or {},
        )
        db.add(canal_obj)
        canais.append(canal_obj)

    # 5) Destinatários
    dests = []
    for d in body.destinatarios:
        if d.cliente_id:
            dest = LembreteDestinatario(
                lembrete_id=lembrete.id, cliente_id=d.cliente_id
            )
        else:
            av = d.contato_avulso
            dest = LembreteDestinatario(
                lembrete_id=lembrete.id,
                nome=av.nome,
                telefone=av.telefone,
                email=str(av.email) if av.email else None,
            )
        db.add(dest)
        dests.append(dest)

    db.flush()
    _validate_destinatarios_canals(db, user, canais, dests)

    # 6) Subtipo
    _build_subtipo(db, lembrete, body)

    # 7) Geração de ocorrências JIT
    ensure_future_window(db, lembrete, horizon_days=14)

    db.commit()

    # resposta simples
    return {
        "id": str(lembrete.id),
        "estado": lembrete.estado.value,
        "tipo": lembrete.tipo.value,
        "titulo": lembrete.titulo,
    }


@router.get("", response_model=PageOut)
def listar_lembretes(
    page: int = 1,
    page_size: int = 20,
    tipo: Optional[str] = None,
    estado: Optional[str] = None,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    q = db.query(Lembrete).filter(Lembrete.usuario_id == user.id)
    if tipo:
        q = q.filter(Lembrete.tipo == _map_str_enum(LembreteTipoEnum, tipo))
    if estado:
        q = q.filter(Lembrete.estado == _map_str_enum(EstadoLembreteEnum, estado))
    total = q.count()
    items = (
        q.order_by(Lembrete.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    # pega próxima execução de forma simples (primeira ocorrência futura)
    res_items = []
    for lem in items:
        tz = gettz(lem.timezone or "America/Sao_Paulo")
        now_tz = datetime.now(tz)  # noqa: F841
        proxima = None
        if lem.recorrente and lem.rrule:
            occs = next_occurrences(lem.rrule, lem.dt_inicio, lem.timezone, limit=1)
            proxima = occs[0] if occs else None
        else:
            proxima = (
                lem.dt_inicio
                if lem.dt_inicio
                >= datetime.utcnow().astimezone(proxima.tzinfo if proxima else None)
                else None
            )

        res_items.append(
            {
                "id": str(lem.id),
                "tipo": lem.tipo.value,
                "titulo": lem.titulo,
                "estado": lem.estado.value,
                "proxima_execucao": proxima,
            }
        )
    return {"items": res_items, "page": page, "total": total}


@router.get("/{lembrete_id}", response_model=LembreteDetalheOut)
def obter_lembrete(
    lembrete_id: str,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    lem = (
        db.query(Lembrete)
        .filter(Lembrete.id == lembrete_id, Lembrete.usuario_id == user.id)
        .first()
    )
    if not lem:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")

    # canais
    canais = [
        {
            "id": str(c.id),
            "canal": c.canal.value,
            "ordem": c.ordem,
            "habilitado": c.habilitado,
            "config": c.config or {},
        }
        for c in lem.canais
    ]
    # destinatários
    dests = []
    for d in lem.destinatarios:
        dests.append(
            {
                "id": str(d.id),
                "cliente_id": str(d.cliente_id) if d.cliente_id else None,
                "contato_avulso": (
                    None
                    if d.cliente_id
                    else {"nome": d.nome, "telefone": d.telefone, "email": d.email}
                ),
            }
        )

    # subtipo (monta dicionário simples)
    subtipo = None
    if lem.tipo == LembreteTipoEnum.cobranca and lem.cobranca:
        subtipo = {
            "cobranca": {
                "valor": float(lem.cobranca.valor),
                "vencimento": lem.cobranca.vencimento,
                "link_pagamento": lem.cobranca.link_pagamento,
                "gateway": lem.cobranca.gateway.value if lem.cobranca.gateway else None,
                "status_pagamento": lem.cobranca.status_pagamento.value,
                "payment_external_id": lem.cobranca.payment_external_id,
                "metadados": lem.cobranca.metadados or {},
            }
        }
    elif lem.tipo == LembreteTipoEnum.documento and lem.documento:
        subtipo = {
            "documento": {
                "lista_documentos": lem.documento.lista_documentos,
                "deadline": lem.documento.deadline,
                "instrucao_upload": lem.documento.instrucao_upload,
            }
        }
    elif lem.tipo == LembreteTipoEnum.agendamento and lem.agendamento:
        subtipo = {
            "agendamento": {
                "data_hora": lem.agendamento.data_hora,
                "local": lem.agendamento.local,
                "link_meeting": lem.agendamento.link_meeting,
            }
        }
    elif lem.tipo == LembreteTipoEnum.aviso and lem.aviso:
        subtipo = {"aviso": {"nota": lem.aviso.nota}}

    return {
        "id": str(lem.id),
        "tipo": lem.tipo.value,
        "titulo": lem.titulo,
        "estado": lem.estado.value,
        "template_id": str(lem.template_id) if lem.template_id else None,
        "conteudo": lem.conteudo,
        "payload": lem.payload,
        "agendamento": {
            "timezone": lem.timezone,
            "dt_inicio": lem.dt_inicio,
            "dt_fim": lem.dt_fim,
            "rrule": lem.rrule,
            "recorrente": lem.recorrente,
            "quiet_hours_start": lem.quiet_hours_start,
            "quiet_hours_end": lem.quiet_hours_end,
        },
        "canais": canais,
        "destinatarios": dests,
        "subtipo": subtipo,
    }


@router.post("/preview", response_model=PreviewOut)
def preview(
    body: PreviewIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    msg = body.conteudo.get("mensagem")
    if not msg:
        raise HTTPException(status_code=400, detail="conteudo.mensagem é obrigatório")

    context: Dict[str, Any] = {}
    if body.exemplo_cliente_id:
        cli = (
            db.query(Cliente)
            .filter(
                Cliente.id == body.exemplo_cliente_id, Cliente.usuario_id == user.id
            )
            .first()
        )
        if not cli:
            raise HTTPException(
                status_code=404, detail="Cliente de exemplo não encontrado"
            )
        primeiro_nome = (cli.nome or "").split(" ")[0]
        context["cliente"] = {"nome": cli.nome, "primeiro_nome": primeiro_nome}

    try:
        rendered = render_message(msg, body.payload or {}, context=context)
    except TemplateError as e:
        raise HTTPException(status_code=400, detail=f"Template inválido: {e}")

    return {"render": rendered}


@router.post("/simular-recorrencia", response_model=SimularRecorrenciaOut)
def simular_recorrencia(body: SimularRecorrenciaIn):
    try:
        inst = next_occurrences(
            body.rrule, body.dt_inicio, body.timezone, limit=body.limite
        )
        return {"instantes": inst}
    except Exception as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.put("/{lembrete_id}", response_model=LembreteDetalheOut)
def atualizar_lembrete(
    lembrete_id: str,
    body: LembreteUpdate,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    lem = (
        db.query(Lembrete)
        .filter(Lembrete.id == lembrete_id, Lembrete.usuario_id == user.id)
        .first()
    )
    if not lem:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")
    if lem.estado == EstadoLembreteEnum.cancelado:
        raise HTTPException(
            status_code=409, detail="Lembrete cancelado não pode ser editado"
        )

    # valida template se fornecido
    if body.conteudo:
        msg = body.conteudo.get("mensagem")
        if not msg:
            raise HTTPException(
                status_code=400, detail="conteudo.mensagem é obrigatório"
            )
        try:
            render_message(
                msg,
                body.payload or lem.payload or {},
                context={"cliente": {"primeiro_nome": "Cliente"}},
            )
        except Exception as e:
            raise HTTPException(status_code=400, detail=f"Template inválido: {e}")

    # valida rrule se fornecida/recorrente
    regen_agenda = False
    if body.agendamento:
        ag = body.agendamento
        if ag.recorrente and (ag.rrule is None or ag.rrule == ""):
            raise HTTPException(
                status_code=400, detail="RRULE obrigatória quando recorrente=true"
            )
        if ag.recorrente and ag.rrule:
            try:
                validate_rrule(ag.rrule, ag.dt_inicio, ag.timezone)
            except Exception as e:
                raise HTTPException(status_code=400, detail=str(e))
        # marcar para regenerar
        regen_agenda = True
        # aplicar campos
        lem.timezone = ag.timezone or lem.timezone
        lem.dt_inicio = ag.dt_inicio or lem.dt_inicio
        lem.dt_fim = ag.dt_fim if ag.dt_fim is not None else lem.dt_fim
        lem.rrule = ag.rrule if ag.rrule is not None else lem.rrule
        lem.recorrente = ag.recorrente
        lem.quiet_hours_start = (
            ag.quiet_hours_start
            if ag.quiet_hours_start is not None
            else lem.quiet_hours_start
        )
        lem.quiet_hours_end = (
            ag.quiet_hours_end
            if ag.quiet_hours_end is not None
            else lem.quiet_hours_end
        )

    _apply_update_on_lembrete(lem, body)

    # canais/destinatários
    if body.canais is not None:
        _replace_canais(db, lem, [c.dict() for c in body.canais])
    if body.destinatarios is not None:
        _replace_destinatarios(db, lem, [d.dict() for d in body.destinatarios])

    db.flush()
    # validar consistência canais x destinatários
    if body.canais is not None or body.destinatarios is not None:
        _validate_destinatarios_canals(db, user, lem.canais, lem.destinatarios)

    # subtipo (se informado) — recria
    if body.subtipo is not None:
        _replace_subtipo(db, lem, body, is_update=True)

    # regenerar ocorrências futuras se mudou agendamento, canais ou destinatários
    if regen_agenda or body.canais is not None or body.destinatarios is not None:
        from dateutil.tz import gettz

        tz = gettz(lem.timezone or "America/Sao_Paulo")
        now_tz = datetime.now(tz)
        # apaga apenas as futuras (mantém histórico)
        db.query(LembreteOcorrencia).filter(
            LembreteOcorrencia.lembrete_id == lem.id,
            LembreteOcorrencia.dt_programada >= now_tz,
        ).delete(synchronize_session=False)
        db.flush()
        ensure_future_window(db, lem, horizon_days=14)

    db.commit()

    # Reutiliza o mesmo retorno do GET/{id}
    return obter_lembrete(lembrete_id, db, user)


@router.patch("/{lembrete_id}/estado", response_model=EstadoPatchOut)
def patch_estado(
    lembrete_id: str,
    body: EstadoPatchIn,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    lem = (
        db.query(Lembrete)
        .filter(Lembrete.id == lembrete_id, Lembrete.usuario_id == user.id)
        .first()
    )
    if not lem:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")

    if body.acao == "pausar":
        if lem.estado != EstadoLembreteEnum.agendado:
            raise HTTPException(
                status_code=409, detail="Só é possível pausar lembretes agendados"
            )
        lem.estado = EstadoLembreteEnum.pausado

    elif body.acao == "retomar":
        if lem.estado != EstadoLembreteEnum.pausado:
            raise HTTPException(
                status_code=409, detail="Só é possível retomar lembretes pausados"
            )
        lem.estado = EstadoLembreteEnum.agendado

    elif body.acao == "cancelar":
        if lem.estado not in (EstadoLembreteEnum.agendado, EstadoLembreteEnum.pausado):
            raise HTTPException(
                status_code=409,
                detail="Lembrete já está cancelado ou em estado inválido",
            )
        lem.estado = EstadoLembreteEnum.cancelado
        # marca ocorrências futuras como canceladas
        from dateutil.tz import gettz

        tz = gettz(lem.timezone or "America/Sao_Paulo")
        now_tz = datetime.now(tz)
        db.query(LembreteOcorrencia).filter(
            LembreteOcorrencia.lembrete_id == lem.id,
            LembreteOcorrencia.dt_programada >= now_tz,
        ).update(
            {LembreteOcorrencia.status: StatusOcorrenciaEnum.cancelado},
            synchronize_session=False,
        )

    db.commit()
    return {"id": str(lem.id), "estado": lem.estado.value}


@router.get("/{lembrete_id}/ocorrencias", response_model=PageOcorrenciasOut)
def listar_ocorrencias(
    lembrete_id: str,
    status: Optional[str] = None,
    desde: Optional[datetime] = None,
    ate: Optional[datetime] = None,
    page: int = 1,
    page_size: int = 20,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    lem = (
        db.query(Lembrete)
        .filter(Lembrete.id == lembrete_id, Lembrete.usuario_id == user.id)
        .first()
    )
    if not lem:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")

    q = db.query(LembreteOcorrencia).filter(LembreteOcorrencia.lembrete_id == lem.id)

    if status:
        try:
            status_enum = _map_str_enum(StatusOcorrenciaEnum, status)
            q = q.filter(LembreteOcorrencia.status == status_enum)
        except HTTPException:
            raise HTTPException(status_code=400, detail="status inválido")

    if desde:
        q = q.filter(LembreteOcorrencia.dt_programada >= desde)
    if ate:
        q = q.filter(LembreteOcorrencia.dt_programada <= ate)

    total = q.count()
    rows = (
        q.order_by(LembreteOcorrencia.dt_programada.asc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    items = []
    for o in rows:
        d = o.destinatario
        dest_dict = {
            "id": str(d.id),
            "cliente_id": str(d.cliente_id) if d.cliente_id else None,
            "nome": d.nome,
            "telefone": d.telefone,
            "email": d.email,
        }
        items.append(
            {
                "id": str(o.id),
                "destinatario": dest_dict,
                "dt_programada": o.dt_programada,
                "status": o.status.value,
                "canal_usado": o.canal_usado.value if o.canal_usado else None,
                "tentativas": o.tentativas,
                "ultimo_erro": o.ultimo_erro,
            }
        )

    return {"items": items, "page": page, "total": total}


@router.delete("/{lembrete_id}", status_code=204)
def deletar_lembrete(
    lembrete_id: str,
    db: Session = Depends(get_db),
    user: Usuario = Depends(get_current_user),
):
    lem = (
        db.query(Lembrete)
        .filter(Lembrete.id == lembrete_id, Lembrete.usuario_id == user.id)
        .first()
    )
    if not lem:
        raise HTTPException(status_code=404, detail="Lembrete não encontrado")
    # política v1: deletar de fato (cascade) — se preferir só cancelar, use o PATCH acima
    db.delete(lem)
    db.commit()
