"""
build_db_full.py

Imports all ~7,793 foods from the USDA FoodData Central SR Legacy dataset
into nutrition.db, replacing the hand-curated 51-food build_db.py.

Run from the backend/ directory:
    python data/build_db_full.py

Expects the SR Legacy CSVs extracted into data/sr_legacy/:
    food.csv            — fdc_id, description
    food_nutrient.csv   — fdc_id, nutrient_id, amount (per 100g, long format)
    nutrient.csv        — nutrient_id → name/unit (used to identify the 13 we want)
    food_portion.csv    — fdc_id, amount, modifier, gram_weight
"""

import csv
import os
import sqlite3

BASE_DIR = os.path.dirname(__file__)
SR_LEGACY_DIR = os.path.join(BASE_DIR, "sr_legacy")
DB_PATH = os.path.join(BASE_DIR, "nutrition.db")

# Map: nutrient.id → our column name
# nutrient.id is what food_nutrient.csv references as nutrient_id.
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

NUTRIENT_FIELDS = [
    "calories", "fat_total_g", "fat_saturated_g", "cholesterol_mg",
    "sodium_mg", "carbohydrates_total_g", "fiber_g", "sugar_g", "protein_g",
    "vitamin_d_mcg", "calcium_mg", "iron_mg", "potassium_mg",
]


def csv_path(filename: str) -> str:
    return os.path.join(SR_LEGACY_DIR, filename)


def create_tables(conn: sqlite3.Connection) -> None:
    conn.execute("DROP TABLE IF EXISTS food_portions")
    conn.execute("DROP TABLE IF EXISTS food_macros")
    conn.execute("""
        CREATE TABLE food_macros (
            fdc_id                  INTEGER PRIMARY KEY,
            description             TEXT NOT NULL,
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
        )
    """)
    conn.execute("""
        CREATE TABLE food_portions (
            id          INTEGER PRIMARY KEY AUTOINCREMENT,
            fdc_id      INTEGER NOT NULL REFERENCES food_macros(fdc_id),
            amount      REAL NOT NULL,
            modifier    TEXT NOT NULL,
            gram_weight REAL NOT NULL
        )
    """)


def load_foods() -> dict[str, str]:
    """Return {fdc_id: description} for all SR Legacy foods."""
    foods: dict[str, str] = {}
    with open(csv_path("food.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            foods[row["fdc_id"]] = row["description"]
    return foods


def load_nutrients(food_ids: set[str]) -> dict[str, dict[str, float]]:
    """
    Return {fdc_id: {field: value}} for the 13 nutrients we care about.
    Reads food_nutrient.csv (644k rows) once, filtering to our nutrient IDs.
    """
    nutrients: dict[str, dict[str, float]] = {fid: {} for fid in food_ids}
    with open(csv_path("food_nutrient.csv"), newline="", encoding="utf-8") as f:
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


def load_portions(food_ids: set[str]) -> list[tuple]:
    """
    Return (fdc_id, amount, modifier, gram_weight) tuples.
    Combines USDA's 'modifier' and 'portion_description' fields into one label.
    """
    portions: list[tuple] = []
    with open(csv_path("food_portion.csv"), newline="", encoding="utf-8") as f:
        for row in csv.DictReader(f):
            fid = row["fdc_id"]
            if fid not in food_ids:
                continue
            try:
                gram_weight = float(row["gram_weight"])
                amount = float(row["amount"]) if row["amount"] else 1.0
            except ValueError:
                continue
            if gram_weight <= 0:
                continue

            # Build a human-readable label: prefer modifier, fall back to portion_description
            modifier = row.get("modifier", "").strip()
            desc = row.get("portion_description", "").strip()
            label = modifier if modifier else desc
            if not label:
                label = "serving"

            portions.append((int(fid), amount, label, gram_weight))
    return portions


def main() -> None:
    for filename in ("food.csv", "food_nutrient.csv", "nutrient.csv", "food_portion.csv"):
        path = csv_path(filename)
        if not os.path.exists(path):
            raise FileNotFoundError(
                f"Missing: {path}\n"
                f"Extract the SR Legacy CSV ZIP into data/sr_legacy/ and try again."
            )

    print(f"Building {DB_PATH} from USDA SR Legacy ...")

    print("  Loading food descriptions ...")
    foods = load_foods()
    food_ids = set(foods.keys())
    print(f"  {len(food_ids)} foods found.")

    print("  Loading nutrient values (this reads ~644k rows) ...")
    nutrients = load_nutrients(food_ids)

    print("  Loading portion sizes ...")
    portions = load_portions(food_ids)
    print(f"  {len(portions)} portion entries found.")

    # Remove stale DB and journal so we start clean
    for suffix in ("", "-journal", "-wal", "-shm"):
        stale = DB_PATH + suffix
        if os.path.exists(stale):
            os.remove(stale)

    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)

    print("  Inserting foods ...")
    food_rows = []
    for fid, description in foods.items():
        n = nutrients.get(fid, {})
        food_rows.append((
            int(fid),
            description,
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

    conn.executemany(
        "INSERT INTO food_macros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)",
        food_rows,
    )
    conn.executemany(
        "INSERT INTO food_portions (fdc_id, amount, modifier, gram_weight) VALUES (?,?,?,?)",
        portions,
    )
    conn.commit()
    conn.close()

    print(f"\nDone. {len(food_rows)} foods, {len(portions)} portion sizes written to {DB_PATH}")


if __name__ == "__main__":
    main()
