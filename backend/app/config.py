# config.py
#
# Reads configuration from environment variables (with sensible defaults).
# Import `settings` anywhere you need the DB path or CORS origins.

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    db_path: str = "data/nutrition.db"

    # CORS — empty in production (frontend is same-origin behind nginx/Caddy).
    # Set CORS_ORIGINS as a JSON array or comma-separated list via env for dev.
    cors_origins: list[str] = []

    # Trusted reverse-proxy IPs that may set X-Forwarded-For. Comma-separated.
    # Set to "*" only behind a controlled edge (e.g. Caddy on the same host).
    forwarded_allow_ips: str = "127.0.0.1"

    # Hard cap on request body bytes (rejected before parsing).
    max_body_bytes: int = 64 * 1024  # 64 KB

    # Rate limits (slowapi syntax). Per client IP.
    rate_limit_search: str = "60/minute"
    rate_limit_food: str = "120/minute"
    rate_limit_generate: str = "10/minute"

    # PDF generation concurrency cap (in-process semaphore).
    pdf_max_concurrency: int = 4
    # Per-request PDF generation timeout (seconds).
    pdf_timeout_seconds: float = 10.0

    # Reported by /api/health for release tracking.
    release_sha: str = "dev"

    model_config = SettingsConfigDict(
        env_file=".env",
        env_file_encoding="utf-8",
    )


settings = Settings()
