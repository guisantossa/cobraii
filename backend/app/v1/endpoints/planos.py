# app/api/v1/planos.py
from typing import List

from app.crud.planos import get_plano_by_id, list_planos
from app.db.session import get_db
from app.schemas.planos import PlanoOut
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.get("/", response_model=List[PlanoOut])
def listar_planos(db: Session = Depends(get_db)):
    return list_planos(db)


@router.get("/{plano_id}", response_model=PlanoOut)
def obter_plano(plano_id: str, db: Session = Depends(get_db)):
    plano = get_plano_by_id(db, plano_id)
    if not plano:
        raise HTTPException(status_code=404, detail="Plano não encontrado")
    return plano
