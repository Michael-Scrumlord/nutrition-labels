# Backend Dockerfile
# Multi-stage: builder installs deps; final image runs as non-root.
# The SQLite database is NOT baked in — it lives on the nutrition_db Docker volume
# and is built once by the db-init service on first deploy.

FROM python:3.11-slim AS builder

# WeasyPrint system dependencies (Pango, Cairo, GDK-Pixbuf)
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libcairo-gobject2 \
    libgdk-pixbuf-2.0-0 \
    libffi-dev \
    shared-mime-info \
    && rm -rf /var/lib/apt/lists/*

WORKDIR /app

COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

COPY app/ ./app/
COPY templates/ ./templates/

# ── Final image ───────────────────────────────────────────────────────────
FROM python:3.11-slim AS final

RUN apt-get update && apt-get install -y --no-install-recommends \
    libpango-1.0-0 \
    libpangocairo-1.0-0 \
    libcairo2 \
    libcairo-gobject2 \
    libgdk-pixbuf-2.0-0 \
    shared-mime-info \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Run as a dedicated unprivileged user.
RUN groupadd --system --gid 1001 app \
    && useradd --system --uid 1001 --gid app --home /app --shell /usr/sbin/nologin app

WORKDIR /app

COPY --from=builder /usr/local/lib/python3.11 /usr/local/lib/python3.11
COPY --from=builder /usr/local/bin /usr/local/bin
COPY --from=builder --chown=app:app /app /app

USER app

EXPOSE 8000

HEALTHCHECK --interval=30s --timeout=5s --start-period=15s --retries=3 \
    CMD curl -fsS http://127.0.0.1:8000/api/health || exit 1

# Gunicorn supervises uvicorn workers — restarts crashed workers, gives us
# a real process model for production. Workers = 2 by default; override in compose.
# Access log emits one JSON object per request, matching the app log format
# in app/main.py — pipe both through `jq` or ship straight to an aggregator.
CMD ["gunicorn", "app.main:app", \
     "--workers", "2", \
     "--worker-class", "uvicorn.workers.UvicornWorker", \
     "--bind", "0.0.0.0:8000", \
     "--forwarded-allow-ips", "*", \
     "--access-logfile", "-", \
     "--access-logformat", "{\"client\":\"%(h)s\",\"method\":\"%(m)s\",\"path\":\"%(U)s\",\"query\":\"%(q)s\",\"status\":%(s)s,\"duration_ms\":%(M)s,\"length\":\"%(B)s\",\"ua\":\"%(a)s\"}", \
     "--error-logfile", "-", \
     "--timeout", "30"]
