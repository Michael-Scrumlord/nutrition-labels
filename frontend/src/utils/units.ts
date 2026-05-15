// utils/units.ts
//
// Unit conversion constants.
// These MUST be identical to UNIT_CONVERSIONS in backend/app/constants.py.
// If you change one, change the other.

import type { UnitKey } from "../types";

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
