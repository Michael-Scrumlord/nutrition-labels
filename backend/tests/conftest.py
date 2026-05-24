# conftest.py
#
# Shared pytest fixtures for the entire test suite.
# The most important fixture is `test_db_path` — it creates a fresh in-memory
# SQLite database seeded with known foods so tests are fast and deterministic.
# Tests NEVER touch data/nutrition.db.

import os

# Allow the httpx test client's "test" Host header through TrustedHostMiddleware.
# Must be set BEFORE `from app.main import app` so Settings() picks it up at
# import time.
os.environ["ALLOWED_HOSTS"] = '["*"]'

import sqlite3
import tempfile
import pytest
from httpx import AsyncClient, ASGITransport

from app.main import app
from app.constants import NUTRIENT_FIELDS


# ---------------------------------------------------------------------------
# Known foods used throughout the tests
# (fdc_id, description, calories, fat_total_g, fat_saturated_g, cholesterol_mg,
#  sodium_mg, carbohydrates_total_g, fiber_g, sugar_g, protein_g,
#  vitamin_d_mcg, calcium_mg, iron_mg, potassium_mg)
# ---------------------------------------------------------------------------
TEST_FOODS = [
    # Butter — all values per 100g
    (1097512, "Butter, unsalted", "foundation_food",
     717, 81.1, 51.4, 215, 11, 0.1, 0.0, 0.1, 0.9, 1.5, 24, 0.02, 24),
    # Flour
    (1100209, "All-purpose flour, white", "foundation_food",
     364, 1.0, 0.2, 0, 2, 76.3, 2.7, 0.3, 10.3, 0.0, 15, 4.64, 107),
    # Sugar
    (1104330, "Sugar, granulated white", "foundation_food",
     387, 0.0, 0.0, 0, 1, 99.8, 0.0, 99.8, 0.0, 0.0, 1, 0.01, 2),
    # Eggs
    (1097517, "Eggs, whole, raw", "foundation_food",
     143, 9.5, 3.1, 372, 142, 0.7, 0.0, 0.4, 12.6, 2.0, 56, 1.75, 138),
    # Chicken breast
    (1105001, "Chicken breast, raw", "foundation_food",
     120, 2.6, 0.7, 64, 74, 0.0, 0.0, 0.0, 22.5, 0.1, 11, 0.37, 256),
    # Olive oil
    (1103301, "Olive oil", "foundation_food",
     884, 100.0, 13.8, 0, 2, 0.0, 0.0, 0.0, 0.0, 0.0, 1, 0.56, 1),
    # Salt (edge case: almost all sodium)
    (1102203, "Salt, table", "foundation_food",
     0, 0.0, 0.0, 0, 38758, 0.0, 0.0, 0.0, 0.0, 0.0, 24, 0.33, 8),
    # Cocoa powder
    (1100216, "Cocoa powder, unsweetened", "foundation_food",
     228, 13.7, 8.1, 0, 21, 57.9, 33.2, 1.8, 19.6, 0.0, 128, 13.86, 1524),
]

TEST_PORTIONS = [
    (1097512, 1, "tablespoon", 14.2),
    (1097512, 0.5, "cup", 113.5),
    (1100209, 1, "cup", 125.0),
    (1104330, 1, "cup", 200.0),
    (1097517, 1, "large egg", 50.0),
]


@pytest.fixture(scope="session")
def test_db_path(tmp_path_factory):
    """
    Create a temporary SQLite database seeded with TEST_FOODS and TEST_PORTIONS.
    The database lives in a temp directory and is deleted after the test session.
    `scope="session"` means it's created once and shared across all tests.
    """
    tmp_dir = tmp_path_factory.mktemp("db")
    db_path = str(tmp_dir / "test_nutrition.db")

    conn = sqlite3.connect(db_path)
    conn.execute("""
        CREATE TABLE food_macros (
            fdc_id INTEGER PRIMARY KEY, description TEXT NOT NULL,
            data_type TEXT NOT NULL,
            calories REAL DEFAULT 0, fat_total_g REAL DEFAULT 0,
            fat_saturated_g REAL DEFAULT 0, cholesterol_mg REAL DEFAULT 0,
            sodium_mg REAL DEFAULT 0, carbohydrates_total_g REAL DEFAULT 0,
            fiber_g REAL DEFAULT 0, sugar_g REAL DEFAULT 0,
            protein_g REAL DEFAULT 0, vitamin_d_mcg REAL DEFAULT 0,
            calcium_mg REAL DEFAULT 0, iron_mg REAL DEFAULT 0,
            potassium_mg REAL DEFAULT 0
        )
    """)
    conn.execute("""
        CREATE TABLE food_portions (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            fdc_id INTEGER NOT NULL, amount REAL NOT NULL,
            modifier TEXT NOT NULL, gram_weight REAL NOT NULL
        )
    """)
    # FTS5 index over food_macros.description — mirrors the production schema
    # in data/build_db_full.py so database.search_foods() works in tests.
    conn.execute("""
        CREATE VIRTUAL TABLE food_search USING fts5(
            description,
            content='food_macros',
            content_rowid='fdc_id',
            tokenize='porter unicode61'
        )
    """)
    conn.executemany(
        "INSERT INTO food_macros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        TEST_FOODS,
    )
    conn.executemany(
        "INSERT INTO food_portions (fdc_id, amount, modifier, gram_weight) VALUES (?,?,?,?)",
        TEST_PORTIONS,
    )
    conn.execute(
        "INSERT INTO food_search(rowid, description) SELECT fdc_id, description FROM food_macros"
    )
    conn.commit()
    conn.close()

    return db_path


@pytest.fixture
def client(test_db_path, monkeypatch):
    """
    An HTTPX test client wired to the FastAPI app, using the test database.
    The monkeypatch overrides the db_path setting so no real database is needed.
    """
    import app.database as db_module
    monkeypatch.setattr(db_module.settings, "db_path", test_db_path)
    return AsyncClient(transport=ASGITransport(app=app), base_url="http://test")
