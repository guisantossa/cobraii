# app/v1/endpoints/logs.py
from typing import Optional
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Usuario
from app.services.audit import list_audit_logs
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

router = APIRouter(prefix="/logs", tags=["Logs"])


@router.get("/audit")
def get_audit_logs(
    entidade_tipo: Optional[str] = Query(None),
    entidade_id: Optional[UUID] = Query(None),
    acao: Optional[str] = Query(None),
    usuario_id: Optional[UUID] = Query(None, description="Filtra por ator específico"),
    desde: Optional[str] = Query(None, description="YYYY-MM-DD ou ISO"),
    ate: Optional[str] = Query(None, description="YYYY-MM-DD ou ISO"),
    page: int = Query(1, ge=1),
    page_size: int = Query(20, ge=1, le=100),
    include_system: bool = Query(True, description="Incluir logs sem usuario_id"),
    scope: str = Query("actor", regex="^(actor|all)$"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    """
    Retorna logs de auditoria com filtros e paginação.
    - scope='actor' (default): somente logs do usuário atual (e system se include_system=True)
    - scope='all': sem filtro por ator (recomendado apenas para admin)
    """
    return list_audit_logs(
        db,
        usuario.id,
        entidade_tipo=entidade_tipo,
        entidade_id=entidade_id,
        acao=acao,
        usuario_id=usuario_id,
        desde=desde,
        ate=ate,
        page=page,
        page_size=page_size,
        include_system=include_system,
        scope=scope,
    )
