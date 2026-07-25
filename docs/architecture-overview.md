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
│          │                  │                      │             │
│          │                  │              ┌───────▼──────────┐  │
│          │                  │              │   labelSpec.ts   │  │
│          │                  │              │ (shared layout)  │  │
│          │                  │              └───────┬──────────┘  │
│          │                  │                      │             │
│          │                  │              ┌───────▼──────────┐  │
│          │                  │              │  LabelPdfDoc.tsx │  │
│          │                  │              │(@react-pdf/render│  │
│          │                  │              │ er, on-click)    │  │
│          │                  │              └──────────────────┘  │
│   GET /api/search    GET /api/food/{id}                          │
└──────────┼──────────────────┼─────────────────────────────────────┘
           │                  │
┌──────────▼──────────────────▼─────────────────────────────────────┐
│  FastAPI Backend                                                  │
│  ┌────────────┐  ┌─────────────┐                                 │
│  │ search.py  │  │ nutrition.py│                                 │
│  │ (ranking)  │  │  (math)     │                                 │
│  └────────────┘  └─────────────┘                                 │
│           └──────────────┬──────┘                                │
│                          │                                        │
│                  ┌───────▼───────┐                               │
│                  │  database.py  │                               │
│                  └───────┬───────┘                               │
└──────────────────────────┼────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   SQLite DB   │
                    │ (USDA foods)  │
                    └───────────────┘
```

PDF generation is entirely client-side (see [Data Flow: PDF Export](#data-flow-pdf-export-client-side) below) — the backend never sees a recipe payload or renders anything. It only ever serves the two read-only food-data routes.

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
| `/api/search`            | GET    | `search.ranked_search`; rejects queries > 100 chars with `400` (a manual check — deliberately not `Query(max_length=100)`, which would surface as `422` instead) |
| `/api/food/{fdc_id}`     | GET    | `database.get_food_by_id`, `database.get_portions_by_id`  |

There is no PDF-generation route. A `POST /api/generate_label` endpoint used
to render labels server-side via Jinja2 + WeasyPrint; it was retired along
with `backend/app/pdf.py` when PDF rendering moved entirely client-side (see
[Data Flow: PDF Export](#data-flow-pdf-export-client-side)).

### Module Responsibilities

**`nutrition.py`** — Pure functions, no side effects, no I/O.

- `calculate_recipe_macros(ingredients, food_rows, portion_divisor)` — Converts each ingredient's amount to grams, scales per-100 g database values by the resulting multiplier, sums across all ingredients, divides by `portion_divisor`, and rounds to label-appropriate precision (calories → integer, everything else → 1 decimal). Raises `ValueError` for `portion_divisor ≤ 0`; there is no upper bound at this layer (that's enforced by the Pydantic model, and by the frontend independently — see Key Design Invariant 3).
- `compute_daily_value_pct(value, nutrient)` — Returns an integer %DV, or `None` if the nutrient has no established FDA daily value (calories, sugar, and protein have no DV).

**`search.py`** — Pure ranking logic, no I/O.

- `ranked_search(query, food_rows)` — Splits results into two groups: names that *start with* the query (prefix matches) and names that *contain* the query. Each group is sorted alphabetically. Returns at most 40 combined results.

**`database.py`** — SQLite access layer. Returns `sqlite3.Row` objects (dict-like). Never does any calculation.

**`models.py`** — All Pydantic models.

| Model                 | Direction | Purpose                                              |
|-----------------------|-----------|------------------------------------------------------|
| `IngredientItem`      | Request   | One ingredient: `fdc_id`, `name`, `amount`, `unit`  |
| `MacroProfile`        | Response  | 13 nutrient totals (per 100 g or per serving)        |
| `FoodSearchResult`    | Response  | `fdc_id` + `name` + optional `data_type` for search results |
| `PortionSize`         | Response  | A named portion (e.g. 1 tablespoon = 14.2 g)         |
| `FoodDetail`          | Response  | One food: `macros` + `portions`                      |
| `HealthResponse`      | Response  | `{"status": "ok", "release": "<sha>"}` from `/api/health` |

`GenerateLabelRequest` still exists in `models.py` but is now unused —
nothing imports it since `main.py` dropped the PDF route. It's kept around
for its validators and field-constraint documentation value (mirrored in the
frontend and in the table below), not because any route accepts it.

**`constants.py`** — Single source of truth for numbers shared across modules.

- `UNIT_CONVERSIONS` — Grams per unit (`g`, `ml`, `oz`, `lb`, `kg`).
- `FDA_DAILY_VALUES` — 2020 reference values for 10 of the 13 tracked nutrients.
- `NUTRIENT_FIELDS` — Ordered list of the 13 nutrient field names. Drives DB queries, macro math, and template rendering.

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
        ├── LabelDetails                ← household serving, added sugars, trans fat
        ├── GenerateButton             ← lazy-loads @react-pdf/renderer + LabelPdfDoc, triggers PDF download
        └── SaveControls                ← save / save-as-new / version info (via useLabelSave)

RecipesModal (overlay, triggered from Header)
└── RecipeCard (×N)
    └── VersionTimeline
```

