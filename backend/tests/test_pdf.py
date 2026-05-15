# test_pdf.py
#
# Tests for the PDF rendering logic in pdf.py.
# We test the HTML output (which we can inspect) rather than the binary PDF.

import pytest
from app.pdf import render_label_html
from app.models import MacroProfile, GenerateLabelRequest, IngredientItem


def sample_macros() -> MacroProfile:
    return MacroProfile(
        calories=350,
        fat_total_g=18.5,
        fat_saturated_g=10.2,
        cholesterol_mg=85,
        sodium_mg=420,
        carbohydrates_total_g=42.1,
        fiber_g=2.3,
        sugar_g=18.0,
        protein_g=6.8,
        vitamin_d_mcg=0.5,
        calcium_mg=150,
        iron_mg=2.1,
        potassium_mg=220,
    )


def sample_request(ingredients=None) -> GenerateLabelRequest:
    if ingredients is None:
        ingredients = [
            IngredientItem(fdc_id=1097512, name="Butter", amount=227, unit="g"),
            IngredientItem(fdc_id=1100209, name="Flour", amount=250, unit="g"),
            IngredientItem(fdc_id=1104330, name="Sugar", amount=200, unit="g"),
        ]
    return GenerateLabelRequest(
        portion_divisor=8,
        label_name="Chocolate Chip Cookies",
        width_inches=2.75,
        height_inches=None,
        ingredients=ingredients,
    )


def test_html_contains_nutrition_facts():
    """The rendered HTML must include 'Nutrition Facts'."""
    html = render_label_html(sample_macros(), sample_request())
    assert "Nutrition Facts" in html


def test_html_contains_calories():
    """The rendered HTML must display the calorie count."""
    html = render_label_html(sample_macros(), sample_request())
    assert "350" in html


def test_html_contains_label_name():
    """If label_name is provided, it should appear in the HTML."""
    html = render_label_html(sample_macros(), sample_request())
    assert "Chocolate Chip Cookies" in html


def test_html_without_label_name():
    """If label_name is empty, the caption div should not be rendered."""
    request = sample_request()
    request.label_name = ""
    html = render_label_html(sample_macros(), request)
    # The CSS class 'label-name' still appears in the <style> block,
    # but the actual <div class="label-name"> element should not be present.
    assert '<div class="label-name">' not in html


def test_ingredients_sorted_by_weight_descending():
    """
    Ingredients must appear sorted by gram weight (heaviest first).
    Flour (250g) > Butter (227g) > Sugar (200g).
    """
    html = render_label_html(sample_macros(), sample_request())
    flour_pos = html.find("FLOUR")
    butter_pos = html.find("BUTTER")
    sugar_pos = html.find("SUGAR")

    assert flour_pos < butter_pos < sugar_pos


def test_ingredients_are_uppercase():
    """Ingredient names in the INGREDIENTS list must be uppercase."""
    html = render_label_html(sample_macros(), sample_request())
    assert "BUTTER" in html
    assert "FLOUR" in html
    assert "SUGAR" in html


def test_page_size_in_css():
    """The page width should appear in the CSS @page rule."""
    html = render_label_html(sample_macros(), sample_request())
    assert "2.75in" in html


def test_daily_value_percentage_displayed():
    """The %DV for fat_total_g (18.5g / 78g = ~24%) should appear in the HTML."""
    html = render_label_html(sample_macros(), sample_request())
    assert "24%" in html


def test_portion_divisor_displayed():
    """The serving count should appear in the HTML."""
    html = render_label_html(sample_macros(), sample_request())
    assert "8 servings" in html
