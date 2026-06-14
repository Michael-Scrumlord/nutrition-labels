// utils/nutrition.ts
//
// Pure math — given ingredient data, returns per-serving nutrient totals.
// This mirrors the logic in backend/app/nutrition.py exactly.
// If you change the math here, change it there too (and vice versa).

import type { IngredientItem, MacroProfile, HighlightSet } from "../types";
import { ingredientGrams } from "./units";

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

// Added Sugars is a mandatory line with its own DV (50g). It is NOT part of
// MacroProfile (not in the USDA DB / not summed from ingredients) — it's a
// user-supplied label override — so its DV lives outside FDA_DAILY_VALUES.
export const ADDED_SUGARS_DV = 50;

// Vitamins/minerals use coarser %DV rounding increments than macros, and their
// quantitative amounts round to their own increments (see formatNutrientAmount).
const MICRO_KEYS = new Set<keyof MacroProfile>([
  "vitamin_d_mcg", "calcium_mg", "iron_mg", "potassium_mg",
]);

/** All nutrient keys in label order. */
export const NUTRIENT_FIELDS: (keyof MacroProfile)[] = [
  "calories", "fat_total_g", "fat_saturated_g", "cholesterol_mg",
  "sodium_mg", "carbohydrates_total_g", "fiber_g", "sugar_g",
  "protein_g", "vitamin_d_mcg", "calcium_mg", "iron_mg", "potassium_mg",
];

/**
 * Round to the specified number of digits using round-half-away-from-zero.
 * Matches Python's `Decimal(x).quantize(..., ROUND_HALF_UP)`.
 *
 * `Number.prototype.toFixed` is specified to pick the integer that
 * minimizes the distance to the true mathematical value of `x` (the
 * stored IEEE-754 number, not its short decimal display), with halfway
 * ties broken away from zero — i.e. the same rule Python's Decimal uses.
 * A naive `Math.round(x * f + EPSILON) / f` diverges at boundaries where
 * the binary expansion of `x` is just below `.x5` (e.g. 0.15 → JS 0.2 vs
 * Py 0.1) because the EPSILON nudge crosses the half-mark in one
 * direction but not the other.
 */
export function roundHalfUp(x: number, ndigits: number = 0): number {
  if (!Number.isFinite(x)) return x;
  return Number(x.toFixed(Math.max(0, ndigits)));
}

/**
 * Calculate per-serving nutrient totals for a recipe.
 *
 * Returns **unrounded** full-precision per-serving values. FDA rounding
 * (21 CFR 101.9(c)) is increment-based and differs per nutrient, so it is
 * applied at the presentation layer (`formatNutrientAmount`) instead of here.
 * Keeping the model unrounded also means %DV is computed from the true amount,
 * not a lossy display value.
 *
 * Step by step:
 *  1. For each ingredient, convert its amount to grams.
 *  2. Scale from per-100g to actual grams: multiplier = grams / 100.
 *  3. Multiply each nutrient by the multiplier and accumulate.
 *  4. Divide all totals by portionDivisor to get per-serving values.
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
    const grams = ingredientGrams(ingredient);
    const multiplier = grams / 100; // DB stores values per 100g

    for (const field of NUTRIENT_FIELDS) {
      totals[field] += (ingredient.baseMacros[field] ?? 0) * multiplier;
    }
  }

  // Per-serving, unrounded. Presentation applies FDA rounding.
  const out = {} as MacroProfile;
  for (const field of NUTRIENT_FIELDS) {
    out[field] = totals[field] / portionDivisor;
  }
  return out;
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
 * Compute the whole-percent %DV for each nutrient that has a daily value.
 * Returns a partial MacroProfile keyed by nutrient. Nutrients without a DV are
 * omitted. (Display uses `formatDV`, which also applies the FDA micronutrient
 * %DV increments and the "<1%" rule; this helper is the plain numeric form.)
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

/** Round a value to the nearest multiple of `increment` (half away from zero). */
function roundToIncrement(value: number, increment: number): number {
  return roundHalfUp(value / increment, 0) * increment;
}

/** Clean numeric → string: drops float noise and trailing ".0" (e.g. 0.7000001 → "0.7"). */
function fmtNum(n: number): string {
  const cleaned = Math.round(n * 10) / 10;
  return Number.isInteger(cleaned) ? String(cleaned) : cleaned.toString();
}

