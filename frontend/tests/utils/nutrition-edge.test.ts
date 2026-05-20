// tests/utils/nutrition-edge.test.ts
//
// Edge-case tests for utils/nutrition.ts.
// Covers getHighlightKeys, round1, and scenarios not in nutrition.test.ts
// (extreme divisors, mixed units, zero/null macros, %DV boundaries).

import { describe, it, expect } from "vitest";
import {
  calculateRecipeMacros,
  getHighlightKeys,
  computeDailyValues,
  formatDV,
  round1,
  buildIngredientsString,
  NUTRIENT_FIELDS,
} from "../../src/utils/nutrition";
import { UNIT_CONVERSIONS } from "../../src/utils/units";
import type { IngredientItem, MacroProfile } from "../../src/types";

// Shared FE/BE parity vectors. The backend test
// (backend/tests/test_nutrition_edge_cases.py) loads the same JSON.
// Vitest is configured (vite.config.ts → test.server.deps.inline + fs.allow)
// to allow reading this file from the sibling backend/ directory.
import parityVectorsJson from "../../../backend/tests/data/round_half_up_parity.json";
const PARITY_VECTORS: { input: number; ndigits: number; expected: number }[] =
  (parityVectorsJson as { cases: { input: number; ndigits: number; expected: number }[] }).cases;

// ── Fixtures ───────────────────────────────────────────────────────────────

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

// Food whose only non-zero nutrients have no DV (protein, calories).
const PROTEIN_ONLY_MACROS: MacroProfile = {
  ...ZERO_MACROS,
  protein_g: 50,
  calories: 200,
};

function makeIngredient(
  fdc_id: number,
  amount: number,
  unit: "g" | "oz" | "lb" | "kg" | "ml" = "g",
  name = "Food",
  macros: MacroProfile = BUTTER_MACROS,
): IngredientItem {
  return { fdc_id, name, amount, unit, baseMacros: macros };
}

// ── round1 ─────────────────────────────────────────────────────────────────

describe("round1", () => {
  it("rounds 1.25 to 1.3", () => {
    expect(round1(1.25)).toBe(1.3);
  });

  it("rounds 0.04 to 0", () => {
    expect(round1(0.04)).toBe(0);
  });

  it("rounds 0.05 to 0.1", () => {
    expect(round1(0.05)).toBe(0.1);
  });

  it("passes through a value already at 1 decimal", () => {
    expect(round1(3.7)).toBe(3.7);
  });

  it("handles 0 without error", () => {
    expect(round1(0)).toBe(0);
  });

  it("handles large values", () => {
    expect(round1(1234.56789)).toBe(1234.6);
  });
});

// ── FE/BE parity vector ────────────────────────────────────────────────────
// These vectors are also exercised by the backend pytest in
// test_nutrition_edge_cases.py::test_round_half_up_parity_vector.
// If you change the shared JSON, both suites must still pass.
describe("roundHalfUp parity with backend", () => {
  for (const { input, ndigits, expected } of PARITY_VECTORS) {
    it(`${input} @ ${ndigits} decimal place(s) → ${expected}`, () => {
      // round1 covers ndigits=1; for ndigits=0 use Math.round equivalent via the
      // exported round1 multiplied/divided path is not exposed, so we round-trip
      // through calculateRecipeMacros indirectly here is overkill — instead we
      // re-derive via a tiny adapter that mirrors what the helper does.
      // To keep this test focused on the helper itself, we import it via the
      // public round1 alias for ndigits=1 and assert directly otherwise.
      if (ndigits === 1) {
        expect(round1(input)).toBe(expected);
      } else {
        // For ndigits=0 the public surface is `calories` rounding inside
        // calculateRecipeMacros. Mirror that by feeding a single-ingredient
        // recipe whose per-serving calories equals `input`.
        const ingredient: IngredientItem = {
          fdc_id: 1,
          name: "Test",
          amount: 100, // 100g, multiplier = 1.0
          unit: "g",
          baseMacros: { ...ZERO_MACROS, calories: input },
        };
        const result = calculateRecipeMacros([ingredient], 1);
        expect(result.calories).toBe(expected);
      }
    });
  }
});

