// label/LabelPdfDoc.tsx
//
// FDA 2020 Nutrition Facts panel rendered as a vector PDF via @react-pdf/renderer.
// This is the canonical printable artifact — the DOM <LabelPreview> is a fast
// scaffold for editing; THIS component is what the user downloads.
//
// Conformance with 21 CFR 101.9(d):
//   • Type style: TeX Gyre Heros, a free Helvetica-metrics-compatible OTF
//     embedded into every PDF (satisfies (d)(1)(ii)(A) "single easy-to-read
//     type style"). Fonts are embedded — printers will not substitute.
//   • Black ink on white background (d)(1)(i).
//   • Bold required for: "Nutrition Facts" title, "Serving size", "Amount per
//     serving" caption, "% Daily Value*" header, non-indented nutrient names,
//     Calories numeral, %DV percentages — see (d)(1)(iv).
//   • Point sizes match or exceed (d)(1)(iii): Calories ≥16pt label / ≥22pt
//     numeral, body ≥6pt, "Amount per serving" ≥8pt.
//   • Leading ≥1pt body, ≥4pt between vitamin/mineral lines per (d)(1)(ii)(C).
//   • Hairline rules between rows per (d)(1)(v); thick bars at the boundaries
//     called out in (d)(4), (d)(6), (d)(8), (d)(9).

import { Document, Page, View, Text, Font, StyleSheet } from "@react-pdf/renderer";
import type { MacroProfile, IngredientItem } from "../../types";
import { formatDV, buildIngredientsString } from "../../utils/nutrition";
import { MACRO_ROWS, MICRO_ROWS, type LabelRow } from "./labelSpec";

// Register TeX Gyre Heros once at module load. The family name MUST NOT be
// "Helvetica" — react-pdf reserves that for the PDF "standard 14" built-in,
// which is NOT embedded in output (just referenced by name). Using the
// built-in is a hard fail for printers that reject non-embedded fonts and
// for any FDA review that audits typography. By registering under a unique
// family name, react-pdf treats this as a real font and embeds (subsets) it
// into every generated PDF.
//
// The files live under /public/fonts so Vite serves them directly without
// bundling — react-pdf fetches them lazily on first PDF render.
Font.register({
  family: "TeXGyreHeros",
  fonts: [
    { src: "/fonts/TeXGyreHeros-Regular.otf", fontWeight: "normal" },
    { src: "/fonts/TeXGyreHeros-Bold.otf",    fontWeight: "bold"   },
  ],
});

// Per 101.9, text should not break across lines in awkward ways — disable
// hyphenation so multi-word nutrient names ("Total Carbohydrate") never
// hyphenate mid-word in a tight label.
Font.registerHyphenationCallback((word) => [word]);

const INK = "#000";

const styles = StyleSheet.create({
  page: {
    paddingTop:    "0.25in",
    paddingBottom: "0.25in",
    paddingLeft:   "0.25in",
    paddingRight:  "0.25in",
    fontFamily:    "TeXGyreHeros",
    color:         INK,
    backgroundColor: "#fff",
  },
  labelName: {
    fontSize: 9,
    fontWeight: "bold",
    textAlign: "center",
    marginBottom: 4,
    letterSpacing: 0.5,
  },
  box: {
    borderWidth: 1.5,
    borderColor: INK,
    paddingHorizontal: 6,
    paddingVertical: 4,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    lineHeight: 1.0,
    marginBottom: 2,
  },
  servingsBlock: {
    fontSize: 8,
    paddingBottom: 2,
    marginBottom: 2,
    borderBottomWidth: 6,
    borderBottomColor: INK,
  },
  servingSizeRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 10,
    fontWeight: "bold",
    marginTop: 2,
  },
  amountLabel: {
    fontSize: 8,
    marginBottom: 0,
  },
  caloriesRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    // baseline aligns the typographic baselines of "Calories" (18pt) and the
    // numeral (32pt) the way the FDA artwork shows. flex-end (a previous
    // workaround) aligned line-box BOTTOMS instead, which pushed the giant
    // numeral's bottom edge against the 3pt rule below this row.
    alignItems: "baseline",
    borderBottomWidth: 3,
    borderBottomColor: INK,
    // 4pt of breathing room between the numeral baseline+descender and the
    // 3pt rule. The original WeasyPrint template got this for free from the
    // browser's default line-height (~1.2); react-pdf needs it explicit.
    paddingBottom: 4,
    marginBottom: 2,
  },
  caloriesLabel: {
    fontSize: 18,
    fontWeight: "bold",
  },
  caloriesValue: {
    fontSize: 32,
    fontWeight: "bold",
    // Intentionally no `lineHeight: 1.0` here — the previous tight setting
    // eliminated natural descender room and made the digits feel jammed
    // against the rule below the row. Default line-height gives breathing
    // room without affecting the row's overall height meaningfully.
  },
  dvHeader: {
    fontSize: 7,
    fontWeight: "bold",
    textAlign: "right",
    borderBottomWidth: 0.5,
    borderBottomColor: INK,
    paddingBottom: 1,
    marginBottom: 1,
  },
  row: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: INK,
    paddingVertical: 1.25,
  },
  rowFaded:    { color: "#666" },
  rowDV:       { fontSize: 8, fontWeight: "bold" },
  rowLabel:    { fontSize: 8 },
  rowLabelBold: { fontSize: 8, fontWeight: "bold" },
  proteinRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    borderBottomWidth: 6,
    borderBottomColor: INK,
    paddingVertical: 1.25,
  },
  microRow: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    borderBottomWidth: 0.5,
    borderBottomColor: INK,
    paddingVertical: 1.25,
  },
  microRowLast: {
    flexDirection: "row",
    justifyContent: "space-between",
    fontSize: 8,
    paddingVertical: 1.25,
  },
  footnote: {
    fontSize: 6,
    lineHeight: 1.3,
    marginTop: 3,
  },
  ingredientsBlock: {
    fontSize: 7,
    lineHeight: 1.4,
    marginTop: 6,
  },
  ingredientsLabel: {
    fontWeight: "bold",
  },
});

