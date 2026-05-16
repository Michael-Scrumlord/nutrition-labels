# test_nutrition_edge_cases.py
#
# Edge-case tests for nutrition.py — scenarios intentionally not covered
# in test_nutrition.py (which handles the golden paths).
# All tests use plain dicts as food rows — no database needed.

import pytest
from app.nutrition import calculate_recipe_macros, compute_daily_value_pct
from app.models import IngredientItem
from app.constants import UNIT_CONVERSIONS


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_ingredient(fdc_id: int, amount: float, unit: str = "g") -> IngredientItem:
    return IngredientItem(fdc_id=fdc_id, name="Test Food", amount=amount, unit=unit)


def butter_row() -> dict:
    return {
        "fdc_id": 1097512,
        "calories": 717, "fat_total_g": 81.1, "fat_saturated_g": 51.4,
        "cholesterol_mg": 215, "sodium_mg": 11, "carbohydrates_total_g": 0.1,
        "fiber_g": 0.0, "sugar_g": 0.1, "protein_g": 0.9,
        "vitamin_d_mcg": 1.5, "calcium_mg": 24, "iron_mg": 0.02, "potassium_mg": 24,
    }


def olive_oil_row() -> dict:
    return {
        "fdc_id": 1103301,
        "calories": 884, "fat_total_g": 100.0, "fat_saturated_g": 13.8,
        "cholesterol_mg": 0, "sodium_mg": 2, "carbohydrates_total_g": 0.0,
        "fiber_g": 0.0, "sugar_g": 0.0, "protein_g": 0.0,
        "vitamin_d_mcg": 0.0, "calcium_mg": 1, "iron_mg": 0.56, "potassium_mg": 1,
    }


def zero_row() -> dict:
    """A food with all-zero macros (e.g. water). Represents the lower bound."""
    return {
        "fdc_id": 9999001,
        "calories": 0, "fat_total_g": 0.0, "fat_saturated_g": 0.0,
        "cholesterol_mg": 0, "sodium_mg": 0, "carbohydrates_total_g": 0.0,
        "fiber_g": 0.0, "sugar_g": 0.0, "protein_g": 0.0,
        "vitamin_d_mcg": 0.0, "calcium_mg": 0, "iron_mg": 0.0, "potassium_mg": 0,
    }


def null_row() -> dict:
    """A food row where every nutrient value is None.
    This can happen if an optional DB column was never populated.
    The `or 0.0` guard in nutrition.py must handle this gracefully.
    """
    return {
        "fdc_id": 9999002,
        "calories": None, "fat_total_g": None, "fat_saturated_g": None,
        "cholesterol_mg": None, "sodium_mg": None, "carbohydrates_total_g": None,
        "fiber_g": None, "sugar_g": None, "protein_g": None,
        "vitamin_d_mcg": None, "calcium_mg": None, "iron_mg": None, "potassium_mg": None,
    }


# ---------------------------------------------------------------------------
# calculate_recipe_macros — unit conversion edge cases
# ---------------------------------------------------------------------------

def test_lb_unit_conversion():
    """1 lb = 453.592 g. 1 lb of butter should scale macros by 4.53592."""
    ingredient = make_ingredient(1097512, 1, "lb")
    result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    expected_calories = round(717 * UNIT_CONVERSIONS["lb"] / 100)
    assert result.calories == expected_calories  # ~3252 kcal


def test_kg_unit_conversion():
    """1 kg = 1000 g. Macros should scale by a factor of 10."""
    ingredient = make_ingredient(1097512, 1, "kg")
    result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    expected_calories = round(717 * UNIT_CONVERSIONS["kg"] / 100)
    assert result.calories == expected_calories  # 7170 kcal


def test_ml_treated_the_same_as_g():
    """1 ml = 1 g (water-density assumption). Results must be identical."""
    g_ingredient  = make_ingredient(1097512, 100, "g")
    ml_ingredient = make_ingredient(1097512, 100, "ml")
    g_result  = calculate_recipe_macros([g_ingredient],  [butter_row()], portion_divisor=1)
    ml_result = calculate_recipe_macros([ml_ingredient], [butter_row()], portion_divisor=1)
    assert g_result.calories == ml_result.calories
    assert g_result.fat_total_g == ml_result.fat_total_g
    assert g_result.protein_g == ml_result.protein_g


def test_mixed_units_in_one_recipe():
    """A recipe using both 'g' and 'oz' should accumulate grams correctly."""
    butter_g  = make_ingredient(1097512, 100, "g")      # 100 g
    butter_oz = IngredientItem(fdc_id=1097512, name="Butter oz", amount=1, unit="oz")  # 28.3495 g
    result = calculate_recipe_macros(
        [butter_g, butter_oz], [butter_row()], portion_divisor=1
    )
    total_grams = 100 + UNIT_CONVERSIONS["oz"]          # 128.3495 g
    expected_calories = round(717 * total_grams / 100)
    assert result.calories == expected_calories


# ---------------------------------------------------------------------------
# calculate_recipe_macros — portion divisor boundary values
# ---------------------------------------------------------------------------

def test_divisor_at_minimum_boundary():
    """portion_divisor=1 returns the full recipe totals, undivided."""
    ingredient = make_ingredient(1097512, 100, "g")
    result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    assert result.calories == 717
    assert result.fat_total_g == 81.1


