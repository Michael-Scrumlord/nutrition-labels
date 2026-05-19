# Data Sources

This is the single source of truth for every claim Nutrition Label Generator
makes about where its food data comes from. If you find a discrepancy between
this document and a user-facing string in the app, this document wins —
update the string, not this document.

## Where the data comes from

Every food, nutrient value, and portion size in `nutrition.db` is sourced
directly from the **U.S. Department of Agriculture's FoodData Central**
program ([fdc.nal.usda.gov](https://fdc.nal.usda.gov)). FoodData Central is
the USDA's current canonical food-composition database, published under
public-domain terms.

We use three official FDC sub-datasets:

| Sub-dataset | Foods | What it is | Why we use it |
|---|---|---|---|
| **Foundation Foods** | ~1,100 | USDA's modern gold-standard analytical dataset. Each entry is backed by lab analysis with metadata, sample provenance, and analytical method. | Highest data quality for raw ingredients (eggs, raw chicken, raw produce, oils, etc.). |
| **Survey (FNDDS)** | ~8,500 | Food and Nutrient Database for Dietary Studies. Used by NHANES for population dietary surveys. Names are written for everyday use ("Apple, raw" rather than "APPLES,RAW,WITH SKIN"). | Clean common-name search results — when a home baker types "tomato" they find "Tomatoes, raw" right away. |
| **SR Legacy** | ~7,793 | The historical Standard Reference dataset, frozen in 2019. | Covers pantry essentials that FNDDS doesn't index as standalone foods: baking soda, baking powder, vanilla extract, dried herbs, ground spices, vinegars, broths, garlic powder, maple syrup. |

All three are downloaded as bulk CSV ZIPs from the FDC public download portal
at [fdc.nal.usda.gov/download-foods.html](https://fdc.nal.usda.gov/download-foods.html).

**Branded Foods is intentionally excluded.** USDA's Branded sub-dataset
contributes ~300k industry-submitted SKUs and would balloon the database
from ~4 MB to ~500 MB, while flooding generic searches with packaged-product
variants. Home bakers writing their own label don't need to look up
"Tomato Basil Pasta Sauce — Newman's Own"; they need clean reference data
for a raw ingredient. If you need branded SKUs, search FDC directly.

## What is NOT happening

Several things are sometimes assumed about apps that say "powered by USDA."
None of them apply here:

- **No live USDA API calls.** Your search query is never sent to USDA, Google,
  or any third party. All search hits a local SQLite database that ships with
  the app. (This is also reflected in the privacy policy.)
- **No API key.** We use the public bulk CSV downloads, not the rate-limited
  FDC API.
- **No third-party food databases.** We do not combine USDA data with Edamam,
  Nutritionix, Open Food Facts, or any other source.
- **No machine-generated nutrient values.** Every macro value in the database
  was published by USDA. We compute *aggregates* (per-recipe, per-serving),
  but never invent or estimate raw nutrient values.

## How the data is loaded

1. **Download** — `scripts/download_fdc.sh` fetches the three ZIP files from
   `fdc.nal.usda.gov/fdc-datasets/` and extracts them into
   `backend/data/fdc/{foundation,survey,sr_legacy}/`.

2. **Build** — On `docker-compose up`, the `db-init` service runs
   [`backend/data/build_db_full.py`](backend/data/build_db_full.py). The script:
   - Extracts only the 13 FDA-mandated nutrients (calories, fat, saturated
     fat, cholesterol, sodium, carbs, fiber, sugar, protein, vitamin D,
     calcium, iron, potassium) from `food_nutrient.csv`. Handles both the
     4-digit `nutrient.id` codes Foundation/SR Legacy use and the 3-digit
     `nutrient.nutrient_nbr` aliases FNDDS uses in the same column. For
     Energy, accepts Atwater-specific (2047) and Atwater-general (2048)
     when the standard Energy id (1008) is not published.
   - Loads portions from `food_portion.csv`, joining `measure_unit.csv`
     for Foundation's unit-ID rows; for FNDDS rows the human label lives
     in `portion_description`.
   - Inserts foods into `food_macros` and portions into `food_portions`.
   - Populates a contentless FTS5 virtual table (`food_search`) over
     `description` and `food_category` for fast search.
   - Checkpoints the WAL (`PRAGMA wal_checkpoint(TRUNCATE)`) and switches
     `journal_mode=DELETE` before close, so the resulting `nutrition.db`
     is self-contained and openable by a read-only backend.

3. **Persist** — The resulting `nutrition.db` (~4 MB) is written to the
   `nutrition_db` Docker volume. It is **not** baked into the backend image.
   The backend container mounts the volume read-only.

4. **Serve** — On each `GET /api/search?query=...`, the backend builds an
   FTS5 prefix MATCH expression (`"term1"* "term2"*`), fetches up to 200
   BM25-ranked rows from the FTS5 index, and then [re-ranks in Python](backend/app/search.py)
   so prefix matches come before contains matches, alphabetically within
   each group. There is no longer a data-source tier — FNDDS, Foundation,
   and SR Legacy entries are all treated as equally authoritative.

## Schema

`food_macros` (one row per food):

| Column | Type | Notes |
|---|---|---|
| `fdc_id` | INTEGER PK | USDA FoodData Central ID — unique across all sub-datasets |
| `description` | TEXT | The USDA-published food name |
| `data_type` | TEXT | `foundation_food` \| `survey_fndds_food` \| `sr_legacy_food` |
| `food_category` | TEXT NULL | USDA food category description |
| 13 nutrient columns | REAL | Values per 100 g, as published by USDA |

`food_portions` (zero or more rows per food):

| Column | Type | Notes |
|---|---|---|
| `id` | INTEGER PK | AUTOINCREMENT |
| `fdc_id` | INTEGER FK | References `food_macros(fdc_id)` |
| `amount` | REAL | e.g. `1` or `0.5` |
| `modifier` | TEXT | e.g. "cup", "tablespoon", "1 cup (28g)" |
| `gram_weight` | REAL | Grams equivalent of `amount × modifier` |

`food_search` (FTS5 contentless virtual table):

| Column | Indexed | Notes |
|---|---|---|
| `rowid` | — | Equals `food_macros.fdc_id` (via `content_rowid='fdc_id'`) |
| `description` | ✓ | Tokenized with `porter unicode61` (Porter stemming + Unicode-aware). Only the description is indexed; `food_category` is deliberately excluded so a search for "baking soda" doesn't match every food with category "Baked Products". |

## Audit: every place the app references the data

The list below was generated by a full repo scan. If you change any of these
strings, update this row.

| Location | Claim | Verified |
|---|---|---|
| `frontend/index.html:13` (meta description) | "pull ingredient data from USDA FoodData Central" | ✓ |
| `frontend/index.html:36` (og:description) | "from USDA ingredient data" | ✓ |
| `frontend/index.html:49` (twitter:description) | "from USDA ingredient data" | ✓ |
| `frontend/src/components/layout/AppShell.tsx:33` | "pull ingredient data from USDA FoodData Central" | ✓ |
| `frontend/src/components/recipe/RecipeBuilder.tsx:214` | "Macronutrient values are retrieved from the USDA FoodData Central database" | ✓ |
| `frontend/src/components/search/IngredientSearch.tsx:224` | placeholder "search USDA database…" | ✓ |
| `frontend/src/components/search/IngredientSearch.tsx:249` | "Type to search the USDA database." | ✓ |
| `frontend/src/pages/AboutPage.tsx:14` | meta description references USDA FoodData Central | ✓ |
| `frontend/src/pages/AboutPage.tsx:29-30` | "pulls ingredient data from the USDA FoodData Central database" | ✓ |
| `frontend/src/pages/PrivacyPage.tsx:47-51` | "your query is processed entirely on our own servers against a local copy of the USDA FoodData Central database… never forwarded to USDA, Google, or any third party" | ✓ (corrected 2026-05-17 — previously falsely claimed queries were forwarded to USDA's API) |
| `frontend/src/pages/TermsPage.tsx:31-32` | "ingredient data sourced from the USDA FoodData Central database" | ✓ |
| `frontend/src/pages/TermsPage.tsx:68` | "USDA data" (copyright carve-out) | ✓ |
| `frontend/src/pages/guides/FdaLabelRequirementsForHomeBakers.tsx:139` | "USDA FoodData Central" as an example public database | ✓ |

## Updating to a newer USDA release

USDA publishes new FDC releases roughly twice a year (typically April and
October). To update:

1. Visit [fdc.nal.usda.gov/download-foods.html](https://fdc.nal.usda.gov/download-foods.html)
   and find the latest dated ZIPs for each sub-dataset.
2. Edit the three `*_URL` lines at the top of `scripts/download_fdc.sh`.
3. On the VM:
   ```bash
   docker-compose down
   rm -rf backend/data/fdc/*
   bash scripts/download_fdc.sh
   docker volume rm nutrition-labels_nutrition_db   # force rebuild
   docker-compose up --build -d
   ```

The `db-init` service detects the missing DB and rebuilds it from the new
CSVs. Allow 1–2 minutes on 2 vCPUs.

## License & attribution

USDA FoodData Central is published in the public domain by the U.S. federal
government and is free to use, redistribute, and combine without
restriction. We attribute USDA throughout the app (about page, terms,
privacy policy) but no license terms require it.
