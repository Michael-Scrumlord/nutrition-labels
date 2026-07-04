# Nutrition Label Generator

A full-stack web application that lets you build custom recipes from USDA food data and generate FDA-compliant Nutrition Facts labels as downloadable PDFs.

## Features

- **Ingredient Search** — SQLite FTS5 full-text search across three USDA FoodData Central sub-datasets (Foundation Foods, FNDDS, SR Legacy — ~17k foods total; Branded Foods is intentionally excluded). Results re-ranked by prefix match then alphabetically. See [DATA_SOURCES.md](DATA_SOURCES.md).
- **Recipe Builder** — Add ingredients with custom amounts in g, ml, oz, lb, or kg. Drag to reorder. Adjust serving count with the portion divisor.
- **Live Label Preview** — An FDA 2020-format Nutrition Facts panel updates in real time as you build your recipe.
- **PDF Export** — Downloads a print-ready, vector PDF label sized to your chosen dimensions (default 2.75 in wide). Generated entirely client-side (see [PDF Export](#pdf-export-client-side) below) — nothing is uploaded to the server.
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
  "macros": { "calories": 717, "fat_total_g": 81.1, "..." : "..." },
  "portions": [{ "amount": 1, "modifier": "tablespoon", "gram_weight": 14.2 }]
}
```

**Supported units:** `g`, `ml`, `oz`, `lb`, `kg`

There is no server-side endpoint for label/PDF generation — see [PDF Export (client-side)](#pdf-export-client-side) below.

## PDF Export (client-side)

Clicking **Generate PDF** does not call the backend. `GenerateButton` lazy-loads
[`@react-pdf/renderer`](https://react-pdf.org/) and `LabelPdfDoc` on click (keeping
the ~450 KB library out of the initial bundle), renders the label to a `Blob` in the
browser, and triggers a local download — nothing is uploaded to the server.

`LabelPreview` (the live DOM preview) and `LabelPdfDoc` (the downloaded PDF) both
read from one shared spec, `frontend/src/components/label/labelSpec.ts`:

- `GEO` — every dimension (font sizes, rule widths, padding) in points, satisfying
  the 21 CFR 101.9(d) minimums.
- `MACRO_ROWS` / `MICRO_ROWS` — row order and metadata for the label body.
- `rowDisplay()` — resolves one row's exact left-hand label/amount and right-hand
  %DV strings, so the preview and the PDF can never disagree on a value or its
  rounding.

This used to be a `POST /api/generate_label` endpoint that rendered a Jinja2
template with WeasyPrint server-side; it was retired in favor of the client-side
approach above so the label has a single source of truth (`labelSpec.ts`) and the
in-app preview always matches the downloaded PDF exactly. `backend/app/nutrition.py`
(the macro-calculation math) is no longer called by any route — it's retained
purely as the parity spec that `frontend/src/utils/nutrition.ts` is tested against
(see [Mirrored math](#key-design-decisions) below).

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

`calculateRecipeMacros` (`frontend/src/utils/nutrition.ts`) returns these
per-serving values **unrounded** — FDA rounding is increment-based and differs
per nutrient (21 CFR 101.9(c)), so it's applied only at the presentation layer,
by `formatNutrientAmount`, right before a value is printed on the label. This
also means %DV is computed from the true per-serving amount, not a
lossy rounded-for-display value. Increment rules, e.g.: calories round to the
nearest 5 below 50 kcal and nearest 10 above; total/saturated fat round to the
nearest 0.5 g below 5 g and nearest 1 g above; sodium rounds to the nearest 5 mg
up to 140 mg and nearest 10 mg above. See `formatNutrientAmount` for the full
per-nutrient table.

## %DV Display Rules

- Nutrients without a DV (calories, sugar, protein) display `—`.
- When the computed %DV rounds to 0 but the raw value is > 0, display `<1%`.
- Otherwise display the rounded integer, e.g. `24%`.
- Vitamins/minerals (Vitamin D, Calcium, Iron, Potassium) round to coarser %DV
  increments than macros (nearest 2% below 10%, nearest 5% up to 50%, nearest
  10% above) per 21 CFR 101.9(c).

## Project Structure

```
nutrition-labels/
├── backend/                    # FastAPI + SQLite
│   ├── app/
│   │   ├── main.py             # 3 API routes (health, search, food) + rate limiter
│   │   ├── nutrition.py        # Pure macro calculation math — parity spec only;
│   │   │                       #   no route calls it anymore (PDF math moved to
│   │   │                       #   frontend/src/utils/nutrition.ts)
│   │   ├── search.py           # Search ranking logic
│   │   ├── database.py         # SQLite access layer
│   │   ├── models.py           # Pydantic request/response models
│   │   ├── constants.py        # Unit conversions, FDA daily values
│   │   └── config.py           # Environment settings
│   └── tests/                  # Pytest suite
├── frontend/                   # React + TypeScript + Zustand
│   ├── src/
│   │   ├── components/         # React components
│   │   │   ├── layout/         # AppShell, Header, SiteFooter
│   │   │   ├── recipe/         # RecipeBuilder, IngredientRow, MethodSection, VariablesPanel, RecipeStatsBar, VersionBanner, SlashMenu
│   │   │   ├── label/          # LabelPreview, LabelPdfDoc (@react-pdf/renderer), labelSpec.ts,
│   │   │   │                   #   LabelDimensions, GenerateButton, SaveControls, AdSlot, GuidesCard
│   │   │   ├── search/         # IngredientSearch modal, FoodTabs, SearchResults
│   │   │   ├── recipes/        # RecipesModal, RecipeCard, VersionTimeline
│   │   │   ├── theme/          # ThemeSwitcher, ThemedFrame, AuroraGlow
│   │   │   └── ui/             # Button, Card, Input, Select, Badge, Spinner, ScrubNumber
│   │   ├── hooks/              # useNutritionCalc, useRecipeActions, useLabelSave, useIngredientSearch, useTitleAutoResize, …
│   │   ├── store/              # Zustand stores
│   │   │   ├── recipeStore.ts      # Current recipe state + all actions
│   │   │   ├── savedRecipesStore.ts# Recipe catalog with localStorage + versioning
│   │   │   ├── preferencesStore.ts # Favorite/recent foods
│   │   │   └── themeStore.ts       # Theme preference
│   │   ├── utils/              # nutrition.ts, units.ts (pure functions)
│   │   ├── api/                # Typed fetch wrappers (client.ts) — search + food detail only
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

- **Mirrored math (spec, not a live call)** — `nutrition.py` and `utils/nutrition.ts` implement identical calculation logic. Since PDF generation moved client-side, no route calls `nutrition.py` anymore — it's kept as the canonical parity spec, exercised only by its own pytest suite, that `utils/nutrition.ts` is tested against.
- **Portion divisor** — Controls how many servings the batch yields. Per-serving values = total recipe macros ÷ divisor. Valid range: 1–999.
- **Ingredient ordering** — FDA regulations require ingredients sorted by gram weight descending. `buildIngredientsString` implements this once; both `LabelPreview` and `LabelPdfDoc` call it.
- **`<1%` rule** — When a nutrient's %DV rounds to 0 but its raw value is > 0, the label shows `<1%` rather than `0%`.
- **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a `RangeError` for `portionDivisor` outside 1–999. In live preview the UI guards against passing 0.
- **Rate limiting** — The two live data routes are rate-limited per IP: `GET /api/search` at 60/min and `GET /api/food/{id}` at 120/min. Every `429` response includes a `Retry-After` header.
- **Body size limit** — Requests whose `Content-Length` exceeds 64 KB are rejected with `413` before FastAPI parses the body. A non-integer `Content-Length` header returns `400`.
- **Recipe versioning** — Recipes are saved to `localStorage` as a list of timestamped snapshots. Each recipe holds up to 20 versions; older ones are pruned automatically. Max 50 recipes total.
- **Single source of truth for label rendering** — `labelSpec.ts`'s `rowDisplay()` resolves every row's label/amount/%DV once; `LabelPreview` (DOM) and `LabelPdfDoc` (`@react-pdf/renderer`) both call it, so the live preview can never drift from the downloaded PDF.
