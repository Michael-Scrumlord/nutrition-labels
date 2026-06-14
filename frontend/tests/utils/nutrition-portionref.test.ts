// tests/utils/nutrition-portionref.test.ts
//
// Tests for calculateRecipeMacros when ingredients carry a portionRef.
// The portionRef path in ingredientGrams is exercised end-to-end through
// the full macro calculation here, complementing the isolated
// ingredientGrams tests in units-extended.test.ts.
//
// Also exercises the portionDivisor RangeError boundaries — the
// <1 / >999 rejection path that pairs with the backend's ValueError check
// in nutrition.py::calculate_recipe_macros.

import { describe, it, expect } from "vitest";
import { calculateRecipeMacros } from "../../src/utils/nutrition";
import { UNIT_CONVERSIONS } from "../../src/utils/units";
import type { IngredientItem, MacroProfile } from "../../src/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

// Build an ingredient without portionRef (plain unit path).
function makeIngredient(
  amount: number,
  unit: "g" | "oz" | "lb" | "kg" | "ml" = "g",
  macros: MacroProfile = BUTTER_MACROS,
): IngredientItem {
  return { fdc_id: 1, name: "Food", amount, unit, baseMacros: macros };
}

// Build an ingredient with portionRef (food-specific portion path).
function makePortionIngredient(
  amount: number,
  gramsPerUnit: number,
  macros: MacroProfile = BUTTER_MACROS,
  modifier = "tablespoon",
): IngredientItem {
  return {
    fdc_id: 1,
    name: "Food",
    amount,
    unit: "g",        // irrelevant when portionRef is set
    baseMacros: macros,
    portionRef: { modifier, gramsPerUnit },
  };
}

// ── portionRef path through calculateRecipeMacros ─────────────────────────

describe("calculateRecipeMacros — portionRef ingredient", () => {
  it("uses gramsPerUnit × amount instead of the unit conversion", () => {
    // 1 tablespoon of butter = 14.2 g of butter
    // Calories = 717 × (14.2 / 100) / 1 ≈ 101.814 kcal (unrounded model)
    const ingredient = makePortionIngredient(1, 14.2);
    const result = calculateRecipeMacros([ingredient], 1);
    const expected = 717 * 14.2 / 100;
    expect(result.calories).toBeCloseTo(expected, 4);
  });

  it("scales correctly when amount > 1 portion", () => {
    // 3 tablespoons = 3 × 14.2 = 42.6 g
    const ingredient = makePortionIngredient(3, 14.2);
    const result = calculateRecipeMacros([ingredient], 1);
    const expected = 717 * (3 * 14.2) / 100;
    expect(result.calories).toBeCloseTo(expected, 4);
  });

  it("portionRef with divisor: per-serving values are divided correctly", () => {
    // 2 cups of butter (1 cup = 227 g → 454 g total), 8 servings
    const ingredient = makePortionIngredient(2, 227, BUTTER_MACROS, "cup");
    const result = calculateRecipeMacros([ingredient], 8);
    const expected = 717 * (2 * 227) / 100 / 8;
    expect(result.calories).toBeCloseTo(expected, 4);
  });

  it("portionRef overrides the unit field completely", () => {
    // unit='lb' would normally give 453.592 g; portionRef (cup=100 g) overrides it
    const ingredient: IngredientItem = {
      fdc_id: 1,
      name: "Food",
      amount: 1,
      unit: "lb",          // irrelevant
      baseMacros: BUTTER_MACROS,
      portionRef: { modifier: "cup", gramsPerUnit: 100 },
    };
    const result = calculateRecipeMacros([ingredient], 1);
    // portionRef path: grams = 1 × 100 = 100 (not 453.592)
    const expected = Math.round(717 * 100 / 100);
    expect(result.calories).toBe(expected);

    // Confirm it is NOT the lb-based result
    const lbResult = Math.round(717 * UNIT_CONVERSIONS.lb / 100);
    expect(result.calories).not.toBe(lbResult);
  });

  it("portionRef with amount=0 contributes zero grams (zero-gram edge case)", () => {
    const ingredient = makePortionIngredient(0, 14.2);
    const result = calculateRecipeMacros([ingredient], 1);
    expect(result.calories).toBe(0);
    expect(result.fat_total_g).toBe(0);
    expect(result.protein_g).toBe(0);
  });

  it("portionRef ingredient accumulates correctly alongside a plain-unit ingredient", () => {
    // 1 tablespoon butter (14.2 g) + 100 g butter
    const portion = makePortionIngredient(1, 14.2);
    const plain   = makeIngredient(100, "g");
    const result = calculateRecipeMacros([portion, plain], 1);

    const totalGrams = 14.2 + 100;
    const expected = 717 * totalGrams / 100;
    expect(result.calories).toBeCloseTo(expected, 4);
  });

  it("all-zero macros via portionRef still returns zero for all nutrients", () => {
    const ingredient = makePortionIngredient(5, 30, ZERO_MACROS);
    const result = calculateRecipeMacros([ingredient], 1);
    expect(result.calories).toBe(0);
    expect(result.fat_total_g).toBe(0);
    expect(result.sodium_mg).toBe(0);
  });

  it("divisor=999 with portionRef ingredient produces near-zero per-serving values", () => {
    // 1 tablespoon (14.2 g) of butter ÷ 999 servings → tiny per-serving values.
    // The model is unrounded, so these are small but non-zero; the FDA
    // "< 5 kcal → 0" / "< 0.5 g → 0g" collapse happens in formatNutrientAmount.
    const ingredient = makePortionIngredient(1, 14.2);
    const result = calculateRecipeMacros([ingredient], 999);
    expect(result.calories).toBeCloseTo(717 * 14.2 / 100 / 999, 4);    // ≈ 0.102
    expect(result.fat_total_g).toBeCloseTo(81.1 * 14.2 / 100 / 999, 4); // ≈ 0.0115
    // Still "near zero": below the FDA display threshold that renders as "0".
    expect(result.calories).toBeGreaterThan(0);
    expect(result.calories).toBeLessThan(5);
  });
});

// ── portionDivisor RangeError boundaries ─────────────────────────────────────

describe("calculateRecipeMacros — portionDivisor validation", () => {
  it("does NOT throw for divisor=1 (minimum allowed)", () => {
    expect(() => calculateRecipeMacros([], 1)).not.toThrow();
  });

  it("does NOT throw for divisor=999 (maximum allowed)", () => {
    expect(() => calculateRecipeMacros([], 999)).not.toThrow();
  });

  it("throws RangeError for divisor=0 (below minimum)", () => {
    expect(() => calculateRecipeMacros([], 0)).toThrow(RangeError);
  });

  it("throws RangeError for divisor=-1 (negative)", () => {
    expect(() => calculateRecipeMacros([], -1)).toThrow(RangeError);
  });

  it("throws RangeError for divisor=-999 (extreme negative)", () => {
    expect(() => calculateRecipeMacros([], -999)).toThrow(RangeError);
  });

  it("throws RangeError for divisor=1000 (one above maximum)", () => {
    expect(() => calculateRecipeMacros([], 1000)).toThrow(RangeError);
  });

  it("throws RangeError for divisor=Number.MAX_SAFE_INTEGER (extreme positive)", () => {
    expect(() => calculateRecipeMacros([], Number.MAX_SAFE_INTEGER)).toThrow(RangeError);
  });

  it("RangeError message mentions the valid range", () => {
    expect(() => calculateRecipeMacros([], 0)).toThrow(/1.*999|portionDivisor/i);
  });
});
