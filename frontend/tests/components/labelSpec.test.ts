// tests/components/labelSpec.test.ts
//
// Unit tests for label/labelSpec.ts's rowDisplay() — the shared function
// LabelPreview (DOM) and LabelPdfDoc (@react-pdf/renderer) both call so the
// live preview and the downloaded PDF can never disagree on a row's text.
// No test previously existed for this file even though it carries the
// value/rounding/%DV logic for every row on the label.

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
  if (!row) throw new Error(`no row named ${label}`);
  return row;
}

// ── macro rows (source: "macro", the default) ──────────────────────────────

describe("rowDisplay — macro rows", () => {
  it("pulls the amount and %DV from the macro profile", () => {
    const row = findRow("Total Fat");
    const display = rowDisplay(row, BUTTER_MACROS, 0, 0);
    expect(display.label).toBe("Total Fat");
    expect(display.amount).toBe("81g");
    expect(display.boldLabel).toBe(true);
    expect(display.dv).toBe("104%");
  });

  it("suppresses %DV for rows marked noDV (Total Sugars)", () => {
    const row = findRow("Total Sugars");
    const display = rowDisplay(row, BUTTER_MACROS, 0, 0);
    expect(display.dv).toBeNull();
  });

  it("zero-value macro rows render the FDA '0' amount, not blank", () => {
    const row = findRow("Sodium");
    const display = rowDisplay(row, ZERO_MACROS, 0, 0);
    expect(display.amount).toBe("0mg");
    expect(display.dv).toBe("0%");
  });

  it("is independent of the transFatG/addedSugarsG args for macro rows", () => {
    const row = findRow("Cholesterol");
    const withZero = rowDisplay(row, BUTTER_MACROS, 0, 0);
    const withOther = rowDisplay(row, BUTTER_MACROS, 999, 999);
    expect(withZero).toEqual(withOther);
  });
});

// ── Trans Fat row (source: "transFat", a user-supplied override) ──────────

describe("rowDisplay — Trans Fat override row", () => {
  it("zero grams renders '0g' and never a %DV (Trans Fat has no established DV)", () => {
    const row = findRow("Trans Fat");
    const display = rowDisplay(row, BUTTER_MACROS, 0, 0);
    expect(display.label).toBe("Trans Fat");
    expect(display.amount).toBe("0g");
    expect(display.dv).toBeNull();
  });

  it("reads its amount from transFatG, ignoring the macro profile", () => {
    const row = findRow("Trans Fat");
    const display = rowDisplay(row, ZERO_MACROS, 2, 0);
    expect(display.amount).toBe("2g");
  });

  it("sub-0.5g trans fat still rounds down to '0g' (FDA increment rule)", () => {
    const row = findRow("Trans Fat");
    const display = rowDisplay(row, ZERO_MACROS, 0.3, 0);
    expect(display.amount).toBe("0g");
  });
});

// ── Added Sugars row (source: "addedSugars", also a user override) ────────

describe("rowDisplay — Added Sugars override row", () => {
  it("zero grams embeds 'Includes 0g Added Sugars' in the label text and 0% DV", () => {
    const row = findRow("Added Sugars");
    const display = rowDisplay(row, BUTTER_MACROS, 0, 0);
    expect(display.label).toBe("Includes 0g Added Sugars");
    expect(display.amount).toBe(""); // amount is embedded in label, not separate
    expect(display.dv).toBe("0%");
  });

  it("computes %DV against the fixed 50g Added Sugars daily value, not any macro DV", () => {
    const row = findRow("Added Sugars");
    const display = rowDisplay(row, ZERO_MACROS, 0, 10); // 10g / 50g DV = 20%
    expect(display.label).toBe("Includes 10g Added Sugars");
    expect(display.dv).toBe("20%");
  });

  it("sub-1g added sugars renders 'less than 1g' inline", () => {
    const row = findRow("Added Sugars");
    const display = rowDisplay(row, ZERO_MACROS, 0, 0.6);
    expect(display.label).toBe("Includes less than 1g Added Sugars");
  });
});

// ── Micronutrient rows use the coarser %DV rounding increments ────────────

describe("rowDisplay — micronutrient rows", () => {
  it("Vitamin D at 0 renders '0mcg' with 0% DV", () => {
    const row = findRow("Vitamin D");
    const display = rowDisplay(row, ZERO_MACROS, 0, 0);
    expect(display.amount).toBe("0mcg");
    expect(display.dv).toBe("0%");
  });

  it("Potassium %DV uses the coarse micronutrient rounding, not plain integer rounding", () => {
    const row = findRow("Potassium");
    // 24mg / 4700mg = 0.51% → micronutrient rule rounds to nearest 2 below 10% → 0,
    // but amount > 0 so the display shows "<1%" per the FDA rule.
    const display = rowDisplay(row, BUTTER_MACROS, 0, 0);
    expect(display.dv).toBe("<1%");
  });
});
