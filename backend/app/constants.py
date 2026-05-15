# constants.py
#
# All authoritative numbers used across the app.
# Never hard-code these elsewhere — always import from here.

# How many grams each unit represents.
# All database values are stored per 100g, so every calculation
# converts the user's chosen amount to grams first.
UNIT_CONVERSIONS: dict[str, float] = {
    "g":  1.0,
    "ml": 1.0,       # Water-density assumption — close enough for food
    "oz": 28.3495,
    "lb": 453.592,
    "kg": 1000.0,
}

# 2020 FDA daily reference values used to compute %DV on the label.
# Only nutrients listed here get a %DV column. Everything else shows a dash.
FDA_DAILY_VALUES: dict[str, float] = {
    "fat_total_g":            78,
    "fat_saturated_g":        20,
    "cholesterol_mg":         300,
    "sodium_mg":              2300,
    "carbohydrates_total_g":  275,
    "fiber_g":                28,
    "vitamin_d_mcg":          20,
    "calcium_mg":             1300,
    "iron_mg":                18,
    "potassium_mg":           4700,
}

# The 13 nutrients we track, in the order they appear on the FDA label.
# This list drives DB queries, macro math, and template rendering.
NUTRIENT_FIELDS: list[str] = [
    "calories",
    "fat_total_g",
    "fat_saturated_g",
    "cholesterol_mg",
    "sodium_mg",
    "carbohydrates_total_g",
    "fiber_g",
    "sugar_g",
    "protein_g",
    "vitamin_d_mcg",
    "calcium_mg",
    "iron_mg",
    "potassium_mg",
]
