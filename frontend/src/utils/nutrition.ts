// utils/nutrition.ts
//
// Pure math — given ingredient data, returns per-serving nutrient totals.
// This mirrors the logic in backend/app/nutrition.py exactly.
// If you change the math here, change it there too (and vice versa).

import type { IngredientItem, MacroProfile } from "../types";
import { UNIT_CONVERSIONS } from "./units";

// FDA 2020 daily values. Nutrients without a DV show a dash on the label.
// MUST match FDA_DAILY_VALUES in backend/app/constants.py.
export const FDA_DAILY_VALUES: Partial<Record<keyof MacroProfile, number>> = {
  fat_total_g:            78,
  fat_saturated_g:        20,
  cholesterol_mg:         300,
  sodium_mg:              2300,
  carbohydrates_total_g:  275,
  fiber_g:                28,
  vitamin_d_mcg:          20,
  calcium_mg:             1300,
  iron_mg:                18,
  potassium_mg:           4700,
};

/** All nutrient keys in label order. */
export const NUTRIENT_FIELDS: (keyof MacroProfile)[] = [
  "calories", "fat_total_g", "fat_saturated_g", "cholesterol_mg",
  "sodium_mg", "carbohydrates_total_g", "fiber_g", "sugar_g",
  "protein_g", "vitamin_d_mcg", "calcium_mg", "iron_mg", "potassium_mg",
];

/**
 * Calculate per-serving nutrient totals for a recipe.
 *
 * Step by step:
 *  1. For each ingredient, convert its amount to grams.
 *  2. Scale from per-100g to actual grams: multiplier = grams / 100.
 *  3. Multiply each nutrient by the multiplier and accumulate.
 *  4. Divide all totals by portionDivisor to get per-serving values.
 *  5. Round: calories → integer, all others → 1 decimal place.
 */
export function calculateRecipeMacros(
  ingredients: IngredientItem[],
  portionDivisor: number,
): MacroProfile {
  // Start at zero
  const totals: MacroProfile = {
    calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
    sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
    protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
  };

  for (const ingredient of ingredients) {
    const grams = ingredient.amount * UNIT_CONVERSIONS[ingredient.unit];
    const multiplier = grams / 100; // DB stores values per 100g

    for (const field of NUTRIENT_FIELDS) {
      totals[field] += (ingredient.baseMacros[field] ?? 0) * multiplier;
    }
  }

  const divisor = portionDivisor > 0 ? portionDivisor : 1;

  return {
    calories:               Math.round(totals.calories / divisor),
    fat_total_g:            round1(totals.fat_total_g / divisor),
    fat_saturated_g:        round1(totals.fat_saturated_g / divisor),
    cholesterol_mg:         round1(totals.cholesterol_mg / divisor),
    sodium_mg:              round1(totals.sodium_mg / divisor),
    carbohydrates_total_g:  round1(totals.carbohydrates_total_g / divisor),
    fiber_g:                round1(totals.fiber_g / divisor),
    sugar_g:                round1(totals.sugar_g / divisor),
    protein_g:              round1(totals.protein_g / divisor),
    vitamin_d_mcg:          round1(totals.vitamin_d_mcg / divisor),
    calcium_mg:             round1(totals.calcium_mg / divisor),
    iron_mg:                round1(totals.iron_mg / divisor),
    potassium_mg:           round1(totals.potassium_mg / divisor),
  };
}

/** Round to 1 decimal place. */
function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/**
 * Compute %DV for each nutrient that has a daily value.
 * Returns a partial MacroProfile where each value is the %DV (0–100+).
 * Nutrients without a DV are omitted from the result.
 */
export function computeDailyValues(
  profile: MacroProfile,
): Partial<Record<keyof MacroProfile, number>> {
  const result: Partial<Record<keyof MacroProfile, number>> = {};
  for (const [nutrient, dv] of Object.entries(FDA_DAILY_VALUES) as [keyof MacroProfile, number][]) {
    result[nutrient] = Math.round((profile[nutrient] / dv) * 100);
  }
  return result;
}

/**
 * Format a %DV for display on the label.
 *   - If no DV exists: return "—"
 *   - If computed value is 0 but raw value > 0: return "<1%"
 *   - Otherwise: return "12%"
 */
export function formatDV(
  nutrient: keyof MacroProfile,
  profile: MacroProfile,
): string {
  const dv = FDA_DAILY_VALUES[nutrient];
  if (dv === undefined) return "—";
  const pct = Math.round((profile[nutrient] / dv) * 100);
  if (pct === 0 && profile[nutrient] > 0) return "<1%";
  return `${pct}%`;
}

/**
 * Build the INGREDIENTS string for the label.
 * Sorted by actual gram weight descending (FDA requirement),
 * all uppercase, comma-separated, ending with a period.
 */
export function buildIngredientsString(ingredients: IngredientItem[]): string {
  if (ingredients.length === 0) return "";
  const sorted = [...ingredients].sort(
    (a, b) =>
      b.amount * UNIT_CONVERSIONS[b.unit] - a.amount * UNIT_CONVERSIONS[a.unit],
  );
  return sorted.map((ing) => ing.name.toUpperCase()).join(", ") + ".";
}
