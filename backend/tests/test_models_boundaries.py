# test_models_boundaries.py
#
# Boundary-value tests for Pydantic models in models.py.
# Complements test_models.py and test_models_validators.py by focusing on
# the exact allowed / rejected boundary values for each constrained field.
# All tests are pure Python — no database, no HTTP.

import pytest
from pydantic import ValidationError
from app.models import (
    IngredientItem,
    GenerateLabelRequest,
    MIN_PORTION_DIVISOR,
    MAX_PORTION_DIVISOR,
    MIN_WIDTH, MAX_WIDTH,
    MIN_HEIGHT, MAX_HEIGHT,
    MAX_NAME_LENGTH,
    MAX_INGREDIENT_AMOUNT,
    MIN_INGREDIENTS,
    MAX_INGREDIENTS,
)


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def make_ingredient(**overrides) -> dict:
    """Return a valid IngredientItem dict with optional field overrides."""
    base = {"fdc_id": 1, "name": "Butter", "amount": 100.0, "unit": "g"}
    return {**base, **overrides}


def make_request(**overrides) -> dict:
    """Return a valid GenerateLabelRequest dict with optional overrides."""
    base = {
        "portion_divisor": 8,
        "label_name": "My Recipe",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [make_ingredient()],
    }
    return {**base, **overrides}


# ---------------------------------------------------------------------------
# IngredientItem — amount boundaries
# ---------------------------------------------------------------------------

class TestIngredientAmount:
    def test_amount_just_above_zero_is_valid(self):
        """amount > 0 is the minimum — a very small positive value must pass."""
        item = IngredientItem(**make_ingredient(amount=0.0001))
        assert item.amount == pytest.approx(0.0001)

    def test_amount_zero_is_rejected(self):
        """amount=0 violates gt=0 — must raise ValidationError."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(amount=0))

    def test_amount_negative_is_rejected(self):
        """Negative amount must raise ValidationError."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(amount=-1.0))

    def test_amount_at_maximum_is_valid(self):
        """amount=MAX_INGREDIENT_AMOUNT (1_000_000) is the ceiling — must pass."""
        item = IngredientItem(**make_ingredient(amount=MAX_INGREDIENT_AMOUNT))
        assert item.amount == MAX_INGREDIENT_AMOUNT

    def test_amount_above_maximum_is_rejected(self):
        """amount above MAX_INGREDIENT_AMOUNT must raise ValidationError."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(amount=MAX_INGREDIENT_AMOUNT + 1))


# ---------------------------------------------------------------------------
# IngredientItem — name boundaries
# ---------------------------------------------------------------------------

class TestIngredientName:
    def test_name_at_max_length_is_valid(self):
        """name of exactly MAX_NAME_LENGTH chars must pass."""
        name = "A" * MAX_NAME_LENGTH
        item = IngredientItem(**make_ingredient(name=name))
        assert len(item.name) == MAX_NAME_LENGTH

    def test_name_one_over_max_is_rejected(self):
        """name longer than MAX_NAME_LENGTH must raise ValidationError."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(name="A" * (MAX_NAME_LENGTH + 1)))

    def test_name_control_chars_stripped(self):
        """Control characters must be stripped from name."""
        item = IngredientItem(**make_ingredient(name="But\x00ter"))
        assert "\x00" not in item.name
        assert "Butter" in item.name

    def test_name_only_control_chars_raises(self):
        """A name that becomes empty after stripping control chars must raise."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(name="\x00\x01\x02"))

    def test_name_rtl_override_stripped(self):
        """RTL override character must be stripped (not allowed in PDF output)."""
        item = IngredientItem(**make_ingredient(name="Butt‮er"))
        assert "‮" not in item.name


# ---------------------------------------------------------------------------
# IngredientItem — unit validation
# ---------------------------------------------------------------------------

class TestIngredientUnit:
    @pytest.mark.parametrize("unit", ["g", "ml", "oz", "lb", "kg"])
    def test_all_valid_units_accepted(self, unit: str):
        item = IngredientItem(**make_ingredient(unit=unit))
        assert item.unit == unit

    def test_unknown_unit_rejected(self):
        """A unit not in UNIT_CONVERSIONS must raise ValidationError."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(unit="cup"))

    def test_uppercase_unit_rejected(self):
        """Units are case-sensitive — 'G' is not a valid unit."""
        with pytest.raises(ValidationError):
            IngredientItem(**make_ingredient(unit="G"))


# ---------------------------------------------------------------------------
# GenerateLabelRequest — portion_divisor boundaries
# ---------------------------------------------------------------------------

