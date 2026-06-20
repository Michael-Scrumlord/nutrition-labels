# test_models_control_chars.py
#
# Tests for the control-character stripping validators in models.py.
# _strip_control must remove ASCII 0x00-0x1F, 0x7F, and the four Unicode
# bidirectional override/mark characters defined in _CONTROL_CHARS.
# These tests cover edge cases not present in test_models.py or
# test_models_validators.py, which focus on field-length and range rules.

import pytest
from pydantic import ValidationError

from app.models import IngredientItem, GenerateLabelRequest


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def valid_ingredient(**overrides) -> dict:
    base = {"fdc_id": 1, "name": "Butter", "amount": 100.0, "unit": "g"}
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
# IngredientItem.name — individual control characters are stripped
# ---------------------------------------------------------------------------

class TestIngredientNameControlChars:
    def test_newline_stripped_leaving_valid_name(self):
        """Embedded newline (chr 10) is removed; surrounding chars are kept."""
        ing = IngredientItem(**valid_ingredient(name="But\nter"))
        assert ing.name == "Butter"

    def test_tab_stripped_leaving_valid_name(self):
        """Embedded tab (chr 9) is removed."""
        ing = IngredientItem(**valid_ingredient(name="But\tter"))
        assert ing.name == "Butter"

    def test_null_byte_stripped(self):
        """Null byte (chr 0) is removed."""
        ing = IngredientItem(**valid_ingredient(name="But\x00ter"))
        assert ing.name == "Butter"

    def test_carriage_return_stripped(self):
        """Carriage return (chr 13) is removed and trailing whitespace is stripped."""
        ing = IngredientItem(**valid_ingredient(name="Butter\r"))
        assert ing.name == "Butter"

    def test_del_char_stripped(self):
        """DEL (chr 127 / 0x7F) is explicitly in _CONTROL_CHARS and must be removed."""
        ing = IngredientItem(**valid_ingredient(name="Butter\x7f"))
        assert ing.name == "Butter"

    def test_rtl_override_stripped(self):
        """U+202E (RIGHT-TO-LEFT OVERRIDE '‮') must be stripped."""
        ing = IngredientItem(**valid_ingredient(name="Butt‮er"))
        assert "‮" not in ing.name
        assert ing.name == "Butter"

    def test_ltr_override_stripped(self):
        """U+202D (LEFT-TO-RIGHT OVERRIDE '‭') must be stripped."""
        ing = IngredientItem(**valid_ingredient(name="‭Butter"))
        assert "‭" not in ing.name

    def test_ltr_mark_stripped(self):
        """U+200E (LEFT-TO-RIGHT MARK '‎') must be stripped."""
        ing = IngredientItem(**valid_ingredient(name="‎Butter"))
        assert "‎" not in ing.name

    def test_rtl_mark_stripped(self):
        """U+200F (RIGHT-TO-LEFT MARK '‏') must be stripped."""
        ing = IngredientItem(**valid_ingredient(name="Butter‏"))
        assert "‏" not in ing.name

    def test_multiple_control_chars_all_stripped(self):
        """Every control character in a mixed string is removed; valid chars survive."""
        ing = IngredientItem(**valid_ingredient(name="Butter\x00\n\t, salted"))
        assert ing.name == "Butter, salted"

    def test_name_only_control_chars_is_rejected(self):
        """A name that becomes empty after stripping must be rejected (allow_empty=False)."""
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(name="\x00\x01\x02"))

    def test_name_only_whitespace_rejected(self):
        """Whitespace-only name is empty after .strip() and must be rejected."""
        with pytest.raises(ValidationError):
            IngredientItem(**valid_ingredient(name="   "))

    def test_accented_unicode_preserved(self):
        """Accented characters (non-control Unicode) must pass through unchanged."""
        name = "Crème brülée"
        ing = IngredientItem(**valid_ingredient(name=name))
        assert ing.name == name

    def test_emoji_preserved(self):
        """Emoji are not control characters and must not be stripped."""
        name = "Honey \U0001f36f"
        ing = IngredientItem(**valid_ingredient(name=name))
        assert ing.name == name

    def test_leading_trailing_whitespace_stripped_by_clean(self):
        """Leading and trailing spaces are removed by the .strip() call in _clean_string."""
        ing = IngredientItem(**valid_ingredient(name="  Butter  "))
        assert ing.name == "Butter"


# ---------------------------------------------------------------------------
# GenerateLabelRequest.label_name — control chars stripped; empty is valid
# ---------------------------------------------------------------------------

class TestLabelNameControlChars:
    def test_empty_label_name_is_valid(self):
        """label_name uses allow_empty=True, so empty string is accepted."""
        req = GenerateLabelRequest(**valid_request(label_name=""))
        assert req.label_name == ""

    def test_null_byte_stripped_from_label_name(self):
        req = GenerateLabelRequest(**valid_request(label_name="Cookies\x00Batch"))
        assert "\x00" not in req.label_name
        assert "Cookies" in req.label_name
        assert "Batch" in req.label_name

    def test_label_name_only_control_chars_becomes_empty_string(self):
        """label_name that reduces to empty after stripping is valid (allow_empty=True)."""
        req = GenerateLabelRequest(**valid_request(label_name="\x00\x01\x02"))
        assert req.label_name == ""

    def test_rtl_override_stripped_from_label_name(self):
        req = GenerateLabelRequest(**valid_request(label_name="Recipe‮"))
        assert "‮" not in req.label_name
        assert req.label_name == "Recipe"

    def test_newline_stripped_from_label_name(self):
        req = GenerateLabelRequest(**valid_request(label_name="Chocolate\nCookies"))
        assert "\n" not in req.label_name
        assert req.label_name == "ChocolateCookies"

    def test_label_name_unicode_preserved(self):
        """Non-control Unicode (accents, CJK) must survive unchanged."""
        req = GenerateLabelRequest(**valid_request(label_name="クッキー"))
        assert req.label_name == "クッキー"

    def test_label_name_whitespace_only_becomes_empty(self):
        """Whitespace-only label_name reduces to empty after .strip() — valid."""
        req = GenerateLabelRequest(**valid_request(label_name="   "))
        assert req.label_name == ""
