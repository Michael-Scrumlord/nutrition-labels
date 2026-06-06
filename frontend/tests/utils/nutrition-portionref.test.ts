// tests/utils/nutrition-portionref.test.ts
//
// Tests for nutrition.ts and units.ts when ingredients carry a portionRef
// (a known FDC portion size, e.g. "1 tablespoon = 14.2 g").
//
// portionRef overrides the unit-conversion path: ingredientGrams() returns
// amount × portionRef.gramsPerUnit instead of amount × UNIT_CONVERSIONS[unit].
// These tests verify that calculateRecipeMacros and buildIngredientsString
// honour that override end-to-end.

import { describe, it, expect } from "vitest";
import {
  calculateRecipeMacros,
  buildIngredientsString,
  NUTRIENT_FIELDS,
} from "../../src/utils/nutrition";
import { ingredientGrams } from "../../src/utils/units";
import type { IngredientItem, MacroProfile, PortionRef } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

// Butter per-100g macros from USDA SR Legacy (same as other test files)
const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

// Olive oil per-100g macros from USDA
const OLIVE_OIL_MACROS: MacroProfile = {
  calories: 884, fat_total_g: 100.0, fat_saturated_g: 13.8,
  cholesterol_mg: 0, sodium_mg: 2, carbohydrates_total_g: 0.0,
  fiber_g: 0.0, sugar_g: 0.0, protein_g: 0.0,
  vitamin_d_mcg: 0.0, calcium_mg: 1, iron_mg: 0.56, potassium_mg: 1,
};

// Helper: build a PortionRef (1 tablespoon of butter ≈ 14.2 g)
const TBSP_BUTTER: PortionRef = { modifier: "tablespoon", gramsPerUnit: 14.2 };
const CUP_BUTTER:  PortionRef = { modifier: "cup",        gramsPerUnit: 227.0 };
const TBSP_OIL:    PortionRef = { modifier: "tablespoon", gramsPerUnit: 13.5 };

function makeIngredient(
  fdc_id: number,
  amount: number,
  unit: "g" | "oz" | "lb" | "kg" | "ml" = "g",
  name = "Food",
  macros: MacroProfile = BUTTER_MACROS,
  portionRef?: PortionRef,
): IngredientItem {
  return { fdc_id, name, amount, unit, baseMacros: macros, portionRef };
}

// ── ingredientGrams with portionRef ───────────────────────────────────────

