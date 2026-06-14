# test_routes.py
#
# Integration tests — we hit the real FastAPI endpoints using an HTTPX test client.
# The client fixture in conftest.py wires in the test database automatically.

import pytest


pytestmark = pytest.mark.anyio


async def test_health_returns_ok_when_db_present(client):
    """GET /api/health returns 200 with status=ok when the DB probe succeeds."""
    async with client as c:
        response = await c.get("/api/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "ok"
    assert "release" in body


async def test_health_returns_503_when_db_missing(client, monkeypatch):
    """If the DB file is unreachable, /api/health should 503 (not 200)."""
    import app.database as db_module
    monkeypatch.setattr(db_module.settings, "db_path", "/nonexistent/nutrition.db")
    async with client as c:
        response = await c.get("/api/health")
    assert response.status_code == 503


async def test_trusted_host_middleware_present(client):
    """Sanity check that TrustedHostMiddleware is wired — a bad Host gets 400.
    The test client's ALLOWED_HOSTS=["*"] override (conftest.py) means we
    have to assert this via app inspection, not a live request."""
    from starlette.middleware.trustedhost import TrustedHostMiddleware
    from app.main import app
    types = [m.cls for m in app.user_middleware]
    assert TrustedHostMiddleware in types


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
