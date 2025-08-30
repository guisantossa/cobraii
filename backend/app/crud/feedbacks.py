# app/crud/feedbacks.py
from app.models.feedbacks import Feedback
from app.schemas.feedbacks import FeedbackIn
from sqlalchemy.orm import Session


def create_feedback(db: Session, usuario_id, data: FeedbackIn) -> Feedback:
    fb = Feedback(
        usuario_id=usuario_id,
        tipo=data.tipo,
        comentario=(data.comentario or "").strip() or None,
        rating=data.rating,
        origem=(data.origem or "").strip() or None,
        contexto=data.contexto or {},
    )
    db.add(fb)
    db.commit()
    db.refresh(fb)
    return fb