def test_divisor_at_maximum_boundary():
    """portion_divisor=999 produces near-zero per-serving values for a small recipe."""
    ingredient = make_ingredient(1097512, 100, "g")
    result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=999)
    # 717 cal / 999 ≈ 0.718 → rounds to 1; fat 81.1 / 999 ≈ 0.081 → rounds to 0.1
    assert result.calories <= 1
    assert result.fat_total_g <= 0.1


def test_negative_divisor_raises():
    """portion_divisor < 0 must raise ValueError, not silently produce wrong results."""
    ingredient = make_ingredient(1097512, 100, "g")
    with pytest.raises(ValueError, match="portion_divisor"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=-5)


# ---------------------------------------------------------------------------
# calculate_recipe_macros — amount edge cases
# ---------------------------------------------------------------------------

def test_very_small_amount_does_not_raise():
    """A trace amount (0.001 g) is valid and returns near-zero values."""
    ingredient = make_ingredient(1097512, 0.001, "g")
    result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    # 717 * 0.001 / 100 = 0.00717 cal → rounds to 0
    assert result.calories == 0
    assert result.fat_total_g == 0.0


def test_large_amount_high_calorie_food():
    """1 kg of olive oil (884 cal/100 g) should produce ~8840 kcal."""
    ingredient = make_ingredient(1103301, 1, "kg")
    result = calculate_recipe_macros([ingredient], [olive_oil_row()], portion_divisor=1)
    expected = round(884 * 1000 / 100)
    assert result.calories == expected  # 8840


# ---------------------------------------------------------------------------
# calculate_recipe_macros — food row data quality
# ---------------------------------------------------------------------------

def test_all_zero_macro_ingredient_contributes_nothing():
    """A food with all-zero macros should not change the recipe totals."""
    water   = make_ingredient(9999001, 500, "g")
    butter  = make_ingredient(1097512, 100, "g")
    combined = calculate_recipe_macros(
        [water, butter], [zero_row(), butter_row()], portion_divisor=1
    )
    butter_only = calculate_recipe_macros([butter], [butter_row()], portion_divisor=1)
    assert combined.calories == butter_only.calories
    assert combined.fat_total_g == butter_only.fat_total_g
    assert combined.protein_g == butter_only.protein_g


def test_null_nutrient_values_treated_as_zero():
    """If a food row has None for all nutrients, it must be treated as all zeros."""
    null_food = make_ingredient(9999002, 100, "g")
    result = calculate_recipe_macros([null_food], [null_row()], portion_divisor=1)
    assert result.calories == 0
    assert result.fat_total_g == 0.0
    assert result.protein_g == 0.0
    assert result.sodium_mg == 0.0


def test_null_and_nonzero_rows_accumulate_correctly():
    """Mixing a null row with a real food row should give the real food's macros."""
    null_food = make_ingredient(9999002, 200, "g")
    butter    = make_ingredient(1097512, 100, "g")
    result = calculate_recipe_macros(
        [null_food, butter], [null_row(), butter_row()], portion_divisor=1
    )
    # Null food contributes 0; only butter's macros should show
    assert result.calories == 717
    assert result.fat_total_g == 81.1


# ---------------------------------------------------------------------------
# compute_daily_value_pct — edge cases
# ---------------------------------------------------------------------------

def test_dv_exactly_100_percent():
    """Exactly the reference DV should return 100."""
    assert compute_daily_value_pct(2300, "sodium_mg") == 100
    assert compute_daily_value_pct(78, "fat_total_g") == 100
    assert compute_daily_value_pct(28, "fiber_g") == 100


def test_dv_exceeds_100_percent():
    """A value double the DV should return 200."""
    assert compute_daily_value_pct(4600, "sodium_mg") == 200
    assert compute_daily_value_pct(156, "fat_total_g") == 200


def test_dv_zero_input():
    """Zero value for a DV-tracked nutrient should return 0."""
    assert compute_daily_value_pct(0, "fat_total_g") == 0
    assert compute_daily_value_pct(0, "sodium_mg") == 0


def test_dv_no_daily_value_nutrients_return_none():
    """Nutrients without an FDA daily value must return None."""
    assert compute_daily_value_pct(500, "calories") is None
    assert compute_daily_value_pct(20, "sugar_g") is None
    assert compute_daily_value_pct(50, "protein_g") is None


def test_dv_rounds_up_at_threshold():
    """15 mg sodium / 2300 mg = 0.652% → rounds to 1 (not 0)."""
    assert compute_daily_value_pct(15, "sodium_mg") == 1


def test_dv_rounds_down_to_zero():
    """1 mg sodium / 2300 mg = 0.043% → rounds to 0."""
    assert compute_daily_value_pct(1, "sodium_mg") == 0


def test_dv_vitamin_d_half():
    """10 mcg vitamin D = 50% DV (reference = 20 mcg)."""
    assert compute_daily_value_pct(10, "vitamin_d_mcg") == 50


def test_dv_calcium_quarter():
    """325 mg calcium / 1300 mg DV = 25%."""
    assert compute_daily_value_pct(325, "calcium_mg") == 25
