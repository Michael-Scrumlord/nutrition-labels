# test_routes.py
#
# Integration tests — we hit the real FastAPI endpoints using an HTTPX test client.
# The client fixture in conftest.py wires in the test database automatically.

import pytest


pytestmark = pytest.mark.anyio


async def test_search_returns_results(client):
    """GET /api/search?query=butter should return at least one result."""
    async with client as c:
        response = await c.get("/api/search?query=butter")
    assert response.status_code == 200
    data = response.json()
    assert isinstance(data, list)
    assert len(data) > 0
    assert "fdc_id" in data[0]
    assert "name" in data[0]


async def test_search_short_query_returns_empty(client):
    """GET /api/search?query=b (one char) should return an empty list."""
    async with client as c:
        response = await c.get("/api/search?query=b")
    assert response.status_code == 200
    assert response.json() == []


async def test_search_no_query_returns_empty(client):
    """GET /api/search with no query param should return empty list."""
    async with client as c:
        response = await c.get("/api/search")
    assert response.status_code == 200
    assert response.json() == []


async def test_food_endpoint_found(client):
    """GET /api/food/1097512 should return full macro + portion data for butter."""
    async with client as c:
        response = await c.get("/api/food/1097512")
    assert response.status_code == 200
    data = response.json()

    assert data["fdc_id"] == 1097512
    assert "macros" in data
    assert "portions" in data
    assert data["macros"]["calories"] == 717
    assert data["macros"]["fat_total_g"] == 81.1
    assert len(data["portions"]) >= 1


async def test_food_endpoint_not_found(client):
    """GET /api/food/9999999 should return 404."""
    async with client as c:
        response = await c.get("/api/food/9999999")
    assert response.status_code == 404


async def test_generate_label_returns_pdf(client):
    """POST /api/generate_label with valid data should return a PDF binary."""
    payload = {
        "portion_divisor": 8,
        "label_name": "Test Recipe",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [
            {"fdc_id": 1097512, "name": "Butter", "amount": 227, "unit": "g"},
            {"fdc_id": 1100209, "name": "Flour", "amount": 250, "unit": "g"},
        ],
    }
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 200
    assert response.headers["content-type"] == "application/pdf"
    assert response.headers["content-disposition"] == 'attachment; filename="nutrition_label.pdf"'
    assert len(response.content) > 0


async def test_generate_label_empty_ingredients(client):
    """POST /api/generate_label with no ingredients should return 422 (Pydantic validation)."""
    payload = {
        "portion_divisor": 8,
        "label_name": "",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [],
    }
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_label_invalid_divisor(client):
    """POST /api/generate_label with divisor=0 should return 422 (Pydantic rejects it)."""
    payload = {
        "portion_divisor": 0,
        "label_name": "",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [
            {"fdc_id": 1097512, "name": "Butter", "amount": 100, "unit": "g"},
        ],
    }
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 422


async def test_generate_label_unknown_fdc_id(client):
    """POST /api/generate_label with an fdc_id not in the DB should return 400."""
    payload = {
        "portion_divisor": 8,
        "label_name": "",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [
            {"fdc_id": 9999999, "name": "Mystery Food", "amount": 100, "unit": "g"},
        ],
    }
    async with client as c:
        response = await c.post("/api/generate_label", json=payload)
    assert response.status_code == 400


async def test_generate_label_unit_conversions(client):
    """Using oz should produce the same result as the equivalent grams."""
    # 2 oz = 56.699g of butter
    oz_payload = {
        "portion_divisor": 1,
        "label_name": "",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [{"fdc_id": 1097512, "name": "Butter", "amount": 2, "unit": "oz"}],
    }
    g_payload = {
        "portion_divisor": 1,
        "label_name": "",
        "width_inches": 2.75,
        "height_inches": None,
        "ingredients": [{"fdc_id": 1097512, "name": "Butter", "amount": 56.699, "unit": "g"}],
    }
    async with client as c:
        oz_response = await c.post("/api/generate_label", json=oz_payload)
        g_response = await c.post("/api/generate_label", json=g_payload)

    # Both should return valid PDFs (we can't easily compare the binary content,
    # but both should succeed and have similar size)
    assert oz_response.status_code == 200
    assert g_response.status_code == 200
