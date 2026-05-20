// types/index.ts
//
// Shared TypeScript interfaces. These mirror the Pydantic models in the backend.
// If you add a field to the backend models, add it here too.

// ── One ingredient in the current recipe ──────────────────────────────────

export interface IngredientItem {
  fdc_id: number;
  name: string;       // Display name on the label (user can edit this)
  amount: number;
  unit: UnitKey;
  // When set, `amount` is interpreted as "this many `portionRef`s" instead
  // of "this much of `unit`". Picking "tbsp" sets portionRef; picking "g"
  // clears it. Only one of (unit, portionRef) drives the math at a time.
  portionRef?: PortionRef | null;
  // The food's known portion sizes from /api/food/{fdc_id}, cached here so
  // the recipe row's unit picker can show them after the food detail query
  // has been discarded.
  availablePortions?: PortionSize[];
  // baseMacros is loaded from GET /api/food/{fdc_id} and cached here
  // so we don't need to re-fetch every time the amount changes.
  baseMacros: MacroProfile;
}

// A food-specific unit ("1 tablespoon = 14.2 g"), normalized to grams-per-1.
// Built from a PortionSize via `normalizePortion()` in utils/units.ts.
export interface PortionRef {
  modifier: string;      // "tablespoon", "cup", "large egg"
  gramsPerUnit: number;  // PortionSize.gram_weight / PortionSize.amount
}

// ── Unit choices ──────────────────────────────────────────────────────────

export type UnitKey = "g" | "ml" | "oz" | "lb" | "kg";

export const UNIT_LABELS: Record<UnitKey, string> = {
  g:  "Grams (g)",
  ml: "Milliliters (ml)",
  oz: "Ounces (oz)",
  lb: "Pounds (lb)",
  kg: "Kilograms (kg)",
};

// ── Nutrient totals (per 100g from API, or per serving after calculation) ─

export interface MacroProfile {
  calories: number;
  fat_total_g: number;
  fat_saturated_g: number;
  cholesterol_mg: number;
  sodium_mg: number;
  carbohydrates_total_g: number;
  fiber_g: number;
  sugar_g: number;
  protein_g: number;
  vitamin_d_mcg: number;
  calcium_mg: number;
  iron_mg: number;
  potassium_mg: number;
}

// ── API response shapes ────────────────────────────────────────────────────

export interface FoodSearchResult {
  fdc_id: number;
  name: string;
}

export interface PortionSize {
  amount: number;
  modifier: string;
  gram_weight: number;
}

export interface FoodDetail {
  fdc_id: number;
  name: string;
  macros: MacroProfile;
  portions: PortionSize[];
}

// ── Preferences (stored in localStorage) ──────────────────────────────────

export interface SavedFood {
  fdc_id: number;
  name: string;
}

// ── Label dimensions ───────────────────────────────────────────────────────

export interface LabelDimensions {
  widthInches: number;
  heightInches: number | null;  // null = auto (content-driven)
}

// ── Synchronized label highlight (set of nutrient keys) ───────────────────
// Defined here (not in a layout component) because it is shared across
// the recipe builder, label column, and label preview.

export type HighlightSet = Set<keyof MacroProfile>;

// ── Method (instructions + tweakable variables) ────────────────────────────

export interface RecipeStep {
  id: string;
  text: string;        // plain text with {Variable Label} tokens
}

export interface RecipeVariable {
  name: string;        // canonical key (slugified label); used as React key
  label: string;       // user-facing label, e.g. "Bake Time" — matched in {…} tokens
  value: number;
  suffix?: string;     // e.g. "°F", "minutes" — rendered after the value in read mode
  min?: number;
  max?: number;
  step?: number;
}

// ── Saved recipe catalog ───────────────────────────────────────────────────

export interface RecipeVersion {
  id: string;
  savedAt: number;
  note?: string;
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
  instructions: RecipeStep[];
  variables: RecipeVariable[];
}

export interface SavedRecipe {
  id: string;
  name: string;
  createdAt: number;
  versions: RecipeVersion[];   // versions.at(-1) is the latest
}
