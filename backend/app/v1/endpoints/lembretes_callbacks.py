# app/api/v1/routers/lembretes_callbacks.py
from uuid import UUID

from app.core.security import require_callback_basic
from app.db.session import get_db
from app.schemas.callbacks import CallbackOcorrenciaIn
from app.schemas.lembretes_ocorrencias import LembreteOcorrenciaOut
from app.services.lembretes_ocorrencias import aplicar_callback_ocorrencia
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter(prefix="/lembretes/ocorrencias", tags=["Callbacks Lembretes"])


@router.post(
    "/{ocorrencia_id}/callback",
    response_model=LembreteOcorrenciaOut,
    dependencies=[Depends(require_callback_basic)],
)
def callback_ocorrencia(
    ocorrencia_id: UUID,
    payload: CallbackOcorrenciaIn,
    db: Session = Depends(get_db),
):
    """
    Endpoint para o n8n retornar o resultado de envio de uma ocorrência.
    """
    oc = aplicar_callback_ocorrencia(db, ocorrencia_id, payload)
    return oc
