# app/v1/endpoints/templates.py
from uuid import UUID

from app.core.dependencies import get_current_user
from app.crud import templates as crud_templates
from app.db.session import get_db
from app.models.models import Usuario
from app.schemas.templates import (
    TemplateCreate,
    TemplateListOut,
    TemplateOut,
    TemplateUpdate,
)
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

router = APIRouter(prefix="", tags=["Templates"])


@router.get("/", response_model=TemplateListOut)
def listar_templates(
    page: int = Query(1, ge=1, description="Página (>=1)"),
    page_size: int = Query(20, ge=1, le=100, description="Itens por página (1..100)"),
    canal: str | None = Query(None, description="whatsapp | email | sms | todos"),
    search: str | None = Query(None, description="Busca por título/corpo"),
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    total, items = crud_templates.list_templates(
        db=db,
        usuario_id=usuario.id,
        page=page,
        page_size=page_size,
        canal=canal,
        search=search,
    )
    return TemplateListOut(
        total=total,
        page=page,
        page_size=page_size,
        items=items,
    )


@router.post("/", response_model=TemplateOut, status_code=status.HTTP_201_CREATED)
def criar_template(
    payload: TemplateCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = crud_templates.create_template(db=db, usuario_id=usuario.id, data=payload)
    return obj


@router.get("/{template_id}", response_model=TemplateOut)
def obter_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = crud_templates.get_template_by_id(
        db=db, usuario_id=usuario.id, template_id=template_id
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return obj


@router.put("/{template_id}", response_model=TemplateOut)
def atualizar_template(
    template_id: UUID,
    payload: TemplateUpdate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    obj = crud_templates.update_template(
        db=db, usuario_id=usuario.id, template_id=template_id, data=payload
    )
    if not obj:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return obj


@router.delete("/{template_id}", status_code=status.HTTP_204_NO_CONTENT)
def deletar_template(
    template_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    ok = crud_templates.delete_template(
        db=db, usuario_id=usuario.id, template_id=template_id
    )
    if not ok:
        raise HTTPException(status_code=404, detail="Template não encontrado")
    return None
