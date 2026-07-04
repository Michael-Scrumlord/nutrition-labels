# Architecture Overview

## System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser                                                               │
│  React + TypeScript + Zustand                                          │
│  ┌────────────────┐  ┌────────────────┐  ┌──────────────────────────┐ │
│  │ IngredientSearch│  │ RecipeBuilder  │  │  LabelPreview / GenerateButton│
│  │  (search modal)│  │ (Zustand store)│  │  (labelSpec.ts + LabelPdfDoc) │
│  └───────┬────────┘  └──────┬─────────┘  └──────────────┬───────────┘ │
│          │                  │                            │             │
│   GET /api/search    GET /api/food/{id}         PDF rendered in-browser│
│                                                  via @react-pdf/renderer│
│                                                  — no network request  │
└──────────┼──────────────────┼──────────────────────────────────────────┘
           │                  │
┌──────────▼──────────────────▼───────────────────┐
│  FastAPI Backend                                  │
│  ┌────────────┐  ┌─────────────────────────────┐ │
│  │ search.py  │  │        database.py          │ │
│  │ (ranking)  │  │   (SQLite access layer)     │ │
│  └─────┬──────┘  └──────────────┬──────────────┘ │
│        └────────────────────────┘                │
└─────────────────────────┼──────────────────────────┘
                           │
                   ┌───────▼───────┐
                   │   SQLite DB   │
                   │ (USDA foods)  │
                   └───────────────┘
