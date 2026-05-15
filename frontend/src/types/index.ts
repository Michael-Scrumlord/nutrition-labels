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
  // baseMacros is loaded from GET /api/food/{fdc_id} and cached here
  // so we don't need to re-fetch every time the amount changes.
  baseMacros: MacroProfile;
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
