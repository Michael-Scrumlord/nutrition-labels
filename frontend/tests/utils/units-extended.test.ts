// tests/utils/units-extended.test.ts
//
// Extended tests for utils/units.ts covering convertBetweenUnits,
// normalizePortion, and ingredientGrams (including portionRef override).
// Companion to units.test.ts which tests UNIT_CONVERSIONS and convertToGrams.

import { describe, it, expect } from "vitest";
import {
  UNIT_CONVERSIONS,
  convertToGrams,
  convertBetweenUnits,
  normalizePortion,
  ingredientGrams,
} from "../../src/utils/units";
import type { PortionSize, IngredientItem, MacroProfile } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

function makeIngredient(
  amount: number,
  unit: "g" | "oz" | "lb" | "kg" | "ml",
  portionRef?: { modifier: string; gramsPerUnit: number },
): IngredientItem {
  return { fdc_id: 1, name: "Food", amount, unit, baseMacros: ZERO_MACROS, ...(portionRef ? { portionRef } : {}) };
}

function makePortionSize(amount: number, gram_weight: number, modifier = "cup"): PortionSize {
  return { amount, modifier, gram_weight };
}

// ── convertBetweenUnits ───────────────────────────────────────────────────

describe("convertBetweenUnits", () => {
  it("same unit returns the original amount unchanged", () => {
    expect(convertBetweenUnits(100, "g", "g")).toBe(100);
    expect(convertBetweenUnits(5,   "oz", "oz")).toBe(5);
    expect(convertBetweenUnits(1,   "lb", "lb")).toBe(1);
  });

  it("g → oz: 100 g is approximately 3.527 oz", () => {
    const result = convertBetweenUnits(100, "g", "oz");
    expect(result).toBeCloseTo(100 / UNIT_CONVERSIONS["oz"], 3);
  });

  it("oz → g: 1 oz converts to 28.3495 g", () => {
    const result = convertBetweenUnits(1, "oz", "g");
    expect(result).toBeCloseTo(28.3495, 4);
  });

  it("g → lb: 453.592 g equals 1 lb", () => {
    const result = convertBetweenUnits(453.592, "g", "lb");
    expect(result).toBeCloseTo(1, 4);
  });

  it("lb → g: 1 lb converts to 453.592 g", () => {
    const result = convertBetweenUnits(1, "lb", "g");
    expect(result).toBeCloseTo(453.592, 3);
  });

  it("kg → g: 0.5 kg converts to 500 g", () => {
    const result = convertBetweenUnits(0.5, "kg", "g");
    expect(result).toBe(500);
  });

  it("g → kg: 1000 g converts to 1 kg", () => {
    const result = convertBetweenUnits(1000, "g", "kg");
    expect(result).toBe(1);
  });

  it("oz → lb: 16 oz converts to exactly 1 lb", () => {
    const result = convertBetweenUnits(16, "oz", "lb");
    expect(result).toBeCloseTo(1, 3);
  });

  it("lb → oz: 1 lb converts to ~16 oz", () => {
    const result = convertBetweenUnits(1, "lb", "oz");
    expect(result).toBeCloseTo(16, 1);
  });

  it("g → ml: identical (water-density assumption)", () => {
    expect(convertBetweenUnits(250, "g", "ml")).toBe(250);
  });

  it("ml → oz: 100 ml converts using the oz factor", () => {
    const result = convertBetweenUnits(100, "ml", "oz");
    expect(result).toBeCloseTo(100 / UNIT_CONVERSIONS["oz"], 3);
  });

  it("round-trip conversion returns the original amount", () => {
    const original = 123.456;
    const roundTrip = convertBetweenUnits(convertBetweenUnits(original, "g", "oz"), "oz", "g");
    expect(roundTrip).toBeCloseTo(original, 6);
  });

  it("zero amount converts to zero in any unit", () => {
    expect(convertBetweenUnits(0, "g",  "oz")).toBe(0);
    expect(convertBetweenUnits(0, "lb", "kg")).toBe(0);
  });

  it("preserves gram weight: same food, different unit representation", () => {
    // 100 g of food → oz → back to grams should be ~100 g
    const oz = convertBetweenUnits(100, "g", "oz");
    const grams = convertToGrams(oz, "oz");
    expect(grams).toBeCloseTo(100, 4);
  });
});

// ── normalizePortion ──────────────────────────────────────────────────────