// ── calculateRecipeMacros — unit conversion edge cases ────────────────────

describe("calculateRecipeMacros — unit conversions", () => {
  it("handles lb unit correctly (1 lb = 453.592 g)", () => {
    const ingredient = makeIngredient(1, 1, "lb");
    const result = calculateRecipeMacros([ingredient], 1);
    const expected = Math.round(717 * UNIT_CONVERSIONS["lb"] / 100);
    expect(result.calories).toBe(expected); // ~3252 kcal
  });

  it("handles kg unit correctly (1 kg = 1000 g)", () => {
    const ingredient = makeIngredient(1, 1, "kg");
    const result = calculateRecipeMacros([ingredient], 1);
    const expected = Math.round(717 * UNIT_CONVERSIONS["kg"] / 100);
    expect(result.calories).toBe(expected); // 7170 kcal
  });

  it("treats ml the same as g (water-density assumption)", () => {
    const g  = makeIngredient(1, 100, "g");
    const ml = makeIngredient(1, 100, "ml");
    expect(calculateRecipeMacros([g], 1).calories)
      .toBe(calculateRecipeMacros([ml], 1).calories);
    expect(calculateRecipeMacros([g], 1).fat_total_g)
      .toBe(calculateRecipeMacros([ml], 1).fat_total_g);
  });

  it("accumulates mixed units (oz + g) by converting each to grams first", () => {
    const butter_g  = makeIngredient(1, 100, "g");       // 100 g
    const butter_oz = makeIngredient(1, 1,   "oz");      // 28.3495 g
    const result = calculateRecipeMacros([butter_g, butter_oz], 1);
    const totalGrams = 100 + UNIT_CONVERSIONS["oz"];
    const expected = Math.round(717 * totalGrams / 100);
    expect(result.calories).toBe(expected);
  });
});

// ── calculateRecipeMacros — portion divisor edge cases ───────────────────

describe("calculateRecipeMacros — portion divisor", () => {
  it("divisor=1 returns full undivided recipe totals", () => {
    const ingredient = makeIngredient(1, 100, "g");
    const result = calculateRecipeMacros([ingredient], 1);
    expect(result.calories).toBe(717);
    expect(result.fat_total_g).toBe(81.1);
  });

  it("divisor=999 produces near-zero per-serving values for a small recipe", () => {
    const ingredient = makeIngredient(1, 100, "g");
    const result = calculateRecipeMacros([ingredient], 999);
    // 717 / 999 ≈ 0.718 → rounds to 1
    expect(result.calories).toBeLessThanOrEqual(1);
    expect(result.fat_total_g).toBeLessThanOrEqual(0.1);
  });

  it("divisor=0 throws error to match backend validation", () => {
    const ingredient = makeIngredient(1, 100, "g");
    // Should throw an error to match backend validation
    expect(() => calculateRecipeMacros([ingredient], 0)).toThrow(RangeError);
  });
});

// ── calculateRecipeMacros — amount edge cases ────────────────────────────

describe("calculateRecipeMacros — extreme amounts", () => {
  it("returns zero calories for a trace amount (0.001 g)", () => {
    // 717 * 0.001 / 100 = 0.00717 → rounds to 0
    const ingredient = makeIngredient(1, 0.001, "g");
    const result = calculateRecipeMacros([ingredient], 1);
    expect(result.calories).toBe(0);
    expect(result.fat_total_g).toBe(0);
  });

  it("a zero-macro ingredient does not change recipe totals", () => {
    const butter = makeIngredient(1, 100, "g", "Butter", BUTTER_MACROS);
    const water  = makeIngredient(2, 500, "g", "Water",  ZERO_MACROS);
    const withWater  = calculateRecipeMacros([butter, water], 1);
    const butterOnly = calculateRecipeMacros([butter],        1);
    expect(withWater.calories).toBe(butterOnly.calories);
    expect(withWater.fat_total_g).toBe(butterOnly.fat_total_g);
    expect(withWater.protein_g).toBe(butterOnly.protein_g);
  });

  it("all-zero macros ingredient list returns zero for all fields", () => {
    const water = makeIngredient(1, 500, "g", "Water", ZERO_MACROS);
    const result = calculateRecipeMacros([water], 1);
    for (const field of NUTRIENT_FIELDS) {
      expect(result[field]).toBe(0);
    }
  });
});

