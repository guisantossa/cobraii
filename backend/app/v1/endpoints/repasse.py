from datetime import datetime
from uuid import UUID

from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Cobranca, Repasse, Usuario
from app.schemas.repasse import MetodoRepasseEnum, RepasseOut, StatusRepasseEnum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/{cobranca_id}", response_model=RepasseOut)
def criar_repasse(
    cobranca_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(
            Cobranca.id == cobranca_id,
            Cobranca.usuario_id == usuario.id,
            Cobranca.status == "pago",
        )
        .first()
    )

    if not cobranca:
        raise HTTPException(
            status_code=404, detail="Cobrança não elegível para repasse."
        )

    # Verifica se já existe repasse
    if cobranca.repasse:
        raise HTTPException(status_code=400, detail="Repasse já realizado.")

    taxa = round(cobranca.valor * 0.03, 2)  # Ex: 3%
    liquido = round(cobranca.valor - taxa, 2)

    novo_repasse = Repasse(
        cobranca_id=cobranca.id,
        valor_bruto=cobranca.valor,
        taxa=taxa,
        valor_liquido=liquido,
        metodo=MetodoRepasseEnum.pix_manual,
        status=StatusRepasseEnum.efetuado,
        data_repassado=datetime.now(),
    )

    cobranca.status = "repassado"

    db.add(novo_repasse)
    db.commit()
    db.refresh(novo_repasse)
    return novo_repasse


@router.get("/{cobranca_id}", response_model=RepasseOut)
def obter_repasse(
    cobranca_id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    repasse = (
        db.query(Repasse)
        .join(Cobranca)
        .filter(Cobranca.id == cobranca_id, Cobranca.usuario_id == usuario.id)
        .first()
    )

    if not repasse:
        raise HTTPException(status_code=404, detail="Repasse não encontrado.")
    return repasse
