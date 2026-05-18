"""
build_db_full.py

Builds nutrition.db from four USDA FoodData Central datasets:
  - Foundation Foods  (~1,100 foods, gold-standard analytical data)
  - Survey / FNDDS    (~8,500 foods, clean everyday names)
  - SR Legacy         (~7,793 foods, retained for backward-compatible fdc_ids
                       used by frontend/src/constants/commonFoods.ts)
  - Branded Foods     (~200-400k US products, filtered to active US market)

All four are official USDA FoodData Central sub-datasets. Search results are
re-ranked by data quality tier in backend/app/search.py:
  Foundation/FNDDS (tier 0) → SR Legacy (tier 1) → Branded (tier 2)

Environment variables:
    FDC_DATA_DIR  Path containing foundation/, survey/, sr_legacy/, branded/
                  subdirectories. Defaults to the directory that contains
                  this script.
    DB_PATH       Output SQLite path.
                  Defaults to nutrition.db next to this script.

Expected layout under FDC_DATA_DIR:
    foundation/food.csv
    foundation/food_nutrient.csv
    foundation/food_portion.csv
    foundation/food_category.csv          (optional)
    survey/...                            (same files)
    sr_legacy/...                         (same files)
    branded/food.csv
    branded/food_nutrient.csv
    branded/branded_food.csv              (portion data lives here, not food_portion.csv)

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

# USDA nutrient IDs → our column names (consistent across all FDC datasets)
NUTRIENT_ID_MAP: dict[str, str] = {
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
}

# (subdirectory, data_type value written to food_macros.data_type)
# Order matters: foods are inserted with INSERT OR IGNORE, so earlier datasets
# win on fdc_id collisions (rare across FDC sub-datasets but possible).
DATASETS = [
    ("foundation", "foundation_food"),
    ("survey",     "survey_fndds_food"),
    ("sr_legacy",  "sr_legacy_food"),
    ("branded",    "branded_food"),
]

# Files every FDC sub-dataset ships. Note: the Branded ZIP intentionally does
# not include food_portion.csv — branded portion data lives in branded_food.csv
# (household_serving_fulltext + serving_size). See validate_inputs().
REQUIRED_FILES = ("food.csv", "food_nutrient.csv")


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
            brand_owner             TEXT,
            brand_name              TEXT,
            gtin_upc                TEXT,
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
        CREATE VIRTUAL TABLE food_search USING fts5(
            description,
            brand_name,
            food_category,
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
                "brand_owner": None,
                "brand_name": None,
                "gtin_upc": None,
            }
    if skipped:
        print(f"  [{data_type}] Skipped {skipped:,} rows of other data_types in food.csv.")
    return foods


def load_branded_meta(subdir: str, food_ids: set[str]) -> dict[str, dict]:
    """
    Read branded_food.csv and return metadata for active US products only.
    Foods with a discontinued_date or a non-US market_country are excluded.
    """
    meta: dict[str, dict] = {}
    path = csv_path(subdir, "branded_food.csv")
    if not os.path.exists(path):
        print(f"  WARNING: {path} not found — branded metadata will be empty.", file=sys.stderr)
        return meta
    with open(path, newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            if fid not in food_ids:
                continue
            if row.get("discontinued_date", "").strip():
                continue
            market = row.get("market_country", "United States").strip()
            if market not in ("United States", ""):
                continue
            meta[fid] = {
                "brand_owner":               row.get("brand_owner", "").strip() or None,
                "brand_name":                row.get("brand_name", "").strip() or None,
                "gtin_upc":                  row.get("gtin_upc", "").strip() or None,
                "food_category":             row.get("branded_food_category", "").strip(),
                "household_serving_fulltext": row.get("household_serving_fulltext", "").strip(),
                "serving_size":              row.get("serving_size", "").strip(),
                "serving_size_unit":         row.get("serving_size_unit", "").strip().lower(),
            }
    return meta


def load_nutrients(
    subdir: str, food_ids: set[str]
) -> dict[str, dict[str, float]]:
    """
    Stream food_nutrient.csv (potentially millions of rows for branded dataset)
    and return {fdc_id: {nutrient_field: value}} for our 13 nutrients.
    """
    nutrients: dict[str, dict[str, float]] = {fid: {} for fid in food_ids}
    with open(csv_path(subdir, "food_nutrient.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            nid = row["nutrient_id"]
            if fid not in food_ids or nid not in NUTRIENT_ID_MAP:
                continue
            field = NUTRIENT_ID_MAP[nid]
            try:
                nutrients[fid][field] = float(row["amount"])
            except (ValueError, KeyError):
                pass
    return nutrients


def load_portions(subdir: str, food_ids: set[str]) -> list[tuple]:
    """Return (fdc_id, amount, modifier, gram_weight) tuples from food_portion.csv.
    Returns [] if the file is absent (expected for the Branded dataset)."""
    portions: list[tuple] = []
    path = csv_path(subdir, "food_portion.csv")
    if not os.path.exists(path):
        return portions
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
            modifier = row.get("modifier", "").strip()
            desc = row.get("portion_description", "").strip()
            label = modifier or desc or "serving"
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

    branded_meta: dict[str, dict] = {}
    if data_type == "branded_food":
        print(f"  [{data_type}] Filtering to active US products ...")
        branded_meta = load_branded_meta(subdir, food_ids)
        food_ids = set(branded_meta.keys())
        print(f"  [{data_type}] {len(food_ids):,} foods after US/active filter.")

    print(f"  [{data_type}] Loading nutrients (large file — may take a few minutes) ...")
    nutrients = load_nutrients(subdir, food_ids)

    print(f"  [{data_type}] Loading portions ...")
    portions = load_portions(subdir, food_ids)

    # For branded foods: supplement portions from household_serving_fulltext
    # when food_portion.csv has no entry for that food.
    if data_type == "branded_food":
        has_portion = {p[0] for p in portions}
        for fid, meta in branded_meta.items():
            fid_int = int(fid)
            if fid_int in has_portion:
                continue
            serving_text = meta["household_serving_fulltext"]
            serving_size = meta["serving_size"]
            serving_unit = meta["serving_size_unit"]
            if serving_text and serving_size and serving_unit == "g":
                try:
                    gram_weight = float(serving_size)
                    if gram_weight > 0:
                        portions.append((fid_int, 1.0, serving_text, gram_weight))
                except ValueError:
                    pass

    print(f"  [{data_type}] Inserting {len(food_ids):,} foods, {len(portions):,} portions ...")
    food_rows = []
    for fid in food_ids:
        fd = foods.get(fid, {})
        bm = branded_meta.get(fid, {})
        n = nutrients.get(fid, {})
        food_rows.append((
            int(fid),
            fd.get("description", ""),
            data_type,
            bm.get("brand_owner") or fd.get("brand_owner"),
            bm.get("brand_name") or fd.get("brand_name"),
            bm.get("gtin_upc") or fd.get("gtin_upc"),
            bm.get("food_category") or fd.get("food_category") or "",
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

    # INSERT OR IGNORE so duplicate fdc_ids (shouldn't happen across datasets) are skipped.
    conn.executemany(
        "INSERT OR IGNORE INTO food_macros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
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
        INSERT INTO food_search(rowid, description, brand_name, food_category)
        SELECT fdc_id,
               description,
               COALESCE(brand_name, ''),
               COALESCE(food_category, '')
        FROM food_macros
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
    # Branded is special: no food_portion.csv (portions live in branded_food.csv),
    # but branded_food.csv itself is required.
    missing: list[str] = []
    for subdir, _ in DATASETS:
        for fname in REQUIRED_FILES:
            p = csv_path(subdir, fname)
            if not os.path.exists(p):
                missing.append(p)
        if subdir == "branded":
            if not os.path.exists(csv_path(subdir, "branded_food.csv")):
                missing.append(csv_path(subdir, "branded_food.csv"))
        else:
            if not os.path.exists(csv_path(subdir, "food_portion.csv")):
                missing.append(csv_path(subdir, "food_portion.csv"))
    if missing:
        print("ERROR: Missing FDC data files:", file=sys.stderr)
        for p in missing:
            print(f"  {p}", file=sys.stderr)
        print(
            "\nDownload the FDC CSV ZIPs from https://fdc.nal.usda.gov/download-foods.html\n"
            "and extract each into the corresponding subdirectory under FDC_DATA_DIR:\n"
            f"  {FDC_DATA_DIR}/foundation/\n"
            f"  {FDC_DATA_DIR}/survey/\n"
            f"  {FDC_DATA_DIR}/branded/\n"
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
    conn.close()

    db_mb = os.path.getsize(DB_PATH) / 1024 / 1024
    print(
        f"\nDone. {total_foods:,} foods | {total_portions:,} portions | "
        f"{db_mb:.1f} MB → {DB_PATH}"
    )


if __name__ == "__main__":
    main()
