# Nutrition Label Generator

A full-stack web application that lets you build custom recipes from USDA food data and generate FDA-compliant Nutrition Facts labels as downloadable PDFs.

## Features

- **Ingredient Search** — SQLite FTS5 full-text search across three USDA FoodData Central sub-datasets (Foundation Foods, FNDDS, SR Legacy — ~17k foods total; Branded Foods is intentionally excluded). Results re-ranked by prefix match then alphabetically. See [DATA_SOURCES.md](DATA_SOURCES.md).
- **Recipe Builder** — Add ingredients with custom amounts in g, ml, oz, lb, or kg. Drag to reorder. Adjust serving count with the portion divisor.
- **Live Label Preview** — An FDA 2020-format Nutrition Facts panel updates in real time as you build your recipe.
- **PDF Export** — Downloads a print-ready PDF label sized to your chosen dimensions (default 2.75 in wide).
- **Recipe Steps & Variables** — Write method notes and define reusable variables (e.g. `servings`) that interpolate into step text.
- **Recipe Saving & Versioning** — Save snapshots to `localStorage`. Each recipe keeps up to 20 versions; you can browse, restore, or delete individual versions.
- **Theme Support** — Light and dark themes, stored in `localStorage`.

## Quick Start (Docker)

```bash
# 1. Download USDA FoodData Central CSVs (~700 MB, one-time, ~2 GB extracted)
bash scripts/download_fdc.sh

# 2. Start everything (local dev mode — publishes ports, skips Caddy/TLS).
#    The db-init service builds nutrition.db on first run (5–15 min on
#    2 vCPUs), then exits. Subsequent restarts skip the build.
docker compose -f docker-compose.yml -f docker-compose.dev.yml up --build
```

| Service      | URL                    |
|-------------|------------------------|
| Frontend    | http://localhost:5173  |
| Backend API | http://localhost:8000  |

For production deploys (Caddy on :80/:443, no published frontend/backend
ports), use `docker compose up --build` without the dev override. See
[docs/DEPLOY.md](docs/DEPLOY.md).

The compiled SQLite database lives on the `nutrition_db` Docker volume — it is
**not** baked into the backend image, and the backend mounts it read-only. See
[DATA_SOURCES.md](DATA_SOURCES.md) for the full data-pipeline architecture.

## API Reference

### `GET /api/search?query=<string>`

Search foods by name.

- **Query params:** `query` (string) — minimum 2 characters; returns `[]` for shorter queries
- **Returns:** `FoodSearchResult[]` — at most 40 results; prefix matches surface ahead of contains matches, each group sorted alphabetically
- **400** if `query` exceeds 100 characters
- **429** if more than 60 requests are made per minute from the same IP

```json
[{
  "fdc_id": 1097512,
  "name": "Butter, unsalted",
  "data_type": "sr_legacy_food"
}]
```

### `GET /api/food/{fdc_id}`

Retrieve full macro data and portion sizes for one food.

- **Path params:** `fdc_id` (integer, ≥ 1)
- **Returns:** `FoodDetail` with `macros` (13 nutrients per 100 g) and `portions`
- **404** if the food is not in the database
- **429** if more than 120 requests are made per minute from the same IP

```json
{
  "fdc_id": 1097512,
  "name": "Butter, unsalted",
  "macros": { "calories": 717, "fat_total_g": 81.1, "...": "..." },
  "portions": [{ "amount": 1, "modifier": "tablespoon", "gram_weight": 14.2 }]
}
```

### ~~`POST /api/generate_label`~~ *(retired)*

> **Retired.** PDF generation now happens entirely client-side via
> `@react-pdf/renderer` (see `frontend/src/components/label/LabelPdfDoc.tsx`).
> Removing the server-side endpoint ensures the in-app live preview and the
> downloaded PDF share a single source of truth
> (`frontend/src/components/label/labelSpec.ts`).
>
> The `GenerateLabelRequest` Pydantic model (`backend/app/models.py`) is
> retained for reference and is exercised by the backend test suite.

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

**Backend rounding** (`nutrition.py`): calories → nearest integer; all other
nutrients → 1 decimal place (ROUND_HALF_UP via Python `Decimal`).

