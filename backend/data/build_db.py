"""
build_db.py

Creates nutrition.db from scratch with a curated set of common foods.
Nutritional values are sourced from the USDA FoodData Central database.
All macro values are per 100g of food.

Run from the backend/ directory:
    python data/build_db.py
"""

import sqlite3
import os

DB_PATH = os.path.join(os.path.dirname(__file__), "nutrition.db")


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


# Each food row: (fdc_id, description, calories, fat_total_g, fat_saturated_g,
#   cholesterol_mg, sodium_mg, carbohydrates_total_g, fiber_g, sugar_g,
#   protein_g, vitamin_d_mcg, calcium_mg, iron_mg, potassium_mg)
# All values are PER 100g.
FOODS = [
    # ── Dairy & Eggs ──
    (1097512, "Butter, unsalted",
     717, 81.1, 51.4, 215, 11, 0.1, 0.0, 0.1, 0.9, 1.5, 24, 0.02, 24),
    (1097513, "Butter, salted",
     717, 81.1, 51.4, 215, 576, 0.1, 0.0, 0.1, 0.9, 1.5, 24, 0.02, 24),
    (1097514, "Cream cheese",
     342, 33.2, 18.8, 110, 321, 4.1, 0.0, 3.2, 6.2, 0.5, 80, 0.07, 138),
    (1097515, "Heavy whipping cream",
     340, 36.1, 22.3, 133, 38, 2.8, 0.0, 2.8, 2.1, 0.6, 71, 0.03, 92),
    (1097516, "Whole milk",
     61, 3.3, 2.1, 10, 43, 4.8, 0.0, 5.1, 3.2, 1.3, 113, 0.03, 132),
    (1097517, "Eggs, whole, raw",
     143, 9.5, 3.1, 372, 142, 0.7, 0.0, 0.4, 12.6, 2.0, 56, 1.75, 138),
    (1097518, "Egg white, raw",
     52, 0.2, 0.0, 0, 166, 0.7, 0.0, 0.6, 10.9, 0.0, 7, 0.08, 163),
    (1097519, "Parmesan cheese, grated",
     431, 28.6, 18.5, 79, 1529, 3.2, 0.0, 0.5, 38.5, 0.5, 1109, 0.82, 92),
    (1097520, "Cheddar cheese",
     402, 33.1, 21.1, 105, 621, 1.3, 0.0, 0.5, 24.9, 0.6, 710, 0.68, 98),
    (1097521, "Mozzarella cheese, whole milk",
     300, 22.4, 13.5, 79, 627, 2.2, 0.0, 1.0, 22.2, 0.5, 505, 0.15, 76),

    # ── Sweeteners ──
    (1104330, "Sugar, granulated white",
     387, 0.0, 0.0, 0, 1, 99.8, 0.0, 99.8, 0.0, 0.0, 1, 0.01, 2),
    (1104331, "Brown sugar",
     380, 0.0, 0.0, 0, 28, 98.1, 0.0, 97.0, 0.3, 0.0, 83, 1.91, 346),
    (1104332, "Honey",
     304, 0.0, 0.0, 0, 4, 82.4, 0.2, 82.1, 0.3, 0.0, 6, 0.42, 52),
    (1104333, "Maple syrup",
     260, 0.1, 0.0, 0, 12, 67.0, 0.0, 60.5, 0.0, 0.0, 102, 0.11, 212),
    (1104334, "Powdered sugar, confectioners",
     389, 0.0, 0.0, 0, 1, 99.7, 0.0, 98.0, 0.0, 0.0, 2, 0.04, 4),

    # ── Flours & Grains ──
    (1100209, "All-purpose flour, white",
     364, 1.0, 0.2, 0, 2, 76.3, 2.7, 0.3, 10.3, 0.0, 15, 4.64, 107),
    (1100210, "Whole wheat flour",
     340, 1.9, 0.3, 0, 2, 72.6, 10.7, 0.4, 13.2, 0.0, 34, 3.88, 405),
    (1100211, "Cake flour",
     362, 0.9, 0.1, 0, 2, 79.4, 2.2, 0.2, 8.0, 0.0, 14, 4.72, 97),
    (1100212, "Bread flour",
     361, 1.1, 0.2, 0, 2, 72.5, 2.9, 0.3, 12.9, 0.0, 15, 5.43, 125),
    (1100213, "Almond flour",
     571, 50.0, 3.8, 0, 1, 19.7, 10.6, 4.3, 21.4, 0.0, 264, 3.71, 733),
    (1100214, "Oats, rolled (dry)",
     389, 6.9, 1.2, 0, 2, 66.3, 10.6, 0.0, 16.9, 0.0, 54, 4.72, 429),
    (1100215, "Cornstarch",
     381, 0.1, 0.0, 0, 9, 91.3, 0.9, 0.0, 0.3, 0.0, 2, 0.47, 3),
    (1100216, "Cocoa powder, unsweetened",
     228, 13.7, 8.1, 0, 21, 57.9, 33.2, 1.8, 19.6, 0.0, 128, 13.86, 1524),
    (1100217, "Baking chocolate, unsweetened",
     501, 52.3, 32.4, 0, 24, 29.8, 15.9, 0.4, 12.9, 0.0, 101, 10.93, 830),

    # ── Leavening & Seasonings ──
    (1102201, "Baking powder",
     53, 0.0, 0.0, 0, 10600, 27.7, 0.2, 0.0, 0.0, 0.0, 5876, 11.07, 40),
    (1102202, "Baking soda",
     0, 0.0, 0.0, 0, 27360, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0.00, 0),
    (1102203, "Salt, table",
     0, 0.0, 0.0, 0, 38758, 0.0, 0.0, 0.0, 0.0, 0.0, 24, 0.33, 8),
    (1102204, "Vanilla extract",
     288, 0.1, 0.0, 0, 9, 12.7, 0.0, 12.7, 0.1, 0.0, 11, 0.12, 148),
    (1102205, "Cinnamon, ground",
     247, 3.5, 0.5, 0, 10, 80.6, 53.1, 2.2, 4.0, 0.0, 1002, 8.32, 431),

    # ── Fats & Oils ──
    (1103301, "Olive oil",
     884, 100.0, 13.8, 0, 2, 0.0, 0.0, 0.0, 0.0, 0.0, 1, 0.56, 1),
    (1103302, "Vegetable oil (soybean)",
     884, 100.0, 14.4, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 0, 0.05, 0),
    (1103303, "Coconut oil",
     892, 99.1, 82.5, 0, 0, 0.0, 0.0, 0.0, 0.0, 0.0, 1, 0.05, 0),

    # ── Proteins ──
    (1105001, "Chicken breast, raw",
     120, 2.6, 0.7, 64, 74, 0.0, 0.0, 0.0, 22.5, 0.1, 11, 0.37, 256),
    (1105002, "Ground beef, 80% lean, raw",
     254, 17.9, 7.0, 76, 75, 0.0, 0.0, 0.0, 21.8, 0.1, 18, 2.21, 307),
    (1105003, "Salmon, Atlantic, raw",
     208, 13.4, 3.1, 63, 59, 0.0, 0.0, 0.0, 20.4, 11.0, 12, 0.34, 363),
    (1105004, "Shrimp, raw",
     85, 0.9, 0.2, 189, 119, 0.2, 0.0, 0.0, 20.1, 0.0, 64, 0.52, 259),
    (1105005, "Bacon, cured, raw",
     458, 41.8, 13.9, 110, 1717, 1.3, 0.0, 0.0, 20.9, 1.2, 7, 1.19, 432),
    (1105006, "Tuna, canned in water",
     116, 2.6, 0.7, 30, 337, 0.0, 0.0, 0.0, 25.5, 1.7, 11, 1.53, 237),

    # ── Produce ──
    (1106001, "Banana, raw",
     89, 0.3, 0.1, 0, 1, 22.8, 2.6, 12.2, 1.1, 0.0, 5, 0.26, 358),
    (1106002, "Apple, raw, with skin",
     52, 0.2, 0.0, 0, 1, 13.8, 2.4, 10.4, 0.3, 0.0, 6, 0.12, 107),
    (1106003, "Blueberries, raw",
     57, 0.3, 0.0, 0, 1, 14.5, 2.4, 10.0, 0.7, 0.0, 6, 0.28, 77),
    (1106004, "Strawberries, raw",
     32, 0.3, 0.0, 0, 1, 7.7, 2.0, 4.9, 0.7, 0.0, 16, 0.41, 153),
    (1106005, "Spinach, raw",
     23, 0.4, 0.1, 0, 79, 3.6, 2.2, 0.4, 2.9, 0.0, 99, 2.71, 558),
    (1106006, "Avocado, raw",
     160, 14.7, 2.1, 0, 7, 8.5, 6.7, 0.7, 2.0, 0.0, 12, 0.61, 485),

    # ── Nuts & Seeds ──
    (1107001, "Almond, whole, raw",
     579, 49.9, 3.8, 0, 1, 21.6, 12.5, 4.4, 21.2, 0.0, 264, 3.71, 733),
    (1107002, "Walnut, halves, raw",
     654, 65.2, 6.1, 0, 2, 13.7, 6.7, 2.6, 15.2, 0.0, 98, 2.91, 441),
    (1107003, "Peanut butter, smooth",
     588, 50.4, 10.5, 0, 426, 19.6, 6.0, 9.2, 25.1, 0.0, 43, 1.74, 558),
    (1107004, "Chia seeds",
     486, 30.7, 3.3, 0, 16, 42.1, 34.4, 0.0, 16.5, 0.0, 631, 7.72, 407),

    # ── Chocolate & Add-ins ──
    (1108001, "Chocolate chips, semi-sweet",
     488, 26.8, 16.1, 6, 9, 64.0, 4.5, 52.0, 5.5, 0.0, 41, 5.02, 365),
    (1108002, "Raisins",
     299, 0.5, 0.1, 0, 11, 79.2, 3.7, 59.2, 3.1, 0.0, 50, 1.88, 749),
]

