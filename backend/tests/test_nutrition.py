# test_nutrition.py
#
# Tests for the pure math in nutrition.py.
# All tests use the known foods from conftest.py — no database needed here,
# we pass food data as plain dicts.

import pytest
from app.nutrition import calculate_recipe_macros, compute_daily_value_pct
from app.models import IngredientItem, MacroProfile


# ---------------------------------------------------------------------------
# Helpers — build a minimal food dict for one food
# ---------------------------------------------------------------------------

def butter_row():
    """Butter macros per 100g as a dict (mimics a sqlite3.Row)."""
    return {
        "fdc_id": 1097512,
        "calories": 717, "fat_total_g": 81.1, "fat_saturated_g": 51.4,
        "cholesterol_mg": 215, "sodium_mg": 11, "carbohydrates_total_g": 0.1,
        "fiber_g": 0.0, "sugar_g": 0.1, "protein_g": 0.9,
        "vitamin_d_mcg": 1.5, "calcium_mg": 24, "iron_mg": 0.02, "potassium_mg": 24,
    }

def flour_row():
    """Flour macros per 100g."""
    return {
        "fdc_id": 1100209,
        "calories": 364, "fat_total_g": 1.0, "fat_saturated_g": 0.2,
        "cholesterol_mg": 0, "sodium_mg": 2, "carbohydrates_total_g": 76.3,
        "fiber_g": 2.7, "sugar_g": 0.3, "protein_g": 10.3,
        "vitamin_d_mcg": 0.0, "calcium_mg": 15, "iron_mg": 4.64, "potassium_mg": 107,
    }

def make_ingredient(fdc_id: int, amount: float, unit: str = "g") -> IngredientItem:
    return IngredientItem(fdc_id=fdc_id, name="Test Food", amount=amount, unit=unit)


# ---------------------------------------------------------------------------
# Tests
# ---------------------------------------------------------------------------

def test_single_ingredient_100g():
    """100g of butter with divisor=1 should return butter's raw macros."""
    ingredient = make_ingredient(1097512, 100, "g")
    _, result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)

    assert result.calories == 717          # Integer
    assert result.fat_total_g == 81.1      # 1 decimal place
    assert result.protein_g == 0.9
    assert result.cholesterol_mg == 215.0


def test_unit_conversion_oz():
    """1 oz = 28.3495g. 1 oz of butter should give macros for 28.3495g."""
    ingredient = make_ingredient(1097512, 1, "oz")  # 28.3495g
    _, result = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)

    expected_calories = round(717 * 28.3495 / 100)
    assert result.calories == expected_calories  # ~203 kcal


def test_portion_divisor_halves_values():
    """Divisor=2 should give exactly half the macros of divisor=1."""
    ingredient = make_ingredient(1097512, 100, "g")
    _, full = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)
    _, half = calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=2)

    # Calories are integers; they might not be exactly half due to rounding
    # But fat (1 decimal) should be half within 0.1g
    assert abs(half.fat_total_g - full.fat_total_g / 2) <= 0.1
    assert abs(half.protein_g - full.protein_g / 2) <= 0.1


def test_zero_divisor_raises():
    """A portion_divisor of 0 or less must raise ValueError."""
    ingredient = make_ingredient(1097512, 100)
    with pytest.raises(ValueError, match="portion_divisor"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=0)

    with pytest.raises(ValueError, match="portion_divisor"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=-1)


def test_empty_ingredients_returns_zeros():
    """An empty ingredient list should return a MacroProfile with all zeros."""
    _, result = calculate_recipe_macros([], [], portion_divisor=8)

    assert result.calories == 0
    assert result.fat_total_g == 0.0
    assert result.protein_g == 0.0
    assert result.sodium_mg == 0.0


def test_multiple_ingredients_accumulate():
    """Two ingredients should produce the sum of their individual contributions."""
    butter = make_ingredient(1097512, 100, "g")
    flour = make_ingredient(1100209, 100, "g")

    _, combined = calculate_recipe_macros([butter, flour], [butter_row(), flour_row()], portion_divisor=1)

    expected_calories = round(717 + 364)     # 100g each, divisor=1
    assert combined.calories == expected_calories

    expected_fat = round(81.1 + 1.0, 1)
    assert combined.fat_total_g == expected_fat


def test_unknown_fdc_id_raises():
    """If a food is in the ingredients but not in food_rows, raise ValueError."""
    ingredient = make_ingredient(9999999, 100)
    with pytest.raises(ValueError, match="9999999"):
        calculate_recipe_macros([ingredient], [butter_row()], portion_divisor=1)


# ---------------------------------------------------------------------------
# Daily value tests
# ---------------------------------------------------------------------------

def test_daily_value_fat():
    """78g fat = 100% DV."""
    assert compute_daily_value_pct(78.0, "fat_total_g") == 100


def test_daily_value_sodium():
    """1150mg sodium = 50% DV (2300mg reference)."""
    assert compute_daily_value_pct(1150, "sodium_mg") == 50


def test_daily_value_no_dv_for_calories():
    """Calories have no DV — should return None."""
    assert compute_daily_value_pct(500, "calories") is None


def test_daily_value_no_dv_for_sugar():
    """Sugar has no DV — should return None."""
    assert compute_daily_value_pct(20, "sugar_g") is None


def test_daily_value_rounds_correctly():
    """39mg sodium / 2300 = 1.69...% → rounds to 2%."""
    result = compute_daily_value_pct(39, "sodium_mg")
    assert result == 2