**Frontend display rounding** (`utils/nutrition.ts` → `formatNutrientAmount`):
FDA 21 CFR 101.9(c) increment-based rules applied at render time — e.g.
calories round to the nearest 5 (if ≤ 50 kcal) or 10; sodium rounds to the
nearest 5 mg (if ≤ 140 mg) or 10 mg. Per-serving values are kept unrounded in
the React state so that %DV is computed from the true amount, not a lossy
display value.

## %DV Display Rules

- Nutrients without a DV (calories, sugar, protein) display `—`.
- When the computed %DV rounds to 0 but the raw value is > 0, display `<1%`.
- Otherwise display the rounded integer, e.g. `24%`.

## Project Structure

```
nutrition-labels/
├── backend/                    # FastAPI + SQLite
│   ├── app/
│   │   ├── main.py             # API routes + rate limiter
│   │   ├── nutrition.py        # Pure macro calculation math
│   │   ├── search.py           # Search ranking logic
│   │   ├── database.py         # SQLite access layer
│   │   ├── pdf.py              # Jinja2 + WeasyPrint PDF rendering (retired — PDF is now client-side)
│   │   ├── models.py           # Pydantic request/response models
│   │   ├── constants.py        # Unit conversions, FDA daily values
│   │   └── config.py           # Environment settings
│   └── tests/                  # Pytest suite
├── frontend/                   # React + TypeScript + Zustand
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── layout/         # AppShell, Header, SiteFooter
│   │   │   ├── recipe/         # RecipeBuilder, IngredientRow, MethodSection, VariablesPanel, RecipeStatsBar, VersionBanner, SlashMenu
│   │   │   ├── label/          # LabelPreview, LabelDimensions, GenerateButton, SaveControls, AdSlot, GuidesCard
│   │   │   ├── search/         # IngredientSearch modal, FoodTabs, SearchResults
│   │   │   ├── recipes/        # RecipesModal, RecipeCard, VersionTimeline
│   │   │   ├── theme/          # ThemeSwitcher, ThemedFrame, AuroraGlow
│   │   │   └── ui/             # Button, Card, Input, Select, Badge, Spinner, ScrubNumber
│   │   ├── hooks/              # useNutritionCalc, useRecipeActions, useIngredientSearch, useTitleAutoResize, …
│   │   ├── store/              # Zustand stores
│   │   │   ├── recipeStore.ts      # Current recipe state + all actions
│   │   │   ├── savedRecipesStore.ts# Recipe catalog with localStorage + versioning
│   │   │   ├── preferencesStore.ts # Favorite/recent foods
│   │   │   └── themeStore.ts       # Theme preference
│   │   ├── utils/              # nutrition.ts, units.ts, stepText.ts (pure functions)
│   │   ├── api/                # Typed fetch wrappers (client.ts)
│   │   ├── constants/          # commonFoods.ts, theme.ts
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

- **Mirrored math** — `nutrition.py` and `utils/nutrition.ts` implement identical
  per-serving calculation logic. FDA label rounding (21 CFR 101.9(c)) is applied
  separately at the presentation layer by the frontend’s `formatNutrientAmount`;
  the backend rounds to 1 decimal place / integer for internal consistency.
- **Client-side PDF** — Label PDFs are generated entirely in the browser via
  `@react-pdf/renderer`. This eliminates the former `POST /api/generate_label`
  WeasyPrint endpoint and guarantees the live preview and downloaded file are
  pixel-identical (both driven by `labelSpec.ts`).
- **Portion divisor** — Controls how many servings the batch yields. Per-serving
  values = total recipe macros ÷ divisor. Valid range: 1–999.
- **Ingredient ordering** — FDA regulations require ingredients sorted by gram weight
  descending. Both the frontend label preview and the PDF template implement this.
- **`<1%` rule** — When a nutrient’s %DV rounds to 0 but its raw value is > 0,
  the label shows `<1%` rather than `0%`.
- **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a
  `RangeError` for `portionDivisor` outside 1–999. In live preview the UI guards
  against passing 0.
- **Rate limiting** — Active API routes are rate-limited per IP: `GET /api/search`
  at 60/min and `GET /api/food/{id}` at 120/min. Every `429` response includes a
  `Retry-After` header.
- **Body size limit** — Requests whose `Content-Length` exceeds 64 KB are rejected
  with `413` before FastAPI parses the body. A non-integer `Content-Length` header
  returns `400`.
- **Recipe versioning** — Recipes are saved to `localStorage` as a list of
  timestamped snapshots. Each recipe holds up to 20 versions; older ones are pruned
  automatically. Max 50 recipes total.
