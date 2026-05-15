// tests/utils/nutrition.test.ts
//
// Tests for the frontend nutrition math — mirrors the backend test_nutrition.py.

import { describe, it, expect } from "vitest";
import { calculateRecipeMacros, computeDailyValues, buildIngredientsString, formatDV } from "../../src/utils/nutrition";
import type { IngredientItem, MacroProfile } from "../../src/types";

// ── Helpers ────────────────────────────────────────────────────────────────

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

const FLOUR_MACROS: MacroProfile = {
  calories: 364, fat_total_g: 1.0, fat_saturated_g: 0.2,
  cholesterol_mg: 0, sodium_mg: 2, carbohydrates_total_g: 76.3,
  fiber_g: 2.7, sugar_g: 0.3, protein_g: 10.3,
  vitamin_d_mcg: 0, calcium_mg: 15, iron_mg: 4.64, potassium_mg: 107,
};

function makeIngredient(fdc_id: number, amount: number, unit: "g" | "oz" = "g", name = "Food", macros = BUTTER_MACROS): IngredientItem {
  return { fdc_id, name, amount, unit, baseMacros: macros };
}

// ── Tests ──────────────────────────────────────────────────────────────────

describe("calculateRecipeMacros", () => {
  it("returns zero MacroProfile for empty ingredient list", () => {
    const result = calculateRecipeMacros([], 8);
    expect(result.calories).toBe(0);
    expect(result.fat_total_g).toBe(0);
    expect(result.protein_g).toBe(0);
  });

  it("returns raw macros for 100g of a food with divisor=1", () => {
    const ingredient = makeIngredient(1, 100, "g");
    const result = calculateRecipeMacros([ingredient], 1);
    expect(result.calories).toBe(717);
    expect(result.fat_total_g).toBe(81.1);
    expect(result.protein_g).toBe(0.9);
  });

  it("halves values with divisor=2", () => {
    const ingredient = makeIngredient(1, 100, "g");
    const full = calculateRecipeMacros([ingredient], 1);
    const half = calculateRecipeMacros([ingredient], 2);
    // Allow ±0.1 for rounding at 1 decimal place
    expect(Math.abs(half.fat_total_g - full.fat_total_g / 2)).toBeLessThanOrEqual(0.1);
  });

  it("converts oz to grams correctly (1 oz = 28.3495g)", () => {
    const ingredient = makeIngredient(1, 1, "oz");
    const result = calculateRecipeMacros([ingredient], 1);
    const expected = Math.round(717 * 28.3495 / 100);
    expect(result.calories).toBe(expected);
  });

  it("accumulates multiple ingredients correctly", () => {
    const butter = makeIngredient(1, 100, "g", "Butter", BUTTER_MACROS);
    const flour  = makeIngredient(2, 100, "g", "Flour",  FLOUR_MACROS);
    const result = calculateRecipeMacros([butter, flour], 1);
    expect(result.calories).toBe(717 + 364);
    expect(result.fat_total_g).toBe(Math.round((81.1 + 1.0) * 10) / 10);
  });

  it("uses divisor=1 when divisor is 0 (defensive)", () => {
    const ingredient = makeIngredient(1, 100, "g");
    const result = calculateRecipeMacros([ingredient], 0);
    // Should not crash, and should not divide by 0
    expect(result.calories).toBeGreaterThan(0);
  });
});

describe("computeDailyValues", () => {
  it("returns 100% for exactly the daily value of fat", () => {
    const profile: MacroProfile = { ...BUTTER_MACROS, fat_total_g: 78 };
    const dvs = computeDailyValues(profile);
    expect(dvs.fat_total_g).toBe(100);
  });

  it("returns 50% for half the sodium daily value", () => {
    const profile: MacroProfile = { ...BUTTER_MACROS, sodium_mg: 1150 };
    const dvs = computeDailyValues(profile);
    expect(dvs.sodium_mg).toBe(50);
  });

  it("does not include calories or sugar in %DV (they have no DV)", () => {
    const dvs = computeDailyValues(BUTTER_MACROS);
    expect(dvs.calories).toBeUndefined();
    expect(dvs.sugar_g).toBeUndefined();
    expect(dvs.protein_g).toBeUndefined();
  });
});

describe("buildIngredientsString", () => {
  it("sorts heavier ingredients first", () => {
    // Flour 250g > Butter 227g > Sugar 200g
    const ingredients: IngredientItem[] = [
      makeIngredient(1, 200, "g", "Sugar",  BUTTER_MACROS),
      makeIngredient(2, 250, "g", "Flour",  FLOUR_MACROS),
      makeIngredient(3, 227, "g", "Butter", BUTTER_MACROS),
    ];
    const result = buildIngredientsString(ingredients);
    const flourIdx  = result.indexOf("FLOUR");
    const butterIdx = result.indexOf("BUTTER");
    const sugarIdx  = result.indexOf("SUGAR");
    expect(flourIdx).toBeLessThan(butterIdx);
    expect(butterIdx).toBeLessThan(sugarIdx);
  });

  it("converts names to uppercase", () => {
    const ingredients: IngredientItem[] = [
      makeIngredient(1, 100, "g", "butter"),
    ];
    const result = buildIngredientsString(ingredients);
    expect(result).toContain("BUTTER");
    expect(result).not.toContain("butter");
  });

  it("ends with a period", () => {
    const ingredients: IngredientItem[] = [makeIngredient(1, 100, "g", "Butter")];
    expect(buildIngredientsString(ingredients)).toMatch(/\.$/);
  });

  it("returns empty string for no ingredients", () => {
    expect(buildIngredientsString([])).toBe("");
  });
});

describe("formatDV", () => {
  it("returns '—' for nutrients with no daily value (calories)", () => {
    expect(formatDV("calories", BUTTER_MACROS)).toBe("—");
  });

  it("returns '<1%' when computed %DV rounds to 0 but value > 0", () => {
    // sodium_mg = 1 → 1/2300 = 0.04% → rounds to 0 → '<1%'
    const profile: MacroProfile = { ...BUTTER_MACROS, sodium_mg: 1 };
    expect(formatDV("sodium_mg", profile)).toBe("<1%");
  });

  it("returns '100%' for fat at the daily value", () => {
    const profile: MacroProfile = { ...BUTTER_MACROS, fat_total_g: 78 };
    expect(formatDV("fat_total_g", profile)).toBe("100%");
  });
});
