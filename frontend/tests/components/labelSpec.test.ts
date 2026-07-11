// tests/components/labelSpec.test.ts
//
// Unit tests for label/labelSpec.ts — the single source of truth for the
// FDA 2020 Nutrition Facts panel, shared by LabelPreview (DOM) and
// LabelPdfDoc (@react-pdf/renderer). Focuses on rowDisplay(), the function
// both renderers call to resolve a row's exact label/amount/%DV strings.

import { describe, it, expect } from "vitest";
import {
  MACRO_ROWS,
  MICRO_ROWS,
  rowDisplay,
} from "../../src/components/label/labelSpec";
import {
  formatNutrientAmount,
  formatDV,
  formatDVFromAmount,
  formatTransFatAmount,
  formatAddedSugarsAmount,
  ADDED_SUGARS_DV,
  NUTRIENT_FIELDS,
} from "../../src/utils/nutrition";
import type { MacroProfile } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const MACROS: MacroProfile = {
  calories: 200, fat_total_g: 10, fat_saturated_g: 3, cholesterol_mg: 30,
  sodium_mg: 400, carbohydrates_total_g: 25, fiber_g: 3, sugar_g: 8,
  protein_g: 6, vitamin_d_mcg: 2, calcium_mg: 150, iron_mg: 2, potassium_mg: 300,
};

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

function findRow(rows: readonly { label: string }[], label: string) {
  const row = rows.find((r) => r.label === label);
  if (!row) throw new Error(`Row "${label}" not found`);
  return row;
}

// ── Plain macro rows ─────────────────────────────────────────────────────

describe("rowDisplay — plain macro row", () => {
  it("resolves Total Fat label/amount/dv from the macro profile", () => {
    const row = findRow(MACRO_ROWS, "Total Fat");
    const display = rowDisplay(row, MACROS, 0, 0);
    expect(display.label).toBe("Total Fat");
    expect(display.amount).toBe(formatNutrientAmount("fat_total_g", MACROS.fat_total_g));
    expect(display.dv).toBe(formatDV("fat_total_g", MACROS));
  });

  it("boldLabel matches the row's declared bold flag (bold row)", () => {
    const row = findRow(MACRO_ROWS, "Total Fat"); // bold: true
    const display = rowDisplay(row, MACROS, 0, 0);
    expect(display.boldLabel).toBe(row.bold);
    expect(display.boldLabel).toBe(true);
  });

  it("boldLabel matches the row's declared bold flag (non-bold row)", () => {
    const row = findRow(MACRO_ROWS, "Saturated Fat"); // bold: false
    const display = rowDisplay(row, MACROS, 0, 0);
    expect(display.boldLabel).toBe(row.bold);
    expect(display.boldLabel).toBe(false);
  });
});

describe("rowDisplay — noDV rows", () => {
  it("Total Sugars always returns dv: null regardless of macro values", () => {
    const row = findRow(MACRO_ROWS, "Total Sugars");
    expect(row.noDV).toBe(true);

    const nonZero = rowDisplay(row, MACROS, 0, 0);
    expect(nonZero.dv).toBeNull();

    const zero = rowDisplay(row, ZERO_MACROS, 0, 0);
    expect(zero.dv).toBeNull();
  });
});

// ── source: "transFat" ──────────────────────────────────────────────────

describe("rowDisplay — transFat row", () => {
  it("amount reflects the transFatG argument, not the macros profile", () => {
    const row = findRow(MACRO_ROWS, "Trans Fat");
    const display = rowDisplay(row, MACROS, 2.5, 0);
    expect(display.amount).toBe(formatTransFatAmount(2.5));
  });

  it("ignores macros entirely — changing macros does not change the amount", () => {
    const row = findRow(MACRO_ROWS, "Trans Fat");
    const withMacros = rowDisplay(row, MACROS, 2.5, 0);
    const withZeroMacros = rowDisplay(row, ZERO_MACROS, 2.5, 0);
    expect(withMacros.amount).toBe(withZeroMacros.amount);
  });

  it("dv is always null", () => {
    const row = findRow(MACRO_ROWS, "Trans Fat");
    expect(rowDisplay(row, MACROS, 2.5, 0).dv).toBeNull();
    expect(rowDisplay(row, MACROS, 0, 0).dv).toBeNull();
  });

  it("label is always literally 'Trans Fat'", () => {
    const row = findRow(MACRO_ROWS, "Trans Fat");
    expect(rowDisplay(row, MACROS, 0, 0).label).toBe("Trans Fat");
    expect(rowDisplay(row, MACROS, 9, 0).label).toBe("Trans Fat");
  });
});

