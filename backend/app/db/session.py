import os

from dotenv import load_dotenv
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")

engine = create_engine(
    DATABASE_URL,
    pool_pre_ping=True,  # testa a conexão antes de usar
    pool_recycle=300,  # recicla conexões antigas (segundos)
    pool_size=5,
    max_overflow=10,
    pool_timeout=30,
    future=True,
)

SessionLocal = sessionmaker(
    autocommit=False, autoflush=False, bind=engine, expire_on_commit=False, future=True
)


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
