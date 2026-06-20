// tests/utils/nutrition-boundaries.test.ts
//
// Boundary-value tests for formatNutrientAmount (21 CFR 101.9(c) rounding)
// and getHighlightKeys. These focus on exact threshold crossings that are
// not tested in nutrition.test.ts, which covers the common interior cases.

import { describe, it, expect } from "vitest";
import {
  formatNutrientAmount,
  getHighlightKeys,
  FDA_DAILY_VALUES,
} from "../../src/utils/nutrition";
import type { MacroProfile } from "../../src/types";

// ── Shared zero baseline ───────────────────────────────────────────────────

const ZERO: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

// ── formatNutrientAmount — calories thresholds ─────────────────────────────

describe("formatNutrientAmount — calories boundaries", () => {
  it("4.9 cal (< 5) displays as '0'", () => {
    expect(formatNutrientAmount("calories", 4.9)).toBe("0");
  });

  it("exactly 5 cal (>= 5, <= 50) displays as '5' (round to nearest 5)", () => {
    expect(formatNutrientAmount("calories", 5)).toBe("5");
  });

  it("exactly 50 cal (<= 50) displays as '50' (round to nearest 5)", () => {
    expect(formatNutrientAmount("calories", 50)).toBe("50");
  });

  it("51 cal (> 50) rounds to nearest 10 → '50'", () => {
    expect(formatNutrientAmount("calories", 51)).toBe("50");
  });

  it("55 cal rounds to nearest 10 with ROUND_HALF_UP → '60'", () => {
    expect(formatNutrientAmount("calories", 55)).toBe("60");
  });

  it("100 cal rounds to nearest 10 → '100'", () => {
    expect(formatNutrientAmount("calories", 100)).toBe("100");
  });
});

// ── formatNutrientAmount — sodium thresholds ───────────────────────────────

describe("formatNutrientAmount — sodium boundaries", () => {
  it("4.9 mg (< 5) displays as '0mg'", () => {
    expect(formatNutrientAmount("sodium_mg", 4.9)).toBe("0mg");
  });

  it("exactly 5 mg (>= 5, <= 140) rounds to nearest 5 → '5mg'", () => {
    expect(formatNutrientAmount("sodium_mg", 5)).toBe("5mg");
  });

  it("exactly 140 mg (<= 140) rounds to nearest 5 → '140mg'", () => {
    expect(formatNutrientAmount("sodium_mg", 140)).toBe("140mg");
  });

  it("141 mg (> 140) switches to nearest-10 increment → '140mg'", () => {
    expect(formatNutrientAmount("sodium_mg", 141)).toBe("140mg");
  });

  it("145 mg rounds to nearest 10 with ROUND_HALF_UP → '150mg'", () => {
    expect(formatNutrientAmount("sodium_mg", 145)).toBe("150mg");
  });
});

// ── formatNutrientAmount — cholesterol thresholds ──────────────────────────

describe("formatNutrientAmount — cholesterol boundaries", () => {
  it("1.9 mg (< 2) displays as '0mg'", () => {
    expect(formatNutrientAmount("cholesterol_mg", 1.9)).toBe("0mg");
  });

  it("exactly 2 mg (boundary, 2-5 range) displays as 'less than 5mg'", () => {
    expect(formatNutrientAmount("cholesterol_mg", 2)).toBe("less than 5mg");
  });

  it("exactly 5 mg (boundary, still in 2-5 range) displays as 'less than 5mg'", () => {
    expect(formatNutrientAmount("cholesterol_mg", 5)).toBe("less than 5mg");
  });

  it("5.1 mg (> 5) rounds to nearest 5 → '5mg'", () => {
    expect(formatNutrientAmount("cholesterol_mg", 5.1)).toBe("5mg");
  });

  it("7.5 mg rounds to nearest 5 with ROUND_HALF_UP → '10mg'", () => {
    expect(formatNutrientAmount("cholesterol_mg", 7.5)).toBe("10mg");
  });
});

// ── formatNutrientAmount — fat thresholds ──────────────────────────────────

describe("formatNutrientAmount — fat boundaries", () => {
  it("0.49 g (< 0.5) displays as '0g'", () => {
    expect(formatNutrientAmount("fat_total_g", 0.49)).toBe("0g");
  });

  it("exactly 0.5 g rounds to nearest 0.5 → '0.5g'", () => {
    expect(formatNutrientAmount("fat_total_g", 0.5)).toBe("0.5g");
  });

  it("4.9 g (< 5) uses 0.5 increment → '5g'", () => {
    // roundToIncrement(4.9, 0.5) = roundHalfUp(9.8)*0.5 = 10*0.5 = 5
    expect(formatNutrientAmount("fat_total_g", 4.9)).toBe("5g");
  });

  it("exactly 5 g (>= 5) switches to 1 g increment → '5g'", () => {
    expect(formatNutrientAmount("fat_total_g", 5)).toBe("5g");
  });

  it("applies to saturated fat identically", () => {
    expect(formatNutrientAmount("fat_saturated_g", 0.49)).toBe("0g");
    expect(formatNutrientAmount("fat_saturated_g", 2.3)).toBe("2.5g");
  });
});

// ── formatNutrientAmount — carb/fiber/sugar/protein thresholds ─────────────