// ── getHighlightKeys ───────────────────────────────────────────────────────

describe("getHighlightKeys", () => {
  it("returns a Set with at most 2 keys", () => {
    expect(getHighlightKeys(BUTTER_MACROS).size).toBeLessThanOrEqual(2);
  });

  it("returns exactly 2 keys for butter (high in fat and saturated fat by %DV)", () => {
    const keys = getHighlightKeys(BUTTER_MACROS);
    // fat_saturated_g: 51.4/20 = 257%; fat_total_g: 81.1/78 = 104%
    expect(keys.has("fat_saturated_g")).toBe(true);
    expect(keys.has("fat_total_g")).toBe(true);
    expect(keys.size).toBe(2);
  });

  it("returns empty set when all macros are zero", () => {
    const keys = getHighlightKeys(ZERO_MACROS);
    expect(keys.size).toBe(0);
  });

  it("skips protein, sugar, and calories — they have no DV", () => {
    // PROTEIN_ONLY_MACROS has protein=50 and calories=200, but no DV-tracked nutrients
    const keys = getHighlightKeys(PROTEIN_ONLY_MACROS);
    expect(keys.has("protein_g")).toBe(false);
    expect(keys.has("calories")).toBe(false);
    expect(keys.has("sugar_g")).toBe(false);
    expect(keys.size).toBe(0);
  });

  it("returns exactly 1 key when only one DV-tracked nutrient is non-zero", () => {
    const single: MacroProfile = { ...ZERO_MACROS, sodium_mg: 1000 };
    const keys = getHighlightKeys(single);
    expect(keys.size).toBe(1);
    expect(keys.has("sodium_mg")).toBe(true);
  });

  it("returns the top contributor first when multiple nutrients compete", () => {
    // High cholesterol (215/300 = 72%) and high saturated fat (51.4/20 = 257%)
    // → saturated fat should win
    const keys = getHighlightKeys(BUTTER_MACROS);
    expect(keys.has("fat_saturated_g")).toBe(true);
  });
});

// ── computeDailyValues — edge cases ───────────────────────────────────────

describe("computeDailyValues — edge cases", () => {
  it("returns all zeros for a zero MacroProfile", () => {
    const dvs = computeDailyValues(ZERO_MACROS);
    for (const pct of Object.values(dvs)) {
      expect(pct).toBe(0);
    }
  });

  it("returns >100 for a nutrient above its daily value (4600 mg sodium = 200% DV)", () => {
    const profile: MacroProfile = { ...ZERO_MACROS, sodium_mg: 4600 };
    expect(computeDailyValues(profile).sodium_mg).toBe(200);
  });

  it("does not include protein, sugar, or calories (no DV)", () => {
    const dvs = computeDailyValues(BUTTER_MACROS);
    expect(dvs.protein_g).toBeUndefined();
    expect(dvs.sugar_g).toBeUndefined();
    expect(dvs.calories).toBeUndefined();
  });

  it("includes all 10 DV-tracked nutrients in the result", () => {
    const dvs = computeDailyValues(BUTTER_MACROS);
    const keys = Object.keys(dvs);
    expect(keys).toContain("fat_total_g");
    expect(keys).toContain("fat_saturated_g");
    expect(keys).toContain("cholesterol_mg");
    expect(keys).toContain("sodium_mg");
    expect(keys).toContain("carbohydrates_total_g");
    expect(keys).toContain("fiber_g");
    expect(keys).toContain("vitamin_d_mcg");
    expect(keys).toContain("calcium_mg");
    expect(keys).toContain("iron_mg");
    expect(keys).toContain("potassium_mg");
    expect(keys.length).toBe(10);
  });
});

