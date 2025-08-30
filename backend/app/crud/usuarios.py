# app/crud/usuarios.py
from typing import List

from app.audit.logger import audit_log
from app.core.security import hash_password, verify_password
from app.crud.planos import get_plano_by_nome
from app.models.enums import CanalLembreteEnum
from app.models.models import Usuario
from app.models.templates import TemplateMensagem
from app.schemas.usuarios import UsuarioCreate
from fastapi import HTTPException
from sqlalchemy.orm import Session


def _jsonify(o):
    from datetime import date as _date
    from datetime import datetime
    from uuid import UUID

    if isinstance(o, (datetime, _date)):
        return o.isoformat()
    if isinstance(o, UUID):
        return str(o)
    if isinstance(o, dict):
        return {k: _jsonify(v) for k, v in o.items()}
    if isinstance(o, (list, tuple)):
        return type(o)(_jsonify(v) for v in o)
    return o


def _default_templates_payload(usuario_id) -> List[TemplateMensagem]:
    """
    Retorna 10 templates padrão, apenas com placeholders de USUÁRIO/CLIENTE/LEMBRETE.
    Placeholders usados:
      - {USUARIO_NOME}
      - {CLIENTE_NOME}
      - {LEMBRETE_TITULO}
      - {LEMBRETE_DESCRICAO}
    """
    # atalhos para enum (ajuste os nomes se o seu Enum tiver valores em maiúsculas, etc.)
    WHATS = CanalLembreteEnum.whatsapp
    EMAIL = CanalLembreteEnum.email
    SMS = CanalLembreteEnum.sms

    T = []

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Confirmação de presença",
            corpo=(
                "Olá {CLIENTE_NOME}, tudo bem? Confirmando nosso compromisso "
                "{LEMBRETE_DESCRICAO} em {DATA} às {HORA}. "
                "Responda CONFIRMO ou REMARCAR. — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_DESCRICAO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Lembrete: compromisso amanhã",
            corpo=(
                "Olá {CLIENTE_NOME}! Só lembrando do compromisso {LEMBRETE_DESCRICAO} "
                "amanhã, {DATA}, às {HORA}. Qualquer ajuste me avise. — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_DESCRICAO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Lembrete: compromisso hoje",
            corpo=(
                "{CLIENTE_NOME}, passando para lembrar do compromisso {LEMBRETE_DESCRICAO} "
                "hoje às {HORA}. Nos vemos! — {USUARIO_NOME}"
            ),
            placeholders=["CLIENTE_NOME", "LEMBRETE_DESCRICAO", "HORA", "USUARIO_NOME"],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Reunião online",
            corpo=(
                "Olá {CLIENTE_NOME}, reunião {LEMBRETE_TITULO} em {DATA} às {HORA}. "
                "O link de acesso será enviado por este canal. — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_TITULO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=EMAIL,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Visita agendada",
            corpo=(
                "{CLIENTE_NOME}, sua visita referente a {LEMBRETE_DESCRICAO} está marcada "
                "para {DATA} às {HORA}. — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_DESCRICAO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Manutenção agendada",
            corpo=(
                "Olá {CLIENTE_NOME}! Manutenção de {LEMBRETE_DESCRICAO} em {DATA} às {HORA}. "
                "Se precisar remarcar, me avise. — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_DESCRICAO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Documentação pendente",
            corpo=(
                "{CLIENTE_NOME}, lembrete de documentação: {LEMBRETE_DESCRICAO}. "
                "Precisamos até {DATA}. Fico à disposição. — {USUARIO_NOME}"
            ),
            placeholders=["CLIENTE_NOME", "LEMBRETE_DESCRICAO", "DATA", "USUARIO_NOME"],
            canal=EMAIL,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Renovação/recorrência",
            corpo=(
                "Olá {CLIENTE_NOME}, lembrando que {LEMBRETE_DESCRICAO} renova em {DATA}. "
                "Se quiser ajustar, responda esta mensagem. — {USUARIO_NOME}"
            ),
            placeholders=["CLIENTE_NOME", "LEMBRETE_DESCRICAO", "DATA", "USUARIO_NOME"],
            canal=WHATS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Retorno/Follow-up",
            corpo=(
                "{CLIENTE_NOME}, tudo certo por aí? Retomando o tema: {LEMBRETE_DESCRICAO}. "
                "Podemos avançar em {DATA} às {HORA}? — {USUARIO_NOME}"
            ),
            placeholders=[
                "CLIENTE_NOME",
                "LEMBRETE_DESCRICAO",
                "DATA",
                "HORA",
                "USUARIO_NOME",
            ],
            canal=SMS,
        )
    )

    T.append(
        TemplateMensagem(
            usuario_id=usuario_id,
            titulo="[Default] Aviso de vencimento",
            corpo=(
                "{CLIENTE_NOME}, lembrete: {LEMBRETE_DESCRICAO} com prazo em {DATA}. "
                "Se já resolveu, desconsidere. Qualquer coisa, me chame. — {USUARIO_NOME}"
            ),
            placeholders=["CLIENTE_NOME", "LEMBRETE_DESCRICAO", "DATA", "USUARIO_NOME"],
            canal=WHATS,
        )
    )

    return T


def _seed_default_templates_for_user(db: Session, usuario_id) -> None:
    """
    Insere os templates padrão para o usuário se ele ainda não tiver nenhum.
    Idempotente: se já existir 1+ template, não insere nada.
    """
    exists = (
        db.query(TemplateMensagem.id)
        .filter(TemplateMensagem.usuario_id == usuario_id)
        .first()
    )
    if exists:
        return

    templates = _default_templates_payload(usuario_id)
    db.add_all(templates)
    # não commita aqui: deixe o commit do fluxo de criação do usuário
    # garantir atomicidade de tudo.


def get_usuario_by_id(db: Session, usuario_id) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.id == usuario_id).first()


def get_usuario_by_email(db: Session, email: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.email == email).first()


def get_usuario_by_documento(db: Session, documento: str) -> Usuario | None:
    return db.query(Usuario).filter(Usuario.documento == documento).first()


def create_usuario(db: Session, data: UsuarioCreate) -> Usuario:
    # unicidade...
    if get_usuario_by_email(db, data.email):
        audit_log(db, "usuario", None, "create_conflict", {"email": data.email})
        db.commit()
        raise HTTPException(status_code=400, detail="Email já cadastrado.")
    if data.documento and get_usuario_by_documento(db, data.documento):
        audit_log(db, "usuario", None, "create_conflict", {"documento": data.documento})
        db.commit()
        raise HTTPException(status_code=400, detail="Documento já cadastrado.")

    # plano default = free
    plano_free = get_plano_by_nome(db, "free")
    if not plano_free:
        # fallback duro (não deveria ocorrer, pois a migração seedou)
        raise HTTPException(
            status_code=500, detail="Plano padrão 'free' não encontrado."
        )

    obj = Usuario(
        nome=data.nome,
        email=data.email,
        telefone=data.telefone,
        documento=data.documento,
        senha_hash=hash_password(data.senha),
        plano_id=plano_free.id,  # << aqui
    )
    db.add(obj)
    db.flush()

    audit_log(
        db,
        entidade_tipo="usuario",
        entidade_id=obj.id,
        acao="create",
        detalhes=_jsonify(
            {
                "nome": obj.nome,
                "email": obj.email,
                "telefone": obj.telefone,
                "documento": obj.documento,
                "plano_id": str(obj.plano_id),
            }
        ),
    )

    db.commit()
    db.refresh(obj)
    return obj


def authenticate_user(db: Session, email: str, senha: str) -> Usuario | None:
    user = get_usuario_by_email(db, email)
    if not user or not verify_password(senha, user.senha_hash):
        audit_log(db, "usuario", None, "login_failed", {"email": email})
        db.commit()
        return None

    audit_log(db, "usuario", user.id, "login", {"email": user.email})
    db.commit()
    return user
