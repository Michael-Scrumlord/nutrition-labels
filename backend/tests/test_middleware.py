# test_middleware.py
#
# Tests for BodySizeLimitMiddleware edge cases not covered in
# test_routes_extended.py (which tests the happy-path 413 scenario).
#
# Specifically exercises:
#   1. An invalid (non-integer) Content-Length header → 400
#   2. Content-Length of "0" (valid integer, no size-limit concern) → not 413
#   3. Content-Length exactly at the limit → not 413 (boundary: check is strict >)
#
# BodySizeLimitMiddleware is a BaseHTTPMiddleware wrapping the whole ASGI
# app, so it runs — and can short-circuit with 400/413 — before Starlette
# resolves a route. These tests POST to MW_TEST_PATH, a path that does not
# (and need not) match any real route: only the middleware's behavior is
# under test here, never route-level logic. The former POST
# /api/generate_label endpoint that these tests originally targeted was
# retired (PDF generation moved client-side); MW_TEST_PATH keeps that
# retirement from silently invalidating what these tests exercise.

import json

import pytest
import app.config as config_module

pytestmark = pytest.mark.anyio

MW_TEST_PATH = "/api/__middleware_test__"


@pytest.fixture(autouse=True)
def reset_rate_limiter():
    """Clear in-memory rate-limit counters so middleware tests never hit the cap."""
    from app.main import limiter
    limiter._storage.reset()
    yield


# ---------------------------------------------------------------------------
# Invalid Content-Length header
# ---------------------------------------------------------------------------

async def test_invalid_content_length_header_returns_400(client):
    """A non-integer Content-Length header must return 400 before any body
    parsing. The middleware's ValueError branch triggers this path."""
    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=b"{}",
            headers={
                "Content-Type": "application/json",
                "Content-Length": "not-a-number",
            },
        )
    assert response.status_code == 400
    assert "Invalid Content-Length" in response.json()["detail"]


async def test_float_content_length_header_returns_400(client):
    """A floating-point Content-Length (e.g. '123.5') is also non-integer
    and must return 400 via the same ValueError branch."""
    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=b"{}",
            headers={
                "Content-Type": "application/json",
                "Content-Length": "123.5",
            },
        )
    assert response.status_code == 400


async def test_negative_content_length_header_passes_through(client):
    """A negative Content-Length is parseable as an integer; since it is
    ≤ max_body_bytes the middleware does not block it (the route or ASGI
    layer may reject it for other reasons — but NOT with 413)."""
    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=b"{}",
            headers={
                "Content-Type": "application/json",
                "Content-Length": "-1",
            },
        )
    assert response.status_code != 413


# ---------------------------------------------------------------------------
# Content-Length boundary conditions
# ---------------------------------------------------------------------------

async def test_content_length_zero_does_not_trigger_413(client):
    """Content-Length: 0 is a valid integer and well under any sane limit.
    The middleware must pass it through (not 413)."""
    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=b"",
            headers={
                "Content-Type": "application/json",
                "Content-Length": "0",
            },
        )
    assert response.status_code != 413


async def test_content_length_exactly_at_limit_is_not_rejected(client):
    """Content-Length == max_body_bytes must NOT produce a 413.
    The check is strictly greater-than (``> self.max_bytes``), so the
    limit itself is a permitted value."""
    max_bytes = config_module.settings.max_body_bytes

    # Content is arbitrary — only its byte length matters to this middleware.
    body = json.dumps({"data": "x"}).encode()

    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=body,
            headers={
                "Content-Type": "application/json",
                # Report the limit itself, not the actual body size.
                # The middleware inspects only the header value.
                "Content-Length": str(max_bytes),
            },
        )
    assert response.status_code != 413


async def test_content_length_one_above_limit_returns_413(client):
    """Content-Length == max_body_bytes + 1 must return 413.
    This is the 'just over the line' counterpart of the boundary test above."""
    max_bytes = config_module.settings.max_body_bytes
    oversized_body = b"x" * (max_bytes + 1)

    async with client as c:
        response = await c.post(
            MW_TEST_PATH,
            content=oversized_body,
            headers={
                "Content-Type": "application/json",
                "Content-Length": str(max_bytes + 1),
            },
        )
    assert response.status_code == 413
    assert "too large" in response.json()["detail"]
