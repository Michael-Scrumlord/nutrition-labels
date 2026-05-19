# test_db_health.py
#
# Validates that the production nutrition.db has been built correctly from
# the three USDA FoodData Central sub-datasets (Foundation, FNDDS, SR Legacy).
# These tests read the real database file, not the in-memory fixture. They
# will FAIL loudly if build_db_full.py has not been run (e.g. after a fresh
# clone or a Docker volume wipe).
#
# Run alongside the rest of the suite:  pytest tests/
# Or in isolation:                      pytest tests/test_db_health.py

import os
import sqlite3

import pytest

# Honor DB_PATH from the environment so the test works inside the production
# container (where the DB lives on a Docker volume at /db/nutrition.db) and
# during local dev (data/nutrition.db).
DB_PATH = os.environ.get(
    "DB_PATH",
    os.path.join(os.path.dirname(__file__), "../data/nutrition.db"),
)

# Minimum expected counts. The DB is sourced from three FDC sub-datasets:
#   Foundation (~1,100) + FNDDS (~8,500) + SR Legacy (~7,793)
# Combined floor is conservative to allow for ongoing USDA dataset changes.
MIN_FOODS = 10_000
MIN_PORTIONS = 10_000

# Required data_types — every dataset must contribute at least one row.
REQUIRED_DATA_TYPES = {
    "foundation_food",
    "survey_fndds_food",
    "sr_legacy_food",
}

# Spot-check a handful of well-known entries from the Common Foods tab.
# (fdc_id, description_fragment, expected_calories_per_100g)
KNOWN_FOODS = [
    (173430, "Butter",   717),   # Butter, without salt (SR Legacy)
    (171287, "Egg",      143),   # Egg, whole, raw, fresh (SR Legacy)
    (169655, "Sugar",    387),   # Sugars, granulated (SR Legacy)
    (168894, "flour",    364),   # Wheat flour, white, all-purpose (SR Legacy)
    (171265, "Milk",      61),   # Milk, whole, 3.25% milkfat (SR Legacy)
    (173468, "Salt",       0),   # Salt, table (SR Legacy)
    (171413, "olive",    884),   # Oil, olive (SR Legacy)
    (169593, "Cocoa",    228),   # Cocoa, dry powder, unsweetened (SR Legacy)
    (170457, "Tomato",    18),   # Tomatoes, red, ripe, raw (SR Legacy)
    (2646170, "Chicken", 106),   # Chicken, breast, boneless, skinless, raw (Foundation)
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


def test_every_data_type_is_represented(db):
    """Each FDC sub-dataset must contribute at least one row, or the DB is incomplete."""
    rows = db.execute("SELECT DISTINCT data_type FROM food_macros").fetchall()
    present = {r["data_type"] for r in rows}
    missing = REQUIRED_DATA_TYPES - present
    assert not missing, (
        f"Missing data_types in food_macros: {missing}. "
        "All four FDC sub-datasets must be built into the DB."
    )


def test_fts_search_table_exists(db):
    """FTS5 search index must be populated."""
    count = db.execute("SELECT COUNT(*) FROM food_search").fetchone()[0]
    assert count >= MIN_FOODS, (
        f"food_search has only {count} rows. FTS5 index not built — check build_db_full.py."
    )


def test_fts_match_returns_results(db):
    """End-to-end check: an FTS5 MATCH query returns rows."""
    rows = db.execute(
        "SELECT fdc_id FROM food_search WHERE food_search MATCH '\"butter\"*' LIMIT 5"
    ).fetchall()
    assert len(rows) > 0, "FTS5 MATCH on 'butter*' returned no rows"


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
        "SELECT fdc_id FROM food_search WHERE food_search MATCH ? LIMIT 1",
        (f'"{term}"*',),
    ).fetchall()
    assert len(rows) > 0, (
        f"'{term}' returned no FTS5 results — expected at least one matching food"
    )


def test_all_common_tab_foods_exist(db):
    """Every fdc_id shown in the frontend Common tab must exist in the DB.
    Parsed live from commonFoods.ts so this test stays in sync with the UI."""
    import re
    ts_path = os.path.join(
        os.path.dirname(__file__),
        "../../frontend/src/constants/commonFoods.ts",
    )
    with open(ts_path) as f:
        text = f.read()
    common_fdc_ids = [int(m) for m in re.findall(r"fdc_id:\s*(\d+)", text)]
    assert common_fdc_ids, "Could not parse any fdc_ids from commonFoods.ts"

    placeholders = ",".join("?" * len(common_fdc_ids))
    rows = db.execute(
        f"SELECT fdc_id FROM food_macros WHERE fdc_id IN ({placeholders})",
        common_fdc_ids,
    ).fetchall()
    found = {r["fdc_id"] for r in rows}
    missing = [fid for fid in common_fdc_ids if fid not in found]
    assert not missing, (
        f"Common-tab fdc_ids missing from DB: {missing}. "
        "Either the build is incomplete, or commonFoods.ts references a stale id."
    )


def test_nutrient_fields_are_populated(db):
    """Spot-check that nutrient columns are not all zero for a well-known food."""
    row = db.execute(
        "SELECT * FROM food_macros WHERE fdc_id = 173430"  # Butter, without salt
    ).fetchone()
    assert row is not None
    assert row["fat_total_g"] > 0, "Butter fat_total_g should be > 0"
    assert row["fat_saturated_g"] > 0, "Butter fat_saturated_g should be > 0"
    assert row["calories"] > 0, "Butter calories should be > 0"
