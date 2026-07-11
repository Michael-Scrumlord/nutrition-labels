# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser                                                         │
│  React + TypeScript + Zustand + TanStack React Query             │
│  ┌────────────────┐  ┌────────────────┐  ┌───────────────────┐ │
│  │ IngredientSearch│  │ RecipeBuilder  │  │   LabelPreview   │ │
│  │  (search modal)│  │ (Zustand store)│  │  (live FDA label) │ │
│  └───────┬────────┘  └──────┬─────────┘  └────────┬──────────┘ │
│          │                  │                      │            │
│          │                  │              LabelPdfDoc.tsx       │
│          │                  │           (@react-pdf/renderer —   │
│          │                  │            renders the same        │
│          │                  │            labelSpec.ts as         │
│          │                  │            LabelPreview; no        │
│          │                  │            network round-trip)     │
│          │                  │                                    │
│   GET /api/search    GET /api/food/{id}                          │
└──────────┼──────────────────┼─────────────────────────────────────┘
           │                  │
┌──────────▼──────────────────▼──────────────────────────────────────┐
│  FastAPI Backend                                                    │
│  ┌────────────┐  ┌─────────────┐                                   │
│  │ search.py  │  │ nutrition.py│  (pure math; unused by any route — │
│  │ (ranking)  │  │             │   kept only for its own pytest     │
│  │            │  │             │   coverage as a parity reference)  │
│  └────────────┘  └─────────────┘                                   │
│           └──────────────┬──────────────────────────┘              │
│                          │                                          │
│                  ┌───────▼───────┐                                 │
│                  │  database.py  │                                 │
│                  └───────┬───────┘                                 │
└──────────────────────────┼──────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   SQLite DB   │
                    │ (USDA foods)  │
                    └───────────────┘
```

PDF generation is fully client-side (see
[Data Flow: PDF Generation](#data-flow-pdf-generation) below) — there is no
`/api/generate_label` route and no server round-trip involved in producing a
label PDF.

---

## Backend

### Routes (`app/main.py`)

Each route follows the same pattern: **validate → fetch → calculate → return**. No business logic lives in routes.

Three middleware layers run before any route handler:

1. **`BodySizeLimitMiddleware`** — Rejects requests whose `Content-Length` header exceeds the configured maximum (default **64 KB**; set via `MAX_BODY_BYTES` env var) with a `413` response before FastAPI parses the body. A non-integer `Content-Length` value returns `400` instead.
2. **`TrustedHostMiddleware`** — Rejects requests with an unrecognized `Host` header (`400`).
3. **`CORSMiddleware`** — Only active in local dev (when `CORS_ORIGINS` is set).

| Route                    | Method | Delegates to                                              |
|--------------------------|--------|-----------------------------------------------------------|
| `/api/health`            | GET    | `database.get_connection` (DB probe); returns `{"status":"ok","release":"..."}` |
| `/api/search`            | GET    | `search.ranked_search`; rejects queries > 100 chars with `400` |
| `/api/food/{fdc_id}`     | GET    | `database.get_food_by_id`, `database.get_portions_by_id`  |

### Module Responsibilities

**`nutrition.py`** — Pure functions, no side effects, no I/O. Not called by any route (see
[PDF generation now lives client-side](#pdf-generation-frontend) below) — kept as a pure,
independently pytest-covered implementation that mirrors `utils/nutrition.ts`.

- `calculate_recipe_macros(ingredients, food_rows, portion_divisor)` — Converts each ingredient's amount to grams, scales per-100 g database values by the resulting multiplier, sums across all ingredients, divides by `portion_divisor`, and rounds to label-appropriate precision (calories → integer, everything else → 1 decimal).
- `compute_daily_value_pct(value, nutrient)` — Returns an integer %DV, or `None` if the nutrient has no established FDA daily value (calories, sugar, and protein have no DV).

**`search.py`** — Pure ranking logic, no I/O.

- `ranked_search(query, food_rows)` — Splits results into two groups: names that *start with* the query (prefix matches) and names that *contain* the query. Each group is sorted alphabetically. Returns at most 40 combined results.

**`database.py`** — SQLite access layer. Returns `sqlite3.Row` objects (dict-like). Never does any calculation.

**`models.py`** — All Pydantic models.

| Model                 | Direction | Purpose                                              |
|-----------------------|-----------|------------------------------------------------------|
| `IngredientItem`      | Request   | One ingredient: `fdc_id`, `name`, `amount`, `unit`  |
| `GenerateLabelRequest`| Request   | Recipe payload shape for `calculate_recipe_macros`; unused by any route, kept for its own test coverage |
| `MacroProfile`        | Response  | 13 nutrient totals (per 100 g or per serving)        |
| `FoodSearchResult`    | Response  | `fdc_id` + `name` + optional `data_type` for search results |
| `PortionSize`         | Response  | A named portion (e.g. 1 tablespoon = 14.2 g)         |
| `FoodDetail`          | Response  | One food: `macros` + `portions`                      |
| `HealthResponse`      | Response  | `{"status": "ok", "release": "<sha>"}` from `/api/health` |

**`constants.py`** — Single source of truth for numbers shared across modules.

- `UNIT_CONVERSIONS` — Grams per unit (`g`, `ml`, `oz`, `lb`, `kg`).
- `FDA_DAILY_VALUES` — 2020 reference values for 10 of the 13 tracked nutrients.
- `NUTRIENT_FIELDS` — Ordered list of the 13 nutrient field names. Drives DB queries and macro math.

### Validation Rules (`models.py`)

| Field                | Rule                                              |
|----------------------|---------------------------------------------------|
| `amount`             | Float, > 0 and ≤ 1,000,000                        |
| `unit`               | Must be a key in `UNIT_CONVERSIONS` (g/ml/oz/lb/kg) |
| `name` (ingredient)  | String, 1–120 characters; control chars stripped  |
| `portion_divisor`    | Integer, 1–999 inclusive                          |
| `label_name`         | String, max 120 characters (empty allowed); control chars stripped |
| `width_inches`       | Float, ≥ 2 and ≤ 12; snapped to 0.01″ precision   |
| `height_inches`      | Float, ≥ 2 and ≤ 20, or `null` (auto-size); snapped to 0.01″ |
| `ingredients`        | List, 1–100 items                                 |
| Extra fields         | Rejected (`extra="forbid"`)                       |

---

## Frontend

### Component Tree

```
App
└── AppShell (2-column magazine grid)
    ├── Header (nav + ThemeSwitcher + saved-recipes button)
    ├── [left] RecipeBuilder
    │   ├── IngredientRow (×N)         ← hover highlights nutrients in label
    │   ├── NutritionBreakdownTable
    │   ├── MethodSection
    │   │   ├── StepEditor → StepRow (×N) → StepText
    │   │   └── VariablesPanel → VariablePopover (×N)
    │   └── AddIngredientForm          ← triggers IngredientSearch modal
    │       └── IngredientSearch (modal overlay)
    │           ├── FoodTabs (common / search)
    │           └── SearchResults
    └── [right] LabelColumn
        ├── LabelPreview               ← live FDA label (ThemedFrame)
        ├── LabelDimensions            ← width/height controls
        └── GenerateButton             ← triggers PDF download