The `IngredientSearch` modal is triggered from `RecipeBuilder` and overlays the whole viewport.

`LabelPdfDoc` (the `@react-pdf/renderer` PDF document) is not part of the
mounted tree above — `GenerateButton` dynamically imports it on click so the
~450 KB renderer stays out of the initial bundle. It and `LabelPreview` both
consume `labelSpec.ts` for row order, geometry, and display strings, so the
two can't disagree with each other.

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
| `servingHousehold`       | `string`            | Household serving description, e.g. `"2/3 cup"` (default `""`) |
| `addedSugarsG`           | `number`            | Added Sugars (g) — FDA line with its own %DV (default 0) |
| `transFatG`              | `number`            | Trans Fat (g) — FDA line with no %DV (default 0) |

Ingredient actions: `addIngredient`, `removeIngredient`, `updateIngredientName`, `updateIngredientAmount`, `updateIngredientUnit`, `moveIngredient`.

Recipe meta actions: `setPortionDivisor`, `setLabelName`, `setDimensions`, `setHighlightedNutrients`, `setServingHousehold`, `setAddedSugarsG`, `setTransFatG` (the last two clamp to ≥ 0 and fall back to 0 for non-finite input, e.g. a cleared number field).

Method actions: `addStep`, `updateStepText`, `removeStep`, `moveStep`, `addVariable`, `setVariableValue`, `updateVariable`, `removeVariable`.

