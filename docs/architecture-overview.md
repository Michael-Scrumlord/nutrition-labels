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
│   GET /api/search    GET /api/food/{id}   POST /api/generate_label
└──────────┼──────────────────┼──────────────────────┼────────────┘
           │                  │                      │
┌──────────▼──────────────────▼──────────────────────▼────────────┐
│  FastAPI Backend                                                  │
│  ┌────────────┐  ┌─────────────┐  ┌────────────────────────┐    │
│  │ search.py  │  │ nutrition.py│  │        pdf.py          │    │
│  │ (ranking)  │  │  (math)     │  │ (Jinja2 + WeasyPrint)  │    │
│  └────────────┘  └─────────────┘  └────────────────────────┘    │
│           └──────────────┬──────────────────────────┘            │
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

---

## Backend

### Routes (`app/main.py`)

Each route follows the same pattern: **validate → fetch → calculate → return**. No business logic lives in routes.

| Route                    | Method | Delegates to                                              |
|--------------------------|--------|-----------------------------------------------------------|
| `/api/search`            | GET    | `search.ranked_search`                                    |
| `/api/food/{fdc_id}`     | GET    | `database.get_food_by_id`, `database.get_portions_by_id`  |
| `/api/generate_label`    | POST   | `nutrition.calculate_recipe_macros` → `pdf.render_label_html` → `pdf.generate_pdf` |

### Module Responsibilities

**`nutrition.py`** — Pure functions, no side effects, no I/O.

- `calculate_recipe_macros(ingredients, food_rows, portion_divisor)` — Converts each ingredient's amount to grams, scales per-100 g database values by the resulting multiplier, sums across all ingredients, divides by `portion_divisor`, and rounds to label-appropriate precision (calories → integer, everything else → 1 decimal).
- `compute_daily_value_pct(value, nutrient)` — Returns an integer %DV, or `None` if the nutrient has no established FDA daily value (calories, sugar, and protein have no DV).

**`search.py`** — Pure ranking logic, no I/O.

- `ranked_search(query, food_rows)` — Splits results into two groups: names that *start with* the query (prefix matches) and names that *contain* the query. Each group is sorted alphabetically. Returns at most 40 combined results.

**`database.py`** — SQLite access layer. Returns `sqlite3.Row` objects (dict-like). Never does any calculation.

**`pdf.py`** — Jinja2 + WeasyPrint.

- `render_label_html(macros, request)` — Renders the FDA label as an HTML string. Ingredients are sorted by gram weight descending (FDA requirement).
- `generate_pdf(html)` — Converts the HTML to a PDF binary using WeasyPrint. Returns bytes.

**`models.py`** — All Pydantic models.

| Model                 | Direction | Purpose                                              |
|-----------------------|-----------|------------------------------------------------------|
| `IngredientItem`      | Request   | One ingredient: `fdc_id`, `name`, `amount`, `unit`  |
| `GenerateLabelRequest`| Request   | Full PDF generation payload                          |
| `MacroProfile`        | Response  | 13 nutrient totals (per 100 g or per serving)        |
| `FoodSearchResult`    | Response  | `fdc_id` + `name` for search results                 |
| `PortionSize`         | Response  | A named portion (e.g. 1 tablespoon = 14.2 g)         |
| `FoodDetail`          | Response  | One food: `macros` + `portions`                      |

**`constants.py`** — Single source of truth for numbers shared across modules.

- `UNIT_CONVERSIONS` — Grams per unit (`g`, `ml`, `oz`, `lb`, `kg`).
- `FDA_DAILY_VALUES` — 2020 reference values for 10 of the 13 tracked nutrients.
- `NUTRIENT_FIELDS` — Ordered list of the 13 nutrient field names. Drives DB queries, macro math, and template rendering.

### Validation Rules (`models.py`)

| Field              | Rule                              |
|--------------------|-----------------------------------|
| `amount`           | Must be > 0                       |
| `unit`             | Must be a key in `UNIT_CONVERSIONS` |
| `portion_divisor`  | Must be between 1 and 999 inclusive |
| `width_inches`     | Must be > 0                       |

---

## Frontend

### Component Tree

```
App
└── AppShell (2-column magazine grid)
    ├── [left] RecipeBuilder
    │   ├── IngredientRow (×N)
    │   └── NutritionBreakdownTable
    └── [right] LabelColumn
        ├── LabelPreview        ← live FDA label
        ├── LabelDimensions     ← width/height controls
        └── GenerateButton      ← triggers PDF download
```

The `IngredientSearch` modal is triggered from `RecipeBuilder` and overlays the whole viewport.

### State Management

**`recipeStore` (Zustand)** — Central recipe state.

