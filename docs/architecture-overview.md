# Architecture Overview

## System Diagram

```
┌───────────────────────────────────────────────────────────────────────┐
│  Browser                                                               │
│  React + TypeScript + Zustand + TanStack React Query                   │
│  ┌────────────────┐  ┌────────────────┐  ┌─────────────────────────┐ │
│  │ IngredientSearch│  │ RecipeBuilder  │  │  LabelPreview (DOM)     │ │
│  │  (search modal)│  │ (Zustand store)│  │  + LabelPdfDoc          │ │
│  └───────┬────────┘  └──────┬─────────┘  │  (@react-pdf/renderer) │ │
│          │                  │            │  both driven by         │ │
│          │                  │            │  labelSpec.ts           │ │
│          │                  │            └────────────┬────────────┘ │
│   GET /api/search    GET /api/food/{id}                │ pdf().toBlob()
│                                                          │ (no network)
└──────────┼──────────────────┼───────────────────────────┼────────────┘
           │                  │
┌──────────▼──────────────────▼─────────────────────────────────────────┐
│  FastAPI Backend  (data API only — no PDF rendering)                   │
│  ┌────────────┐  ┌──────────────────────────────────────────────┐    │
│  │ search.py  │  │ nutrition.py (unused by any route — kept for  │    │
│  │ (ranking)  │  │  its test coverage; see Key Design Invariants) │    │
│  └────────────┘  └──────────────────────────────────────────────┘    │
│           └──────────────┬──────────────────────────┘                 │
│                          │                                            │
│                  ┌───────▼───────┐                                   │
│                  │  database.py  │                                   │
│                  └───────┬───────┘                                   │
└──────────────────────────┼────────────────────────────────────────────┘
                            │
                    ┌───────▼───────┐
                    │   SQLite DB   │
                    │ (USDA foods)  │
                    └───────────────┘
```

PDF generation used to be a third backend round-trip (`POST /api/generate_label`
→ Jinja2 → WeasyPrint). That route, `app/pdf.py`, and `backend/templates/label.html`
were removed — the label now renders exclusively in the browser.

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

`POST /api/generate_label` was retired — see "PDF generation" below.

### Module Responsibilities

**`nutrition.py`** — Pure functions, no side effects, no I/O. **Not called by any route** — the label (and its %DV math) is computed entirely on the frontend now. Kept only because it still has test coverage (`test_nutrition.py`, `test_nutrition_edge_cases.py`, `test_nutrition_invariants.py`); treat it as a reference implementation, not a live dependency.

- `calculate_recipe_macros(ingredients, food_rows, portion_divisor)` — Converts each ingredient's amount to grams, scales per-100 g database values by the resulting multiplier, sums across all ingredients, divides by `portion_divisor`, and rounds to label-appropriate precision (calories → integer, everything else → 1 decimal).
- `compute_daily_value_pct(value, nutrient)` — Returns an integer %DV, or `None` if the nutrient has no established FDA daily value (calories, sugar, and protein have no DV).

**`search.py`** — Pure ranking logic, no I/O.

- `ranked_search(query, food_rows)` — Splits results into two groups: names that *start with* the query (prefix matches) and names that *contain* the query. Each group is sorted alphabetically. Returns at most 40 combined results.

**`database.py`** — SQLite access layer. Returns `sqlite3.Row` objects (dict-like). Never does any calculation.

**`models.py`** — All Pydantic models.

| Model                 | Direction | Purpose                                              |
|-----------------------|-----------|------------------------------------------------------|
| `IngredientItem`      | Request   | One ingredient: `fdc_id`, `name`, `amount`, `unit`  |
| `GenerateLabelRequest`| —         | Full PDF-generation payload shape. **Unused** — no route constructs it since `POST /api/generate_label` was removed; kept only for its existing `test_models.py`/`test_models_validators.py` coverage. |
| `MacroProfile`        | Response  | 13 nutrient totals (per 100 g or per serving)        |
| `FoodSearchResult`    | Response  | `fdc_id` + `name` + optional `data_type` for search results |
| `PortionSize`         | Response  | A named portion (e.g. 1 tablespoon = 14.2 g)         |
| `FoodDetail`          | Response  | One food: `macros` + `portions`                      |
| `HealthResponse`      | Response  | `{"status": "ok", "release": "<sha>"}` from `/api/health` |

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