Lifecycle actions: `clearRecipe`, `loadRecipe`, `loadVersion`, `exitVersionView`, `setCurrentRecipeId`. Both loaders default `servingHousehold`/`addedSugarsG`/`transFatG` to `""`/`0`/`0` when restoring a version saved before those fields existed.

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
| `useLabelSave`          | Save/version workflow for `LabelColumn`: builds the `RecipeSnapshot`, branches between `appendVersion` (a recipe is loaded) and `createRecipe` (it isn't), and owns the transient "SAVED ✓" feedback flash and the relative-time "last saved" label |
| `useIngredientSearch`   | Manages search API calls and the search modal state                     |
| `useLabelResize`        | Tracks label panel dimensions for the PDF size controls                 |
| `useAnimatedNumber`     | Animates number transitions in the stats bar                            |
| `useDebounce`           | Debounces a value by a given delay (used by ingredient search input)    |
| `useTitleAutoResize`    | Auto-resizes the label-name input to fit its content                    |
| `usePageMeta`           | Sets `document.title`, `<meta name="description">`, and canonical link per page |
| `useAdSenseBootstrap`   | Loads the Google AdSense script; no-op when publisher env vars are unset |

### Utilities (`src/utils/`)

**`nutrition.ts`** — Mirrors backend math exactly. Must stay in sync with `nutrition.py`. Unlike the backend, rounding is *not* applied inside `calculateRecipeMacros` — it returns full-precision per-serving values, and FDA increment-rounding is applied at display time (see the `format*` functions below) so %DV is always computed from the true amount, not a lossy rounded one.

| Function                    | Purpose                                                                  |
|-----------------------------|--------------------------------------------------------------------------|
| `calculateRecipeMacros`     | Same algorithm as backend; returns unrounded per-serving values; throws `RangeError` for `portionDivisor` outside 1–999 |
| `getHighlightKeys`          | Returns a `Set` of the top 2 nutrient keys by %DV contribution           |
| `computeDailyValues`        | Returns `{ nutrient: %DV }` for all DV-tracked nutrients                 |
| `formatNutrientAmount`      | FDA increment-rounded amount + unit for one of the 13 tracked nutrients, e.g. `"8g"`, `"less than 1g"`, `"160mg"` |
| `formatAddedSugarsAmount` / `formatTransFatAmount` | Same increment rules as sugars / total fat, for the two label-only override fields (not part of `MacroProfile`) |
| `formatDV`                  | Returns `"—"`, `"<1%"`, or `"12%"` for a tracked nutrient                |
| `formatDVFromAmount`        | Same `"<1%"` / `"12%"` logic from a raw amount + daily value; used for Added Sugars, which has a DV (50 g) but isn't in `FDA_DAILY_VALUES` |
| `buildIngredientsString`    | Sorts by gram weight desc, uppercases, joins with commas, appends `.`    |
| `round1` / `roundHalfUp`    | Round-half-away-from-zero, matching Python's `Decimal(...).quantize(..., ROUND_HALF_UP)` |

**`label/labelSpec.ts`** — Single source of truth for the FDA label layout, consumed by both `LabelPreview` and `LabelPdfDoc`.

- `GEO` — All dimensions in points (the PDF's native unit); the DOM preview renders them as px 1:1 so both renderers stay uniform scales of each other.
- `MACRO_ROWS` / `MICRO_ROWS` — Row order and metadata (label, bold, indent, DV suppression).
- `rowDisplay(row, macros, transFatG, addedSugarsG)` — Resolves one row to its exact left/right display strings. Three row `source`s: `"macro"` (pulls from `MacroProfile`), `"transFat"` and `"addedSugars"` (pull from the two `LabelDetails` override fields instead). Because both renderers call this same function, a value, its rounding, and its %DV can never disagree between the live preview and the downloaded PDF.

**`units.ts`** — Unit conversion utilities. Must stay in sync with `backend/app/constants.py`.

| Function               | Purpose                                                                              |
|------------------------|--------------------------------------------------------------------------------------|
| `UNIT_CONVERSIONS`     | Grams-per-unit map for the 5 supported units (`g`, `ml`, `oz`, `lb`, `kg`)          |
| `convertToGrams`       | `amount × UNIT_CONVERSIONS[unit]`                                                    |
| `convertBetweenUnits`  | Re-expresses an amount in a new unit (preserves gram weight; used when the user changes the unit dropdown) |
| `normalizePortion`     | Converts a FDC `PortionSize` (e.g. `0.5 cup = 113.5 g`) to a per-1-unit `PortionRef` |
| `ingredientGrams`      | Single source of truth for ingredient weight: uses `portionRef.gramsPerUnit` when set, otherwise falls back to unit conversion |

---

## Key Design Invariants

1. **Mirrored math** — `nutrition.ts` and `nutrition.py` implement the same algorithm. Changes to one must be reflected in the other.

2. **Constants parity** — `UNIT_CONVERSIONS` and `FDA_DAILY_VALUES` are duplicated across frontend and backend. They must remain identical.

3. **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a `RangeError` for any `portionDivisor` outside 1–999. The backend `nutrition.py` raises `ValueError` for `portionDivisor ≤ 0`. The UI never passes 0 to the calculation function.

4. **Client-side rendering, no server round-trip** — PDF generation has no backend involvement. `LabelPdfDoc` and `LabelPreview` both read from `labelSpec.ts`, so the download can't drift from the on-screen preview. (This replaces an earlier invariant where the backend independently recalculated macros on every PDF request — that cross-check no longer exists now that there's no backend PDF request to recalculate against.)

5. **Ingredient ordering** — FDA regulations require ingredients listed by weight descending. `buildIngredientsString` implements this sort for both the live preview and the PDF (they share the same sorted string via `labelSpec.ts`/`LabelPdfDoc`).

6. **`<1%` rule** — When `round(value / dv * 100) === 0` but `value > 0`, the label must show `<1%` rather than `0%`. Implemented once, in `formatDV`/`formatDVFromAmount`, and consumed by both renderers via `rowDisplay`.

7. **No business logic in routes** — `main.py` only validates input, delegates to modules, and assembles responses. Math and ranking are isolated in their own modules.

8. **Rate limiting** — Both remaining data routes are rate-limited per remote IP via `slowapi`: `GET /api/search` at 60/min and `GET /api/food/{fdc_id}` at 120/min. Every `429` response includes a `Retry-After` header.

---

## Data Flow: PDF Export (client-side)

```
User clicks "Generate PDF" (GenerateButton)
        │
        ▼
  Dynamic import: @react-pdf/renderer + LabelPdfDoc
        │              (kept out of the initial JS bundle; Vite code-splits
        │               this into its own chunk, loaded only on first click)
        ▼
  useNutritionCalc() → MacroProfile   ← calculateRecipeMacros(ingredients, portionDivisor)
        │                                 (unrounded per-serving values; see nutrition.ts)
        ▼
  <LabelPdfDoc macros portionDivisor ingredients labelName
               widthInches heightInches
               servingHousehold addedSugarsG transFatG />
        │
        │  for each row in MACRO_ROWS / MICRO_ROWS:
        │    rowDisplay(row, macros, transFatG, addedSugarsG)  ← labelSpec.ts
        │      → exact label / amount / %DV strings
        │      → identical to what LabelPreview already shows on screen
        ▼
  pdf(<LabelPdfDoc .../>).toBlob()    ← @react-pdf/renderer, in-browser
        │
        ▼
  downloadBlob(blob, "nutrition_label.pdf")   ← client/api.ts, no network request
```

No backend request is made at any point in this flow — search and food-detail
lookups (`GET /api/search`, `GET /api/food/{fdc_id}`) already happened
earlier, while the user was building the recipe, and their results
(`baseMacros` on each `IngredientItem`) are already in `recipeStore`.

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
