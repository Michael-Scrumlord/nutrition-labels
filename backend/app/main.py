# main.py
#
# Creates the FastAPI app and registers routes.
# Wires CORS, rate limiting, body-size enforcement, and a /api/health probe.

import asyncio
import logging
import os
import sys
from typing import Annotated

from fastapi import FastAPI, HTTPException, Path, Query, Request, Response
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.trustedhost import TrustedHostMiddleware

from app import database, search as search_module, nutrition, pdf
from app.config import settings
from app.models import (
    FoodSearchResult,
    FoodDetail,
    HealthResponse,
    MacroProfile,
    PortionSize,
    GenerateLabelRequest,
)
from app.constants import NUTRIENT_FIELDS

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

# Bounds concurrent WeasyPrint renders so a burst of /generate_label requests
# can't exhaust memory or pin every worker.
_pdf_semaphore = asyncio.Semaphore(settings.pdf_max_concurrency)


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

    portions = database.get_portions_by_id(fdc_id)

    return FoodDetail(
        fdc_id=food["fdc_id"],
        name=food["description"],
        macros=MacroProfile(**{field: food[field] or 0.0 for field in NUTRIENT_FIELDS}),
        portions=[
            PortionSize(
                amount=p["amount"],
                modifier=p["modifier"],
                gram_weight=p["gram_weight"],
            )
            for p in portions
        ],
    )


async def _render_pdf_with_timeout(html: str) -> bytes:
    """Run WeasyPrint in a thread, bounded by the semaphore and a timeout."""
    try:
        async with _pdf_semaphore:
            return await asyncio.wait_for(
                asyncio.to_thread(pdf.generate_pdf, html),
                timeout=settings.pdf_timeout_seconds,
            )
    except asyncio.TimeoutError:
        logger.warning("PDF generation timed out after %.1fs", settings.pdf_timeout_seconds)
        raise HTTPException(status_code=504, detail="PDF generation timed out")


@app.post("/api/generate_label")
@limiter.limit(settings.rate_limit_generate)
async def generate_label(request: Request, payload: GenerateLabelRequest) -> Response:
    """
    Calculate macros for the recipe, render the FDA label as HTML,
    convert to PDF, and return the binary PDF as a download.

    The backend recalculates macros independently — this is intentional.
    It catches any drift between frontend and backend constants.
    """
    fdc_ids = [ing.fdc_id for ing in payload.ingredients]
    food_rows = database.get_foods_by_ids(fdc_ids)

    found_ids = {row["fdc_id"] for row in food_rows}
    missing = [fid for fid in fdc_ids if fid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown ingredient fdc_id(s): {missing}",
        )

    try:
        unrounded_macros, macros = nutrition.calculate_recipe_macros(
            payload.ingredients, food_rows, payload.portion_divisor
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    html = pdf.render_label_html(macros, payload, unrounded_macros)
    pdf_bytes = await _render_pdf_with_timeout(html)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={
            "Content-Disposition": 'attachment; filename="nutrition_label.pdf"',
            "Cache-Control": "no-store",
        },
    )
