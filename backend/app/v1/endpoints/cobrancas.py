import os
from typing import List
from uuid import UUID

import requests
from app.core.dependencies import get_current_user
from app.db.session import get_db
from app.models.models import Cliente, Cobranca, Usuario
from app.schemas.cobrancas import CobrancaCreate, CobrancaOut, StatusCobrancaEnum
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

router = APIRouter()

ASAAS_API_URL = "https://sandbox.asaas.com/api/v3"
ASAAS_TOKEN = os.getenv("ASAAS_TOKEN")  # defina isso no seu .env


@router.post("/", response_model=CobrancaOut)
def criar_cobranca(
    dados: CobrancaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cliente = (
        db.query(Cliente)
        .filter(Cliente.id == dados.cliente_id, Cliente.usuario_id == usuario.id)
        .first()
    )
    if not cliente:
        raise HTTPException(status_code=404, detail="Cliente não encontrado.")

    # 👉 Criar cobrança no ASAAS
    payload = {
        "customer": cliente.documento,  # assume que você já criou o cliente no ASAAS e salvou esse ID
        "billingType": "PIX",
        "value": dados.valor,
        "dueDate": str(dados.vencimento),
        "description": dados.descricao,
    }

    headers = {"Content-Type": "application/json", "access_token": ASAAS_TOKEN}

    response = requests.post(f"{ASAAS_API_URL}/payments", json=payload, headers=headers)
    if response.status_code != 200:
        raise HTTPException(status_code=500, detail="Erro ao criar cobrança no ASAAS")

    res_data = response.json()

    nova_cobranca = Cobranca(
        usuario_id=usuario.id,
        cliente_id=cliente.id,
        valor=dados.valor,
        descricao=dados.descricao,
        vencimento=dados.vencimento,
        canal_envio=dados.canal_envio,
        status=StatusCobrancaEnum.pendente,
        asaas_payment_id=res_data["id"],
        link_pagamento=res_data.get("invoiceUrl"),
    )

    db.add(nova_cobranca)
    db.commit()
    db.refresh(nova_cobranca)
    return nova_cobranca


@router.get("/", response_model=List[CobrancaOut])
def listar_cobrancas(
    db: Session = Depends(get_db), usuario: Usuario = Depends(get_current_user)
):
    return db.query(Cobranca).filter(Cobranca.usuario_id == usuario.id).all()


@router.get("/{id}", response_model=CobrancaOut)
def obter_cobranca(
    id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == id, Cobranca.usuario_id == usuario.id)
        .first()
    )
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")
    return cobranca


@router.put("/{id}", response_model=CobrancaOut)
def atualizar_cobranca(
    id: UUID,
    dados: CobrancaCreate,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == id, Cobranca.usuario_id == usuario.id)
        .first()
    )
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")

    cobranca.valor = dados.valor
    cobranca.descricao = dados.descricao
    cobranca.vencimento = dados.vencimento
    cobranca.canal_envio = dados.canal_envio

    db.commit()
    db.refresh(cobranca)
    return cobranca


@router.delete("/{id}", status_code=204)
def cancelar_cobranca(
    id: UUID,
    db: Session = Depends(get_db),
    usuario: Usuario = Depends(get_current_user),
):
    cobranca = (
        db.query(Cobranca)
        .filter(Cobranca.id == id, Cobranca.usuario_id == usuario.id)
        .first()
    )
    if not cobranca:
        raise HTTPException(status_code=404, detail="Cobrança não encontrada.")

    # Cancela também no ASAAS
    headers = {"access_token": ASAAS_TOKEN}
    requests.delete(
        f"{ASAAS_API_URL}/payments/{cobranca.asaas_payment_id}", headers=headers
    )

    db.delete(cobranca)
    db.commit()