| State field              | Type                | Purpose                              |
|--------------------------|---------------------|--------------------------------------|
| `ingredients`            | `IngredientItem[]`  | Ordered list of recipe ingredients   |
| `portionDivisor`         | `number`            | How many servings the batch yields   |
| `labelName`              | `string`            | Recipe name printed on the label     |
| `highlightedNutrients`   | `HighlightSet`      | Nutrient rows to highlight in label  |

Actions: `addIngredient`, `removeIngredient`, `updateIngredientName`, `updateIngredientAmount`, `updateIngredientUnit`, `moveIngredient`, `setPortionDivisor`, `setLabelName`, `setDimensions`, `clearRecipe`, `setHighlightedNutrients`.

**`preferencesStore` (Zustand)** — User preferences persisted to `localStorage`: favorite foods and recently used foods.

### Custom Hooks

| Hook                  | Purpose                                                                 |
|-----------------------|-------------------------------------------------------------------------|
| `useNutritionCalc`    | Derives per-serving `MacroProfile` from `recipeStore`; memoized with `useMemo` |
| `useRecipeActions`    | Returns all `recipeStore` actions in one shallow-equal subscription (prevents unnecessary re-renders) |
| `useIngredientSearch` | Manages search API calls and the search modal state                     |
| `useLabelResize`      | Tracks label panel dimensions for the PDF size controls                 |
| `useAnimatedNumber`   | Animates number transitions in the stats bar                            |

### Utilities (`src/utils/`)

**`nutrition.ts`** — Mirrors backend math exactly. Must stay in sync with `nutrition.py`.

| Function                    | Purpose                                                              |
|-----------------------------|----------------------------------------------------------------------|
| `calculateRecipeMacros`     | Same algorithm as backend; treats `portionDivisor=0` as 1 (defensive) |
| `getHighlightKeys`          | Returns a `Set` of the top 2 nutrient keys by %DV contribution       |
| `computeDailyValues`        | Returns `{ nutrient: %DV }` for all DV-tracked nutrients             |
| `formatDV`                  | Returns `"—"`, `"<1%"`, or `"12%"` for label display                |
| `buildIngredientsString`    | Sorts by gram weight desc, uppercases, joins with commas, appends `.` |
| `round1`                    | Rounds to 1 decimal place (`Math.round(n * 10) / 10`)               |

**`units.ts`** — `UNIT_CONVERSIONS` map and `convertToGrams(amount, unit)` helper. Must stay in sync with `backend/app/constants.py`.

---

## Key Design Invariants

1. **Mirrored math** — `nutrition.ts` and `nutrition.py` implement the same algorithm. Changes to one must be reflected in the other.

2. **Constants parity** — `UNIT_CONVERSIONS` and `FDA_DAILY_VALUES` are duplicated across frontend and backend. They must remain identical.

3. **Frontend DV permissiveness** — The frontend `calculateRecipeMacros` treats `portionDivisor=0` as 1 (defensive, for live preview). The backend raises `ValueError` (strict, for PDF generation). This is intentional.

4. **Backend recalculates on generate** — When `POST /api/generate_label` is called, the backend recalculates all macros independently from the food database. This catches any constant drift that might have crept in between frontend and backend.

5. **Ingredient ordering** — FDA regulations require ingredients listed by weight descending. Both `buildIngredientsString` (frontend label preview) and the Jinja2 template (backend PDF) implement this sort.

6. **`<1%` rule** — When `round(value / dv * 100) === 0` but `value > 0`, the label must show `<1%` rather than `0%`. Implemented in `formatDV` (frontend) and the Jinja2 template (backend).

7. **No business logic in routes** — `main.py` only validates input, delegates to modules, and assembles responses. Math, ranking, and rendering are isolated in their own modules.

---

## Data Flow: PDF Generation

```
Client
  POST /api/generate_label (GenerateLabelRequest)
        │
        ▼
  Validate with Pydantic (amount > 0, unit valid, divisor 1–999)
        │
        ▼
  database.get_foods_by_ids(fdc_ids)   ← one bulk query
        │
        ▼
  Verify all fdc_ids were found (400 if any missing)
        │
        ▼
  nutrition.calculate_recipe_macros(ingredients, food_rows, portion_divisor)
        │  for each ingredient:
        │    grams = amount × UNIT_CONVERSIONS[unit]
        │    multiplier = grams / 100
        │    for each nutrient: total += db_value × multiplier
        │  per_serving = total / portion_divisor
        │  round calories → int, others → 1 decimal
        ▼
  pdf.render_label_html(macros, request)   ← Jinja2 template
        │
        ▼
  pdf.generate_pdf(html)   ← WeasyPrint
        │
        ▼
  Response(content=pdf_bytes, media_type="application/pdf")
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
