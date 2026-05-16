# models.py
#
# All Pydantic models in one file.
# Request models describe what comes in from the client.
# Response models describe what goes back out.

from pydantic import BaseModel, Field, field_validator
from app.constants import UNIT_CONVERSIONS


# ---------------------------------------------------------------------------
# Validation constants
# ---------------------------------------------------------------------------

MAX_NAME_LENGTH = 120         # Max length for ingredient/label names
MAX_INGREDIENT_AMOUNT = 1_000_000  # Max amount in any unit conversion
MIN_INGREDIENTS = 1           # Minimum ingredients required
MAX_INGREDIENTS = 100         # Maximum ingredients allowed
MIN_PORTION_DIVISOR = 1       # Minimum servings
MAX_PORTION_DIVISOR = 999     # Maximum servings
MIN_WIDTH = 0.1               # Minimum label width in inches
MAX_WIDTH = 12                # Maximum label width in inches
MAX_HEIGHT = 20               # Maximum label height in inches


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class IngredientItem(BaseModel):
    """One ingredient in a recipe: which food, how much, and what unit."""
    fdc_id: int
    name: str = Field(..., min_length=1, max_length=MAX_NAME_LENGTH)  # Display name on the label (user can edit this)
    amount: float = Field(..., gt=0, le=MAX_INGREDIENT_AMOUNT)
    unit: str        # Must be a key in UNIT_CONVERSIONS: g, ml, oz, lb, kg

    @field_validator("unit")
    @classmethod
    def unit_must_be_valid(cls, v: str) -> str:
        valid = set(UNIT_CONVERSIONS.keys())
        if v not in valid:
            raise ValueError(f"unit must be one of {valid}")
        return v


class GenerateLabelRequest(BaseModel):
    """The full payload sent when the user clicks Generate PDF."""
    portion_divisor: int = Field(8, ge=MIN_PORTION_DIVISOR, le=MAX_PORTION_DIVISOR)       # How many servings are in the batch
    label_name: str = Field("", max_length=MAX_NAME_LENGTH)           # Optional recipe name printed above the label
    width_inches: float = Field(2.75, gt=MIN_WIDTH, le=MAX_WIDTH)        # Label width for the PDF page
    height_inches: float | None = Field(None, gt=0, le=MAX_HEIGHT)  # None = WeasyPrint auto-sizes height
    ingredients: list[IngredientItem] = Field(..., min_length=MIN_INGREDIENTS, max_length=MAX_INGREDIENTS)

    @field_validator("width_inches")
    @classmethod
    def width_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("width_inches must be greater than 0")
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
    modifier: str    # e.g. "tablespoon", "cup", "slice"
    gram_weight: float


class FoodDetail(BaseModel):
    """Full data for one food: macros + known portion sizes."""
    fdc_id: int
    name: str
    macros: MacroProfile
    portions: list[PortionSize]
