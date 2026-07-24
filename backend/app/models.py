# models.py
#
# All Pydantic models in one file.
# Request models describe what comes in from the client.
# Response models describe what goes back out.

from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator
from app.constants import UNIT_CONVERSIONS


# Control chars (including newlines, tabs, RTL overrides) that would corrupt
# the rendered PDF if smuggled into a user-supplied string field.
# frozenset signals immutability and is marginally faster for `in` lookups.
_CONTROL_CHARS: frozenset[str] = frozenset(
    chr(c) for c in range(0, 32)
) | frozenset({chr(0x7F), "‮", "‭", "‎", "‏"})


def _strip_control(value: str) -> str:
    return "".join(ch for ch in value if ch not in _CONTROL_CHARS)


def _clean_string(v: str, *, allow_empty: bool = False) -> str:
    """Strip control chars and surrounding whitespace from a string field.

    Raises ValueError if the result is empty and allow_empty is False.
    """
    cleaned = _strip_control(v).strip()
    if not allow_empty and not cleaned:
        raise ValueError("must not be empty after stripping control characters")
    return cleaned


# ---------------------------------------------------------------------------
# Validation constants
# ---------------------------------------------------------------------------

MAX_NAME_LENGTH = 120         # Max length for ingredient/label names
MAX_INGREDIENT_AMOUNT = 1_000_000  # Max amount in any unit conversion


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class IngredientItem(BaseModel):
    """One ingredient in a recipe: which food, how much, and what unit."""
    model_config = ConfigDict(extra="forbid")

    fdc_id: int
    name: str = Field(..., min_length=1, max_length=MAX_NAME_LENGTH)
    amount: float = Field(..., gt=0, le=MAX_INGREDIENT_AMOUNT)
    unit: str

    @field_validator("name")
    @classmethod
    def name_no_control_chars(cls, v: str) -> str:
        return _clean_string(v, allow_empty=False)

    @field_validator("unit")
    @classmethod
    def unit_must_be_valid(cls, v: str) -> str:
        valid = set(UNIT_CONVERSIONS.keys())
        if v not in valid:
            raise ValueError(f"unit must be one of {sorted(valid)}")
        return v


# ---------------------------------------------------------------------------
# Response models
# ---------------------------------------------------------------------------

class MacroProfile(BaseModel):
    """Per-serving nutrient totals for a recipe (or raw values for one food)."""
    calories: float
    fat_total_g: float
    fat_saturated_g: float
    cholesterol_mg: float
    sodium_mg: float
    carbohydrates_total_g: float
    fiber_g: float
    sugar_g: float
    protein_g: float
    vitamin_d_mcg: float
    calcium_mg: float
    iron_mg: float
    potassium_mg: float


class FoodSearchResult(BaseModel):
    """One item in a search results list."""
    fdc_id: int
    name: str
    data_type: str | None = None


class PortionSize(BaseModel):
    """A known portion size for a food (e.g. 1 tablespoon = 14.2g)."""
    amount: float
    modifier: str
    gram_weight: float


class FoodDetail(BaseModel):
    """Full data for one food: macros + known portion sizes."""
    fdc_id: int
    name: str
    macros: MacroProfile
    portions: list[PortionSize]


class HealthResponse(BaseModel):
    """Response body for GET /api/health."""
    status: Literal["ok"]
    release: str
