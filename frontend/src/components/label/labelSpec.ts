// label/labelSpec.ts
//
// Single source of truth for the FDA 2020 Nutrition Facts panel.
// Both LabelPreview (DOM) and LabelPdfDoc (@react-pdf/renderer) consume:
//   • GEO        — all dimensions in POINTS (the PDF's native unit). The PDF
//                  uses them as pt; the preview renders them as px 1:1 at the
//                  page's authoring width (also in points-as-pixels), so the
//                  two layouts are uniform scales of each other — same font,
//                  same wrapping, same proportions.
//   • MACRO_ROWS / MICRO_ROWS — the row order + metadata.
//   • rowDisplay() — the exact left/right strings for a row, so the renderers
//                    can never disagree on a value, a %DV, or rounding.

import type { MacroProfile, IngredientItem } from "../../types";
import {
  formatNutrientAmount,
  formatTransFatAmount,
  formatAddedSugarsAmount,
  formatDV,
  formatDVFromAmount,
  ADDED_SUGARS_DV,
} from "../../utils/nutrition";
import { ingredientGrams } from "../../utils/units";

// Regulated print artifact: always black ink on white paper.
export const INK = "#000";

// ── Geometry (points). Mirrors 21 CFR 101.9(d) type-size minimums. ──────────
export const GEO = {
  pagePadding: 18,          // 0.25in page margin around the whole label
  labelName:   { fontSize: 9, marginBottom: 4, letterSpacing: 0.5 },
  box:         { border: 1.5, padH: 6, padV: 4 },
  title:       { fontSize: 28, marginBottom: 2 },
  servings:    { fontSize: 8, padBottom: 2, marginBottom: 2, rule: 6 },
  servingSize: { fontSize: 10, marginTop: 2 },
  amountLabel: { fontSize: 8 },
  calories:    { rule: 3, padBottom: 4, marginBottom: 2, label: 18, value: 32 },
  dvHeader:    { fontSize: 7, rule: 0.5, padBottom: 1, marginBottom: 1 },
  row:         { fontSize: 8, rule: 0.5, padV: 1.25 },
  proteinRule: 6,
  footnote:    { fontSize: 6, lineHeight: 1.3, marginTop: 3 },
  ingredients: { fontSize: 7, lineHeight: 1.4, marginTop: 6 },
  indent:      { 0: 0, 1: 8, 2: 16 } as const,
} as const;

// Rows whose value/%DV come from a user-supplied override (not the USDA DB).
type RowSource = "macro" | "transFat" | "addedSugars";

export interface LabelRow {
  label:     string;
  /** Macro key — present for "macro" rows; pulls value/%DV from MacroProfile. */
  nutrient?: keyof MacroProfile;
  /** Where the value comes from. Defaults to "macro". */
  source?:   RowSource;
  /** Non-indented nutrient names are bold per 21 CFR 101.9(d)(1)(iv). */
  bold:      boolean;
  /** Indent: 0 = top-level, 1 = subnutrient, 2 = sub-sub (Added Sugars). */
  indent:    0 | 1 | 2;
  /** Suppress the %DV column (Total Sugars, Trans Fat). */
  noDV?:     boolean;
}

// Total Fat through Added Sugars. Protein is special-cased in the renderers
// because it carries the thick 6pt rule that closes the macro block (d)(8).
export const MACRO_ROWS: readonly LabelRow[] = [
  { label: "Total Fat",          nutrient: "fat_total_g",           bold: true,  indent: 0 },
  { label: "Saturated Fat",      nutrient: "fat_saturated_g",       bold: false, indent: 1 },
  { label: "Trans Fat",          source: "transFat",                bold: false, indent: 1, noDV: true },
  { label: "Cholesterol",        nutrient: "cholesterol_mg",        bold: true,  indent: 0 },
  { label: "Sodium",             nutrient: "sodium_mg",             bold: true,  indent: 0 },
  { label: "Total Carbohydrate", nutrient: "carbohydrates_total_g", bold: true,  indent: 0 },
  { label: "Dietary Fiber",      nutrient: "fiber_g",               bold: false, indent: 1 },
  { label: "Total Sugars",       nutrient: "sugar_g",               bold: false, indent: 1, noDV: true },
  { label: "Added Sugars",       source: "addedSugars",             bold: false, indent: 2 },
] as const;

// Micronutrient block — printed below the protein 6pt rule.
export const MICRO_ROWS: readonly LabelRow[] = [
  { label: "Vitamin D",  nutrient: "vitamin_d_mcg",  bold: false, indent: 0 },
  { label: "Calcium",    nutrient: "calcium_mg",     bold: false, indent: 0 },
  { label: "Iron",       nutrient: "iron_mg",        bold: false, indent: 0 },
  { label: "Potassium",  nutrient: "potassium_mg",   bold: false, indent: 0 },
] as const;

export interface ServingDisplay {
  /** Household serving description, or "1 portion" when none is set. */
  label: string;
  /** Per-serving net weight in whole grams, for the "(Xg)" suffix. */
  grams: number;
}

/**
 * Resolve the FDA serving-size line: total recipe weight divided across
 * servings, paired with the user's household-measure label (or the "1
 * portion" fallback). Shared by both renderers so they can't disagree on
 * rounding.
 */
export function resolveServing(
  ingredients: IngredientItem[],
  portionDivisor: number,
  servingHousehold: string,
): ServingDisplay {
  const totalGrams = ingredients.reduce((sum, ing) => sum + ingredientGrams(ing), 0);
  return {
    label: servingHousehold.trim() || "1 portion",
    grams: Math.round(totalGrams / portionDivisor),
  };
}

export interface RowDisplay {
  /** Bold portion of the left text (nutrient name). */
  label:  string;
  /** Non-bold trailing amount, e.g. "8g". Empty for the Added Sugars row,
   *  which embeds its amount inside `label`. */
  amount: string;
  /** Whether `label` should be bold. */
  boldLabel: boolean;
  /** Right-hand %DV string, or null when this row has no %DV. */
  dv:     string | null;
}

/**
 * Resolve a row to its exact display strings. Shared by both renderers so a
 * value, its rounding, and its %DV are computed in exactly one place.
 */
export function rowDisplay(
  row: LabelRow,
  macros: MacroProfile,
  transFatG: number,
  addedSugarsG: number,
): RowDisplay {
  switch (row.source ?? "macro") {
    case "transFat":
      return { label: "Trans Fat", amount: formatTransFatAmount(transFatG), boldLabel: false, dv: null };

    case "addedSugars":
      // FDA layout: "Includes <amt> Added Sugars" on the left, %DV on the right.
      return {
        label: `Includes ${formatAddedSugarsAmount(addedSugarsG)} Added Sugars`,
        amount: "",
        boldLabel: false,
        dv: formatDVFromAmount(addedSugarsG, ADDED_SUGARS_DV),
      };

    default: {
      const key = row.nutrient!;
      return {
        label: row.label,
        amount: formatNutrientAmount(key, macros[key]),
        boldLabel: row.bold,
        dv: row.noDV ? null : formatDV(key, macros),
      };
    }
  }
}
