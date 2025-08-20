# app/scripts/run_marcar_atrasadas.py
from __future__ import annotations

from app.crud.faturas import marcar_faturas_atrasadas
from app.db.session import SessionLocal

# --- IMPORTA OS MODELS ANTES DE USAR A SESSÃO (REGISTRA MAPPERS) ---
from app.models import (  # noqa: F401  ← importante: este módulo deve importar TODOS os models
    cobrancas,
    faturas,
    lembretes,
    lembretes_ocorrencias,
    templates,
)
from app.models.models import (  # noqa: F401  ← importante: este módulo deve importar TODOS os models
    Cliente,
    Usuario,
)


def main() -> int:
    db = SessionLocal()
    try:
        afetadas = marcar_faturas_atrasadas(db)
        print(f"[OK] Faturas marcadas como 'atrasado': {afetadas}")
        return 0
    except Exception as e:
        print(f"[ERRO] Falha ao marcar faturas atrasadas: {type(e).__name__}: {e}")
        return 1
    finally:
        db.close()


if __name__ == "__main__":
    raise SystemExit(main())
