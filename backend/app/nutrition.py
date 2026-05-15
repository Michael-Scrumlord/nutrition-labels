# nutrition.py
#
# Pure math — no database access, no HTTP, no side effects.
# Given ingredient data and food rows, returns per-serving nutrient totals.

from app.models import IngredientItem, MacroProfile
from app.constants import UNIT_CONVERSIONS, FDA_DAILY_VALUES, NUTRIENT_FIELDS


def calculate_recipe_macros(
    ingredients: list[IngredientItem],
    food_rows: list,        # sqlite3.Row objects (or dicts) from database.get_foods_by_ids()
    portion_divisor: int,
) -> MacroProfile:
    """
    Scale each ingredient's macros to its actual weight, sum everything up,
    then divide by the number of servings.

    The math, step by step:
      1. Convert the user's chosen amount to grams:
            grams = amount × UNIT_CONVERSIONS[unit]
      2. Scale from per-100g to actual grams:
            multiplier = grams / 100
      3. For each nutrient:
            contribution = db_value × multiplier
      4. Sum contributions across all ingredients.
      5. Divide every total by portion_divisor to get per-serving values.
      6. Round: calories → integer, all others → 1 decimal place.
    """
    if portion_divisor <= 0:
        raise ValueError("portion_divisor must be at least 1")

    # Build a lookup dict so we can find macros by fdc_id in O(1)
    food_lookup = {row["fdc_id"]: row for row in food_rows}

    # Accumulate totals across all ingredients
    totals: dict[str, float] = {field: 0.0 for field in NUTRIENT_FIELDS}

    for ingredient in ingredients:
        food = food_lookup.get(ingredient.fdc_id)
        if food is None:
            raise ValueError(
                f"fdc_id {ingredient.fdc_id} not found in the provided food rows"
            )

        # How many grams of this ingredient are in the recipe?
        grams = ingredient.amount * UNIT_CONVERSIONS[ingredient.unit]

        # The DB stores values per 100g, so scale proportionally
        multiplier = grams / 100.0

        for field in NUTRIENT_FIELDS:
            raw = food[field]
            totals[field] += (raw or 0.0) * multiplier

    # Divide everything by the number of servings
    per_serving = {field: value / portion_divisor for field, value in totals.items()}

    # Round to label-appropriate precision
    per_serving["calories"] = round(per_serving["calories"])
    for field in NUTRIENT_FIELDS:
        if field != "calories":
            per_serving[field] = round(per_serving[field], 1)

    return MacroProfile(**per_serving)


def compute_daily_value_pct(value: float, nutrient: str) -> int | None:
    """
    Return the %DV for a nutrient as an integer (e.g. 12 means 12%),
    or None if that nutrient has no established daily value
    (calories, sugar, and protein have no DV — show a dash for those).

    Note: when the computed value is 0 but the raw value > 0, the caller
    should display "<1%" rather than "0%".
    """
    daily_value = FDA_DAILY_VALUES.get(nutrient)
    if daily_value is None:
        return None
    return round((value / daily_value) * 100)
