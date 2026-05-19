"""
build_db_full.py

Builds nutrition.db from three USDA FoodData Central datasets:
  - Foundation Foods  (~1,100 foods, gold-standard analytical data)
  - Survey / FNDDS    (~8,500 foods, clean everyday names — "Tomato, red, ripe")
  - SR Legacy         (~7,793 foods, frozen 2019 — has the pantry/spice/herb
                       entries that FNDDS lacks: baking soda, vanilla extract,
                       dried oregano, garlic powder, chicken broth, vinegars)

All three load through the same uniform code path. The Branded sub-dataset is
intentionally excluded: it contributes ~99% of disk size for packaged-product
SKUs that flood generic searches.

Environment variables:
    FDC_DATA_DIR  Path containing foundation/, survey/, sr_legacy/ subdirs.
                  Defaults to the directory that contains this script.
    DB_PATH       Output SQLite path.
                  Defaults to nutrition.db next to this script.

Expected layout under FDC_DATA_DIR:
    foundation/food.csv
    foundation/food_nutrient.csv
    foundation/food_portion.csv
    foundation/food_category.csv          (optional)
    survey/...                            (same files)
    sr_legacy/...                         (same files)

Download the CSVs from: https://fdc.nal.usda.gov/download-foods.html
Or run: bash scripts/download_fdc.sh
Then build: python data/build_db_full.py
"""

import csv
import os
import sqlite3
import sys

BASE_DIR = os.path.dirname(os.path.abspath(__file__))
FDC_DATA_DIR = os.environ.get("FDC_DATA_DIR", BASE_DIR)
DB_PATH = os.environ.get("DB_PATH", os.path.join(BASE_DIR, "nutrition.db"))

# USDA nutrient codes → our column names.
# A USDA quirk: Foundation's food_nutrient.csv stores the 4-digit `nutrient.id`
# (1008 = Energy), but FNDDS's food_nutrient.csv stores the 3-digit
# `nutrient.nutrient_nbr` (208 = Energy) in the same column. We accept both so
# one loader works for both datasets.
NUTRIENT_ID_MAP: dict[str, str] = {
    # 4-digit Foundation/SR-Legacy IDs
    "1008": "calories",
    "1004": "fat_total_g",
    "1258": "fat_saturated_g",
    "1253": "cholesterol_mg",
    "1093": "sodium_mg",
    "1005": "carbohydrates_total_g",
    "1079": "fiber_g",
    "2000": "sugar_g",
    "1003": "protein_g",
    "1114": "vitamin_d_mcg",
    "1087": "calcium_mg",
    "1089": "iron_mg",
    "1092": "potassium_mg",
    # 3-digit FNDDS nutrient_nbr equivalents
    "208": "calories",
    "204": "fat_total_g",
    "606": "fat_saturated_g",
    "601": "cholesterol_mg",
    "307": "sodium_mg",
    "205": "carbohydrates_total_g",
    "291": "fiber_g",
    "269": "sugar_g",
    "203": "protein_g",
    "328": "vitamin_d_mcg",
    "301": "calcium_mg",
    "303": "iron_mg",
    "306": "potassium_mg",
}

# (subdirectory, data_type value written to food_macros.data_type)
# Order matters: foods are inserted with INSERT OR IGNORE, so earlier datasets
# win on fdc_id collisions.
DATASETS = [
    ("foundation", "foundation_food"),
    ("survey",     "survey_fndds_food"),
    ("sr_legacy",  "sr_legacy_food"),
]

REQUIRED_FILES = ("food.csv", "food_nutrient.csv", "food_portion.csv")


def csv_path(subdir: str, filename: str) -> str:
    return os.path.join(FDC_DATA_DIR, subdir, filename)


# ---------------------------------------------------------------------------
# Schema
# ---------------------------------------------------------------------------