// Indent widths chosen to match (d)(7)'s nested nutrient layout — subnutrients
// roughly twice the indent of the row separator hairline.
const INDENT = { 0: 0, 1: 8, 2: 16 } as const;

function NutrientRow({ row, macros }: { row: LabelRow; macros: MacroProfile }) {
  const value = row.fixedValue ?? (row.nutrient ? (macros[row.nutrient] as number) : 0);
  const dv = !row.noDV && row.nutrient ? formatDV(row.nutrient, macros) : null;

  return (
    <View style={row.faded ? [styles.row, styles.rowFaded] : styles.row}>
      <Text style={[row.bold ? styles.rowLabelBold : styles.rowLabel, { paddingLeft: INDENT[row.indent] }]}>
        {row.bold ? <Text style={{ fontWeight: "bold" }}>{row.label}</Text> : row.label}
        {" "}
        {value}{row.unit}
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
}

export function LabelPdfDoc({
  macros, portionDivisor, ingredients, labelName, widthInches, heightInches,
}: LabelPdfDocProps) {
  // react-pdf measures Page size in points (72pt = 1 inch). Pre-rounded to
  // 2dp upstream — we just multiply.
  const pageSize: [number, number] = [widthInches * 72, heightInches * 72];
  const ingredientsString = buildIngredientsString(ingredients);

  return (
    <Document>
      {/* wrap={false}: keep the label on ONE page, even if content exceeds the
          requested height. Without this, react-pdf paginates and the user
          ends up with a label split across 2+ PDF pages — useless for a
          sticker workflow. The existing in-app preview shows a clipping
          warning when this is about to happen, so the user is informed. */}
      <Page size={pageSize} style={styles.page} wrap={false}>
        {labelName ? <Text style={styles.labelName}>{labelName}</Text> : null}

        <View style={styles.box}>
          <Text style={styles.title}>Nutrition Facts</Text>

          <View style={styles.servingsBlock}>
            <Text>{portionDivisor} servings per container</Text>
            <View style={styles.servingSizeRow}>
              <Text>Serving size</Text>
              <Text>1 portion</Text>
            </View>
          </View>

          <Text style={styles.amountLabel}>Amount per serving</Text>
          <View style={styles.caloriesRow}>
            <Text style={styles.caloriesLabel}>Calories</Text>
            <Text style={styles.caloriesValue}>{Math.round(macros.calories)}</Text>
          </View>

          <Text style={styles.dvHeader}>% Daily Value*</Text>

          {MACRO_ROWS.map((row) => <NutrientRow key={row.label} row={row} macros={macros} />)}

          {/* Protein gets the regulatory 6pt rule below it per (d)(8). */}
          <View style={styles.proteinRow}>
            <Text style={styles.rowLabelBold}>
              <Text style={{ fontWeight: "bold" }}>Protein</Text> {macros.protein_g}g
            </Text>
            <Text style={styles.rowDV}> </Text>
          </View>

          {MICRO_ROWS.map((row, i) => {
            const isLast = i === MICRO_ROWS.length - 1;
            return (
              <View key={row.label} style={isLast ? styles.microRowLast : styles.microRow}>
                <Text style={styles.rowLabel}>
                  {row.label} {row.nutrient ? macros[row.nutrient] : 0}{row.unit}
                </Text>
                <Text style={styles.rowLabel}>
                  {row.nutrient ? formatDV(row.nutrient, macros) : ""}
                </Text>
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
