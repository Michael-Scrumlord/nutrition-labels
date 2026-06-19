# test_models_validators.py
#
# Tests for the Pydantic field validators in models.py that aren't
# covered by test_models.py: control-character stripping and boundary
# conditions for all validated string/numeric fields on IngredientItem.

import pytest
from pydantic import ValidationError

from app.models import IngredientItem


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def valid_ingredient(**overrides) -> dict:
    base = {"fdc_id": 1097512, "name": "Butter", "amount": 100.0, "unit": "g"}
    return {**base, **overrides}


# ---------------------------------------------------------------------------
# IngredientItem.name — control-character stripping
# ---------------------------------------------------------------------------

class TestIngredientNameControlChars:
    def test_newline_stripped(self):
        """Embedded newlines must be stripped from ingredient names."""
        ing = IngredientItem(**valid_ingredient(name="But\nter"))
        assert "\n" not in ing.name
        assert ing.name == "Butter"

    def test_tab_stripped(self):
        """Tab characters must be removed."""
        ing = IngredientItem(**valid_ingredient(name="But\tter"))
        assert "\t" not in ing.name
        assert ing.name == "Butter"

    def test_carriage_return_stripped(self):
        """Carriage returns must be removed."""
        ing = IngredientItem(**valid_ingredient(name="But\rter"))
        assert "\r" not in ing.name

    def test_rtl_override_stripped(self):
        """Right-to-left override characters (U+202E) must be removed."""
        ing = IngredientItem(**valid_ingredient(name="But‮ter"))
        assert "‮" not in ing.name

    def test_null_byte_stripped(self):
        """Null bytes (U+0000) must be removed."""
        ing = IngredientItem(**valid_ingredient(name="But\x00ter"))
        assert "\x00" not in ing.name

    def test_leading_trailing_whitespace_stripped(self):
        """Leading and trailing ordinary whitespace is stripped via .strip()."""
        ing = IngredientItem(**valid_ingredient(name="  Butter  "))
        assert ing.name == "Butter"

    def test_name_becomes_empty_after_stripping_raises(self):
        """A name that's entirely control characters is rejected after stripping."""
        with pytest.raises(ValidationError, match="empty"):
            IngredientItem(**valid_ingredient(name="\n\t\r"))

    def test_normal_unicode_letters_preserved(self):
        """Non-ASCII but printable characters (e.g. accented) must be preserved."""
        ing = IngredientItem(**valid_ingredient(name="Crème fraîche"))
        assert ing.name == "Crème fraîche"


# ---------------------------------------------------------------------------
# IngredientItem.unit — boundary and edge cases
# ---------------------------------------------------------------------------

class TestIngredientUnit:
    def test_all_five_units_accepted(self):
        for unit in ("g", "ml", "oz", "lb", "kg"):
            ing = IngredientItem(**valid_ingredient(unit=unit))
            assert ing.unit == unit

    def test_unknown_unit_rejected_with_message(self):
        with pytest.raises(ValidationError, match="unit must be one of"):
            IngredientItem(**valid_ingredient(unit="tbsp"))

    def test_unit_must_be_lowercase(self):
        """Units are case-sensitive; 'G' is not the same as 'g'."""
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(unit="G"))

    def test_empty_unit_rejected(self):
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(unit=""))


# ---------------------------------------------------------------------------
# Zero-gram edge: amount field boundary
# ---------------------------------------------------------------------------

class TestIngredientAmountBoundary:
    def test_amount_exactly_zero_rejected(self):
        """Exactly zero is not a valid amount (gt=0 constraint)."""
        with pytest.raises(ValidationError, match="greater than 0"):
            IngredientItem(**valid_ingredient(amount=0.0))

    def test_amount_very_small_positive_accepted(self):
        """Any strictly positive value, however small, must be accepted."""
        ing = IngredientItem(**valid_ingredient(amount=1e-9))
        assert ing.amount > 0

    def test_amount_exactly_at_max_accepted(self):
        from app.models import MAX_INGREDIENT_AMOUNT
        ing = IngredientItem(**valid_ingredient(amount=MAX_INGREDIENT_AMOUNT))
        assert ing.amount == MAX_INGREDIENT_AMOUNT

    def test_amount_one_above_max_rejected(self):
        from app.models import MAX_INGREDIENT_AMOUNT
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(amount=MAX_INGREDIENT_AMOUNT + 1))
