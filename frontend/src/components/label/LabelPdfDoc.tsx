// label/LabelPdfDoc.tsx
//
// FDA 2020 Nutrition Facts panel rendered as a vector PDF via @react-pdf/renderer.
// This is the canonical printable artifact the user downloads; the DOM
// <LabelPreview> is a faithful live scaffold built from the SAME spec (GEO +
// rowDisplay in labelSpec.ts), so the two cannot drift.
//
// Conformance with 21 CFR 101.9(d):
//   • Type style: TeX Gyre Heros, a free Helvetica-metrics-compatible OTF
//     embedded into every PDF (satisfies (d)(1)(ii)(A)). Fonts are embedded —
//     printers will not substitute.
//   • Black ink on white (d)(1)(i). Bold for the title, "Serving size",
//     "Amount per serving", "% Daily Value*", non-indented nutrient names,
//     Calories numeral, %DV percentages (d)(1)(iv).
//   • Point sizes from GEO meet/exceed (d)(1)(iii). Hairline rules between rows
//     (d)(1)(v); thick bars at the (d)(4)/(d)(6)/(d)(8) boundaries.

import { Document, Page, View, Text, Font, StyleSheet } from "@react-pdf/renderer";
import type { MacroProfile, IngredientItem } from "../../types";
import { buildIngredientsString, formatNutrientAmount } from "../../utils/nutrition";
import { MACRO_ROWS, MICRO_ROWS, GEO, INK, rowDisplay, resolveServing, type LabelRow } from "./labelSpec";

// Register TeX Gyre Heros once at module load. The family name MUST NOT be
// "Helvetica" — react-pdf reserves that for the built-in "standard 14", which
// is NOT embedded. A unique family name makes react-pdf embed (subset) it.
Font.register({
  family: "TeXGyreHeros",
  fonts: [
    { src: "/fonts/TeXGyreHeros-Regular.otf", fontWeight: "normal" },
    { src: "/fonts/TeXGyreHeros-Bold.otf",    fontWeight: "bold"   },
  ],
});

// Disable hyphenation so multi-word nutrient names never break mid-word.
Font.registerHyphenationCallback((word) => [word]);

const styles = StyleSheet.create({
  page: {
    padding: GEO.pagePadding,
    fontFamily: "TeXGyreHeros",
    color: INK,
    backgroundColor: "#fff",
  },
  labelName: {
    fontSize: GEO.labelName.fontSize,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: GEO.labelName.marginBottom,
    letterSpacing: GEO.labelName.letterSpacing,
  },
  box: {
    borderWidth: GEO.box.border,
    borderColor: INK,
    paddingHorizontal: GEO.box.padH,
    paddingVertical: GEO.box.padV,
  },
  title: {
    fontSize: GEO.title.fontSize,
    fontWeight: "bold",
    lineHeight: 1.0,
    marginBottom: GEO.title.marginBottom,
  },
  servingsBlock: {
    fontSize: GEO.servings.fontSize,
    paddingBottom: GEO.servings.padBottom,
    marginBottom: GEO.servings.marginBottom,
    borderBottomWidth: GEO.servings.rule,
    borderBottomColor: INK,
  },
  servingSizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: GEO.servingSize.fontSize,
    fontWeight: "bold",
    marginTop: GEO.servingSize.marginTop,
  },
  amountLabel: { fontSize: GEO.amountLabel.fontSize },
  caloriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "baseline",
    borderBottomWidth: GEO.calories.rule,
    borderBottomColor: INK,
    paddingBottom: GEO.calories.padBottom,
    marginBottom: GEO.calories.marginBottom,
  },
  caloriesLabel: { fontSize: GEO.calories.label, fontWeight: "bold" },
  caloriesValue: { fontSize: GEO.calories.value, fontWeight: "bold" },
  dvHeader: {
    fontSize: GEO.dvHeader.fontSize,
    fontWeight: "bold",
    textAlign: "right",
    borderBottomWidth: GEO.dvHeader.rule,
    borderBottomColor: INK,
    paddingBottom: GEO.dvHeader.padBottom,
    marginBottom: GEO.dvHeader.marginBottom,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: GEO.row.fontSize,
    borderBottomWidth: GEO.row.rule,
    borderBottomColor: INK,
    paddingVertical: GEO.row.padV,
  },
  rowDV:        { fontSize: GEO.row.fontSize, fontWeight: "bold" },
  rowLabel:     { fontSize: GEO.row.fontSize },
  rowLabelBold: { fontSize: GEO.row.fontSize, fontWeight: "bold" },
  proteinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: GEO.row.fontSize,
    borderBottomWidth: GEO.proteinRule,
    borderBottomColor: INK,
    paddingVertical: GEO.row.padV,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: GEO.row.fontSize,
    borderBottomWidth: GEO.row.rule,
    borderBottomColor: INK,
    paddingVertical: GEO.row.padV,
  },
  microRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: GEO.row.fontSize,
    paddingVertical: GEO.row.padV,
  },
  footnote: {
    fontSize: GEO.footnote.fontSize,
    lineHeight: GEO.footnote.lineHeight,
    marginTop: GEO.footnote.marginTop,
  },
  ingredientsBlock: {
    fontSize: GEO.ingredients.fontSize,
    lineHeight: GEO.ingredients.lineHeight,
    marginTop: GEO.ingredients.marginTop,
  },
  ingredientsLabel: { fontWeight: "bold" },
});

