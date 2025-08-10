import os

from fastapi import Header, HTTPException, status

INTERNAL_API_KEY = os.getenv("INTERNAL_API_KEY", "")


def require_internal_api_key(
    x_api_key: str | None = Header(None, convert_underscores=False)
):
    if not INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="INTERNAL_API_KEY não configurada",
        )
    if x_api_key != INTERNAL_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="X-API-Key inválida"
        )
    return True