describe("ingredientGrams with portionRef", () => {
  it("uses portionRef.gramsPerUnit instead of UNIT_CONVERSIONS when portionRef is set", () => {
    // 1 tablespoon of butter = 14.2 g (not 1 × UNIT_CONVERSIONS['g'] = 1 g)
    const ing = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    expect(ingredientGrams(ing)).toBeCloseTo(14.2, 4);
  });

  it("scales gramsPerUnit linearly by amount", () => {
    // 3 tablespoons × 14.2 g/tbsp = 42.6 g
    const ing = makeIngredient(1, 3, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    expect(ingredientGrams(ing)).toBeCloseTo(42.6, 4);
  });

  it("overrides even when the unit field is non-gram (lb)", () => {
    // unit='lb' would normally give 453.592 g, but portionRef overrides to 227 g (1 cup)
    const ing = makeIngredient(1, 1, "lb", "Butter", BUTTER_MACROS, CUP_BUTTER);
    expect(ingredientGrams(ing)).toBeCloseTo(227.0, 4);
  });

  it("fractional amounts work correctly (0.5 cups)", () => {
    // 0.5 cup × 227 g/cup = 113.5 g
    const ing = makeIngredient(1, 0.5, "g", "Butter", BUTTER_MACROS, CUP_BUTTER);
    expect(ingredientGrams(ing)).toBeCloseTo(113.5, 4);
  });

  it("zero amount returns 0 g regardless of portionRef", () => {
    const ing = makeIngredient(1, 0, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    expect(ingredientGrams(ing)).toBe(0);
  });
});

// ── calculateRecipeMacros with portionRef ─────────────────────────────────

describe("calculateRecipeMacros with portionRef", () => {
  it("1 tablespoon of butter (14.2 g) gives the same calories as 14.2 g butter", () => {
    const byPortion = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    const byGrams   = makeIngredient(1, 14.2, "g", "Butter", BUTTER_MACROS);

    const resultPortion = calculateRecipeMacros([byPortion], 1);
    const resultGrams   = calculateRecipeMacros([byGrams],   1);

    // Both should round to the same calories (717 * 0.142 / 100 = 1.018 → rounds to 1 kcal)
    expect(resultPortion.calories).toBe(resultGrams.calories);
    expect(resultPortion.fat_total_g).toBe(resultGrams.fat_total_g);
  });

  it("1 cup (227 g) of butter matches an explicit 227 g ingredient", () => {
    const byPortion = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, CUP_BUTTER);
    const byGrams   = makeIngredient(1, 227, "g", "Butter", BUTTER_MACROS);

    const resultPortion = calculateRecipeMacros([byPortion], 1);
    const resultGrams   = calculateRecipeMacros([byGrams],   1);

    expect(resultPortion.calories).toBe(resultGrams.calories);
    expect(resultPortion.fat_total_g).toBe(resultGrams.fat_total_g);
    expect(resultPortion.protein_g).toBe(resultGrams.protein_g);
  });

  it("portionRef ingredient contributes proportionally to total recipe macros", () => {
    // 2 tablespoons of olive oil = 2 × 13.5 g = 27 g
    // olive oil: 884 cal/100g → 884 × 0.27 = 238.68 cal → rounds to 239
    const oilByPortion = makeIngredient(2, 2, "g", "Olive Oil", OLIVE_OIL_MACROS, TBSP_OIL);
    const oilByGrams   = makeIngredient(2, 27, "g", "Olive Oil", OLIVE_OIL_MACROS);

    expect(calculateRecipeMacros([oilByPortion], 1).calories)
      .toBe(calculateRecipeMacros([oilByGrams],   1).calories);
  });

  it("mixed portionRef and raw-unit ingredients accumulate correctly", () => {
    // 1 tbsp butter (14.2 g) + 100 g olive oil
    const butterTbsp = makeIngredient(1, 1, "g", "Butter",    BUTTER_MACROS,    TBSP_BUTTER);
    const oilGrams   = makeIngredient(2, 100, "g", "Olive Oil", OLIVE_OIL_MACROS);

    // Equivalent raw-gram ingredients
    const butterRaw  = makeIngredient(1, 14.2, "g", "Butter",    BUTTER_MACROS);
    const oilRaw     = makeIngredient(2, 100,  "g", "Olive Oil", OLIVE_OIL_MACROS);

    const mixed     = calculateRecipeMacros([butterTbsp, oilGrams], 1);
    const allGrams  = calculateRecipeMacros([butterRaw,  oilRaw],   1);

    expect(mixed.calories).toBe(allGrams.calories);
    expect(mixed.fat_total_g).toBe(allGrams.fat_total_g);
  });

  it("portionRef with portion_divisor divides correctly", () => {
    // 1 cup butter (227 g), 4 servings
    // 717 * 2.27 = 1627.59 total cal → per serving: 1627.59 / 4 = 406.9 → 407 kcal
    const byPortion = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, CUP_BUTTER);
    const result    = calculateRecipeMacros([byPortion], 4);
    const expected  = calculateRecipeMacros([makeIngredient(1, 227, "g", "Butter", BUTTER_MACROS)], 4);
    expect(result.calories).toBe(expected.calories);
  });

  it("all-zero macros ingredient with portionRef contributes nothing to the total", () => {
    const water  = makeIngredient(1, 2, "g", "Water", ZERO_MACROS, { modifier: "cup", gramsPerUnit: 237 });
    const butter = makeIngredient(2, 100, "g", "Butter", BUTTER_MACROS);

    const combined    = calculateRecipeMacros([water, butter], 1);
    const butterOnly  = calculateRecipeMacros([butter], 1);

    for (const field of NUTRIENT_FIELDS) {
      expect(combined[field]).toBe(butterOnly[field]);
    }
  });

  it("portionDivisor=1 with portionRef ingredient returns full serving macros", () => {
    // 1 tablespoon of butter = 14.2 g → 717 * 0.142 = 101.814 cal → 102 kcal
    const ing = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    const result = calculateRecipeMacros([ing], 1);
    const expected = calculateRecipeMacros([makeIngredient(1, 14.2, "g", "Butter", BUTTER_MACROS)], 1);
    expect(result.calories).toBe(expected.calories);
  });
});