The `portion_divisor` / `label_name` / `width_inches` / `height_inches` /
`ingredients` rows above all belong to `GenerateLabelRequest`, which no route
uses anymore (see Module Responsibilities). `IngredientItem`'s `amount`/`unit`/
`name` rules are still live — they mirror the frontend's own input constraints
even though the frontend never sends this shape over the network.

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
        ├── LabelPreview               ← live FDA label (ThemedFrame), driven by labelSpec.ts
        ├── LabelDetails               ← servingHousehold / addedSugarsG / transFatG inputs
        ├── LabelDimensions            ← width/height controls
        ├── SaveControls               ← save/version workflow (via useLabelSave)
        └── GenerateButton             ← client-side PDF render (LabelPdfDoc, same labelSpec.ts) + download

RecipesModal (overlay, triggered from Header)
└── RecipeCard (×N)
    └── VersionTimeline
```

The `IngredientSearch` modal is triggered from `RecipeBuilder` and overlays the whole viewport.

`LabelPdfDoc` (the `@react-pdf/renderer` document `GenerateButton` renders to a
PDF Blob) isn't shown in the visible tree above — it's dynamically imported on
click, never mounted in the DOM. It and `LabelPreview` both read from
`labelSpec.ts` so they always agree on layout, values, and rounding.

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
| `servingHousehold`       | `string`            | Household serving description (e.g. "2/3 cup"); FDA label field not derivable from the USDA DB |
| `addedSugarsG`           | `number`            | Added Sugars (g) — mandatory FDA line with its own %DV (DV 50 g)  |
| `transFatG`              | `number`            | Trans Fat (g) — mandatory FDA line, no %DV       |
| `currentRecipeId`        | `string \| null`    | ID of the loaded saved recipe, or null if unsaved|
| `viewingVersionId`       | `string \| null`    | Non-null when browsing a historical version      |

Ingredient actions: `addIngredient`, `removeIngredient`, `updateIngredientName`, `updateIngredientAmount`, `updateIngredientUnit` (preserves gram weight across unit change), `updateIngredientPortion` (switch to/from a food-specific portion like "1 tbsp", also preserving gram weight), `moveIngredient`.

Recipe meta actions: `setPortionDivisor`, `setLabelName`, `setDimensions`, `setHighlightedNutrients`, `setServingHousehold`, `setAddedSugarsG`, `setTransFatG` (the latter two clamp to `>= 0` and coerce `NaN` — e.g. a cleared numeric input — to `0`; there is no upper clamp in the store itself, only in the `ScrubNumber` UI).

Method actions: `addStep`, `updateStepText`, `removeStep`, `moveStep`, `addVariable`, `setVariableValue`, `updateVariable`, `removeVariable`.

Lifecycle actions: `clearRecipe`, `loadRecipe`, `loadVersion`, `exitVersionView`, `setCurrentRecipeId`. `loadRecipe`/`loadVersion` default `servingHousehold`/`addedSugarsG`/`transFatG` to `""`/`0`/`0` when loading a version saved before these fields existed.

**`savedRecipesStore` (Zustand + `localStorage`)** — Recipe catalog, persisted under key `nl_saved_recipes`.

- Max 50 recipes, max 20 versions per recipe (oldest pruned automatically).
- Actions: `createRecipe`, `appendVersion`, `renameRecipe`, `deleteRecipe`, `deleteVersion`.
- Schema migration: v1 snapshots are upgraded to v2 (versioned) format on first load.
- `RecipeSnapshot` (the shape passed to `createRecipe`/`appendVersion`) mirrors `recipeStore`'s content fields, including `servingHousehold`/`addedSugarsG`/`transFatG`.

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
| `useLabelSave`          | Save/version workflow extracted from `LabelColumn`: builds the `RecipeSnapshot`, formats "X min/hr ago" relative time, exposes `canSave`/`isLoaded`/`versionCount`/`lastSavedRel`/`handleSaveVersion`/`handleSaveAsNew` plus a transient `feedback` toast string |

### Utilities (`src/utils/`)

**`nutrition.ts`** — Per-serving calculation math mirrors backend `nutrition.py` (which is otherwise unused — see Module Responsibilities). Label **display formatting** (FDA increment rounding) has no backend equivalent at all, since only the frontend renders the label.

| Function                    | Purpose                                                                  |
|-----------------------------|--------------------------------------------------------------------------|
| `calculateRecipeMacros`     | Same per-serving totals algorithm as the (unused) backend; throws `RangeError` for `portionDivisor` outside 1–999. Returns **unrounded** values — no rounded/unrounded tuple like the backend. |
| `formatNutrientAmount`      | FDA 21 CFR 101.9(c) increment rounding for one nutrient's per-serving amount, returned as the full display token including unit (e.g. `"8g"`, `"less than 1g"`, `"160mg"`). This — not `round1` — is what the label actually shows. |
| `formatTransFatAmount` / `formatAddedSugarsAmount` | Same increment rules as `fat_total_g` / `sugar_g`, for the two user-entered label overrides that aren't in `MacroProfile`. |
| `formatDVFromAmount`        | `%DV` string (`"<1%"` / `"12%"`) from a raw amount + its daily value; `isMicro` selects the coarser vitamin/mineral rounding increments. |
| `formatDV`                  | Returns `"—"`, `"<1%"`, or `"12%"` for a `MacroProfile` nutrient — defers to `formatDVFromAmount`. |
| `getHighlightKeys`          | Returns a `Set` of the top 2 nutrient keys by %DV contribution           |
| `computeDailyValues`        | Returns `{ nutrient: %DV }` (plain `roundHalfUp`, not the FDA-increment form) for all DV-tracked nutrients |
| `buildIngredientsString`    | Sorts by gram weight desc, uppercases, joins with commas, appends `.`    |
| `round1`                    | Rounds to 1 decimal place using `roundHalfUp` (matches Python behavior); used by `computeDailyValues`, not label display |

**`units.ts`** — Unit conversion utilities. Must stay in sync with `backend/app/constants.py`.

| Function               | Purpose                                                                              |
|------------------------|--------------------------------------------------------------------------------------|
| `UNIT_CONVERSIONS`     | Grams-per-unit map for the 5 supported units (`g`, `ml`, `oz`, `lb`, `kg`)          |
| `convertToGrams`       | `amount × UNIT_CONVERSIONS[unit]`                                                    |
| `convertBetweenUnits`  | Re-expresses an amount in a new unit (preserves gram weight; used when the user changes the unit dropdown) |
| `normalizePortion`     | Converts a FDC `PortionSize` (e.g. `0.5 cup = 113.5 g`) to a per-1-unit `PortionRef` |
| `ingredientGrams`      | Single source of truth for ingredient weight: uses `portionRef.gramsPerUnit` when set, otherwise falls back to unit conversion |

**`components/label/labelSpec.ts`** — Single source of truth for the label's rows and geometry, consumed by both `LabelPreview` (DOM) and `LabelPdfDoc` (`@react-pdf/renderer`).

| Export           | Purpose                                                                              |
|------------------|----------------------------------------------------------------------------------------|
| `GEO`            | All label dimensions in points — `LabelPreview` renders them 1:1 as px, `LabelPdfDoc` uses them natively as pt, so both are uniform scales of the same layout |
| `MACRO_ROWS` / `MICRO_ROWS` | Row order + metadata (label, nutrient key, bold/indent, whether %DV is suppressed), in FDA label order |
| `rowDisplay(row, macros, transFatG, addedSugarsG)` | Resolves one row to its exact `{ label, amount, boldLabel, dv }` display strings — the one place a value, its rounding, and its %DV are computed, so the two renderers can never disagree |

---

## Key Design Invariants

1. **Nutrition math is frontend-only in practice** — `nutrition.ts` still mirrors the *algorithm* in `nutrition.py` (same accumulate-then-divide approach), but `nutrition.py` is dead code: no route calls it. Treat `nutrition.py` as a reference implementation preserved by its tests, not a live dependency to keep in sync on every change.

2. **Constants parity** — `UNIT_CONVERSIONS` and `FDA_DAILY_VALUES` are duplicated across frontend and backend. They must remain identical even though the backend copy is currently only exercised by tests (`IngredientItem.unit` validation still uses the backend's `UNIT_CONVERSIONS` keys).

3. **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` throws a `RangeError` for any `portionDivisor` outside 1–999. The (unused) backend `nutrition.py` raises `ValueError` for `portionDivisor ≤ 0`. The UI never passes 0 to the calculation function.

