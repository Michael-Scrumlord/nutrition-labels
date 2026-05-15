# models.py
#
# All Pydantic models in one file.
# Request models describe what comes in from the client.
# Response models describe what goes back out.

from pydantic import BaseModel, field_validator


# ---------------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------------

class IngredientItem(BaseModel):
    """One ingredient in a recipe: which food, how much, and what unit."""
    fdc_id: int
    name: str        # Display name on the label (user can edit this)
    amount: float
    unit: str        # Must be a key in UNIT_CONVERSIONS: g, ml, oz, lb, kg

    @field_validator("amount")
    @classmethod
    def amount_must_be_positive(cls, v: float) -> float:
        if v <= 0:
            raise ValueError("amount must be greater than 0")
        return v

    @field_validator("unit")
    @classmethod
    def unit_must_be_valid(cls, v: str) -> str:
        valid = {"g", "ml", "oz", "lb", "kg"}
        if v not in valid:
            raise ValueError(f"unit must be one of {valid}")
        return v


class GenerateLabelRequest(BaseModel):
    """The full payload sent when the user clicks Generate PDF."""
    portion_divisor: int = 8       # How many servings are in the batch
    label_name: str = ""           # Optional recipe name printed above the label
    width_inches: float = 2.75     # Label width for the PDF page
    height_inches: float | None = None  # None = WeasyPrint auto-sizes height
    ingredients: list[IngredientItem]

    @field_validator("portion_divisor")
    @classmethod
    def divisor_in_range(cls, v: int) -> int:
        if v < 1 or v > 999:
            raise ValueError("portion_divisor must be between 1 and 999")
        return v

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