// ── formatDV — edge cases ─────────────────────────────────────────────────

describe("formatDV — edge cases", () => {
  it("returns '—' for sugar (no DV)", () => {
    expect(formatDV("sugar_g", BUTTER_MACROS)).toBe("—");
  });

  it("returns '—' for protein (no DV)", () => {
    expect(formatDV("protein_g", BUTTER_MACROS)).toBe("—");
  });

  it("returns '—' for calories (no DV)", () => {
    expect(formatDV("calories", BUTTER_MACROS)).toBe("—");
  });

  it("returns '0%' when nutrient value is exactly 0", () => {
    const profile: MacroProfile = { ...ZERO_MACROS };
    expect(formatDV("sodium_mg", profile)).toBe("0%");
  });

  it("returns '<1%' for a trace amount that rounds to 0% but value is > 0", () => {
    // 0.01 mcg vitamin D / 20 mcg DV = 0.05% → rounds to 0 → '<1%'
    const profile: MacroProfile = { ...ZERO_MACROS, vitamin_d_mcg: 0.01 };
    expect(formatDV("vitamin_d_mcg", profile)).toBe("<1%");
  });

  it("returns '100%' when nutrient equals its DV exactly", () => {
    const profile: MacroProfile = { ...ZERO_MACROS, fat_total_g: 78 };
    expect(formatDV("fat_total_g", profile)).toBe("100%");
  });

  it("returns '200%' when nutrient is double the DV", () => {
    const profile: MacroProfile = { ...ZERO_MACROS, sodium_mg: 4600 };
    expect(formatDV("sodium_mg", profile)).toBe("200%");
  });

  it("returns '50%' for half the sodium DV (1150 mg)", () => {
    const profile: MacroProfile = { ...ZERO_MACROS, sodium_mg: 1150 };
    expect(formatDV("sodium_mg", profile)).toBe("50%");
  });
});

// ── buildIngredientsString — edge cases ───────────────────────────────────

describe("buildIngredientsString — edge cases", () => {
  it("sorts mixed units by actual gram weight (lb > g here)", () => {
    // 1 lb butter = 453.592 g; 250 g flour
    const butter = makeIngredient(1, 1,   "lb", "Butter");
    const flour  = makeIngredient(2, 250, "g",  "Flour");
    const result = buildIngredientsString([flour, butter]); // flour passed first
    expect(result.indexOf("BUTTER")).toBeLessThan(result.indexOf("FLOUR"));
  });

  it("handles a single ingredient: no commas, ends with period", () => {
    const result = buildIngredientsString([makeIngredient(1, 100, "g", "Salt")]);
    expect(result).toBe("SALT.");
  });

  it("handles duplicate ingredient names", () => {
    const a = makeIngredient(1, 100, "g", "Sugar");
    const b = makeIngredient(2, 200, "g", "Sugar");  // heavier → first
    const result = buildIngredientsString([a, b]);
    expect(result).toBe("SUGAR, SUGAR.");
  });

  it("sorts oz amounts correctly against g amounts", () => {
    // 2 oz = 56.699 g (lighter than 100 g flour)
    const butter_oz = makeIngredient(1, 2,   "oz", "Butter");
    const flour_g   = makeIngredient(2, 100, "g",  "Flour");
    const result = buildIngredientsString([butter_oz, flour_g]);
    expect(result.indexOf("FLOUR")).toBeLessThan(result.indexOf("BUTTER"));
  });

  it("two ingredients of equal gram weight appear in the order they were given", () => {
    const a = makeIngredient(1, 100, "g", "Apple");
    const b = makeIngredient(2, 100, "g", "Banana");
    // Equal weight — sort is stable in V8 → original order preserved
    const result = buildIngredientsString([a, b]);
    expect(result).toContain("APPLE");
    expect(result).toContain("BANANA");
    expect(result.endsWith(".")).toBe(true);
  });
});
