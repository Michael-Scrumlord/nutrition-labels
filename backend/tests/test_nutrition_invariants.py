# test_nutrition_invariants.py
#
# Tests for structural invariants across nutrition.py and constants.py:
# proportional scaling, zero-divisor guard, constant shapes and values,
# and numerical consistency between rounded and unrounded outputs.
# No database access — plain dicts used as food rows throughout.

import pytest
from app.nutrition import calculate_recipe_macros, compute_daily_value_pct, round_half_up
from app.models import IngredientItem
from app.constants import UNIT_CONVERSIONS, FDA_DAILY_VALUES, NUTRIENT_FIELDS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_ingredient(fdc_id: int, amount: float, unit: str = "g") -> IngredientItem:
    return IngredientItem(fdc_id=fdc_id, name="Test Food", amount=amount, unit=unit)


def butter_row() -> dict:
    return {
        "fdc_id": 1097512,
        "calories": 717.0,
        "fat_total_g": 81.1,
        "fat_saturated_g": 51.4,
        "cholesterol_mg": 215.0,
        "sodium_mg": 11.0,
        "carbohydrates_total_g": 0.1,
        "fiber_g": 0.0,
        "sugar_g": 0.1,
        "protein_g": 0.9,
        "vitamin_d_mcg": 1.5,
        "calcium_mg": 24.0,
        "iron_mg": 0.02,
        "potassium_mg": 24.0,
    }


# ---------------------------------------------------------------------------
# Proportional scaling
# ---------------------------------------------------------------------------

def test_doubling_amount_doubles_per_serving_calories():
    """
    200 g of a food should yield exactly twice the per-serving calories of 100 g,
    with the same portion divisor. Rounding may introduce ±1 kcal difference.
    """
    single = make_ingredient(1097512, 100, "g")
    double = make_ingredient(1097512, 200, "g")
    _, result_100 = calculate_recipe_macros([single], [butter_row()], portion_divisor=1)
    _, result_200 = calculate_recipe_macros([double], [butter_row()], portion_divisor=1)
    # Allow ±1 for rounding at the integer level
    assert abs(result_200.calories - result_100.calories * 2) <= 1


def test_doubling_amount_doubles_fat_within_rounding():
    """
    Fat (rounded to 1 decimal) for 200 g should be within 0.1 g of 2× the 100 g value.
    """
    single = make_ingredient(1097512, 100, "g")
    double = make_ingredient(1097512, 200, "g")
    _, result_100 = calculate_recipe_macros([single], [butter_row()], portion_divisor=1)
    _, result_200 = calculate_recipe_macros([double], [butter_row()], portion_divisor=1)
    assert abs(result_200.fat_total_g - result_100.fat_total_g * 2) <= 0.1


def test_doubling_divisor_halves_per_serving_calories():
    """
    Keeping the recipe fixed and doubling the portion divisor should halve
    the per-serving calories (within rounding tolerance).
    """
    ingredient = make_ingredient(1097512, 100, "g")
    _, result_div1 = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    _, result_div2 = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=2)
    # 717 / 2 = 358.5 → rounds to 359 (half-up); result_div1.calories = 717
    assert abs(result_div2.calories - result_div1.calories / 2) <= 1


def test_same_ingredient_twice_equals_double_amount():
    """
    Adding the same ingredient twice should give the same macros as a single
    ingredient at twice the amount. Verifies accumulation math.
    """
    single_double = make_ingredient(1097512, 200, "g")
    ing_a = make_ingredient(1097512, 100, "g")
    ing_b = IngredientItem(fdc_id=1097512, name="Butter copy", amount=100, unit="g")

    _, result_combined = calculate_recipe_macros([ing_a, ing_b], [butter_row()], portion_divisor=1)
    _, result_double   = calculate_recipe_macros([single_double], [butter_row()], portion_divisor=1)

    assert result_combined.calories == result_double.calories
    assert result_combined.fat_total_g == result_double.fat_total_g
    assert result_combined.protein_g == result_double.protein_g


# ---------------------------------------------------------------------------
# Divisor guard — boundary values
# ---------------------------------------------------------------------------

def test_divisor_zero_raises_value_error():
    """portion_divisor=0 triggers the <= 0 guard and must raise ValueError."""
    ingredient = make_ingredient(1097512, 100, "g")
    with pytest.raises(ValueError, match="portion_divisor"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=0)


def test_divisor_negative_one_raises_value_error():
    """portion_divisor=-1 must also raise ValueError."""
    ingredient = make_ingredient(1097512, 100, "g")
    with pytest.raises(ValueError, match="portion_divisor"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=-1)


def test_divisor_one_returns_full_totals():
    """portion_divisor=1 divides by 1, so result equals the full recipe total."""
    ingredient = make_ingredient(1097512, 100, "g")
    _, result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    assert result.calories == 717
    assert result.protein_g == pytest.approx(0.9)


# ---------------------------------------------------------------------------
# Unrounded-vs-rounded consistency
# ---------------------------------------------------------------------------

def test_unrounded_calories_within_half_unit_of_rounded():
    """
    The unrounded per-serving calories must be within 0.5 of the rounded value
    (otherwise the rounding rule is wrong).
    """
    ingredient = make_ingredient(1097512, 100, "g")
    unrounded, rounded = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    assert abs(unrounded["calories"] - rounded.calories) < 0.5


def test_unrounded_fat_within_half_tenth_of_rounded():
    """
    Fat is rounded to 1 decimal place, so the unrounded value must be within
    0.05 of the rounded value.
    """
    ingredient = make_ingredient(1097512, 100, "g")
    unrounded, rounded = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    assert abs(unrounded["fat_total_g"] - rounded.fat_total_g) < 0.05


