# app/api/routes/feedbacks.py
from app.core.dependencies import (  # igual ao get_current_user, mas pode ser None
    get_current_user,
)
from app.crud.feedbacks import create_feedback
from app.db.session import get_db
from app.schemas.feedbacks import FeedbackIn, FeedbackOut
from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

router = APIRouter()


@router.post("/", response_model=FeedbackOut, status_code=201, tags=["Feedback"])
def enviar_feedback(
    payload: FeedbackIn,
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
):
    fb = create_feedback(db, getattr(user, "id", None), payload)
    return fb
