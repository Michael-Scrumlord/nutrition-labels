# main.py
#
# Creates the FastAPI app and registers routes.
# Wires CORS, rate limiting, body-size enforcement, and a /api/health probe.

import logging
import os
import sys
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app import database, search as search_module
from app.config import settings
from app.models import (
    FoodSearchResult,
    FoodDetail,
    HealthResponse,
)

# One JSON object per log line. Pipe `docker compose logs backend` through
# `jq` for filtering, or ship straight to an aggregator without reformatting.
# LOG_LEVEL overridable via env (default INFO).
logging.basicConfig(
    level=os.environ.get("LOG_LEVEL", "INFO"),
    format='{"ts":"%(asctime)s","lvl":"%(levelname)s","logger":"%(name)s","msg":"%(message)s"}',
    stream=sys.stdout,
)

logger = logging.getLogger("nutritionlabels")

limiter = Limiter(key_func=get_remote_address, default_limits=[])


class BodySizeLimitMiddleware(BaseHTTPMiddleware):
    """Reject oversized bodies before FastAPI parses them."""

    def __init__(self, app, max_bytes: int):
        super().__init__(app)
        self.max_bytes = max_bytes

    async def dispatch(self, request: Request, call_next):
        content_length = request.headers.get("content-length")
        if content_length is not None:
            try:
                if int(content_length) > self.max_bytes:
                    return JSONResponse(
                        status_code=413,
                        content={"detail": "Request body too large"},
                    )
            except ValueError:
                return JSONResponse(status_code=400, content={"detail": "Invalid Content-Length"})
        return await call_next(request)


app = FastAPI(title="NutritionLabels API", docs_url=None, redoc_url=None, openapi_url=None)
app.state.limiter = limiter

app.add_middleware(BodySizeLimitMiddleware, max_bytes=settings.max_body_bytes)

# Reject requests whose Host header isn't in our allow-list. Defense-in-depth
# against Host-header injection; also blocks the random-IP scanners that hit
# the bare server IP looking for vhosts.
app.add_middleware(TrustedHostMiddleware, allowed_hosts=settings.allowed_hosts)

# CORS is only needed when the frontend is served from a different origin
# (typical only in local dev). In prod, nginx/Caddy proxies /api/ same-origin.
if settings.cors_origins:
    app.add_middleware(
        CORSMiddleware,
        allow_origins=settings.cors_origins,
        allow_credentials=False,
        allow_methods=["GET", "POST"],
        allow_headers=["Content-Type"],
    )


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(_request: Request, exc: RateLimitExceeded) -> JSONResponse:
    retry_after = getattr(exc, "retry_after", None)
    headers = {"Retry-After": str(retry_after)} if retry_after else {}
    return JSONResponse(
        status_code=429,
        content={"detail": "Too many requests — please wait before generating another label."},
        headers=headers,
    )


@app.exception_handler(Exception)
async def unhandled_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    logger.exception("Unhandled error on %s %s", request.method, request.url.path)
    return JSONResponse(
        status_code=500,
        content={"detail": "An unexpected server error occurred. Please try again."},
    )


@app.get("/api/health", response_model=HealthResponse)
def health() -> HealthResponse:
    """
    Liveness + readiness in one. Probes the DB so a missing/corrupt
    nutrition.db volume surfaces as an unhealthy container instead of
    silently 500ing every real request.
    """
    try:
        with database.get_connection() as conn:
            conn.execute("SELECT 1 FROM food_macros LIMIT 1").fetchone()
    except Exception:
        logger.exception("health check db probe failed")
        raise HTTPException(status_code=503, detail="database unavailable")
    return HealthResponse(status="ok", release=settings.release_sha)


@app.get("/api/search", response_model=list[FoodSearchResult])
@limiter.limit(settings.rate_limit_search)
def search(
    request: Request,
    query: str = Query("", max_length=100),
) -> list[dict]:
    """
    Search foods by name. Returns up to 40 results ranked by relevance:
    prefix matches first (alphabetically), then contains matches (alphabetically).
    Returns an empty list if the query is less than 2 characters.
    """
    if len(query) < 2:
        return []
    rows = database.search_foods(query)
    return search_module.ranked_search(query, rows)


@app.get("/api/food/{fdc_id}", response_model=FoodDetail)
@limiter.limit(settings.rate_limit_food)
def get_food(
    request: Request,
    fdc_id: Annotated[int, Path(ge=1, description="USDA FoodData Central food ID")],
) -> FoodDetail:
    """
    Return full macro data and portion sizes for one food.
    Returns 404 if the fdc_id is not in the database.
    """
    food = database.get_food_by_id(fdc_id)
    if food is None:
        raise HTTPException(status_code=404, detail=f"Food with fdc_id {fdc_id} not found")

    return FoodDetail.from_db_rows(food, database.get_portions_by_id(fdc_id))


# NOTE: PDF generation now happens entirely client-side via @react-pdf/renderer
# (see frontend/src/components/label/LabelPdfDoc.tsx). The former
# POST /api/generate_label WeasyPrint endpoint was retired so the label has a
# single source of truth (frontend labelSpec.ts) and the in-app preview matches
# the downloaded PDF exactly.
