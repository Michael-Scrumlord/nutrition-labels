# config.py
#
# Reads configuration from environment variables (with sensible defaults).
# Import `settings` anywhere you need the DB path or CORS origins.

from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    db_path: str = "data/nutrition.db"
    cors_origins: list[str] = ["http://localhost:5173", "http://localhost:80"]

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


settings = Settings()
