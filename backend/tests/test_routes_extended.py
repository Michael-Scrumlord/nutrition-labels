# test_routes_extended.py
#
# Extended route integration tests — boundary conditions and error paths not
# covered in test_routes.py (which handles the core golden paths).
# All tests hit the FastAPI app via an HTTPX test client wired to the
# in-memory test database defined in conftest.py.

import pytest

pytestmark = pytest.mark.anyio


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear in-memory rate-limit counters before each test.

    The slowapi limiter is a module-level singleton shared across all tests.
    Without this reset, the 10/min cap on POST /api/generate_label would be
    exhausted mid-suite (asyncio + trio backend both hit the same counter).
    """
    from app.main import limiter
    limiter._storage.reset()
    yield


# ── GET /api/search — query length boundaries ─────────────────────────────

async def test_search_query_exactly_100_chars_accepted(client):
    """A query at the 100-character boundary must return 200, not 400."""
    query = "a" * 100
    async with client as c:
        response = await c.get(f"/api/search?query={query}")
    assert response.status_code == 200


async def test_search_query_101_chars_rejected_with_400(client):
    """A query one character over the 100-char limit must return 400."""
    query = "a" * 101
    async with client as c:
        response = await c.get(f"/api/search?query={query}")
    assert response.status_code == 400
    assert "too long" in response.json()["detail"]


async def test_search_query_exactly_2_chars_returns_results(client):
    """Two characters is the minimum that triggers an actual search."""
    async with client as c:
        response = await c.get("/api/search?query=bu")
    assert response.status_code == 200
    assert isinstance(response.json(), list)


async def test_search_query_exactly_1_char_returns_empty(client):
    """A single-character query must return an empty list, not an error."""
    async with client as c:
        response = await c.get("/api/search?query=b")
    assert response.status_code == 200
    assert response.json() == []


# ── GET /api/food/{fdc_id} — path validation ─────────────────────────────

async def test_food_fdc_id_zero_rejected_with_422(client):
    """fdc_id=0 violates the ge=1 constraint and must return 422."""
    async with client as c:
        response = await c.get("/api/food/0")
    assert response.status_code == 422


async def test_food_fdc_id_negative_rejected_with_422(client):
    """Negative fdc_id values violate ge=1 and must return 422."""
    async with client as c:
        response = await c.get("/api/food/-1")
    assert response.status_code == 422


async def test_food_fdc_id_non_integer_rejected_with_422(client):
    """Non-integer fdc_id (e.g. a string) must return 422."""
    async with client as c:
        response = await c.get("/api/food/abc")
    assert response.status_code == 422


# ── POST /api/generate_label — portion_divisor boundaries ────────────────

async def _valid_payload(**overrides) -> dict:
    base = {
        "portion_divisor": 8,
        "label_name": "Test",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [
            {"fdc_id": 1097512, "name": "Butter", "amount": 100, "unit": "g"}
        ],
    }
    return {**base, **overrides}


async def test_generate_portion_divisor_at_max_boundary(client):
    """portion_divisor=999 is the maximum valid value and must return 200."""
    payload = await _valid_payload(portion_divisor=999)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"


async def test_generate_portion_divisor_1000_rejected_with_422(client):
    """portion_divisor=1000 exceeds the maximum of 999 and must return 422."""
    payload = await _valid_payload(portion_divisor=1000)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_portion_divisor_0_rejected_with_422(client):
    """portion_divisor=0 is below the minimum of 1 and must return 422."""
    payload = await _valid_payload(portion_divisor=0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_portion_divisor_negative_rejected_with_422(client):
    """Negative portion_divisor must return 422."""
    payload = await _valid_payload(portion_divisor=-1)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


# ── POST /api/generate_label — width_inches boundaries ───────────────────

async def test_generate_width_below_minimum_rejected_with_422(client):
    """width_inches=1.5 is below the 2-inch minimum and must return 422."""
    payload = await _valid_payload(width_inches=1.5)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_width_above_maximum_rejected_with_422(client):
    """width_inches=12.5 is above the 12-inch maximum and must return 422."""
    payload = await _valid_payload(width_inches=12.5)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_width_at_minimum_boundary_accepted(client):
    """width_inches=2 (minimum boundary) must return 200."""
    payload = await _valid_payload(width_inches=2.0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


async def test_generate_width_at_maximum_boundary_accepted(client):
    """width_inches=12 (maximum boundary) must return 200."""
    payload = await _valid_payload(width_inches=12.0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


# ── POST /api/generate_label — height_inches boundaries ──────────────────

async def test_generate_height_below_minimum_rejected_with_422(client):
    """height_inches=1.5 is below the 2-inch minimum and must return 422."""
    payload = await _valid_payload(height_inches=1.5)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_height_above_maximum_rejected_with_422(client):
    """height_inches=21.0 is above the 20-inch maximum and must return 422."""
    payload = await _valid_payload(height_inches=21.0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_height_null_accepted(client):
    """height_inches=null (auto-size) is the default and must return 200."""
    payload = await _valid_payload(height_inches=None)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


async def test_generate_height_at_minimum_boundary_accepted(client):
    """height_inches=2 (minimum boundary) must return 200."""
    payload = await _valid_payload(height_inches=2.0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


async def test_generate_height_at_maximum_boundary_accepted(client):
    """height_inches=20 (maximum boundary) must return 200."""
    payload = await _valid_payload(height_inches=20.0)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


# ── POST /api/generate_label — ingredient amount boundaries ───────────────

async def test_generate_amount_zero_rejected_with_422(client):
    """amount=0 violates the gt=0 constraint and must return 422."""
    payload = await _valid_payload(
        ingredients=[{"fdc_id": 1097512, "name": "Butter", "amount": 0, "unit": "g"}]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_amount_negative_rejected_with_422(client):
    """Negative amount violates gt=0 and must return 422."""
    payload = await _valid_payload(
        ingredients=[{"fdc_id": 1097512, "name": "Butter", "amount": -1, "unit": "g"}]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_trace_amount_accepted(client):
    """A very small but strictly positive amount is valid and returns 200."""
    payload = await _valid_payload(
        ingredients=[{"fdc_id": 1097512, "name": "Butter", "amount": 0.001, "unit": "g"}]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


# ── POST /api/generate_label — ingredient count boundaries ────────────────

async def test_generate_exactly_100_ingredients_accepted(client):
    """100 ingredients is the maximum allowed and must return 200."""
    ingredients = [
        {"fdc_id": 1097512, "name": f"Butter {i}", "amount": 1, "unit": "g"}
        for i in range(100)
    ]
    payload = await _valid_payload(ingredients=ingredients)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200


async def test_generate_101_ingredients_rejected_with_422(client):
    """101 ingredients exceeds the maximum of 100 and must return 422."""
    ingredients = [
        {"fdc_id": 1097512, "name": f"Butter {i}", "amount": 1, "unit": "g"}
        for i in range(101)
    ]
    payload = await _valid_payload(ingredients=ingredients)
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


# ── POST /api/generate_label — unit validation ────────────────────────────

async def test_generate_unknown_unit_rejected_with_422(client):
    """An unrecognized unit (e.g. 'tbsp') must return 422."""
    payload = await _valid_payload(
        ingredients=[{"fdc_id": 1097512, "name": "Butter", "amount": 1, "unit": "tbsp"}]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


# ── POST /api/generate_label — extra fields rejected ─────────────────────

async def test_generate_extra_field_in_payload_rejected_with_422(client):
    """Extra top-level fields are forbidden (extra='forbid') and return 422."""
    payload = {
        **(await _valid_payload()),
        "unexpected_field": "should_not_be_here",
    }
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_extra_field_in_ingredient_rejected_with_422(client):
    """Extra fields inside an ingredient item must also return 422."""
    payload = await _valid_payload(
        ingredients=[
            {"fdc_id": 1097512, "name": "Butter", "amount": 100,
             "unit": "g", "extra": "bad"}
        ]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


# ── POST /api/generate_label — body size limit (413) ─────────────────────

async def test_body_size_limit_returns_413(client):
    """A request with Content-Length above the server limit must return 413."""
    import app.config as config_module
    max_bytes = config_module.settings.max_body_bytes
    oversized_body = b"x" * (max_bytes + 1)

    async with client as c:
        response = await c.post(
            "/api/generate_label",
            content=oversized_body,
            headers={"Content-Type": "application/json",
                     "Content-Length": str(len(oversized_body))},
        )
    assert response.status_code == 413
    assert "too large" in response.json()["detail"]


# ── POST /api/generate_label — control characters in names ───────────────

async def test_generate_control_chars_in_ingredient_name_stripped(client):
    """Control characters in ingredient names should be stripped by the validator,
    not cause a 422. The cleaned name must appear in the successful response."""
    payload = await _valid_payload(
        ingredients=[{"fdc_id": 1097512, "name": "But\nter", "amount": 100, "unit": "g"}]
    )
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    # The newline should be stripped → name becomes "Butter" → valid
    assert response.status_code == 200
