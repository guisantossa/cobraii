from datetime import datetime

from app.db.session import get_db
from app.models.models import Cobranca, Pagamento
from fastapi import APIRouter, Depends, HTTPException, Request
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/webhook", tags=["Pagamentos"])
async def receber_webhook_asaas(request: Request, db: Session = Depends(get_db)):
    payload = await request.json()

    # ASAAS dispara vários tipos de evento
    if payload.get("event") != "PAYMENT_RECEIVED":
        return {"message": "Evento ignorado"}

    payment = payload.get("payment")
    if not payment:
        raise HTTPException(
            status_code=400, detail="Pagamento não encontrado no payload."
        )

    cobranca = (
        db.query(Cobranca).filter(Cobranca.asaas_payment_id == payment["id"]).first()
    )
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")

    cobranca.status = "pago"
    pagamento = Pagamento(
        cobranca_id=cobranca.id,
        valor_bruto=payment["value"],
        forma_pagamento=payment["billingType"],
        data_pagamento=datetime.fromisoformat(payment["paymentDate"]),
    )

    db.add(pagamento)
    db.commit()
    return {"message": "Pagamento registrado com sucesso"}
