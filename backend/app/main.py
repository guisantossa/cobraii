import os

from app.db.session import engine
from app.models.models import Base
from app.v1 import routes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Cobraii API", version="1.0.0")


cors_origins = os.getenv("CORS_ORIGINS", "")
origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # OU use `origins` se quiser limitar depois
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(routes.api_router, prefix="/api/v1")

# Cria tabelas se não existirem (só pra dev)
Base.metadata.create_all(bind=engine)