/**
 * Format a nutrient's per-serving amount for the label per the FDA
 * increment-rounding rules in 21 CFR 101.9(c). Returns the full display token
 * INCLUDING the unit, e.g. "8g", "0g", "less than 1g", "less than 5mg",
 * "160mg", "2mcg". `calories` returns a bare numeric string ("60").
 *
 * `value` is the unrounded per-serving amount from `calculateRecipeMacros`.
 */
export function formatNutrientAmount(nutrient: keyof MacroProfile, value: number): string {
  switch (nutrient) {
    case "calories":
      if (value < 5) return "0";
      return String(roundToIncrement(value, value <= 50 ? 5 : 10));

    case "fat_total_g":
    case "fat_saturated_g":
      if (value < 0.5) return "0g";
      return `${fmtNum(roundToIncrement(value, value < 5 ? 0.5 : 1))}g`;

    case "cholesterol_mg":
      if (value < 2) return "0mg";
      if (value <= 5) return "less than 5mg";
      return `${roundToIncrement(value, 5)}mg`;

    case "sodium_mg":
      if (value < 5) return "0mg";
      return `${roundToIncrement(value, value <= 140 ? 5 : 10)}mg`;

    case "carbohydrates_total_g":
    case "fiber_g":
    case "sugar_g":
    case "protein_g":
      if (value < 0.5) return "0g";
      if (value < 1) return "less than 1g";
      return `${roundToIncrement(value, 1)}g`;

    case "vitamin_d_mcg":
      return `${fmtNum(roundToIncrement(value, 0.1))}mcg`;
    case "iron_mg":
      return `${fmtNum(roundToIncrement(value, 0.1))}mg`;
    case "calcium_mg":
    case "potassium_mg":
      return `${roundToIncrement(value, 10)}mg`;

    default:
      return fmtNum(value);
  }
}

/** FDA amount string for Added Sugars (g) — same increment rules as sugars. */
export function formatAddedSugarsAmount(value: number): string {
  if (value < 0.5) return "0g";
  if (value < 1) return "less than 1g";
  return `${roundToIncrement(value, 1)}g`;
}

/** FDA amount string for Trans Fat (g) — same increment rules as total fat. */
export function formatTransFatAmount(value: number): string {
  if (value < 0.5) return "0g";
  return `${fmtNum(roundToIncrement(value, value < 5 ? 0.5 : 1))}g`;
}

/** Round a raw %DV to FDA increments: vitamins/minerals are coarser than macros. */
function roundDvPct(pctRaw: number, isMicro: boolean): number {
  if (!isMicro) return roundHalfUp(pctRaw, 0);
  if (pctRaw <= 10) return roundToIncrement(pctRaw, 2);
  if (pctRaw <= 50) return roundToIncrement(pctRaw, 5);
  return roundToIncrement(pctRaw, 10);
}

/**
 * Format a %DV string from an amount and its Daily Value.
 *   - computed value is 0 but the amount > 0 → "<1%"
 *   - otherwise → "12%"
 */
export function formatDVFromAmount(amount: number, dv: number, isMicro = false): string {
  const pct = roundDvPct((amount / dv) * 100, isMicro);
  if (pct === 0 && amount > 0) return "<1%";
  return `${pct}%`;
}

/**
 * Format a %DV for display on the label, computed from the unrounded amount.
 *   - If no DV exists: return "—"
 *   - Otherwise defer to `formatDVFromAmount`.
 */
export function formatDV(
  nutrient: keyof MacroProfile,
  profile: MacroProfile,
): string {
  const dv = FDA_DAILY_VALUES[nutrient];
  if (dv === undefined) return "—";
  return formatDVFromAmount(profile[nutrient], dv, MICRO_KEYS.has(nutrient));
}

/**
 * Build the INGREDIENTS string for the label.
 * Sorted by actual gram weight descending (FDA requirement),
 * all uppercase, comma-separated, ending with a period.
 */
export function buildIngredientsString(ingredients: IngredientItem[]): string {
  if (ingredients.length === 0) return "";
  const sorted = [...ingredients].sort(
    (a, b) => ingredientGrams(b) - ingredientGrams(a),
  );
  return sorted.map((ing) => ing.name.toUpperCase()).join(", ") + ".";
}