def create_schema(conn: sqlite3.Connection) -> None:
    conn.executescript("""
        DROP TABLE IF EXISTS food_search;
        DROP TABLE IF EXISTS food_portions;
        DROP TABLE IF EXISTS food_macros;

        CREATE TABLE food_macros (
            fdc_id                  INTEGER PRIMARY KEY,
            description             TEXT NOT NULL,
            data_type               TEXT NOT NULL,
            food_category           TEXT,
            calories                REAL DEFAULT 0,
            fat_total_g             REAL DEFAULT 0,
            fat_saturated_g         REAL DEFAULT 0,
            cholesterol_mg          REAL DEFAULT 0,
            sodium_mg               REAL DEFAULT 0,
            carbohydrates_total_g   REAL DEFAULT 0,
            fiber_g                 REAL DEFAULT 0,
            sugar_g                 REAL DEFAULT 0,
            protein_g               REAL DEFAULT 0,
            vitamin_d_mcg           REAL DEFAULT 0,
            calcium_mg              REAL DEFAULT 0,
            iron_mg                 REAL DEFAULT 0,
            potassium_mg            REAL DEFAULT 0
        );

        CREATE TABLE food_portions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            fdc_id      INTEGER NOT NULL REFERENCES food_macros(fdc_id),
            amount      REAL NOT NULL,
            modifier    TEXT NOT NULL,
            gram_weight REAL NOT NULL
        );

        -- FTS5 content table: index lives here, text is read from food_macros.
        -- porter unicode61 = unicode-aware tokenizer + Porter stemming.
        -- Only `description` is indexed: indexing food_category caused
        -- spurious matches (e.g. "baking soda" hit "Bread, irish soda" via
        -- the "Baked Products" category).
        CREATE VIRTUAL TABLE food_search USING fts5(
            description,
            content='food_macros',
            content_rowid='fdc_id',
            tokenize='porter unicode61'
        );
    """)


# ---------------------------------------------------------------------------
# Loaders
# ---------------------------------------------------------------------------

def load_categories(subdir: str) -> dict[str, str]:
    """Return {category_id: description} from food_category.csv, or {} if absent."""
    path = csv_path(subdir, "food_category.csv")
    if not os.path.exists(path):
        return {}
    cats: dict[str, str] = {}
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            cats[row["id"]] = row["description"]
    return cats