def test_all_unrounded_fields_within_rounding_tolerance():
    """
    For every nutrient field, the absolute difference between unrounded and
    rounded must be less than the rounding unit (0.5 for calories, 0.05 for others).
    """
    ingredient = make_ingredient(1097512, 100, "g")
    unrounded, rounded = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    for field in NUTRIENT_FIELDS:
        raw = unrounded[field]
        rounded_val = getattr(rounded, field)
        tolerance = 0.5 if field == "calories" else 0.05
        assert abs(raw - rounded_val) < tolerance, (
            f"{field}: unrounded={raw}, rounded={rounded_val}, tolerance={tolerance}"
        )


# ---------------------------------------------------------------------------
# Unknown fdc_id
# ---------------------------------------------------------------------------

def test_unknown_fdc_id_raises_value_error():
    """
    If an ingredient's fdc_id is not present in food_rows, calculate_recipe_macros
    must raise ValueError — not silently produce 0 for that ingredient.
    """
    ingredient = make_ingredient(9999999, 100, "g")
    with pytest.raises(ValueError, match="fdc_id"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)


# ---------------------------------------------------------------------------
# Constants structural invariants
# ---------------------------------------------------------------------------

def test_nutrient_fields_has_exactly_13_entries():
    """NUTRIENT_FIELDS must contain exactly the 13 FDA-mandated nutrients."""
    assert len(NUTRIENT_FIELDS) == 13


def test_nutrient_fields_contains_calories():
    """Calories must be present and must be the first entry."""
    assert NUTRIENT_FIELDS[0] == "calories"


def test_nutrient_fields_no_duplicates():
    """No nutrient should appear twice in NUTRIENT_FIELDS."""
    assert len(NUTRIENT_FIELDS) == len(set(NUTRIENT_FIELDS))


def test_fda_daily_values_has_exactly_10_entries():
    """10 of the 13 nutrients have an FDA daily value (calories, sugar, protein do not)."""
    assert len(FDA_DAILY_VALUES) == 10


def test_fda_daily_values_keys_are_subset_of_nutrient_fields():
    """Every key in FDA_DAILY_VALUES must be a recognized nutrient field."""
    for key in FDA_DAILY_VALUES:
        assert key in NUTRIENT_FIELDS, f"Unexpected key in FDA_DAILY_VALUES: {key}"


def test_nutrients_without_dv_are_absent_from_fda_daily_values():
    """calories, sugar_g, and protein_g must NOT have a daily value."""
    assert "calories" not in FDA_DAILY_VALUES
    assert "sugar_g" not in FDA_DAILY_VALUES
    assert "protein_g" not in FDA_DAILY_VALUES


def test_unit_conversions_has_exactly_5_entries():
    """UNIT_CONVERSIONS must cover exactly the 5 supported units."""
    assert len(UNIT_CONVERSIONS) == 5


def test_unit_conversions_keys_are_the_five_supported_units():
    """Supported units must be g, ml, oz, lb, kg."""
    assert set(UNIT_CONVERSIONS.keys()) == {"g", "ml", "oz", "lb", "kg"}


def test_unit_conversions_all_positive():
    """Every conversion factor must be strictly positive."""
    for unit, factor in UNIT_CONVERSIONS.items():
        assert factor > 0, f"UNIT_CONVERSIONS['{unit}'] is not positive: {factor}"


def test_gram_is_base_unit():
    """UNIT_CONVERSIONS['g'] must be exactly 1.0 (grams is the base unit)."""
    assert UNIT_CONVERSIONS["g"] == 1.0


def test_ml_equals_g_conversion():
    """UNIT_CONVERSIONS['ml'] must equal UNIT_CONVERSIONS['g'] (water-density assumption)."""
    assert UNIT_CONVERSIONS["ml"] == UNIT_CONVERSIONS["g"]


def test_kg_is_1000_grams():
    """UNIT_CONVERSIONS['kg'] must be exactly 1000."""
    assert UNIT_CONVERSIONS["kg"] == 1000.0


# ---------------------------------------------------------------------------
# compute_daily_value_pct — sub-1% boundary (the <1% display scenario)
# ---------------------------------------------------------------------------

def test_compute_dv_pct_returns_zero_for_trace_sodium():
    """
    1 mg sodium / 2300 mg DV = 0.043% → rounds to 0.
    The caller is responsible for displaying '<1%' when the raw value > 0
    but this function returns 0. Verify the return is 0, not 1.
    """
    assert compute_daily_value_pct(1, "sodium_mg") == 0


def test_compute_dv_pct_returns_one_for_barely_over_half_percent():
    """
    12 mg sodium / 2300 mg DV = 0.522% → rounds to 1 (ROUND_HALF_UP).
    """
    assert compute_daily_value_pct(12, "sodium_mg") == 1


def test_compute_dv_pct_is_none_for_all_no_dv_nutrients():
    """calories, sugar_g, protein_g all lack a daily value and must return None."""
    for nutrient in ("calories", "sugar_g", "protein_g"):
        assert compute_daily_value_pct(100, nutrient) is None, (
            f"Expected None for {nutrient} but got a value"
        )


# ---------------------------------------------------------------------------
# round_half_up — correctness at boundary
# ---------------------------------------------------------------------------

def test_round_half_up_half_rounds_away_from_zero_positive():
    """0.5 must round up to 1 (not banker's rounding → 0)."""
    assert round_half_up(0.5) == 1.0


def test_round_half_up_half_rounds_away_from_zero_one_decimal():
    """0.05 at 1 decimal place must round to 0.1."""
    assert round_half_up(0.05, 1) == 0.1


def test_round_half_up_exact_integer_unchanged():
    """An exact integer value is not affected by rounding."""
    assert round_half_up(7.0, 0) == 7.0
    assert round_half_up(7.0, 1) == 7.0
