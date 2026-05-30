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


# ---------------------------------------------------------------------------
# Validation constants
# ---------------------------------------------------------------------------

MAX_NAME_LENGTH = 120         # Max length for ingredient/label names
MAX_INGREDIENT_AMOUNT = 1_000_000  # Max amount in any unit conversion
MIN_INGREDIENTS = 1           # Minimum ingredients required
MAX_INGREDIENTS = 100         # Maximum ingredients allowed
MIN_PORTION_DIVISOR = 1       # Minimum servings
MAX_PORTION_DIVISOR = 999     # Maximum servings
MIN_WIDTH = 2                 # Minimum label width in inches (FDA min)
MAX_WIDTH = 12                # Maximum label width in inches
MIN_HEIGHT = 2                # Minimum label height in inches (matches frontend clamp)
MAX_HEIGHT = 20               # Maximum label height in inches


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
        cleaned = _strip_control(v).strip()
        if not cleaned:
            raise ValueError("name must not be empty after stripping control characters")
        return cleaned

    @field_validator("unit")
    @classmethod
    def unit_must_be_valid(cls, v: str) -> str:
        valid = set(UNIT_CONVERSIONS.keys())
        if v not in valid:
            raise ValueError(f"unit must be one of {sorted(valid)}")
        return v


class GenerateLabelRequest(BaseModel):
    """The full payload sent when the user clicks Generate PDF."""
    model_config = ConfigDict(extra="forbid")

    portion_divisor: int = Field(8, ge=MIN_PORTION_DIVISOR, le=MAX_PORTION_DIVISOR)
    label_name: str = Field("", max_length=MAX_NAME_LENGTH)
    width_inches: float = Field(2.75, ge=MIN_WIDTH, le=MAX_WIDTH)
    height_inches: float | None = Field(None, ge=MIN_HEIGHT, le=MAX_HEIGHT)
    ingredients: list[IngredientItem] = Field(..., min_length=MIN_INGREDIENTS, max_length=MAX_INGREDIENTS)

    @field_validator("label_name")
    @classmethod
    def label_name_no_control_chars(cls, v: str) -> str:
        return _strip_control(v).strip()

    # Snap dimensions to 0.01" so float noise (e.g. 2.7500000001) can't drift
    # the WeasyPrint @page size between identical-looking client requests.
    @field_validator("width_inches")
    @classmethod
    def round_width(cls, v: float) -> float:
        return round(v, 2)

    @field_validator("height_inches")
    @classmethod
    def round_height(cls, v: float | None) -> float | None:
        return None if v is None else round(v, 2)


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