class TestPortionDivisor:
    def test_divisor_at_minimum_is_valid(self):
        """portion_divisor=MIN_PORTION_DIVISOR (1) must pass."""
        req = GenerateLabelRequest(**make_request(portion_divisor=MIN_PORTION_DIVISOR))
        assert req.portion_divisor == MIN_PORTION_DIVISOR

    def test_divisor_below_minimum_is_rejected(self):
        """portion_divisor=0 must raise ValidationError."""
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(portion_divisor=0))

    def test_divisor_negative_is_rejected(self):
        """portion_divisor=-1 must raise ValidationError."""
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(portion_divisor=-1))

    def test_divisor_at_maximum_is_valid(self):
        """portion_divisor=MAX_PORTION_DIVISOR (999) must pass."""
        req = GenerateLabelRequest(**make_request(portion_divisor=MAX_PORTION_DIVISOR))
        assert req.portion_divisor == MAX_PORTION_DIVISOR

    def test_divisor_above_maximum_is_rejected(self):
        """portion_divisor=1000 must raise ValidationError."""
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(portion_divisor=1000))


# ---------------------------------------------------------------------------
# GenerateLabelRequest — width / height boundaries
# ---------------------------------------------------------------------------

class TestDimensions:
    def test_width_at_minimum_is_valid(self):
        req = GenerateLabelRequest(**make_request(width_inches=float(MIN_WIDTH)))
        assert req.width_inches == float(MIN_WIDTH)

    def test_width_below_minimum_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(width_inches=MIN_WIDTH - 0.01))

    def test_width_at_maximum_is_valid(self):
        req = GenerateLabelRequest(**make_request(width_inches=float(MAX_WIDTH)))
        assert req.width_inches == float(MAX_WIDTH)

    def test_width_above_maximum_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(width_inches=MAX_WIDTH + 0.01))

    def test_width_snapped_to_two_decimal_places(self):
        """Float noise is snapped to 0.01″ precision."""
        req = GenerateLabelRequest(**make_request(width_inches=2.7500000001))
        assert req.width_inches == pytest.approx(2.75, abs=0.001)

    def test_height_none_is_valid(self):
        """height_inches=None (auto-size) must pass."""
        req = GenerateLabelRequest(**make_request(height_inches=None))
        assert req.height_inches is None

    def test_height_at_minimum_is_valid(self):
        req = GenerateLabelRequest(**make_request(height_inches=float(MIN_HEIGHT)))
        assert req.height_inches == float(MIN_HEIGHT)

    def test_height_below_minimum_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(height_inches=MIN_HEIGHT - 0.01))

    def test_height_at_maximum_is_valid(self):
        req = GenerateLabelRequest(**make_request(height_inches=float(MAX_HEIGHT)))
        assert req.height_inches == float(MAX_HEIGHT)

    def test_height_above_maximum_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(height_inches=MAX_HEIGHT + 0.01))


# ---------------------------------------------------------------------------
# GenerateLabelRequest — ingredients list boundaries
# ---------------------------------------------------------------------------

class TestIngredientListBoundaries:
    def test_minimum_one_ingredient_is_valid(self):
        req = GenerateLabelRequest(**make_request(ingredients=[make_ingredient()]))
        assert len(req.ingredients) == MIN_INGREDIENTS

    def test_zero_ingredients_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(ingredients=[]))

    def test_maximum_100_ingredients_is_valid(self):
        items = [make_ingredient(fdc_id=i + 1) for i in range(MAX_INGREDIENTS)]
        req = GenerateLabelRequest(**make_request(ingredients=items))
        assert len(req.ingredients) == MAX_INGREDIENTS

    def test_101_ingredients_is_rejected(self):
        items = [make_ingredient(fdc_id=i + 1) for i in range(MAX_INGREDIENTS + 1)]
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(ingredients=items))


# ---------------------------------------------------------------------------
# GenerateLabelRequest — label_name edge cases
# ---------------------------------------------------------------------------

class TestLabelName:
    def test_empty_label_name_is_valid(self):
        """label_name is optional — empty string should be accepted."""
        req = GenerateLabelRequest(**make_request(label_name=""))
        assert req.label_name == ""

    def test_label_name_at_max_length_is_valid(self):
        name = "A" * MAX_NAME_LENGTH
        req = GenerateLabelRequest(**make_request(label_name=name))
        assert len(req.label_name) == MAX_NAME_LENGTH

    def test_label_name_over_max_length_is_rejected(self):
        with pytest.raises(ValidationError):
            GenerateLabelRequest(**make_request(label_name="A" * (MAX_NAME_LENGTH + 1)))

    def test_label_name_control_chars_stripped(self):
        req = GenerateLabelRequest(**make_request(label_name="My\x00Recipe"))
        assert "\x00" not in req.label_name

    def test_label_name_whitespace_only_stripped_to_empty(self):
        """Whitespace-only label_name strips to empty string (allow_empty=True)."""
        req = GenerateLabelRequest(**make_request(label_name="   "))
        assert req.label_name == ""
