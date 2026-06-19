// utils/units.ts
//
// Unit conversion constants.
// These MUST be identical to UNIT_CONVERSIONS in backend/app/constants.py.
// If you change one, change the other.

import type { UnitKey, IngredientItem, PortionRef, PortionSize } from "../types";

export const UNIT_CONVERSIONS: Record<UnitKey, number> = {
  g:  1.0,
  ml: 1.0,       // Water-density assumption
  oz: 28.3495,
  lb: 453.592,
  kg: 1000.0,
};

/** Convert any amount + unit to grams. */
export function convertToGrams(amount: number, unit: UnitKey): number {
  return amount * UNIT_CONVERSIONS[unit];
}

/** Re-express an amount in a new unit while preserving its actual gram weight.
 *  Used when the user changes the unit dropdown on an existing ingredient row —
 *  100 g → oz becomes 3.53 oz, not 100 oz. */
export function convertBetweenUnits(amount: number, from: UnitKey, to: UnitKey): number {
  if (from === to) return amount;
  const grams = amount * UNIT_CONVERSIONS[from];
  return grams / UNIT_CONVERSIONS[to];
}

/** Convert a FDC PortionSize ("0.5 cup = 113.5 g") into a per-1-unit reference
 *  ("1 cup ≈ 227 g"). Lets the recipe row default to amount=1 + portion picker
 *  instead of awkward fractional defaults. */
export function normalizePortion(p: PortionSize): PortionRef {
  return { modifier: p.modifier, gramsPerUnit: p.gram_weight / p.amount };
}

/** Single source of truth for "what does this ingredient weigh in grams?".
 *  Honors portionRef when set; falls back to the global unit conversion. */
export function ingredientGrams(item: Pick<IngredientItem, "amount" | "unit" | "portionRef">): number {
  if (item.portionRef) return item.amount * item.portionRef.gramsPerUnit;
  return item.amount * UNIT_CONVERSIONS[item.unit];
}

/** Parse a raw amount string from a form input.
 *  Returns the value rounded to 2 decimal places, or null if invalid (NaN / ≤ 0). */
export function parseIngredientAmount(raw: string): number | null {
  const parsed = parseFloat(raw);
  if (isNaN(parsed) || parsed <= 0) return null;
  return Math.round(parsed * 100) / 100;
}
