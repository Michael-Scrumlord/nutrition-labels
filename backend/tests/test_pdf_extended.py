# test_pdf_extended.py
#
# Additional edge-case tests for pdf.py — supplements test_pdf.py.
# Focuses on: unrounded_macros fallback, unit-mixed ingredient sorting,
# height CSS, single ingredient, and high %DV scenarios.

import pytest
from app.pdf import render_label_html
from app.models import MacroProfile, GenerateLabelRequest, IngredientItem


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def zero_macros() -> MacroProfile:
    return MacroProfile(
        calories=0, fat_total_g=0, fat_saturated_g=0, cholesterol_mg=0,
        sodium_mg=0, carbohydrates_total_g=0, fiber_g=0, sugar_g=0,
        protein_g=0, vitamin_d_mcg=0, calcium_mg=0, iron_mg=0, potassium_mg=0,
    )


def high_sodium_macros() -> MacroProfile:
    """4600 mg sodium = 200% DV."""
    return MacroProfile(
        calories=100, fat_total_g=0, fat_saturated_g=0, cholesterol_mg=0,
        sodium_mg=4600, carbohydrates_total_g=0, fiber_g=0, sugar_g=0,
        protein_g=0, vitamin_d_mcg=0, calcium_mg=0, iron_mg=0, potassium_mg=0,
    )


def make_request(ingredients=None, **kwargs) -> GenerateLabelRequest:
    if ingredients is None:
        ingredients = [IngredientItem(fdc_id=1, name="Butter", amount=100, unit="g")]
    defaults = {
        "portion_divisor": 8,
        "label_name": "Test",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": ingredients,
    }
    return GenerateLabelRequest(**{**defaults, **kwargs})


# ---------------------------------------------------------------------------
# unrounded_macros fallback
# ---------------------------------------------------------------------------

def test_none_unrounded_macros_falls_back_to_rounded():
    """When unrounded_macros is None, the HTML must still render without error."""
    macros = MacroProfile(
        calories=350, fat_total_g=18.5, fat_saturated_g=10.2,
        cholesterol_mg=85, sodium_mg=420, carbohydrates_total_g=42.1,
        fiber_g=2.3, sugar_g=18.0, protein_g=6.8,
        vitamin_d_mcg=0.5, calcium_mg=150, iron_mg=2.1, potassium_mg=220,
    )
    html = render_label_html(macros, make_request(), unrounded_macros=None)
    assert "Nutrition Facts" in html
    assert "350" in html


def test_explicit_unrounded_macros_used_for_dv():
    """Unrounded macros change the %DV displayed, not the displayed gram value.

    Pass unrounded sodium=1150.0 (50% DV) even though the rounded
    MacroProfile has sodium=420. The template should use 50% for sodium DV.
    """
    macros = MacroProfile(
        calories=200, fat_total_g=0, fat_saturated_g=0, cholesterol_mg=0,
        sodium_mg=420,  # 420/2300 ≈ 18% rounded DV
        carbohydrates_total_g=0, fiber_g=0, sugar_g=0,
        protein_g=0, vitamin_d_mcg=0, calcium_mg=0, iron_mg=0, potassium_mg=0,
    )
    # Supply unrounded sodium = 1150 → 50% DV
    unrounded = {
        "calories": 200, "fat_total_g": 0, "fat_saturated_g": 0,
        "cholesterol_mg": 0, "sodium_mg": 1150.0, "carbohydrates_total_g": 0,
        "fiber_g": 0, "sugar_g": 0, "protein_g": 0, "vitamin_d_mcg": 0,
        "calcium_mg": 0, "iron_mg": 0, "potassium_mg": 0,
    }
    html = render_label_html(macros, make_request(), unrounded_macros=unrounded)
    assert "50%" in html


# ---------------------------------------------------------------------------
# Custom height_inches in CSS
# ---------------------------------------------------------------------------

def test_custom_height_inches_appears_in_css():
    """When height_inches is set, it should appear in the CSS @page rule."""
    req = make_request(height_inches=5.5)
    html = render_label_html(zero_macros(), req)
    assert "5.5in" in html