# Portion sizes: (fdc_id, amount, modifier, gram_weight)
PORTIONS = [
    (1097512, 1, "tablespoon", 14.2),
    (1097512, 0.5, "cup", 113.5),
    (1097512, 1, "stick (1/2 cup)", 113.5),
    (1097513, 1, "tablespoon", 14.2),
    (1097513, 1, "stick (1/2 cup)", 113.5),
    (1097514, 1, "tablespoon", 14.5),
    (1097515, 1, "tablespoon", 15.0),
    (1097515, 1, "cup", 238.0),
    (1097516, 1, "cup", 244.0),
    (1097516, 1, "tablespoon", 15.3),
    (1097517, 1, "large egg", 50.0),
    (1097517, 1, "medium egg", 44.0),
    (1097518, 1, "large egg white", 33.0),
    (1097519, 1, "tablespoon", 5.0),
    (1097519, 0.25, "cup", 25.0),
    (1097520, 1, "slice (1 oz)", 28.35),
    (1097520, 1, "cup, shredded", 113.0),
    (1097521, 1, "slice", 21.0),
    (1104330, 1, "teaspoon", 4.2),
    (1104330, 1, "tablespoon", 12.6),
    (1104330, 1, "cup", 200.0),
    (1104331, 1, "tablespoon, packed", 14.2),
    (1104331, 1, "cup, packed", 220.0),
    (1104332, 1, "tablespoon", 21.0),
    (1104333, 1, "tablespoon", 20.0),
    (1104334, 1, "cup, sifted", 120.0),
    (1100209, 1, "cup", 125.0),
    (1100209, 1, "tablespoon", 7.8),
    (1100210, 1, "cup", 120.0),
    (1100213, 1, "cup", 96.0),
    (1100214, 1, "cup, old-fashioned", 81.0),
    (1100216, 1, "tablespoon", 5.0),
    (1100216, 0.25, "cup", 20.5),
    (1102201, 1, "teaspoon", 4.6),
    (1102202, 1, "teaspoon", 4.6),
    (1102203, 1, "teaspoon", 6.0),
    (1102203, 0.25, "teaspoon", 1.5),
    (1102204, 1, "teaspoon", 4.2),
    (1103301, 1, "tablespoon", 13.5),
    (1103301, 0.25, "cup", 54.0),
    (1103302, 1, "tablespoon", 14.0),
    (1103303, 1, "tablespoon", 13.5),
    (1105001, 1, "breast (about 4 oz)", 113.0),
    (1105001, 3, "oz", 85.05),
    (1105002, 3, "oz", 85.05),
    (1105002, 4, "oz", 113.4),
    (1105006, 3, "oz (drained)", 85.05),
    (1106001, 1, "medium banana", 118.0),
    (1106001, 1, "large banana", 136.0),
    (1106002, 1, "medium apple", 182.0),
    (1106003, 1, "cup", 148.0),
    (1106004, 1, "cup, whole", 152.0),
    (1107001, 1, "oz (about 23 nuts)", 28.35),
    (1107001, 0.25, "cup", 36.0),
    (1107002, 1, "oz", 28.35),
    (1107003, 1, "tablespoon", 16.0),
    (1107003, 2, "tablespoons", 32.0),
    (1107004, 1, "tablespoon", 12.0),
    (1108001, 1, "cup", 168.0),
    (1108001, 2, "tablespoons", 28.0),
    (1108002, 1, "cup", 145.0),
]

