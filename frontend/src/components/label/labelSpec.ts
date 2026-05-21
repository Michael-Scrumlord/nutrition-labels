// label/labelSpec.ts
//
// Single source of truth for the FDA 2020 Nutrition Facts panel layout.
// Both LabelPreview (DOM) and LabelPdfDoc (@react-pdf/renderer) iterate
// over this array, so the two renderers can't drift.

import type { MacroProfile } from "../../types";

export interface LabelRow {
  label:    string;
  /** Macro key — when present, the row pulls value/unit from MacroProfile and shows %DV. */
  nutrient?: keyof MacroProfile;
  /** Override the displayed value when the row is a fixed literal (Trans Fat, Added Sugars). */
  fixedValue?: number;
  unit:     string;
  /** Non-indented nutrient names must be bold per 21 CFR 101.9(d)(1)(iv). */
  bold:     boolean;
  /** Indent level: 0 = top-level, 1 = subnutrient, 2 = sub-sub (Added Sugars). */
  indent:   0 | 1 | 2;
  /** "Greyed-out" rows: not tracked in the DB; we render them but mute the color. */
  faded?:   boolean;
  /** Suppress the %DV column for this row (Total Sugars, Trans Fat, Added Sugars). */
  noDV?:    boolean;
}

// Top block: Total Fat through Added Sugars. Protein is a special-case below
// because it has the thick 6pt rule below it that separates macros from
// micronutrients — kept inline in the renderers to preserve the regulation
// boundary in (d)(8).
export const MACRO_ROWS: readonly LabelRow[] = [
  { label: "Total Fat",         nutrient: "fat_total_g",          unit: "g",  bold: true,  indent: 0 },
  { label: "Saturated Fat",     nutrient: "fat_saturated_g",      unit: "g",  bold: false, indent: 1 },
  { label: "Trans Fat",         fixedValue: 0,                    unit: "g",  bold: false, indent: 1, faded: true, noDV: true },
  { label: "Cholesterol",       nutrient: "cholesterol_mg",       unit: "mg", bold: true,  indent: 0 },
  { label: "Sodium",            nutrient: "sodium_mg",            unit: "mg", bold: true,  indent: 0 },
  { label: "Total Carbohydrate", nutrient: "carbohydrates_total_g", unit: "g", bold: true, indent: 0 },
  { label: "Dietary Fiber",     nutrient: "fiber_g",              unit: "g",  bold: false, indent: 1 },
  { label: "Total Sugars",      nutrient: "sugar_g",              unit: "g",  bold: false, indent: 1, noDV: true },
  { label: "Includes 0g Added Sugars", fixedValue: 0,             unit: "",   bold: false, indent: 2, faded: true, noDV: true },
] as const;

// Micronutrient block — printed below the protein 6pt rule.
// Per (d)(8) these get their own 4pt leading and a closing rule.
export const MICRO_ROWS: readonly LabelRow[] = [
  { label: "Vitamin D",  nutrient: "vitamin_d_mcg",  unit: "mcg", bold: false, indent: 0 },
  { label: "Calcium",    nutrient: "calcium_mg",     unit: "mg",  bold: false, indent: 0 },
  { label: "Iron",       nutrient: "iron_mg",        unit: "mg",  bold: false, indent: 0 },
  { label: "Potassium",  nutrient: "potassium_mg",   unit: "mg",  bold: false, indent: 0 },
] as const;