describe("normalizePortion", () => {
  it("converts a 1-unit portion to gramsPerUnit = gram_weight", () => {
    const portion = makePortionSize(1, 125, "cup");
    const ref = normalizePortion(portion);
    expect(ref.gramsPerUnit).toBe(125);
    expect(ref.modifier).toBe("cup");
  });

  it("converts a fractional portion (0.5 cup = 113.5 g) to per-unit", () => {
    // 0.5 cup = 113.5 g → 1 cup ≈ 227 g
    const portion = makePortionSize(0.5, 113.5, "cup");
    const ref = normalizePortion(portion);
    expect(ref.gramsPerUnit).toBeCloseTo(227, 2);
    expect(ref.modifier).toBe("cup");
  });

  it("converts a 2-unit portion to half the gram_weight per unit", () => {
    // 2 tablespoons = 28.4 g → 1 tablespoon ≈ 14.2 g
    const portion = makePortionSize(2, 28.4, "tablespoon");
    const ref = normalizePortion(portion);
    expect(ref.gramsPerUnit).toBeCloseTo(14.2, 2);
  });

  it("preserves the modifier string exactly", () => {
    const portion = makePortionSize(1, 50, "large egg");
    const ref = normalizePortion(portion);
    expect(ref.modifier).toBe("large egg");
  });

  it("handles very small portion sizes without error", () => {
    // 0.001 cup = 0.237 g → 1 cup = 237 g
    const portion = makePortionSize(0.001, 0.237, "cup");
    const ref = normalizePortion(portion);
    expect(ref.gramsPerUnit).toBeCloseTo(237, 1);
  });

  it("returns a PortionRef object with exactly modifier and gramsPerUnit", () => {
    const portion = makePortionSize(1, 14.2, "tablespoon");
    const ref = normalizePortion(portion);
    expect(Object.keys(ref).sort()).toEqual(["gramsPerUnit", "modifier"]);
  });
});

// ── ingredientGrams — unit fallback path ──────────────────────────────────

describe("ingredientGrams (unit fallback, no portionRef)", () => {
  it("100 g ingredient weighs 100 g", () => {
    expect(ingredientGrams(makeIngredient(100, "g"))).toBe(100);
  });

  it("1 oz ingredient weighs 28.3495 g", () => {
    expect(ingredientGrams(makeIngredient(1, "oz"))).toBeCloseTo(28.3495, 4);
  });

  it("1 lb ingredient weighs 453.592 g", () => {
    expect(ingredientGrams(makeIngredient(1, "lb"))).toBeCloseTo(453.592, 3);
  });

  it("1 kg ingredient weighs 1000 g", () => {
    expect(ingredientGrams(makeIngredient(1, "kg"))).toBe(1000);
  });

  it("250 ml ingredient weighs 250 g (water-density assumption)", () => {
    expect(ingredientGrams(makeIngredient(250, "ml"))).toBe(250);
  });

  it("zero-gram ingredient (amount=0) returns 0", () => {
    expect(ingredientGrams(makeIngredient(0, "g"))).toBe(0);
  });
});

// ── ingredientGrams — portionRef override path ────────────────────────────

describe("ingredientGrams (with portionRef)", () => {
  it("uses portionRef.gramsPerUnit instead of the unit conversion", () => {
    // 1 tablespoon of butter = 14.2 g, regardless of unit on the row
    const portionRef = { modifier: "tablespoon", gramsPerUnit: 14.2 };
    const ingredient = makeIngredient(1, "g", portionRef);
    expect(ingredientGrams(ingredient)).toBeCloseTo(14.2, 4);
  });

  it("scales gramsPerUnit by amount correctly", () => {
    // 3 tablespoons × 14.2 g/tbsp = 42.6 g
    const portionRef = { modifier: "tablespoon", gramsPerUnit: 14.2 };
    const ingredient = makeIngredient(3, "g", portionRef);
    expect(ingredientGrams(ingredient)).toBeCloseTo(42.6, 4);
  });

  it("portionRef overrides the unit field entirely", () => {
    // The unit='lb' would normally give 453.592 g, but portionRef overrides it
    const portionRef = { modifier: "cup", gramsPerUnit: 227 };
    const ingredient = makeIngredient(1, "lb", portionRef);
    expect(ingredientGrams(ingredient)).toBe(227);
  });

  it("portionRef with 0.5 cups produces half the gramsPerUnit", () => {
    const portionRef = { modifier: "cup", gramsPerUnit: 227 };
    const ingredient = makeIngredient(0.5, "g", portionRef);
    expect(ingredientGrams(ingredient)).toBeCloseTo(113.5, 4);
  });

  it("portionRef with large egg (amount=1, gramsPerUnit=50) gives 50 g", () => {
    const portionRef = { modifier: "large egg", gramsPerUnit: 50 };
    const ingredient = makeIngredient(1, "g", portionRef);
    expect(ingredientGrams(ingredient)).toBe(50);
  });

  it("null portionRef falls back to unit conversion", () => {
    // Explicitly construct an ingredient with portionRef = undefined
    const ingredient: IngredientItem = {
      fdc_id: 1, name: "Food", amount: 100, unit: "g",
      baseMacros: ZERO_MACROS,
      portionRef: undefined,
    };
    expect(ingredientGrams(ingredient)).toBe(100);
  });
});

// ── ingredientGrams — edge: zero-gram portionRef ──────────────────────────

describe("ingredientGrams — zero-gram edge cases", () => {
  it("portionRef with amount=0 returns 0 g", () => {
    const portionRef = { modifier: "tablespoon", gramsPerUnit: 14.2 };
    const ingredient = makeIngredient(0, "g", portionRef);
    expect(ingredientGrams(ingredient)).toBe(0);
  });

  it("no portionRef with amount=0 returns 0 g", () => {
    expect(ingredientGrams(makeIngredient(0, "oz"))).toBe(0);
  });
});
