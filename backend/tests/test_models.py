# test_models.py
#
# Unit tests for Pydantic validation in models.py.
# Covers IngredientItem and GenerateLabelRequest field constraints.
# No database, no HTTP — pure model instantiation.

import pytest
from pydantic import ValidationError

from app.models import (
    IngredientItem,
    GenerateLabelRequest,
    MAX_NAME_LENGTH,
    MAX_INGREDIENT_AMOUNT,
    MAX_INGREDIENTS,
    MIN_PORTION_DIVISOR,
    MAX_PORTION_DIVISOR,
    MIN_WIDTH,
    MAX_WIDTH,
    MAX_HEIGHT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def valid_ingredient(**overrides) -> dict:
    base = {"fdc_id": 1097512, "name": "Butter", "amount": 100.0, "unit": "g"}
    return {**base, **overrides}


def valid_request(**overrides) -> dict:
    base = {
        "portion_divisor": 8,
        "label_name": "My Recipe",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [valid_ingredient()],
    }
    return {**base, **overrides}


# ---------------------------------------------------------------------------
# IngredientItem — valid cases
# ---------------------------------------------------------------------------

class TestIngredientItemValid:
    def test_minimal_valid_ingredient(self):
        ing = IngredientItem(**valid_ingredient())
        assert ing.fdc_id == 1097512
        assert ing.amount == 100.0
        assert ing.unit == "g"

    def test_all_units_accepted(self):
        for unit in ("g", "ml", "oz", "lb", "kg"):
            ing = IngredientItem(**valid_ingredient(unit=unit))
            assert ing.unit == unit

    def test_amount_just_above_zero(self):
        ing = IngredientItem(**valid_ingredient(amount=0.0001))
        assert ing.amount == pytest.approx(0.0001)

    def test_amount_at_max(self):
        ing = IngredientItem(**valid_ingredient(amount=MAX_INGREDIENT_AMOUNT))
        assert ing.amount == MAX_INGREDIENT_AMOUNT

    def test_name_single_char(self):
        ing = IngredientItem(**valid_ingredient(name="X"))
        assert ing.name == "X"

    def test_name_at_max_length(self):
        name = "A" * MAX_NAME_LENGTH
        ing = IngredientItem(**valid_ingredient(name=name))
        assert len(ing.name) == MAX_NAME_LENGTH


# ---------------------------------------------------------------------------
# IngredientItem — invalid cases
# ---------------------------------------------------------------------------

class TestIngredientItemInvalid:
    def test_amount_zero_rejected(self):
        with pytest.raises(ValidationError, match="greater than 0"):
            IngredientItem(**valid_ingredient(amount=0))

    def test_amount_negative_rejected(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(amount=-1.0))

    def test_amount_above_max_rejected(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(amount=MAX_INGREDIENT_AMOUNT + 1))

    def test_invalid_unit_rejected(self):
        with pytest.raises(ValidationError, match="unit must be one of"):
            IngredientItem(**valid_ingredient(unit="cups"))

    def test_unit_case_sensitive(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(unit="G"))

    def test_empty_name_rejected(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(name=""))

    def test_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(name="A" * (MAX_NAME_LENGTH + 1)))

    def test_extra_field_rejected(self):
        with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
            IngredientItem(**valid_ingredient(extra_field="oops"))


# ---------------------------------------------------------------------------
# GenerateLabelRequest — valid cases
# ---------------------------------------------------------------------------

class TestGenerateLabelRequestValid:
    def test_minimal_valid_request(self):
        req = GenerateLabelRequest(**valid_request())
        assert req.portion_divisor == 8

    def test_portion_divisor_at_minimum(self):
        req = GenerateLabelRequest(**valid_request(portion_divisor=MIN_PORTION_DIVISOR))
        assert req.portion_divisor == MIN_PORTION_DIVISOR

    def test_portion_divisor_at_maximum(self):
        req = GenerateLabelRequest(**valid_request(portion_divisor=MAX_PORTION_DIVISOR))
        assert req.portion_divisor == MAX_PORTION_DIVISOR

    def test_width_just_above_minimum(self):
        req = GenerateLabelRequest(**valid_request(width_inches=MIN_WIDTH + 0.01))
        assert req.width_inches > MIN_WIDTH

    def test_width_at_maximum(self):
        req = GenerateLabelRequest(**valid_request(width_inches=MAX_WIDTH))
        assert req.width_inches == MAX_WIDTH

    def test_height_none_accepted(self):
        req = GenerateLabelRequest(**valid_request(height_inches=None))
        assert req.height_inches is None

    def test_height_positive_accepted(self):
        req = GenerateLabelRequest(**valid_request(height_inches=5.0))
        assert req.height_inches == 5.0

    def test_height_at_maximum(self):
        req = GenerateLabelRequest(**valid_request(height_inches=MAX_HEIGHT))
        assert req.height_inches == MAX_HEIGHT

    def test_empty_label_name_accepted(self):
        req = GenerateLabelRequest(**valid_request(label_name=""))
        assert req.label_name == ""

    def test_max_ingredients_accepted(self):
        ingredients = [valid_ingredient(fdc_id=i) for i in range(1, MAX_INGREDIENTS + 1)]
        req = GenerateLabelRequest(**valid_request(ingredients=ingredients))
        assert len(req.ingredients) == MAX_INGREDIENTS

    def test_default_portion_divisor_is_8(self):
        data = valid_request()
        del data["portion_divisor"]
        req = GenerateLabelRequest(**data)
        assert req.portion_divisor == 8

    def test_default_width_is_2_75(self):
        data = valid_request()
        del data["width_inches"]
        req = GenerateLabelRequest(**data)
        assert req.width_inches == 2.75


# ---------------------------------------------------------------------------
# GenerateLabelRequest — invalid cases
# ---------------------------------------------------------------------------

class TestGenerateLabelRequestInvalid:
    def test_portion_divisor_zero_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(portion_divisor=0))

    def test_portion_divisor_negative_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(portion_divisor=-1))

    def test_portion_divisor_above_max_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(portion_divisor=MAX_PORTION_DIVISOR + 1))

    def test_width_at_minimum_boundary_rejected(self):
        # Field uses gt= (strictly greater than), so MIN_WIDTH itself is invalid
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(width_inches=MIN_WIDTH))

    def test_width_above_maximum_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(width_inches=MAX_WIDTH + 0.01))

    def test_width_zero_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(width_inches=0))

    def test_width_negative_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(width_inches=-1.0))

    def test_height_zero_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(height_inches=0))

    def test_height_negative_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(height_inches=-0.1))

    def test_height_above_maximum_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(height_inches=MAX_HEIGHT + 0.01))

    def test_empty_ingredients_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(ingredients=[]))

    def test_too_many_ingredients_rejected(self):
        ingredients = [valid_ingredient(fdc_id=i) for i in range(1, MAX_INGREDIENTS + 2)]
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(ingredients=ingredients))

    def test_label_name_too_long_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(label_name="X" * (MAX_NAME_LENGTH + 1)))

    def test_extra_field_rejected(self):
        with pytest.raises(ValidationError, match="Extra inputs are not permitted"):
            GenerateLabelRequest(**valid_request(bogus_field="nope"))

    def test_invalid_ingredient_unit_bubbles_up(self):
        bad = valid_ingredient(unit="tablespoon")
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**valid_request(ingredients=[bad]))
