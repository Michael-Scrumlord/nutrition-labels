# test_db_health.py
#
# Validates that the production nutrition.db has been built correctly.
# These tests read the real database file, not the in-memory test fixture.
# They will FAIL loudly if build_db_full.py has not been run (e.g. after a
# fresh clone or a Docker volume wipe).
#
# Run alongside the rest of the suite:  pytest tests/
# Or in isolation:                      pytest tests/test_db_health.py

import os
import sqlite3

import pytest

DB_PATH = os.path.join(os.path.dirname(__file__), "../data/nutrition.db")

# Minimum expected counts — SR Legacy ships 7,793 foods and 14,449 portions.
MIN_FOODS = 7_000
MIN_PORTIONS = 10_000

# Spot-check a handful of well-known SR Legacy entries.
# (fdc_id, description_fragment, expected_calories_per_100g)
KNOWN_FOODS = [
    (173430, "Butter",   717),   # Butter, without salt
    (171287, "Egg",      143),   # Egg, whole, raw, fresh
    (169655, "Sugar",    387),   # Sugars, granulated
    (168894, "flour",    364),   # Wheat flour, white, all-purpose
    (171265, "Milk",      61),   # Milk, whole, 3.25% milkfat
    (173468, "Salt",       0),   # Salt, table
    (171413, "olive",    884),   # Oil, olive
    (174036, "Beef",     254),   # Beef, ground, 80% lean
    (169593, "Cocoa",    228),   # Cocoa, dry powder, unsweetened
]

# Queries that must return at least one row — confirms common ingredients exist.
EXPECTED_SEARCHES = [
    "tomato",
    "chicken",
    "onion",
    "garlic",
    "rice",
    "salmon",
    "spinach",
    "avocado",
]


@pytest.fixture(scope="module")
def db():
    assert os.path.exists(DB_PATH), (
        f"nutrition.db not found at {DB_PATH}. Run: python data/build_db_full.py"
    )
    assert os.path.getsize(DB_PATH) > 0, (
        f"nutrition.db is 0 bytes. Run: python data/build_db_full.py"
    )
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    yield conn
    conn.close()


def test_db_has_expected_food_count(db):
    count = db.execute("SELECT COUNT(*) FROM food_macros").fetchone()[0]
    assert count >= MIN_FOODS, (
        f"Expected >= {MIN_FOODS} foods, got {count}. Run: python data/build_db_full.py"
    )


def test_db_has_expected_portion_count(db):
    count = db.execute("SELECT COUNT(*) FROM food_portions").fetchone()[0]
    assert count >= MIN_PORTIONS, (
        f"Expected >= {MIN_PORTIONS} portions, got {count}. Run: python data/build_db_full.py"
    )


@pytest.mark.parametrize("fdc_id,hint,expected_cal", KNOWN_FOODS)
def test_known_food_exists_with_correct_calories(db, fdc_id, hint, expected_cal):
    row = db.execute(
        "SELECT description, calories FROM food_macros WHERE fdc_id = ?", (fdc_id,)
    ).fetchone()
    assert row is not None, f"fdc_id {fdc_id} ({hint}) missing from DB"
    assert int(row["calories"]) == expected_cal, (
        f"fdc_id {fdc_id} ({hint}): expected {expected_cal} kcal, got {row['calories']}"
    )


@pytest.mark.parametrize("term", EXPECTED_SEARCHES)
def test_common_ingredient_is_searchable(db, term):
    rows = db.execute(
        "SELECT fdc_id FROM food_macros WHERE LOWER(description) LIKE ?",
        (f"%{term}%",),
    ).fetchall()
    assert len(rows) > 0, (
        f"'{term}' returned no results — expected at least one matching food in SR Legacy"
    )


def test_all_common_tab_foods_exist(db):
    """Every fdc_id shown in the frontend Common tab must exist in the DB."""
    common_fdc_ids = [
        173430, 171287, 169655, 168894, 171265, 173418,
        169640, 172804, 173468, 173471, 171413, 171509,
        174036, 169593, 167976,
    ]
    placeholders = ",".join("?" * len(common_fdc_ids))
    rows = db.execute(
        f"SELECT fdc_id FROM food_macros WHERE fdc_id IN ({placeholders})",
        common_fdc_ids,
    ).fetchall()
    found = {r["fdc_id"] for r in rows}
    missing = [fid for fid in common_fdc_ids if fid not in found]
    assert not missing, f"Common-tab fdc_ids missing from DB: {missing}"


def test_nutrient_fields_are_populated(db):
    """Spot-check that nutrient columns are not all zero for a well-known food."""
    row = db.execute(
        "SELECT * FROM food_macros WHERE fdc_id = 173430"  # Butter, without salt
    ).fetchone()
    assert row is not None
    assert row["fat_total_g"] > 0, "Butter fat_total_g should be > 0"
    assert row["fat_saturated_g"] > 0, "Butter fat_saturated_g should be > 0"
    assert row["calories"] > 0, "Butter calories should be > 0"