describe("formatNutrientAmount — carb-family boundaries", () => {
  it("0.49 g (< 0.5) displays as '0g'", () => {
    expect(formatNutrientAmount("carbohydrates_total_g", 0.49)).toBe("0g");
  });

  it("exactly 0.5 g (>= 0.5, < 1) displays as 'less than 1g'", () => {
    expect(formatNutrientAmount("carbohydrates_total_g", 0.5)).toBe("less than 1g");
  });

  it("0.99 g (< 1) displays as 'less than 1g'", () => {
    expect(formatNutrientAmount("fiber_g", 0.99)).toBe("less than 1g");
  });

  it("exactly 1 g rounds to 1g", () => {
    expect(formatNutrientAmount("sugar_g", 1)).toBe("1g");
  });

  it("protein 0.5 g (>= 0.5, < 1) displays as 'less than 1g'", () => {
    expect(formatNutrientAmount("protein_g", 0.5)).toBe("less than 1g");
  });
});

// ── formatNutrientAmount — micronutrient thresholds ────────────────────────

describe("formatNutrientAmount — micronutrient edge values", () => {
  it("vitamin_d 0 mcg → '0mcg'", () => {
    expect(formatNutrientAmount("vitamin_d_mcg", 0)).toBe("0mcg");
  });

  it("iron 0 mg → '0mg'", () => {
    expect(formatNutrientAmount("iron_mg", 0)).toBe("0mg");
  });

  it("calcium 0 mg → '0mg'", () => {
    expect(formatNutrientAmount("calcium_mg", 0)).toBe("0mg");
  });

  it("calcium 4 mg (< 5) rounds to nearest 10 → '0mg'", () => {
    // roundToIncrement(4, 10) = roundHalfUp(0.4)*10 = 0*10 = 0
    expect(formatNutrientAmount("calcium_mg", 4)).toBe("0mg");
  });

  it("calcium 5 mg (half of 10) rounds up with ROUND_HALF_UP → '10mg'", () => {
    // roundToIncrement(5, 10) = roundHalfUp(0.5)*10 = 1*10 = 10
    expect(formatNutrientAmount("calcium_mg", 5)).toBe("10mg");
  });

  it("potassium 5 mg rounds to nearest 10 with ROUND_HALF_UP → '10mg'", () => {
    expect(formatNutrientAmount("potassium_mg", 5)).toBe("10mg");
  });

  it("potassium 0 mg → '0mg'", () => {
    expect(formatNutrientAmount("potassium_mg", 0)).toBe("0mg");
  });
});

// ── getHighlightKeys ───────────────────────────────────────────────────────

describe("getHighlightKeys", () => {
  it("returns an empty set when all macros are zero", () => {
    expect(getHighlightKeys(ZERO).size).toBe(0);
  });

  it("returns a set with the one nutrient that has a positive %DV contribution", () => {
    const profile: MacroProfile = { ...ZERO, sodium_mg: 500 };
    const keys = getHighlightKeys(profile);
    expect(keys.size).toBe(1);
    expect(keys.has("sodium_mg")).toBe(true);
  });

  it("returns at most 2 keys even with many non-zero DV nutrients", () => {
    const profile: MacroProfile = {
      ...ZERO,
      fat_total_g: 78,       // 100% DV
      sodium_mg: 2300,       // 100% DV
      carbohydrates_total_g: 275, // 100% DV
      fiber_g: 28,           // 100% DV
    };
    expect(getHighlightKeys(profile).size).toBeLessThanOrEqual(2);
  });

  it("selects the two highest %DV contributors", () => {
    const profile: MacroProfile = {
      ...ZERO,
      fat_total_g: 78,    // 100% DV (78/78)
      sodium_mg: 2300,    // 100% DV (2300/2300)
      fiber_g: 14,        //  50% DV (14/28)
    };
    const keys = getHighlightKeys(profile);
    // fat_total and sodium are tied at 100%; fiber is lower — top-2 must NOT include fiber
    // (unless tie-breaking puts it there, but fiber is strictly lower)
    expect(keys.has("fiber_g")).toBe(false);
    expect(keys.size).toBe(2);
  });

  it("excludes nutrients that have no FDA daily value (calories, sugar, protein)", () => {
    const profile: MacroProfile = {
      ...ZERO,
      calories: 9999,   // no DV
      sugar_g: 9999,    // no DV
      protein_g: 9999,  // no DV
    };
    const keys = getHighlightKeys(profile);
    expect(keys.has("calories")).toBe(false);
    expect(keys.has("sugar_g")).toBe(false);
    expect(keys.has("protein_g")).toBe(false);
    expect(keys.size).toBe(0);
  });

  it("excludes a nutrient whose value is exactly 0 even if it has a DV", () => {
    const profile: MacroProfile = { ...ZERO, fat_total_g: 0 };
    expect(getHighlightKeys(profile).has("fat_total_g")).toBe(false);
  });

  it("correctly ranks a high-DV micronutrient ahead of a low-DV macro", () => {
    // 20 mcg vitamin D = 100% DV; 1 g fat = 1.3% DV
    const profile: MacroProfile = { ...ZERO, vitamin_d_mcg: 20, fat_total_g: 1 };
    const keys = getHighlightKeys(profile);
    expect(keys.has("vitamin_d_mcg")).toBe(true);
    // fat_total_g is also non-zero and has a DV, so both end up in the top-2
    expect(keys.size).toBe(2);
  });

  it("returns exactly 2 keys when there are exactly 2 non-zero DV nutrients", () => {
    const profile: MacroProfile = { ...ZERO, sodium_mg: 100, fiber_g: 10 };
    const keys = getHighlightKeys(profile);
    expect(keys.size).toBe(2);
    expect(keys.has("sodium_mg")).toBe(true);
    expect(keys.has("fiber_g")).toBe(true);
  });

  it("the returned object is a Set (has .has, .size, and is iterable)", () => {
    const keys = getHighlightKeys({ ...ZERO, sodium_mg: 100 });
    expect(keys).toBeInstanceOf(Set);
    expect(typeof keys.has).toBe("function");
    expect([...keys]).toBeInstanceOf(Array);
  });
});
