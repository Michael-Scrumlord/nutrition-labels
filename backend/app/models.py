# models.py
#
# All Pydantic models in one file.
# Request models describe what comes in from the client.
# Response models describe what goes back out.

from pydantic import BaseModel, Field, field_validator
from app.constants import UNIT_CONVERSIONS


# Control chars (including newlines, tabs, RTL overrides) that would corrupt
# the rendered PDF if smuggled into a user-supplied string field.
_CONTROL_CHARS = set(chr(c) for c in range(0, 32)) | {chr(0x7F), "‮", "‭", "‎", "‏"}


def _strip_control(value: str) -> str:
    return "".join(ch for ch in value if ch not in _CONTROL_CHARS)


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class IngredientItem(BaseModel):
    """One ingredient in a recipe: which food, how much, and what unit."""
    fdc_id: int
    name: str = Field(min_length=1, max_length=120)
    amount: float
    unit: str

    @field_validator("name")
    @classmethod
    def name_no_control_chars(cls, v: str) -> str:
        cleaned = _strip_control(v).strip()
        if not cleaned:
            raise ValueError("name must not be empty after stripping control characters")
        return cleaned

    @field_validator("amount")
    @classmethod
    def amount_in_range(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        if v > 1_000_000:
            raise ValueError("amount is unreasonably large")
        return v

    @field_validator("unit")
    @classmethod
    def unit_must_be_valid(cls, v: str) -> str:
        valid = set(UNIT_CONVERSIONS.keys())
        if v not in valid:
            raise ValueError(f"unit must be one of {valid}")
        return v


class GenerateLabelRequest(BaseModel):
    """The full payload sent when the user clicks Generate PDF."""
    portion_divisor: int = 8
    label_name: str = Field(default="", max_length=120)
    width_inches: float = 2.75
    height_inches: float | None = None
    ingredients: list[IngredientItem] = Field(min_length=1, max_length=50)

    @field_validator("label_name")
    @classmethod
    def label_name_no_control_chars(cls, v: str) -> str:
        return _strip_control(v).strip()

    @field_validator("portion_divisor")
    @classmethod
    def divisor_in_range(cls, v: int) -> int:
        if v < 1 or v > 999:
            raise ValueError("portion_divisor must be between 1 and 999")
        return v

    @field_validator("width_inches")
    @classmethod
    def width_in_range(cls, v: float) -> float:
        if v <= 0 or v > 20:
            raise ValueError("width_inches must be between 0 and 20")
        return v

    @field_validator("height_inches")
    @classmethod
    def height_in_range(cls, v: float | None) -> float | None:
        if v is not None and (v <= 0 or v > 20):
            raise ValueError("height_inches must be between 0 and 20")
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