```

`nutrition.py` (macro math) still lives in `backend/app/` but no route calls
it — see [Module Responsibilities](#module-responsibilities) below. It's
omitted from this diagram because it is off the request path.

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

There used to be a fourth route, `POST /api/generate_label`, which rendered a
Jinja2 template through WeasyPrint (`pdf.py`, since deleted) and returned a
PDF. It was retired — PDF generation is now entirely client-side (see
[Data Flow: PDF Generation](#data-flow-pdf-generation) below). `main.py`
carries a comment at the bottom noting the removal and its replacement.

### Module Responsibilities

**`nutrition.py`** — Pure functions, no side effects, no I/O. **Not called by
any route** — retired along with `POST /api/generate_label`. Retained purely
as the parity spec: its pytest suite (`test_nutrition*.py`) is the source of
truth that `frontend/src/utils/nutrition.ts` is tested against (they share the
`round_half_up_parity.json` vector file).

- `calculate_recipe_macros(ingredients, food_rows, portion_divisor)` — Converts each ingredient's amount to grams, scales per-100 g database values by the resulting multiplier, sums across all ingredients, divides by `portion_divisor`, and rounds to label-appropriate precision (calories → integer, everything else → 1 decimal). The frontend equivalent, `calculateRecipeMacros`, deliberately does **not** round here — it returns full-precision per-serving values and defers to FDA increment-rounding at display time (`formatNutrientAmount`). The two implementations are "mirrored" in algorithm, not in this rounding step.
- `compute_daily_value_pct(value, nutrient)` — Returns an integer %DV, or `None` if the nutrient has no established FDA daily value (calories, sugar, and protein have no DV).

**`search.py`** — Pure ranking logic, no I/O.

- `ranked_search(query, food_rows)` — Splits results into two groups: names that *start with* the query (prefix matches) and names that *contain* the query. Each group is sorted alphabetically. Returns at most 40 combined results.

**`database.py`** — SQLite access layer. Returns `sqlite3.Row` objects (dict-like). Never does any calculation.

**`models.py`** — All Pydantic models.

| Model                 | Direction | Purpose                                              |
|-----------------------|-----------|------------------------------------------------------|
| `IngredientItem`      | Request   | One ingredient: `fdc_id`, `name`, `amount`, `unit`. No route constructs this today — see note below. |
| `GenerateLabelRequest`| Request   | The retired PDF-generation payload shape. No route uses it; same status as `IngredientItem` above. |
| `MacroProfile`        | Response  | 13 nutrient totals (per 100 g or per serving)        |
| `FoodSearchResult`    | Response  | `fdc_id` + `name` + optional `data_type` for search results |
| `PortionSize`         | Response  | A named portion (e.g. 1 tablespoon = 14.2 g)         |
| `FoodDetail`          | Response  | One food: `macros` + `portions`                      |
| `HealthResponse`      | Response  | `{"status": "ok", "release": "<sha>"}` from `/api/health` |

`IngredientItem` and `GenerateLabelRequest` are unused by any live route (the
route that consumed them was removed), but are kept because `test_models.py`
and `test_models_validators.py` still exercise their field constraints below.

**`constants.py`** — Single source of truth for numbers shared across modules.

- `UNIT_CONVERSIONS` — Grams per unit (`g`, `ml`, `oz`, `lb`, `kg`).
- `FDA_DAILY_VALUES` — 2020 reference values for 10 of the 13 tracked nutrients.
- `NUTRIENT_FIELDS` — Ordered list of the 13 nutrient field names. Drives DB queries and macro math.

### Validation Rules (`models.py`)

Not enforced against any live request today (see the note above) — listed
here as the spec `test_models*.py` checks, and as the numbers the frontend is
expected to informally respect even though nothing currently enforces them
client-side either.

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
    └── [right] LabelColumn            ← save/version workflow via useLabelSave
        ├── LabelPreview               ← live FDA label (ThemedFrame); reads labelSpec.ts
        ├── LabelDetails               ← serving size / added sugars / trans fat overrides
        ├── LabelDimensions            ← width/height controls
        ├── SaveControls               ← save/save-as-new buttons + feedback flash
        └── GenerateButton             ← renders LabelPdfDoc client-side, triggers download
                                          (lazy-loads @react-pdf/renderer; no network request)

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
| `servingHousehold`       | `string`            | Household serving description, e.g. "2/3 cup"; empty → label shows "1 portion" |
| `addedSugarsG`           | `number`            | Added Sugars (g) — mandatory FDA line with its own %DV (50 g); user-supplied, not looked up |
| `transFatG`              | `number`            | Trans Fat (g) — mandatory FDA line, no %DV; user-supplied, not looked up |
| `currentRecipeId`        | `string \| null`    | ID of the loaded saved recipe, or null if unsaved|
| `viewingVersionId`       | `string \| null`    | Non-null when browsing a historical version      |

Ingredient actions: `addIngredient`, `removeIngredient`, `updateIngredientName`, `updateIngredientAmount`, `updateIngredientUnit`, `moveIngredient`.

Recipe meta actions: `setPortionDivisor`, `setLabelName`, `setDimensions`, `setHighlightedNutrients`, `setServingHousehold`, `setAddedSugarsG`, `setTransFatG`.

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
| `useLabelSave`          | Save/version workflow for `LabelColumn`: builds the `RecipeSnapshot`, decides create-vs-append-version, and drives the transient "SAVED ✓" feedback flash |
| `useAnimatedNumber`     | Animates number transitions in the stats bar                            |
| `useDebounce`           | Debounces a value by a given delay (used by ingredient search input)    |
| `useTitleAutoResize`    | Auto-resizes the label-name input to fit its content                    |
| `usePageMeta`           | Sets `document.title`, `<meta name="description">`, and canonical link per page |
| `useAdSenseBootstrap`   | Loads the Google AdSense script; no-op when publisher env vars are unset |

### Utilities (`src/utils/`)

**`nutrition.ts`** — Mirrors the *algorithm* in `nutrition.py` (grams → multiplier → contribution → sum → per-serving), but not its rounding step: `calculateRecipeMacros` returns unrounded per-serving values, and every display-rounding rule below lives only on the frontend (the backend's `_round_macro_values` has no active caller now that PDF generation is client-side). This is the module both `LabelPreview` and `LabelPdfDoc` (via `labelSpec.ts`) call for every value on the label.

| Function                    | Purpose                                                                  |
|-----------------------------|--------------------------------------------------------------------------|
| `calculateRecipeMacros`     | Same summing algorithm as the backend; returns **unrounded** per-serving values; throws `RangeError` for `portionDivisor` outside 1–999 |
| `getHighlightKeys`          | Returns a `Set` of the top 2 nutrient keys by %DV contribution           |
| `computeDailyValues`        | Returns `{ nutrient: %DV }` for all DV-tracked nutrients                 |
| `formatDV`                  | Returns `"—"`, `"<1%"`, or `"12%"` for label display, from an unrounded amount |
| `formatDVFromAmount`        | Same as `formatDV` but takes a raw `(amount, dv)` pair directly — used for Added Sugars, which has a DV but isn't part of `MacroProfile` |
| `formatNutrientAmount`      | Applies the FDA 21 CFR 101.9(c) increment-rounding table (per-nutrient) and returns the full display token, e.g. `"8g"`, `"less than 1g"`, `"160mg"` |
| `formatTransFatAmount` / `formatAddedSugarsAmount` | Same increment rules as fat/sugar, for the two label-meta overrides that aren't looked up from the USDA DB |
| `buildIngredientsString`    | Sorts by gram weight desc, uppercases, joins with commas, appends `.`    |
| `roundHalfUp`               | Round-half-away-from-zero at `ndigits`, matching Python's `Decimal.quantize(ROUND_HALF_UP)`. Verified against the backend via a shared `round_half_up_parity.json` vector file. |
| `round1`                    | `roundHalfUp(_, 1)`                                                      |

**`units.ts`** — Unit conversion utilities. Must stay in sync with `backend/app/constants.py`.

| Function               | Purpose                                                                              |
|------------------------|--------------------------------------------------------------------------------------|
| `UNIT_CONVERSIONS`     | Grams-per-unit map for the 5 supported units (`g`, `ml`, `oz`, `lb`, `kg`)          |
| `convertToGrams`       | `amount × UNIT_CONVERSIONS[unit]`                                                    |
| `convertBetweenUnits`  | Re-expresses an amount in a new unit (preserves gram weight; used when the user changes the unit dropdown) |
| `normalizePortion`     | Converts a FDC `PortionSize` (e.g. `0.5 cup = 113.5 g`) to a per-1-unit `PortionRef` |
| `ingredientGrams`      | Single source of truth for ingredient weight: uses `portionRef.gramsPerUnit` when set, otherwise falls back to unit conversion |

### Label Rendering (`src/components/label/labelSpec.ts`)

Single source of truth for the FDA 2020 Nutrition Facts panel layout, shared
by `LabelPreview` (DOM) and `LabelPdfDoc` (`@react-pdf/renderer`) so the two
renderers can never disagree on a value, its rounding, or its %DV:

| Export         | Purpose                                                                 |
|-----------------|--------------------------------------------------------------------------|
| `GEO`           | Every label dimension (font sizes, rule widths, padding) in points — the PDF's native unit. The DOM preview renders the same numbers as px at 1:1, so both are uniform scales of the same layout. |
| `MACRO_ROWS`    | Total Fat through Added Sugars, in FDA order, with `bold`/`indent`/`noDV` metadata per row |
| `MICRO_ROWS`    | Vitamin D, Calcium, Iron, Potassium — printed after the Protein rule     |
| `rowDisplay(row, macros, transFatG, addedSugarsG)` | Resolves one row to its exact `{ label, amount, boldLabel, dv }` display strings. Trans Fat and Added Sugars are "label-meta overrides" (user-supplied, not looked up from the USDA DB) handled via `row.source`; everything else pulls from `MacroProfile` via `row.nutrient`. |

### PDF Rendering (`src/components/label/LabelPdfDoc.tsx`)

Renders the same rows as `LabelPreview`, as a `@react-pdf/renderer` `<Document>`,
using TeX Gyre Heros (a Helvetica-metrics-compatible OTF) embedded into every
PDF so printers never substitute fonts. `GenerateButton` lazy-imports both this
component and `@react-pdf/renderer` on click and calls `pdf(<LabelPdfDoc .../>).toBlob()`
in the browser — see [Data Flow: PDF Generation](#data-flow-pdf-generation).

---

## Key Design Invariants

1. **Mirrored math (algorithm, not rounding)** — `nutrition.ts` and `nutrition.py` implement the same summing algorithm, but `nutrition.py` is no longer called by any route (see [Module Responsibilities](#module-responsibilities)) — it survives purely as the parity spec `nutrition.ts` is tested against. `nutrition.ts`'s `calculateRecipeMacros` also deliberately skips the rounding step `nutrition.py` performs; FDA increment-rounding happens only at display time via `formatNutrientAmount`.

2. **Constants parity** — `UNIT_CONVERSIONS` and `FDA_DAILY_VALUES` are duplicated across frontend and backend. They must remain identical.

3. **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a `RangeError` for any `portionDivisor` outside 1–999. The backend `nutrition.py` raises `ValueError` for `portionDivisor ≤ 0`. The UI never passes 0 to the calculation function.

4. **PDF generation is entirely client-side** — There is no backend involvement in producing the downloadable PDF. `LabelPdfDoc` and `LabelPreview` both read from `labelSpec.ts`, so there's no "backend recalculates to catch drift" step anymore — there's only one implementation of the label to begin with.

5. **Ingredient ordering** — FDA regulations require ingredients listed by weight descending. `buildIngredientsString` (frontend) implements this sort once; both `LabelPreview` and `LabelPdfDoc` call it.

6. **`<1%` rule** — When the computed %DV rounds to 0 but the raw value is > 0, the label must show `<1%` rather than `0%`. Implemented once, in `formatDV` / `formatDVFromAmount`, and consumed by both renderers via `labelSpec.ts`'s `rowDisplay()`.

7. **No business logic in routes** — `main.py` only validates input, delegates to modules, and assembles responses. Search ranking and DB access are isolated in their own modules.

8. **Rate limiting** — Both live data routes are rate-limited per remote IP via `slowapi`: `GET /api/search` at 60/min and `GET /api/food/{fdc_id}` at 120/min. Every `429` response includes a `Retry-After` header.

---

## Data Flow: PDF Generation

Entirely client-side — no network request is made.

```
Browser (GenerateButton.handleGenerate)
        │
        ▼
  Lazy-import @react-pdf/renderer + LabelPdfDoc
  (dynamic import → separate chunk, ~450 KB kept out of the initial bundle)
        │
        ▼
  macros = useNutritionCalc()   ← same recipeStore-derived MacroProfile the
        │                          live LabelPreview is already rendering
        ▼
  <LabelPdfDoc macros={macros} portionDivisor={...} ingredients={...} .../>
        │  for each row in MACRO_ROWS / MICRO_ROWS + the Protein row:
        │    rowDisplay(row, macros, transFatG, addedSugarsG)  ← labelSpec.ts
        │  buildIngredientsString(ingredients)  ← sorted by gram weight desc
        ▼
  pdf(<LabelPdfDoc .../>).toBlob()   ← @react-pdf/renderer, in-browser
        │
        ▼
  downloadBlob(blob, "nutrition_label.pdf")   ← api/client.ts;
                                                 object URL, click, revoke
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