4. **FDA rounding happens at display time, not calculation time** — `calculateRecipeMacros` returns unrounded per-serving values; `formatNutrientAmount` / `formatTransFatAmount` / `formatAddedSugarsAmount` / `formatDVFromAmount` apply each nutrient's own FDA increment when a row is actually displayed. This is a deliberate divergence from the old backend's single-step `round_half_up` rounding.

5. **One label implementation, not two** — `labelSpec.ts` (`GEO`, `MACRO_ROWS`/`MICRO_ROWS`, `rowDisplay()`) is consumed by both `LabelPreview` (DOM) and `LabelPdfDoc` (`@react-pdf/renderer`), so the on-screen preview and the downloaded PDF are structurally guaranteed to match. There is no longer a second (backend/Jinja2) implementation to keep in sync — that was the point of retiring `POST /api/generate_label` and `app/pdf.py`.

6. **Ingredient ordering** — FDA regulations require ingredients listed by weight descending. `buildIngredientsString` implements this once and both label renderers consume its output via `labelSpec.ts`.

7. **`<1%` rule** — When a nutrient's %DV rounds to 0 but its raw value is > 0, the label must show `<1%` rather than `0%`. Implemented in `formatDV`/`formatDVFromAmount` (frontend only now).

8. **No business logic in routes** — `main.py` only validates input, delegates to modules, and assembles responses. Math and ranking are isolated in their own modules.