function NutrientRow({
  row, macros, transFatG, addedSugarsG,
}: { row: LabelRow; macros: MacroProfile; transFatG: number; addedSugarsG: number }) {
  const { label, amount, boldLabel, dv } = rowDisplay(row, macros, transFatG, addedSugarsG);
  return (
    <View style={styles.row}>
      <Text style={[boldLabel ? styles.rowLabelBold : styles.rowLabel, { paddingLeft: GEO.indent[row.indent] }]}>
        {boldLabel ? <Text style={{ fontWeight: "bold" }}>{label}</Text> : label}
        {amount ? ` ${amount}` : ""}
      </Text>
      {dv !== null ? <Text style={styles.rowDV}>{dv}</Text> : <Text style={styles.rowDV}> </Text>}
    </View>
  );
}

interface LabelPdfDocProps {
  macros: MacroProfile;
  portionDivisor: number;
  ingredients: IngredientItem[];
  labelName: string;
  widthInches: number;
  heightInches: number;
  servingHousehold: string;
  addedSugarsG: number;
  transFatG: number;
}

export function LabelPdfDoc({
  macros, portionDivisor, ingredients, labelName, widthInches, heightInches,
  servingHousehold, addedSugarsG, transFatG,
}: LabelPdfDocProps) {
  // react-pdf measures Page size in points (72pt = 1 inch).
  const pageSize: [number, number] = [widthInches * 72, heightInches * 72];
  const ingredientsString = buildIngredientsString(ingredients);

  const serving = resolveServing(ingredients, portionDivisor, servingHousehold);

  return (
    <Document>
      {/* wrap={false}: keep the label on ONE page even if content exceeds the
          requested height — the in-app preview warns before that happens. */}
      <Page size={pageSize} style={styles.page} wrap={false}>
        {labelName ? <Text style={styles.labelName}>{labelName}</Text> : null}

        <View style={styles.box}>
          <Text style={styles.title}>Nutrition Facts</Text>

          <View style={styles.servingsBlock}>
            <Text>{portionDivisor} servings per container</Text>
            <View style={styles.servingSizeRow}>
              <Text>Serving size</Text>
              <Text>{serving.label} ({serving.grams}g)</Text>
            </View>
          </View>

          <Text style={styles.amountLabel}>Amount per serving</Text>
          <View style={styles.caloriesRow}>
            <Text style={styles.caloriesLabel}>Calories</Text>
            <Text style={styles.caloriesValue}>{Math.round(macros.calories)}</Text>
          </View>

          <Text style={styles.dvHeader}>% Daily Value*</Text>

          {MACRO_ROWS.map((row) => (
            <NutrientRow key={row.label} row={row} macros={macros} transFatG={transFatG} addedSugarsG={addedSugarsG} />
          ))}

          {/* Protein closes the macro block with the regulatory 6pt rule (d)(8). */}
          <View style={styles.proteinRow}>
            <Text style={styles.rowLabelBold}>
              <Text style={{ fontWeight: "bold" }}>Protein</Text> {formatNutrientAmount("protein_g", macros.protein_g)}
            </Text>
            <Text style={styles.rowDV}> </Text>
          </View>

          {MICRO_ROWS.map((row, i) => {
            const { label, amount, dv } = rowDisplay(row, macros, transFatG, addedSugarsG);
            const isLast = i === MICRO_ROWS.length - 1;
            return (
              <View key={row.label} style={isLast ? styles.microRowLast : styles.microRow}>
                <Text style={styles.rowLabel}>{label} {amount}</Text>
                <Text style={styles.rowLabel}>{dv}</Text>
              </View>
            );
          })}

          <Text style={styles.footnote}>
            * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes
            to a daily diet. 2,000 calories a day is used for general nutrition advice.
          </Text>
        </View>

        {ingredientsString ? (
          <Text style={styles.ingredientsBlock}>
            <Text style={styles.ingredientsLabel}>INGREDIENTS: </Text>
            {ingredientsString}
          </Text>
        ) : null}
      </Page>
    </Document>
  );
}
