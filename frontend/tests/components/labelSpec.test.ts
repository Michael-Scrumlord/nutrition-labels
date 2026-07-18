// tests/components/labelSpec.test.ts
//
// Unit tests for label/labelSpec.ts — the shared row-resolution spec consumed
// by both LabelPreview (DOM) and LabelPdfDoc (@react-pdf/renderer). Until now
// this file (MACRO_ROWS/MICRO_ROWS/rowDisplay) had zero test coverage even
// though it's the single source of truth for every value, rounding, and %DV
// shown on the label.

import { describe, it, expect } from "vitest";
import { MACRO_ROWS, MICRO_ROWS, rowDisplay } from "../../src/components/label/labelSpec";
import type { MacroProfile } from "../../src/types";

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

function findRow(label: string) {
  const row = [...MACRO_ROWS, ...MICRO_ROWS].find((r) => r.label === label);
  if (!row) throw new Error(`no row found for label "${label}"`);
  return row;
}

// ── Row table shape ─────────────────────────────────────────────────────────

describe("MACRO_ROWS", () => {
  it("lists exactly the 9 FDA macro rows in label order", () => {
    expect(MACRO_ROWS.map((r) => r.label)).toEqual([
      "Total Fat", "Saturated Fat", "Trans Fat", "Cholesterol", "Sodium",
      "Total Carbohydrate", "Dietary Fiber", "Total Sugars", "Added Sugars",
    ]);
  });

  it("bolds only the non-indented top-level nutrient names (21 CFR 101.9(d)(1)(iv))", () => {
    const bolded = MACRO_ROWS.filter((r) => r.bold).map((r) => r.label);
    expect(bolded).toEqual(["Total Fat", "Cholesterol", "Sodium", "Total Carbohydrate"]);
  });

  it("suppresses %DV on Total Sugars and Trans Fat", () => {
    expect(findRow("Total Sugars").noDV).toBe(true);
    expect(findRow("Trans Fat").noDV).toBe(true);
  });

  it("indents subnutrients: Saturated Fat/Dietary Fiber/Total Sugars/Trans Fat at 1, Added Sugars at 2", () => {
    expect(findRow("Saturated Fat").indent).toBe(1);
    expect(findRow("Dietary Fiber").indent).toBe(1);
    expect(findRow("Total Sugars").indent).toBe(1);
    expect(findRow("Trans Fat").indent).toBe(1);
    expect(findRow("Added Sugars").indent).toBe(2);
  });
});

describe("MICRO_ROWS", () => {
  it("lists exactly the 4 FDA micronutrients, all non-bold and non-indented", () => {
    expect(MICRO_ROWS.map((r) => r.label)).toEqual(["Vitamin D", "Calcium", "Iron", "Potassium"]);
    for (const row of MICRO_ROWS) {
      expect(row.bold).toBe(false);
      expect(row.indent).toBe(0);
      expect(row.noDV).toBeUndefined();
    }
  });
});

// ── rowDisplay: default ("macro") rows ───────────────────────────────────────

describe("rowDisplay — macro rows", () => {
  it("resolves a bold top-level row (Total Fat) with its %DV", () => {
    const display = rowDisplay(findRow("Total Fat"), BUTTER_MACROS, 0, 0);
    expect(display.label).toBe("Total Fat");
    expect(display.amount).toBe("81g");
    expect(display.boldLabel).toBe(true);
    expect(display.dv).toBe("104%"); // 81.1 / 78 * 100, rounded
  });

  it("resolves a non-bold subnutrient row (Saturated Fat)", () => {
    const display = rowDisplay(findRow("Saturated Fat"), BUTTER_MACROS, 0, 0);
    expect(display.boldLabel).toBe(false);
    expect(display.amount).toBe("51g");
  });

  it("suppresses %DV for Total Sugars even though the row has a nutrient key", () => {
    const display = rowDisplay(findRow("Total Sugars"), BUTTER_MACROS, 0, 0);
    expect(display.amount).toBe("0g"); // 0.1g rounds below the 0.5g floor
    expect(display.dv).toBeNull();
  });

  it("returns '—' via formatDV for micronutrients/macros with zero value", () => {
    const display = rowDisplay(findRow("Vitamin D"), ZERO_MACROS, 0, 0);
    expect(display.amount).toBe("0mcg");
    expect(display.dv).toBe("0%");
  });

  it("all rows resolve without throwing for an all-zero MacroProfile (empty recipe)", () => {
    for (const row of [...MACRO_ROWS, ...MICRO_ROWS]) {
      expect(() => rowDisplay(row, ZERO_MACROS, 0, 0)).not.toThrow();
    }
  });
});

// ── rowDisplay: transFat source ──────────────────────────────────────────────

describe("rowDisplay — transFat source", () => {
  it("zero trans fat renders '0g' with no %DV", () => {
    const display = rowDisplay(findRow("Trans Fat"), ZERO_MACROS, 0, 0);
    expect(display.label).toBe("Trans Fat");
    expect(display.amount).toBe("0g");
    expect(display.boldLabel).toBe(false);
    expect(display.dv).toBeNull();
  });

  it("ignores the macros argument entirely — only transFatG drives the amount", () => {
    const display = rowDisplay(findRow("Trans Fat"), BUTTER_MACROS, 2.3, 0);
    expect(display.amount).toBe("2.5g"); // formatTransFatAmount increments at 0.5g below 5g
  });
});

// ── rowDisplay: addedSugars source ───────────────────────────────────────────

describe("rowDisplay — addedSugars source", () => {
  it("zero added sugars renders the 'Includes 0g Added Sugars' line with 0% DV", () => {
    const display = rowDisplay(findRow("Added Sugars"), ZERO_MACROS, 0, 0);
    expect(display.label).toBe("Includes 0g Added Sugars");
    expect(display.amount).toBe(""); // amount is embedded in the label for this row
    expect(display.boldLabel).toBe(false);
    expect(display.dv).toBe("0%");
  });

  it("a trace amount below both display floors: the gram amount rounds to '0g' but %DV still shows '<1%'", () => {
    // 0.2g rounds to "0g" (< 0.5g floor), but 0.2/50*100 = 0.4% rounds to 0
    // while the raw amount is > 0, so the FDA "<1%" rule still applies to
    // the %DV column even though the amount column reads "0g".
    const display = rowDisplay(findRow("Added Sugars"), ZERO_MACROS, 0, 0.2);
    expect(display.label).toBe("Includes 0g Added Sugars");
    expect(display.dv).toBe("<1%");
  });

  it("an amount between 0.5g and 1g displays 'less than 1g' with its own %DV", () => {
    const display = rowDisplay(findRow("Added Sugars"), ZERO_MACROS, 0, 0.6);
    expect(display.label).toBe("Includes less than 1g Added Sugars");
    expect(display.dv).toBe("1%");
  });

  it("computes %DV against the fixed 50g Added Sugars daily value, independent of MacroProfile", () => {
    const display = rowDisplay(findRow("Added Sugars"), ZERO_MACROS, 0, 25);
    expect(display.label).toBe("Includes 25g Added Sugars");
    expect(display.dv).toBe("50%");
  });
});
