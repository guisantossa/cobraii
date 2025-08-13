# ---------- base ----------
FROM python:3.11-slim AS base
ENV PYTHONDONTWRITEBYTECODE=1 \
    PYTHONUNBUFFERED=1 \
    PIP_NO_CACHE_DIR=1 \
    TZ=America/Sao_Paulo

# deps de sistema (ajuste libpq-dev se usar outro driver)
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential libpq-dev tzdata curl \
  && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# ---------- deps ----------
# Mantém cache de deps entre builds
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ---------- app ----------
COPY . .

# Se quiser rodar como não-root:
# RUN useradd -m appuser && chown -R appuser:appuser /app
# USER appuser

EXPOSE 8000

# Variáveis comuns (ajuste no Compose/ambiente real)

# Sobe migrações e inicia a API
CMD ["sh", "-c", "alembic upgrade head && uvicorn app.main:app --host 0.0.0.0 --port 8000 --workers ${UVICORN_WORKERS:-1}"]