def load_foods(
    subdir: str, data_type: str, categories: dict[str, str]
) -> dict[str, dict]:
    """
    Return {fdc_id: food_dict} for foods in food.csv whose own data_type
    column equals `data_type`.

    The FDC Foundation ZIP bundles five extra data_types alongside the real
    finished entries: sample_food, market_acquisition, agricultural_acquisition,
    sub_sample_food, and rows with bogus integer data_type values. Those are
    USDA's intermediate research samples and would clutter end-user search
    with thousands of partial entries — we filter them out here.
    """
    foods: dict[str, dict] = {}
    skipped = 0
    with open(csv_path(subdir, "food.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            if row.get("data_type", "").strip() != data_type:
                skipped += 1
                continue
            fid = row["fdc_id"]
            cat_id = row.get("food_category_id", "")
            foods[fid] = {
                "description": row["description"],
                "data_type": data_type,
                "food_category": categories.get(cat_id, ""),
            }
    if skipped:
        print(f"  [{data_type}] Skipped {skipped:,} rows of other data_types in food.csv.")
    return foods


# Foundation Foods store Energy under Atwater conversion-factor nutrient IDs
# (2047 = Atwater specific, 2048 = Atwater general) instead of the standard
# Energy id 1008 that SR Legacy and FNDDS use. Map all three to "calories";
# CALORIES_PRIORITY is consulted by the loader so that 1008 > 2047 > 2048
# when more than one is published for the same food.
CALORIES_PRIORITY: dict[str, int] = {"1008": 0, "208": 0, "2047": 1, "2048": 2}
_CALORIE_ALIASES = {"2047": "calories", "2048": "calories"}


def load_nutrients(
    subdir: str, food_ids: set[str]
) -> dict[str, dict[str, float]]:
    """
    Stream food_nutrient.csv and return {fdc_id: {nutrient_field: value}}
    for our 13 nutrients.
    """
    nutrients: dict[str, dict[str, float]] = {fid: {} for fid in food_ids}
    # Track which Energy source supplied each food's calories so we don't
    # overwrite a higher-priority value with a lower-priority one.
    calorie_src: dict[str, int] = {}
    with open(csv_path(subdir, "food_nutrient.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            nid = row["nutrient_id"]
            if fid not in food_ids:
                continue
            field = NUTRIENT_ID_MAP.get(nid) or _CALORIE_ALIASES.get(nid)
            if field is None:
                continue
            try:
                value = float(row["amount"])
            except (ValueError, KeyError):
                continue
            if field == "calories":
                prio = CALORIES_PRIORITY.get(nid, 99)
                if calorie_src.get(fid, 99) <= prio:
                    continue
                calorie_src[fid] = prio
            nutrients[fid][field] = value
    return nutrients


def load_measure_units(subdir: str) -> dict[str, str]:
    """Return {measure_unit_id: human_name} for joining FDC portion rows."""
    units: dict[str, str] = {}
    path = csv_path(subdir, "measure_unit.csv")
    if not os.path.exists(path):
        return units
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            units[row["id"]] = row.get("name", "").strip()
    return units


def load_portions(subdir: str, food_ids: set[str]) -> list[tuple]:
    """Return (fdc_id, amount, modifier, gram_weight) tuples from food_portion.csv.

    The portion label picks the most human-readable field available:
      - FNDDS rows: measure_unit_id is always "9999" (undetermined) and the
        readable label lives in portion_description ("1 cup", "1 tablespoon").
      - Foundation rows: measure_unit_id points at a real unit ("1001"=tablespoon)
        and portion_description is empty.
      - A non-numeric `modifier` ("stick", "slice") wins last as a fallback —
        FNDDS uses this column for opaque numeric codes, which we discard.
    """
    measure_units = load_measure_units(subdir)
    portions: list[tuple] = []
    path = csv_path(subdir, "food_portion.csv")
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            if fid not in food_ids:
                continue
            try:
                gram_weight = float(row["gram_weight"])
                amount = float(row["amount"]) if row.get("amount") else 1.0
            except ValueError:
                continue
            if gram_weight <= 0:
                continue

            desc = row.get("portion_description", "").strip()
            unit_id = row.get("measure_unit_id", "").strip()
            unit_name = measure_units.get(unit_id, "")
            modifier = row.get("modifier", "").strip()

            if desc:
                label = desc
            elif unit_name and unit_name.lower() != "undetermined":
                label = unit_name
            elif modifier and not modifier.isdigit():
                label = modifier
            else:
                label = "serving"

            portions.append((int(fid), amount, label, gram_weight))
    return portions


# ---------------------------------------------------------------------------
# Dataset inserter
# ---------------------------------------------------------------------------

def insert_dataset(
    conn: sqlite3.Connection, subdir: str, data_type: str
) -> tuple[int, int]:
    """Load one FDC dataset and insert it into the open connection. Returns (foods, portions)."""
    print(f"  [{data_type}] Loading categories ...")
    categories = load_categories(subdir)

    print(f"  [{data_type}] Loading food descriptions ...")
    foods = load_foods(subdir, data_type, categories)
    food_ids = set(foods.keys())
    print(f"  [{data_type}] {len(food_ids):,} foods in food.csv.")

    print(f"  [{data_type}] Loading nutrients ...")
    nutrients = load_nutrients(subdir, food_ids)

    print(f"  [{data_type}] Loading portions ...")
    portions = load_portions(subdir, food_ids)

    print(f"  [{data_type}] Inserting {len(food_ids):,} foods, {len(portions):,} portions ...")
    food_rows = []
    for fid in food_ids:
        fd = foods.get(fid, {})
        n = nutrients.get(fid, {})
        food_rows.append((
            int(fid),
            fd.get("description", ""),
            data_type,
            fd.get("food_category", ""),
            n.get("calories", 0.0),
            n.get("fat_total_g", 0.0),
            n.get("fat_saturated_g", 0.0),
            n.get("cholesterol_mg", 0.0),
            n.get("sodium_mg", 0.0),
            n.get("carbohydrates_total_g", 0.0),
            n.get("fiber_g", 0.0),
            n.get("sugar_g", 0.0),
            n.get("protein_g", 0.0),
            n.get("vitamin_d_mcg", 0.0),
            n.get("calcium_mg", 0.0),
            n.get("iron_mg", 0.0),
            n.get("potassium_mg", 0.0),
        ))

    # INSERT OR IGNORE so duplicate fdc_ids (rare across datasets) are skipped.
    conn.executemany(
        "INSERT OR IGNORE INTO food_macros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        food_rows,
    )
    conn.executemany(
        "INSERT INTO food_portions (fdc_id, amount, modifier, gram_weight) VALUES (?,?,?,?)",
        portions,
    )
    conn.commit()
    return len(food_ids), len(portions)


# ---------------------------------------------------------------------------
# FTS5 index
# ---------------------------------------------------------------------------

def build_fts_index(conn: sqlite3.Connection) -> None:
    print("  Building FTS5 search index ...")
    conn.execute("""
        INSERT INTO food_search(rowid, description)
        SELECT fdc_id, description FROM food_macros
    """)
    # Merge all segment files into one for fastest read-time performance.
    conn.execute("INSERT INTO food_search(food_search) VALUES('optimize')")
    conn.commit()


# ---------------------------------------------------------------------------
# Entry point
# ---------------------------------------------------------------------------

def main() -> None:
    if os.path.exists(DB_PATH):
        print(f"Database already exists at {DB_PATH}. Delete it to rebuild.")
        sys.exit(0)

    # Verify required CSVs are present before doing any work.
    missing: list[str] = []
    for subdir, _ in DATASETS:
        for fname in REQUIRED_FILES:
            p = csv_path(subdir, fname)
            if not os.path.exists(p):
                missing.append(p)
    if missing:
        print("ERROR: Missing FDC data files:", file=sys.stderr)
        for p in missing:
            print(f"  {p}", file=sys.stderr)
        print(
            "\nDownload the FDC CSV ZIPs from https://fdc.nal.usda.gov/download-foods.html\n"
            "and extract each into the corresponding subdirectory under FDC_DATA_DIR:\n"
            f"  {FDC_DATA_DIR}/foundation/\n"
            f"  {FDC_DATA_DIR}/survey/\n"
            f"  {FDC_DATA_DIR}/sr_legacy/\n"
            "\nOr run: scripts/download_fdc.sh",
            file=sys.stderr,
        )
        sys.exit(1)

    print(f"Building {DB_PATH} ...")
    print(f"Data source: {FDC_DATA_DIR}")

    # Remove any stale files from a partial previous run.
    for suffix in ("", "-journal", "-wal", "-shm"):
        stale = DB_PATH + suffix
        if os.path.exists(stale):
            os.remove(stale)

    conn = sqlite3.connect(DB_PATH)
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA synchronous=NORMAL")
    conn.execute("PRAGMA cache_size=-64000")   # 64 MB page cache during build

    create_schema(conn)

    total_foods = 0
    total_portions = 0
    for subdir, data_type in DATASETS:
        foods, portions = insert_dataset(conn, subdir, data_type)
        total_foods += foods
        total_portions += portions
        print(f"  [{data_type}] Done.")

    build_fts_index(conn)

    print("  Running ANALYZE for query planner ...")
    conn.execute("ANALYZE")
    conn.execute("PRAGMA optimize")

    # Merge the WAL into the main DB and switch back to rollback-journal mode
    # so the resulting nutrition.db is self-contained. Without this, SQLite
    # leaves a multi-hundred-MB .wal file alongside the DB and the read-only
    # backend container can't apply it on open (sqlite3.OperationalError:
    # unable to open database file).
    print("  Checkpointing WAL and switching to rollback-journal mode ...")
    conn.execute("PRAGMA wal_checkpoint(TRUNCATE)")
    conn.execute("PRAGMA journal_mode=DELETE")
    conn.close()

    db_mb = os.path.getsize(DB_PATH) / 1024 / 1024
    print(
        f"\nDone. {total_foods:,} foods | {total_portions:,} portions | "
        f"{db_mb:.1f} MB → {DB_PATH}"
    )


if __name__ == "__main__":
    main()
