import os

from dotenv import load_dotenv
from pydantic import BaseSettings

load_dotenv()


class Settings(BaseSettings):
    app_name: str = os.getenv("APP_NAME", "FastAPI App")
    environment: str = os.getenv("ENVIRONMENT", "dev")
    database_url: str = os.getenv("DATABASE_URL")


settings = Settings()