# The "Common" foods tab in the frontend hardcodes these fdc_ids.
# Keep this list in sync with frontend/src/components/search/FoodTabs.tsx.
COMMON_FDC_IDS = [
    1097512,  # Butter, unsalted
    1097517,  # Eggs, whole
    1104330,  # Sugar, granulated white
    1100209,  # All-purpose flour
    1097516,  # Whole milk
    1097514,  # Cream cheese
    1104332,  # Honey
    1102201,  # Baking powder
    1102203,  # Salt
    1102204,  # Vanilla extract
    1103301,  # Olive oil
    1105001,  # Chicken breast
    1105002,  # Ground beef
    1100216,  # Cocoa powder
    1108001,  # Chocolate chips
]


def main() -> None:
    print(f"Building {DB_PATH} ...")
    conn = sqlite3.connect(DB_PATH)
    create_tables(conn)

    conn.executemany(
        """INSERT INTO food_macros VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)""",
        FOODS,
    )
    conn.executemany(
        """INSERT INTO food_portions (fdc_id, amount, modifier, gram_weight) VALUES (?,?,?,?)""",
        PORTIONS,
    )
    conn.commit()
    conn.close()

    food_count = len(FOODS)
    portion_count = len(PORTIONS)
    print(f"Done. {food_count} foods, {portion_count} portion sizes.")


if __name__ == "__main__":
    main()
