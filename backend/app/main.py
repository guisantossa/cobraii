import os

from app.db.session import engine
from app.models.models import Base
from app.scheduler import start_scheduler
from app.v1 import routes
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.base import BaseHTTPMiddleware

app = FastAPI(title="Cobraii API", version="1.0.0")


class ForceHTTPSRedirectMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        # Só atua em redirecionamentos
        if response.status_code in (301, 302, 307, 308):
            loc = response.headers.get("location")
            if loc and loc.startswith("http://") and "api.cobraii.com.br" in loc:
                # Troca apenas o esquema, preservando resto da URL
                response.headers["location"] = loc.replace("http://", "https://", 1)
        return response


cors_origins = os.getenv("CORS_ORIGINS", "")

origins = [origin.strip() for origin in cors_origins.split(",") if origin.strip()]
print(f"CORS origins: {origins if origins else 'All (*)'}")
app.add_middleware(
    CORSMiddleware,
    allow_origins=origins if origins else ["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.add_middleware(ForceHTTPSRedirectMiddleware)
app.include_router(routes.api_router, prefix="/api/v1")
start_scheduler(app)

# Cria tabelas se não existirem (só pra dev)
Base.metadata.create_all(bind=engine)
