// utils/nutrition.ts
//
// Pure math — given ingredient data, returns per-serving nutrient totals.
// This mirrors the logic in backend/app/nutrition.py exactly.
// If you change the math here, change it there too (and vice versa).

import type { IngredientItem, MacroProfile, HighlightSet } from "../types";
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
 * Round to the specified number of digits using round-half-away-from-zero.
 * This ensures consistent rounding behavior between frontend and backend.
 */
function roundHalfUp(x: number, ndigits: number = 0): number {
  const factor = Math.pow(10, ndigits);
  // Add tiny epsilon to handle floating-point representation issues
  // (e.g., 1.005 * 10 = 10.050000000001)
  return Math.round(x * factor + Number.EPSILON) / factor;
}

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
  // Validate portionDivisor matches backend constraints
  if (portionDivisor < 1 || portionDivisor > 999) {
    throw new RangeError("portionDivisor must be between 1 and 999");
  }

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

  return {
    calories:               roundHalfUp(totals.calories / portionDivisor),
    fat_total_g:            roundHalfUp(totals.fat_total_g / portionDivisor, 1),
    fat_saturated_g:        roundHalfUp(totals.fat_saturated_g / portionDivisor, 1),
    cholesterol_mg:         roundHalfUp(totals.cholesterol_mg / portionDivisor, 1),
    sodium_mg:              roundHalfUp(totals.sodium_mg / portionDivisor, 1),
    carbohydrates_total_g:  roundHalfUp(totals.carbohydrates_total_g / portionDivisor, 1),
    fiber_g:                roundHalfUp(totals.fiber_g / portionDivisor, 1),
    sugar_g:                roundHalfUp(totals.sugar_g / portionDivisor, 1),
    protein_g:              roundHalfUp(totals.protein_g / portionDivisor, 1),
    vitamin_d_mcg:          roundHalfUp(totals.vitamin_d_mcg / portionDivisor, 1),
    calcium_mg:             roundHalfUp(totals.calcium_mg / portionDivisor, 1),
    iron_mg:                roundHalfUp(totals.iron_mg / portionDivisor, 1),
    potassium_mg:           roundHalfUp(totals.potassium_mg / portionDivisor, 1),
  };
}

/** Round to 1 decimal place using consistent ROUND_HALF_UP. */
export function round1(n: number): number {
  return roundHalfUp(n, 1);
}

/**
 * Return the 2 nutrients most influenced by a food (by %DV contribution).
 * Used to highlight the corresponding rows in the FDA label when the
 * user hovers an ingredient in the recipe builder.
 */
export function getHighlightKeys(baseMacros: MacroProfile): HighlightSet {
  const ranked: [keyof MacroProfile, number][] = [];
  for (const [key, dv] of Object.entries(FDA_DAILY_VALUES) as [keyof MacroProfile, number][]) {
    if (dv && baseMacros[key] > 0) ranked.push([key, baseMacros[key] / dv]);
  }
  ranked.sort((a, b) => b[1] - a[1]);
  return new Set(ranked.slice(0, 2).map(([k]) => k));
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
    result[nutrient] = roundHalfUp((profile[nutrient] / dv) * 100);
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
  const pct = roundHalfUp((profile[nutrient] / dv) * 100);
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
