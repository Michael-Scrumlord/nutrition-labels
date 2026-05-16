# Nutrition Labels

A full-stack web application that lets you build custom recipes from USDA food data and generate FDA-compliant Nutrition Facts labels as downloadable PDFs.

## Features

- **Ingredient Search** — Full-text search across the USDA FoodData Central database. Results ranked: prefix matches first (alphabetically), then contains matches.
- **Recipe Builder** — Add ingredients with custom amounts in g, ml, oz, lb, or kg. Drag to reorder. Adjust serving count with the portion divisor.
- **Live Label Preview** — An FDA 2020-format Nutrition Facts panel updates in real time as you build your recipe.
- **PDF Export** — Downloads a print-ready PDF label sized to your chosen dimensions (default 2.75 in wide).

## Quick Start (Docker)

```bash
docker-compose up --build
```

| Service      | URL                    |
|-------------|------------------------|
| Frontend    | http://localhost:5173  |
| Backend API | http://localhost:8000  |

## API Reference

### `GET /api/search?query=<string>`

Search foods by name.

- **Query params:** `query` (string) — minimum 2 characters; returns `[]` for shorter queries
- **Returns:** `FoodSearchResult[]` — at most 40 results, prefix matches before contains matches

```json
[{ "fdc_id": 1097512, "name": "Butter, unsalted" }]
```

### `GET /api/food/{fdc_id}`

Retrieve full macro data and portion sizes for one food.

- **Path params:** `fdc_id` (integer)
- **Returns:** `FoodDetail` with `macros` (13 nutrients per 100 g) and `portions`
- **404** if the food is not in the database

```json
{
  "fdc_id": 1097512,
  "name": "Butter, unsalted",
  "macros": { "calories": 717, "fat_total_g": 81.1, "..." : "..." },
  "portions": [{ "amount": 1, "modifier": "tablespoon", "gram_weight": 14.2 }]
}
```

### `POST /api/generate_label`

Calculate per-serving macros for a recipe, render an FDA Nutrition Facts label, and return a PDF.

- **Body:** `GenerateLabelRequest` (JSON)
- **Returns:** `application/pdf` binary download (`nutrition_label.pdf`)
- **400** if the ingredients list is empty or an `fdc_id` is not in the database
- **422** if request validation fails (e.g. `portion_divisor` out of range)

```json
{
  "portion_divisor": 8,
  "label_name": "Chocolate Chip Cookies",
  "width_inches": 2.75,
  "height_inches": null,
  "ingredients": [
    { "fdc_id": 1097512, "name": "Butter", "amount": 227, "unit": "g" },
    { "fdc_id": 1100209, "name": "Flour",  "amount": 250, "unit": "g" }
  ]
}
```

**Supported units:** `g`, `ml`, `oz`, `lb`, `kg`
**`portion_divisor` range:** 1–999 (number of servings in the batch)

## Nutrient Tracking

The app tracks the 13 nutrients required by the 2020 FDA Nutrition Facts format:

| Nutrient            | Field                    | Daily Value |
|---------------------|--------------------------|-------------|
| Calories            | `calories`               | —           |
| Total Fat           | `fat_total_g`            | 78 g        |
| Saturated Fat       | `fat_saturated_g`        | 20 g        |
| Cholesterol         | `cholesterol_mg`         | 300 mg      |
| Sodium              | `sodium_mg`              | 2300 mg     |
| Total Carbohydrate  | `carbohydrates_total_g`  | 275 g       |
| Dietary Fiber       | `fiber_g`                | 28 g        |
| Total Sugars        | `sugar_g`                | —           |
| Protein             | `protein_g`              | —           |
| Vitamin D           | `vitamin_d_mcg`          | 20 mcg      |
| Calcium             | `calcium_mg`             | 1300 mg     |
| Iron                | `iron_mg`                | 18 mg       |
| Potassium           | `potassium_mg`           | 4700 mg     |

Nutrients with `—` have no established FDA Daily Value and show a dash on the label.

## Calculation Math

```
grams       = amount × UNIT_CONVERSIONS[unit]
multiplier  = grams / 100
contribution = db_value_per_100g × multiplier
total       = Σ contributions across all ingredients
per_serving = total / portion_divisor
```

Rounding: calories → nearest integer; all other nutrients → 1 decimal place.

## %DV Display Rules

- Nutrients without a DV (calories, sugar, protein) display `—`.
- When the computed %DV rounds to 0 but the raw value is > 0, display `<1%`.
- Otherwise display the rounded integer, e.g. `24%`.

## Project Structure

```
nutrition-labels/
├── backend/                    # FastAPI + SQLite
│   ├── app/
│   │   ├── main.py             # 3 API routes
│   │   ├── nutrition.py        # Pure macro calculation math
│   │   ├── search.py           # Search ranking logic
│   │   ├── database.py         # SQLite access layer
│   │   ├── pdf.py              # Jinja2 + WeasyPrint PDF rendering
│   │   ├── models.py           # Pydantic request/response models
│   │   ├── constants.py        # Unit conversions, FDA daily values
│   │   └── config.py           # Environment settings
│   └── tests/                  # Pytest suite
├── frontend/                   # React + TypeScript + Zustand
│   ├── src/
│   │   ├── components/         # React components (layout, recipe, label, search, ui)
│   │   ├── hooks/              # Custom hooks
│   │   ├── store/              # Zustand stores
│   │   ├── utils/              # nutrition.ts, units.ts (pure functions)
│   │   ├── api/                # Typed fetch wrappers
│   │   └── types/              # TypeScript interfaces
│   └── tests/                  # Vitest suite
└── docs/                       # Architecture documentation
```

## Running Tests

### Backend (Pytest)

```bash
cd backend
pip install -r requirements.txt
pytest tests/ -v
```

### Frontend (Vitest)

```bash
cd frontend
npm install
npm test
```

## Key Design Decisions

- **Mirrored math** — `nutrition.py` and `utils/nutrition.ts` implement identical calculation logic. The backend recalculates macros on every PDF request to catch constant drift.
- **Portion divisor** — Controls how many servings the batch yields. Per-serving values = total recipe macros ÷ divisor. Valid range: 1–999.
- **Ingredient ordering** — FDA regulations require ingredients sorted by gram weight descending. Both the frontend label preview and the backend PDF template implement this.
- **`<1%` rule** — When a nutrient's %DV rounds to 0 but its raw value is > 0, the label shows `<1%` rather than `0%`.
- **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` treats `portionDivisor=0` as 1 (defensive for live preview). The backend raises a `ValueError` (strict for PDF generation).
