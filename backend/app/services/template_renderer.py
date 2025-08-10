from typing import Any, Dict

from jinja2 import Environment, StrictUndefined

# Ambiente de template: falha se placeholder faltar (StrictUndefined)
_env = Environment(
    undefined=StrictUndefined, autoescape=False, trim_blocks=True, lstrip_blocks=True
)


class TemplateError(Exception):
    pass


def render_message(
    content_template: str,
    payload: Dict[str, Any],
    context: Dict[str, Any] | None = None,
) -> str:
    """
    Renderiza mensagem usando Jinja2.
    - content_template: string com placeholders, ex: "Olá {{cliente.primeiro_nome}}, vence em {{vencimento}}"
    - payload: dict com dados específicos do lembrete (ex: valor, vencimento, link_pagamento)
    - context: dict com dados padrão (cliente.*, usuario.*, etc.)
    """
    try:
        template = _env.from_string(content_template)
        data = {}
        if context:
            data.update(context)
        if payload:
            data.update(payload)
        return template.render(**data)
    except Exception as e:
        raise TemplateError(str(e))


def extract_placeholders(content_template: str) -> list[str]:
    """Extrai nomes de variáveis encontradas no template (heurística simples)."""
    ast = _env.parse(content_template)
    # atributos do tipo a.b contam como 'a' (você pode customizar se quiser listar todos)
    return list(
        sorted(
            {
                n.name
                for n in ast.find_all(
                    type(ast.__class__.__mro__[1].__dict__.get("Name", object))
                )
                if hasattr(n, "name")
            }
        )
    )
