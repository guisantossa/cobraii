# app/crud/planos.py
from typing import List, Optional

from app.models.planos import Plano
from sqlalchemy.orm import Session


def list_planos(db: Session) -> List[Plano]:
    return db.query(Plano).order_by(Plano.valor_mensal.asc()).all()


def get_plano_by_id(db: Session, pid) -> Optional[Plano]:
    return db.query(Plano).filter(Plano.id == pid).first()


def get_plano_by_nome(db: Session, nome: str) -> Optional[Plano]:
    return db.query(Plano).filter(Plano.nome == nome).first()