RecipesModal (overlay, triggered from Header)
└── RecipeCard (×N)
    └── VersionTimeline
```

The `IngredientSearch` modal is triggered from `RecipeBuilder` and overlays the whole viewport.

### State Management

**`recipeStore` (Zustand)** — Central recipe state. Not persisted; holds the recipe being edited right now.

| State field              | Type                | Purpose                                          |
|--------------------------|---------------------|--------------------------------------------------|
| `ingredients`            | `IngredientItem[]`  | Ordered list of recipe ingredients               |
| `portionDivisor`         | `number`            | How many servings the batch yields (default 8)   |
| `labelName`              | `string`            | Recipe name printed on the label                 |
| `dimensions`             | `LabelDimensions`   | PDF width/height in inches                       |
| `highlightedNutrients`   | `HighlightSet`      | Nutrient rows to highlight in label (hover)      |
| `instructions`           | `RecipeStep[]`      | Ordered method steps                             |
| `variables`              | `RecipeVariable[]`  | Named variables that interpolate into step text  |
| `currentRecipeId`        | `string \| null`    | ID of the loaded saved recipe, or null if unsaved|
| `viewingVersionId`       | `string \| null`    | Non-null when browsing a historical version      |

Ingredient actions: `addIngredient`, `removeIngredient`, `updateIngredientName`, `updateIngredientAmount`, `updateIngredientUnit`, `moveIngredient`.

Recipe meta actions: `setPortionDivisor`, `setLabelName`, `setDimensions`, `setHighlightedNutrients`.

Method actions: `addStep`, `updateStepText`, `removeStep`, `moveStep`, `addVariable`, `setVariableValue`, `updateVariable`, `removeVariable`.

Lifecycle actions: `clearRecipe`, `loadRecipe`, `loadVersion`, `exitVersionView`, `setCurrentRecipeId`.

**`savedRecipesStore` (Zustand + `localStorage`)** — Recipe catalog, persisted under key `nl_saved_recipes`.

- Max 50 recipes, max 20 versions per recipe (oldest pruned automatically).
- Actions: `createRecipe`, `appendVersion`, `renameRecipe`, `deleteRecipe`, `deleteVersion`.
- Schema migration: v1 snapshots are upgraded to v2 (versioned) format on first load.

**`preferencesStore` (Zustand + `localStorage`)** — User preferences: favorite foods and recently used foods.

**`themeStore` (Zustand + `localStorage`)** — Stores the active theme (`light` / `dark`).

### Custom Hooks

| Hook                    | Purpose                                                                 |
|-------------------------|-------------------------------------------------------------------------|
| `useNutritionCalc`      | Derives per-serving `MacroProfile` from `recipeStore`; memoized with `useMemo` |
| `useRecipeActions`      | Returns all `recipeStore` actions in one shallow-equal subscription (prevents unnecessary re-renders) |
| `useIngredientSearch`   | Manages search API calls and the search modal state                     |
| `useLabelResize`        | Tracks label panel dimensions for the PDF size controls                 |
| `useAnimatedNumber`     | Animates number transitions in the stats bar                            |
| `useDebounce`           | Debounces a value by a given delay (used by ingredient search input)    |
| `useTitleAutoResize`    | Auto-resizes the label-name input to fit its content                    |
| `usePageMeta`           | Sets `document.title`, `<meta name="description">`, and canonical link per page |
| `useAdSenseBootstrap`   | Loads the Google AdSense script; no-op when publisher env vars are unset |

### Utilities (`src/utils/`)

**`nutrition.ts`** — Mirrors backend math exactly. Must stay in sync with `nutrition.py`.

| Function                    | Purpose                                                                  |
|-----------------------------|--------------------------------------------------------------------------|
| `calculateRecipeMacros`     | Same algorithm as backend; throws `RangeError` for `portionDivisor` outside 1–999 |
| `getHighlightKeys`          | Returns a `Set` of the top 2 nutrient keys by %DV contribution           |
| `computeDailyValues`        | Returns `{ nutrient: %DV }` for all DV-tracked nutrients                 |
| `formatDV`                  | Returns `"—"`, `"<1%"`, or `"12%"` for label display                    |
| `buildIngredientsString`    | Sorts by gram weight desc, uppercases, joins with commas, appends `.`    |
| `round1`                    | Rounds to 1 decimal place using `roundHalfUp` (matches Python behavior)  |

**`units.ts`** — Unit conversion utilities. Must stay in sync with `backend/app/constants.py`.

| Function               | Purpose                                                                              |
|------------------------|--------------------------------------------------------------------------------------|
| `UNIT_CONVERSIONS`     | Grams-per-unit map for the 5 supported units (`g`, `ml`, `oz`, `lb`, `kg`)          |
| `convertToGrams`       | `amount × UNIT_CONVERSIONS[unit]`                                                    |
| `convertBetweenUnits`  | Re-expresses an amount in a new unit (preserves gram weight; used when the user changes the unit dropdown) |
| `normalizePortion`     | Converts a FDC `PortionSize` (e.g. `0.5 cup = 113.5 g`) to a per-1-unit `PortionRef` |
| `ingredientGrams`      | Single source of truth for ingredient weight: uses `portionRef.gramsPerUnit` when set, otherwise falls back to unit conversion |

### PDF Generation (Frontend)

PDF generation moved entirely client-side; there is no backend PDF route.
`frontend/src/components/label/labelSpec.ts` is the single source of truth
for the FDA 2020 Nutrition Facts panel layout, and both renderers consume it
so they can't disagree on a value, a rounding, or a %DV:

- **`GEO`** — All panel dimensions in points (the PDF's native unit). The
  live DOM preview renders these same numbers as pixels 1:1, so the preview
  and the PDF are uniform scales of each other — same font, same wrapping,
  same proportions.
- **`MACRO_ROWS` / `MICRO_ROWS`** — The row order and metadata (label,
  which `MacroProfile` key it reads, bold/indent level, whether it suppresses
  the %DV column) for every line on the label.
- **`rowDisplay(row, macros, transFatG, addedSugarsG)`** — Resolves one row
  to its exact label/amount/%DV display strings, delegating to the shared
  formatting functions in `utils/nutrition.ts` (`formatNutrientAmount`,
  `formatDV`, `formatDVFromAmount`, etc). This is the one place a value, its
  rounding, and its %DV are computed — both renderers call it instead of
  reimplementing the logic.

Consumers:

- **`LabelPreview.tsx`** — Renders `labelSpec.ts` as live DOM/CSS for the
  in-app preview.
- **`LabelPdfDoc.tsx`** — Renders the same `labelSpec.ts` via
  `@react-pdf/renderer` to produce the downloadable PDF. Triggered from
  `GenerateButton`; the resulting blob is downloaded via `downloadBlob` in
  `api/client.ts`. No network request is made — the PDF is built entirely
  in the browser from state already in `recipeStore`.

---

## Key Design Invariants

1. **Mirrored math** — `nutrition.ts` and `nutrition.py` implement the same algorithm, but only `nutrition.ts` is reachable from the live app — `nutrition.py` isn't called by any route. Nothing recomputes macros server-side; the two implementations are kept in sync by convention and by each having its own dedicated test suite (pytest / Vitest), including a shared round-half-up parity vector (`tests/data/round_half_up_parity.json`). CI's `backend-test` job runs the pytest suite on every push/PR; there is currently no CI job running the Vitest suite.

2. **Constants parity** — `UNIT_CONVERSIONS` and `FDA_DAILY_VALUES` are duplicated across frontend and backend. They must remain identical.

3. **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a `RangeError` for any `portionDivisor` outside 1–999. The backend `nutrition.py` raises `ValueError` for `portionDivisor ≤ 0`. The UI never passes 0 to the calculation function.

4. **Single source of truth for the label** — `labelSpec.ts` (`rowDisplay`, `MACRO_ROWS`, `MICRO_ROWS`, `GEO`) is consumed identically by `LabelPreview.tsx` (live DOM preview) and `LabelPdfDoc.tsx` (`@react-pdf/renderer` PDF export), so the in-app preview and the downloaded PDF can't disagree on a value or a %DV.

5. **Ingredient ordering** — FDA regulations require ingredients listed by weight descending. `buildIngredientsString` implements this sort and is shared by both `LabelPreview.tsx` and `LabelPdfDoc.tsx`.

6. **`<1%` rule** — When `round(value / dv * 100) === 0` but `value > 0`, the label must show `<1%` rather than `0%`. Implemented in `formatDV` / `formatDVFromAmount` (`utils/nutrition.ts`), consumed by `rowDisplay`.

7. **No business logic in routes** — `main.py` only validates input, delegates to modules, and assembles responses. Math and ranking are isolated in their own modules.

8. **Rate limiting** — Both data routes are rate-limited per remote IP via `slowapi`: `GET /api/search` at 60/min and `GET /api/food/{fdc_id}` at 120/min. Every `429` response includes a `Retry-After` header.

---

## Data Flow: PDF Generation

There is no backend involvement in producing a label PDF — the whole flow
runs client-side, from recipe state already held in `recipeStore`:

```
User builds/edits a recipe in the frontend (recipeStore)
        │
        ▼
  calculateRecipeMacros(ingredients, portionDivisor)   ← utils/nutrition.ts, pure, client-side
        │  for each ingredient:
        │    grams = amount × UNIT_CONVERSIONS[unit]
        │    multiplier = grams / 100
        │    for each nutrient: total += baseMacros[field] × multiplier
        │  per_serving = total / portionDivisor   (unrounded)
        ▼
  LabelPreview renders the live DOM preview from labelSpec.ts
  (MACRO_ROWS / MICRO_ROWS + rowDisplay() resolve each row's
  label/amount/%DV, applying FDA rounding at display time)
        │
        │   user clicks "Generate" (GenerateButton)
        ▼
  LabelPdfDoc renders the SAME labelSpec.ts via @react-pdf/renderer
  → produces a PDF Blob in the browser (no network request)
        ▼
  downloadBlob(blob, "nutrition_label.pdf")   ← api/client.ts
  triggers a browser download
```

---

## Data Flow: Ingredient Highlight

When a user hovers an ingredient row in `RecipeBuilder`:

```
IngredientRow (hover)
  → calls useRecipeActions().setHighlightedNutrients(
        getHighlightKeys(ingredient.baseMacros)
      )
  → recipeStore.highlightedNutrients updated
  → LabelPreview re-renders, highlighting the top 2 %DV rows
  → useRecipeActions().setHighlightedNutrients(new Set())  on mouse-leave
```

`getHighlightKeys` ranks all DV-tracked nutrients by `value / dailyValue` and returns the top 2 as a `Set<keyof MacroProfile>`.
