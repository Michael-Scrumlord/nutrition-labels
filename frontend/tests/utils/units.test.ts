// tests/utils/units.test.ts
//
// Tests for utils/units.ts — UNIT_CONVERSIONS map and convertToGrams.
// These values MUST match backend/app/constants.py UNIT_CONVERSIONS.

import { describe, it, expect } from "vitest";
import { UNIT_CONVERSIONS, convertToGrams } from "../../src/utils/units";

// ── UNIT_CONVERSIONS — map shape and values ────────────────────────────────

describe("UNIT_CONVERSIONS", () => {
  it("contains exactly 5 unit keys", () => {
    expect(Object.keys(UNIT_CONVERSIONS).length).toBe(5);
  });

  it("has all 5 supported units", () => {
    expect(UNIT_CONVERSIONS).toHaveProperty("g");
    expect(UNIT_CONVERSIONS).toHaveProperty("ml");
    expect(UNIT_CONVERSIONS).toHaveProperty("oz");
    expect(UNIT_CONVERSIONS).toHaveProperty("lb");
    expect(UNIT_CONVERSIONS).toHaveProperty("kg");
  });

  it("g → 1.0 (identity: gram is the base unit)", () => {
    expect(UNIT_CONVERSIONS["g"]).toBe(1.0);
  });

  it("ml → 1.0 (water-density assumption — same as g)", () => {
    expect(UNIT_CONVERSIONS["ml"]).toBe(1.0);
  });

  it("oz → 28.3495 (matches backend constant to 4 decimal places)", () => {
    expect(UNIT_CONVERSIONS["oz"]).toBeCloseTo(28.3495, 4);
  });

  it("lb → 453.592 (matches backend constant to 3 decimal places)", () => {
    expect(UNIT_CONVERSIONS["lb"]).toBeCloseTo(453.592, 3);
  });

  it("kg → 1000.0", () => {
    expect(UNIT_CONVERSIONS["kg"]).toBe(1000.0);
  });

  it("g and ml have identical conversion factors (both water-density)", () => {
    expect(UNIT_CONVERSIONS["g"]).toBe(UNIT_CONVERSIONS["ml"]);
  });

  it("lb is approximately 453.6 × oz (16 oz in a pound, close enough)", () => {
    const ratio = UNIT_CONVERSIONS["lb"] / UNIT_CONVERSIONS["oz"];
    expect(ratio).toBeCloseTo(16, 1);
  });

  it("kg is exactly 1000 × g", () => {
    expect(UNIT_CONVERSIONS["kg"] / UNIT_CONVERSIONS["g"]).toBe(1000);
  });
});

// ── convertToGrams ────────────────────────────────────────────────────────

describe("convertToGrams", () => {
  it("100 g → 100 g", () => {
    expect(convertToGrams(100, "g")).toBe(100);
  });

  it("1 oz → 28.3495 g", () => {
    expect(convertToGrams(1, "oz")).toBeCloseTo(28.3495, 4);
  });

  it("1 lb → 453.592 g", () => {
    expect(convertToGrams(1, "lb")).toBeCloseTo(453.592, 3);
  });

  it("1 kg → 1000 g", () => {
    expect(convertToGrams(1, "kg")).toBe(1000);
  });

  it("500 ml → 500 g (water-density assumption)", () => {
    expect(convertToGrams(500, "ml")).toBe(500);
  });

  it("0 of any unit → 0 g", () => {
    expect(convertToGrams(0, "g")).toBe(0);
    expect(convertToGrams(0, "oz")).toBe(0);
    expect(convertToGrams(0, "lb")).toBe(0);
    expect(convertToGrams(0, "kg")).toBe(0);
    expect(convertToGrams(0, "ml")).toBe(0);
  });

  it("0.5 lb → ~226.796 g", () => {
    expect(convertToGrams(0.5, "lb")).toBeCloseTo(226.796, 2);
  });

  it("2 oz → ~56.699 g", () => {
    expect(convertToGrams(2, "oz")).toBeCloseTo(56.699, 2);
  });

  it("returns the same result as amount × UNIT_CONVERSIONS[unit]", () => {
    expect(convertToGrams(3, "oz")).toBe(3 * UNIT_CONVERSIONS["oz"]);
    expect(convertToGrams(2, "lb")).toBe(2 * UNIT_CONVERSIONS["lb"]);
    expect(convertToGrams(0.25, "kg")).toBe(0.25 * UNIT_CONVERSIONS["kg"]);
  });
});
