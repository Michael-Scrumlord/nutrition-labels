# main.py
#
# Creates the FastAPI app and registers the three routes.
# Each route does: validate → fetch → calculate → return.
# No business logic lives here.

import logging

from fastapi import FastAPI, HTTPException, Response, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import JSONResponse
from slowapi import Limiter
from slowapi.errors import RateLimitExceeded
from slowapi.util import get_remote_address

from app import database, search as search_module, nutrition, pdf
from app.config import settings
from app.models import (
    FoodSearchResult,
    FoodDetail,
    MacroProfile,
    PortionSize,
    GenerateLabelRequest,
)
from app.constants import NUTRIENT_FIELDS

logger = logging.getLogger(__name__)

app = FastAPI(title="NutritionLabels API")

# Initialize the rate limiter
limiter = Limiter(key_func=get_remote_address)
app.state.limiter = limiter


@app.exception_handler(RateLimitExceeded)
async def rate_limit_handler(request: Request, exc: RateLimitExceeded) -> JSONResponse:
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


app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_credentials=False,
    allow_methods=["GET", "POST"],
    allow_headers=["Content-Type"],
)


@app.get("/api/search", response_model=list[FoodSearchResult])
def search(query: str = "") -> list[dict]:
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
def get_food(fdc_id: int) -> FoodDetail:
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


@app.post("/api/generate_label")
@limiter.limit("10/minute")
def generate_label(request: Request, payload: GenerateLabelRequest) -> Response:
    """
    Calculate macros for the recipe, render the FDA label as HTML,
    convert to PDF, and return the binary PDF as a download.

    The backend recalculates macros independently — this is intentional.
    It catches any drift between frontend and backend constants.
    """
    # Fetch all food rows in one query
    fdc_ids = [ing.fdc_id for ing in payload.ingredients]
    food_rows = database.get_foods_by_ids(fdc_ids)

    # Make sure every fdc_id was found
    found_ids = {row["fdc_id"] for row in food_rows}
    missing = [fid for fid in fdc_ids if fid not in found_ids]
    if missing:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown ingredient fdc_id(s): {missing}",
        )

    # Calculate per-serving macros
    try:
        unrounded_macros, macros = nutrition.calculate_recipe_macros(
            payload.ingredients, food_rows, payload.portion_divisor
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

    # Render the label and generate the PDF
    html = pdf.render_label_html(macros, payload, unrounded_macros)
    pdf_bytes = pdf.generate_pdf(html)

    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": 'attachment; filename="nutrition_label.pdf"'},
    )
