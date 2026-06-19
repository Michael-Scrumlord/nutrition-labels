# test_models.py
#
# Unit tests for Pydantic validation in models.py.
# Covers IngredientItem field constraints.
# No database, no HTTP — pure model instantiation.

import pytest
from pydantic import ValidationError

from app.models import (
    IngredientItem,
    MAX_NAME_LENGTH,
    MAX_INGREDIENT_AMOUNT,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def valid_ingredient(**overrides) -> dict:
    base = {"fdc_id": 1097512, "name": "Butter", "amount": 100.0, "unit": "g"}
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


