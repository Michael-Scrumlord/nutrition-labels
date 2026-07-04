// tests/components/labelSpec.test.ts
//
// Unit tests for label/labelSpec.ts — specifically rowDisplay(), the single
// function both LabelPreview (DOM) and LabelPdfDoc (@react-pdf/renderer) call
// to resolve a row's exact left/right display strings. A bug here would
// silently desync the in-app preview from the downloaded PDF, so it is
// tested directly rather than only indirectly through component rendering.

import { describe, it, expect } from "vitest";
import { MACRO_ROWS, MICRO_ROWS, rowDisplay } from "../../src/components/label/labelSpec";
import type { MacroProfile } from "../../src/types";

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

const SAMPLE_MACROS: MacroProfile = {
  calories: 350, fat_total_g: 18.5, fat_saturated_g: 10.2,
  cholesterol_mg: 85, sodium_mg: 420, carbohydrates_total_g: 42.1,
  fiber_g: 2.3, sugar_g: 18.0, protein_g: 6.8,
  vitamin_d_mcg: 0.5, calcium_mg: 150, iron_mg: 2.1, potassium_mg: 220,
};

function findRow(label: string) {
  const row = [...MACRO_ROWS, ...MICRO_ROWS].find((r) => r.label === label);
  if (!row) throw new Error(`no row named ${label}`);
  return row;
}

describe("rowDisplay — plain macro rows", () => {
  it("resolves a bold top-level row (Total Fat) with its amount and %DV", () => {
    const result = rowDisplay(findRow("Total Fat"), SAMPLE_MACROS, 0, 0);
    expect(result.label).toBe("Total Fat");
    expect(result.amount).toBe("19g"); // 18.5 rounds to nearest 1g at >=5g
    expect(result.boldLabel).toBe(true);
    expect(result.dv).not.toBeNull();
  });

  it("resolves a non-bold indented row (Saturated Fat)", () => {
    const result = rowDisplay(findRow("Saturated Fat"), SAMPLE_MACROS, 0, 0);
    expect(result.boldLabel).toBe(false);
    expect(result.dv).not.toBeNull();
  });

  it("suppresses %DV for a noDV row (Total Sugars)", () => {
    const result = rowDisplay(findRow("Total Sugars"), SAMPLE_MACROS, 0, 0);
    expect(result.dv).toBeNull();
  });

  it("returns all-zero display for a zero MacroProfile", () => {
    const result = rowDisplay(findRow("Sodium"), ZERO_MACROS, 0, 0);
    expect(result.amount).toBe("0mg");
    expect(result.dv).toBe("0%");
  });

  it("resolves every micro row (Vitamin D, Calcium, Iron, Potassium) without throwing", () => {
    for (const row of MICRO_ROWS) {
      const result = rowDisplay(row, SAMPLE_MACROS, 0, 0);
      expect(result.label).toBe(row.label);
      expect(result.amount.length).toBeGreaterThan(0);
    }
  });
});

describe("rowDisplay — Trans Fat (source: transFat)", () => {
  it("always suppresses %DV regardless of value", () => {
    const result = rowDisplay(findRow("Trans Fat"), SAMPLE_MACROS, 5, 0);
    expect(result.dv).toBeNull();
  });

  it("formats a zero transFatG as '0g'", () => {
    const result = rowDisplay(findRow("Trans Fat"), SAMPLE_MACROS, 0, 0);
    expect(result.amount).toBe("0g");
  });

  it("formats a non-zero transFatG using the fat increment rules", () => {
    const result = rowDisplay(findRow("Trans Fat"), SAMPLE_MACROS, 1.3, 0);
    expect(result.amount).toBe("1.5g");
  });

  it("is driven entirely by the transFatG argument, not the macros object", () => {
    const withZeroMacros = rowDisplay(findRow("Trans Fat"), ZERO_MACROS, 2.2, 0);
    const withSampleMacros = rowDisplay(findRow("Trans Fat"), SAMPLE_MACROS, 2.2, 0);
    expect(withZeroMacros.amount).toBe(withSampleMacros.amount);
  });
});

describe("rowDisplay — Added Sugars (source: addedSugars)", () => {
  it("embeds the amount inside the label, leaving `amount` empty", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 10);
    expect(result.label).toBe("Includes 10g Added Sugars");
    expect(result.amount).toBe("");
  });

  it("computes %DV against the fixed 50g Added Sugars daily value", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 10);
    expect(result.dv).toBe("20%"); // 10/50 = 20%
  });

  it("shows '<1%' when addedSugarsG is a trace amount", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 0.05);
    expect(result.dv).toBe("<1%");
  });

  it("shows 'less than 1g' wording for a sub-gram amount", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 0.6);
    expect(result.label).toBe("Includes less than 1g Added Sugars");
  });

  it("shows '0g' and '0%' when addedSugarsG is exactly zero", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 0);
    expect(result.label).toBe("Includes 0g Added Sugars");
    expect(result.dv).toBe("0%");
  });

  it("boldLabel is always false for the Added Sugars row", () => {
    const result = rowDisplay(findRow("Added Sugars"), SAMPLE_MACROS, 0, 10);
    expect(result.boldLabel).toBe(false);
  });
});

describe("rowDisplay — row order matches FDA layout", () => {
  it("MACRO_ROWS lists Total Fat through Added Sugars in FDA order", () => {
    expect(MACRO_ROWS.map((r) => r.label)).toEqual([
      "Total Fat", "Saturated Fat", "Trans Fat", "Cholesterol", "Sodium",
      "Total Carbohydrate", "Dietary Fiber", "Total Sugars", "Added Sugars",
    ]);
  });

  it("MICRO_ROWS lists the four mandatory micronutrients in FDA order", () => {
    expect(MICRO_ROWS.map((r) => r.label)).toEqual([
      "Vitamin D", "Calcium", "Iron", "Potassium",
    ]);
  });
});