9. **Rate limiting** — The two remaining data routes are rate-limited per remote IP via `slowapi`: `GET /api/search` at 60/min and `GET /api/food/{fdc_id}` at 120/min. Every `429` response includes a `Retry-After` header. (The old `generate` 10/min limit — both the `slowapi` one and the edge-level one in `Caddyfile` — was removed along with the route.)

---

## Data Flow: PDF Generation (client-side)

```
GenerateButton.handleGenerate()
        │
        ▼
  Lazy dynamic import: @react-pdf/renderer + LabelPdfDoc
        │  (keeps the ~450 KB renderer out of the initial JS bundle;
        │   Vite splits it into its own chunk)
        ▼
  <LabelPdfDoc macros={unrounded MacroProfile from useNutritionCalc()}
               ingredients={...} portionDivisor={...} labelName={...}
               widthInches={...} heightInches={dimensions.heightInches ?? 11}
               servingHousehold={...} addedSugarsG={...} transFatG={...} />
        │  renders each row via labelSpec.ts: rowDisplay(row, macros, transFatG, addedSugarsG)
        │  (same function + same GEO constants LabelPreview uses on screen)
        ▼
  pdf(<LabelPdfDoc .../>).toBlob()   ← react-pdf renders directly to a Blob, no HTML/DOM step
        │
        ▼
  downloadBlob(blob, "nutrition_label.pdf")   ← triggers the browser's normal download UI
```

No network request is involved. `heightInches ?? 11`: when the user leaves
height in "auto" mode, react-pdf needs a concrete page height up front (no
`auto` keyword), so a generous 11in canvas is used — matching the old
WeasyPrint behavior's effective max.

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