// ── source: "addedSugars" ───────────────────────────────────────────────

describe("rowDisplay — addedSugars row", () => {
  const row = findRow(MACRO_ROWS, "Added Sugars");

  it("interpolates the formatted amount into the label when addedSugarsG=0", () => {
    const display = rowDisplay(row, MACROS, 0, 0);
    expect(display.label).toBe(`Includes ${formatAddedSugarsAmount(0)} Added Sugars`);
    expect(display.label).toBe("Includes 0g Added Sugars");
  });

  it("interpolates the formatted amount into the label for a non-zero case", () => {
    const display = rowDisplay(row, MACROS, 0, 12);
    expect(display.label).toBe(`Includes ${formatAddedSugarsAmount(12)} Added Sugars`);
  });

  it("amount is always the empty string", () => {
    expect(rowDisplay(row, MACROS, 0, 0).amount).toBe("");
    expect(rowDisplay(row, MACROS, 0, 12).amount).toBe("");
  });

  it("dv is computed from addedSugarsG against ADDED_SUGARS_DV via formatDVFromAmount", () => {
    const zero = rowDisplay(row, MACROS, 0, 0);
    expect(zero.dv).toBe(formatDVFromAmount(0, ADDED_SUGARS_DV));

    const nonZero = rowDisplay(row, MACROS, 0, 12);
    expect(nonZero.dv).toBe(formatDVFromAmount(12, ADDED_SUGARS_DV));
  });
});

// ── Zero-value edge case ─────────────────────────────────────────────────

describe("rowDisplay — zero-value macro profile", () => {
  it("wires an all-zero profile through to the correct '0mg'-style amount and dv", () => {
    const row = findRow(MACRO_ROWS, "Cholesterol");
    const display = rowDisplay(row, ZERO_MACROS, 0, 0);
    expect(display.amount).toBe(formatNutrientAmount("cholesterol_mg", 0));
    expect(display.amount).toBe("0mg");
    expect(display.dv).toBe(formatDV("cholesterol_mg", ZERO_MACROS));
  });
});

// ── MACRO_ROWS / MICRO_ROWS structural sanity ────────────────────────────

describe("MACRO_ROWS sanity", () => {
  it("every row has a non-empty label string", () => {
    for (const row of MACRO_ROWS) {
      expect(typeof row.label).toBe("string");
      expect(row.label.length).toBeGreaterThan(0);
    }
  });

  it("every row has either a nutrient key or a non-'macro' source", () => {
    for (const row of MACRO_ROWS) {
      const hasNutrient = row.nutrient !== undefined;
      const hasOverrideSource = row.source !== undefined && row.source !== "macro";
      expect(hasNutrient || hasOverrideSource).toBe(true);
    }
  });

  it("rows with an override source do not also declare a nutrient key", () => {
    for (const row of MACRO_ROWS) {
      if (row.source && row.source !== "macro") {
        expect(row.nutrient).toBeUndefined();
      }
    }
  });
});

describe("MICRO_ROWS sanity", () => {
  it("all 4 rows are indent: 0, bold: false, and have a valid MacroProfile nutrient key", () => {
    expect(MICRO_ROWS).toHaveLength(4);
    for (const row of MICRO_ROWS) {
      expect(row.indent).toBe(0);
      expect(row.bold).toBe(false);
      expect(row.nutrient).toBeDefined();
      expect(NUTRIENT_FIELDS).toContain(row.nutrient);
    }
  });
});