// ── buildIngredientsString with portionRef ────────────────────────────────

describe("buildIngredientsString with portionRef", () => {
  it("sorts by actual gram weight from portionRef (heavier first)", () => {
    // 1 cup butter = 227 g; 250 g flour (no portionRef)
    const butter = makeIngredient(1, 1,   "g", "Butter", BUTTER_MACROS,    CUP_BUTTER);
    const flour  = makeIngredient(2, 250, "g", "Flour",  ZERO_MACROS);  // 250 g

    // Flour is heavier (250 g > 227 g) → must appear first
    const result = buildIngredientsString([butter, flour]);
    expect(result.indexOf("FLOUR")).toBeLessThan(result.indexOf("BUTTER"));
  });

  it("portionRef ingredient heavier than a raw-unit ingredient ranks first", () => {
    // 2 cups butter = 454 g vs 100 g oil
    const butter = makeIngredient(1, 2,   "g", "Butter",    BUTTER_MACROS, CUP_BUTTER);
    const oil    = makeIngredient(2, 100, "g", "Olive Oil", ZERO_MACROS);

    const result = buildIngredientsString([oil, butter]);
    expect(result.indexOf("BUTTER")).toBeLessThan(result.indexOf("OLIVE OIL"));
  });

  it("tablespoon portionRef (14.2 g) sorts lighter than a 100 g ingredient", () => {
    const salt  = makeIngredient(1, 100, "g", "Salt",   ZERO_MACROS);
    const butter = makeIngredient(2, 1,   "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);

    // Salt 100 g > Butter 14.2 g → Salt first
    const result = buildIngredientsString([butter, salt]);
    expect(result.indexOf("SALT")).toBeLessThan(result.indexOf("BUTTER"));
  });

  it("two portionRef ingredients are sorted by their computed gram weights", () => {
    // 1 cup butter = 227 g vs 1 tbsp butter = 14.2 g
    const bigPortion   = makeIngredient(1, 1, "g", "Butter A", BUTTER_MACROS, CUP_BUTTER);
    const smallPortion = makeIngredient(2, 1, "g", "Butter B", BUTTER_MACROS, TBSP_BUTTER);

    const result = buildIngredientsString([smallPortion, bigPortion]);
    expect(result.indexOf("BUTTER A")).toBeLessThan(result.indexOf("BUTTER B"));
  });

  it("portionRef zero amount (0 g) ingredient still appears in the list", () => {
    // Zero-gram ingredients still appear — they just sort last
    const noWeight = makeIngredient(1, 0,   "g", "Flavoring", ZERO_MACROS, { modifier: "drop", gramsPerUnit: 0.05 });
    const flour    = makeIngredient(2, 100, "g", "Flour",     ZERO_MACROS);

    // amount=0 → 0 g → sorts last
    const result = buildIngredientsString([noWeight, flour]);
    expect(result.indexOf("FLOUR")).toBeLessThan(result.indexOf("FLAVORING"));
    expect(result.endsWith(".")).toBe(true);
  });

  it("result is uppercase, comma-separated, and ends with a period", () => {
    const ing = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    const result = buildIngredientsString([ing]);
    expect(result).toBe("BUTTER.");
  });
});

// ── Extreme portion divisors with portionRef ──────────────────────────────

describe("calculateRecipeMacros — portionRef with extreme divisors", () => {
  it("portionDivisor=999 with portionRef ingredient gives near-zero values", () => {
    // 1 tablespoon butter = 14.2 g → 717 * 0.142 / 999 ≈ 0.102 cal → rounds to 0
    const ing = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    const result = calculateRecipeMacros([ing], 999);
    expect(result.calories).toBeLessThanOrEqual(1);
  });

  it("portionDivisor throws RangeError for values outside 1–999", () => {
    const ing = makeIngredient(1, 1, "g", "Butter", BUTTER_MACROS, TBSP_BUTTER);
    expect(() => calculateRecipeMacros([ing], 0)).toThrow(RangeError);
    expect(() => calculateRecipeMacros([ing], 1000)).toThrow(RangeError);
  });
});