def test_no_height_does_not_produce_null_in_css():
    """When height_inches is None, the string 'None' must not appear in the HTML."""
    req = make_request(height_inches=None)
    html = render_label_html(zero_macros(), req)
    assert "Nonein" not in html
    assert "null" not in html.lower() or "null" not in html


# ---------------------------------------------------------------------------
# Single ingredient renders without commas
# ---------------------------------------------------------------------------

def test_single_ingredient_has_no_comma():
    """A single ingredient should not have a trailing comma before the period."""
    req = make_request(ingredients=[
        IngredientItem(fdc_id=1, name="Salt", amount=10, unit="g"),
    ])
    html = render_label_html(zero_macros(), req)
    assert "SALT." in html
    assert "SALT," not in html


# ---------------------------------------------------------------------------
# Ingredient sorting with mixed units
# ---------------------------------------------------------------------------

def test_oz_ingredient_sorted_by_gram_weight():
    """2 oz (~56.7 g) of Butter should appear after 100 g of Flour."""
    req = make_request(ingredients=[
        IngredientItem(fdc_id=1, name="Butter", amount=2, unit="oz"),   # ~56.7 g
        IngredientItem(fdc_id=2, name="Flour",  amount=100, unit="g"),  # 100 g
    ])
    html = render_label_html(zero_macros(), req)
    flour_pos  = html.find("FLOUR")
    butter_pos = html.find("BUTTER")
    assert flour_pos < butter_pos, "Flour (100g) must appear before Butter (2oz ≈ 56.7g)"


def test_lb_ingredient_sorted_before_g_ingredient():
    """1 lb (~453.6 g) of Sugar should appear before 200 g of Flour."""
    req = make_request(ingredients=[
        IngredientItem(fdc_id=2, name="Flour", amount=200, unit="g"),
        IngredientItem(fdc_id=1, name="Sugar", amount=1,   unit="lb"),  # ~453.6 g
    ])
    html = render_label_html(zero_macros(), req)
    sugar_pos = html.find("SUGAR")
    flour_pos = html.find("FLOUR")
    assert sugar_pos < flour_pos, "Sugar (1lb ≈ 453.6g) must appear before Flour (200g)"


# ---------------------------------------------------------------------------
# Over-100% daily value
# ---------------------------------------------------------------------------

def test_over_100_percent_dv_displayed():
    """4600 mg sodium = 200% DV — the label must show this without capping."""
    req = make_request(ingredients=[
        IngredientItem(fdc_id=1, name="Salt", amount=100, unit="g"),
    ])
    unrounded = {
        "calories": 100, "fat_total_g": 0, "fat_saturated_g": 0,
        "cholesterol_mg": 0, "sodium_mg": 4600, "carbohydrates_total_g": 0,
        "fiber_g": 0, "sugar_g": 0, "protein_g": 0, "vitamin_d_mcg": 0,
        "calcium_mg": 0, "iron_mg": 0, "potassium_mg": 0,
    }
    html = render_label_html(high_sodium_macros(), req, unrounded_macros=unrounded)
    assert "200%" in html


# ---------------------------------------------------------------------------
# Ingredients string ends with a period
# ---------------------------------------------------------------------------

def test_ingredients_string_ends_with_period():
    """The rendered INGREDIENTS block must end with a period."""
    req = make_request(ingredients=[
        IngredientItem(fdc_id=1, name="Butter", amount=227, unit="g"),
        IngredientItem(fdc_id=2, name="Flour",  amount=250, unit="g"),
    ])
    html = render_label_html(zero_macros(), req)
    # The ingredients string "FLOUR, BUTTER." must end with a period
    assert "FLOUR, BUTTER." in html


# ---------------------------------------------------------------------------
# Zero-gram edge case: all-zero macros still renders a valid label
# ---------------------------------------------------------------------------

def test_zero_macros_renders_without_error():
    """An all-zero recipe should render a valid label (e.g. water-only recipes)."""
    html = render_label_html(zero_macros(), make_request())
    assert "Nutrition Facts" in html
    assert "0" in html  # calories displayed as 0
