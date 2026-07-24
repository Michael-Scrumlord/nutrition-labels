// label/LabelPreview.tsx
//
// FDA 2020 Nutrition Facts panel rendered in the DOM. This is the live editing
// scaffold; LabelPdfDoc renders the same spec to the downloadable PDF.
//
// Fidelity: the panel is laid out in POINTS-as-pixels (GEO values used directly
// as px) at a page width of widthInches*72, and uses the SAME embedded font
// (TeXGyreHeros) as the PDF. LabelColumn scales the whole thing uniformly for
// display, so the preview is a true scale of the PDF — same wrapping, same
// proportions. Values/%DV come from the shared rowDisplay() helper.

import type { MacroProfile, IngredientItem, HighlightSet } from "../../types";
import { buildIngredientsString, formatNutrientAmount } from "../../utils/nutrition";
import { MACRO_ROWS, MICRO_ROWS, GEO, INK, rowDisplay, resolveServing, type LabelRow } from "./labelSpec";

// Font family registered via @font-face in index.css, matching the PDF's
// embedded TeXGyreHeros so line breaks are identical.
const LABEL_FONT = "'TeXGyreHeros', Helvetica, Arial, sans-serif";

interface LabelPreviewProps {
  macros: MacroProfile;
  portionDivisor: number;
  ingredients: IngredientItem[];
  widthInches: number;
  servingHousehold: string;
  addedSugarsG: number;
  transFatG: number;
  highlightSet?: HighlightSet;
}

function NutrientRow({
  row, macros, transFatG, addedSugarsG, highlight, lastRow = false,
}: {
  row: LabelRow; macros: MacroProfile; transFatG: number; addedSugarsG: number;
  highlight: boolean; lastRow?: boolean;
}) {
  const { label, amount, boldLabel, dv } = rowDisplay(row, macros, transFatG, addedSugarsG);
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: GEO.row.fontSize,
        borderBottom: lastRow ? "none" : `${GEO.row.rule}px solid ${INK}`,
        padding: `${GEO.row.padV}px 0`,
        paddingLeft: GEO.indent[row.indent],
        background: highlight ? "var(--color-accent-blush)" : "transparent",
        transition: "background 0.22s ease",
      }}
    >
      <span>
        {boldLabel ? <strong>{label}</strong> : label}{amount ? ` ${amount}` : ""}
      </span>
      {dv !== null ? (
        <strong style={{ fontSize: GEO.row.fontSize }}>{dv}</strong>
      ) : (
        <span style={{ visibility: "hidden" }}>—</span>
      )}
    </div>
  );
}

export function LabelPreview({
  macros, portionDivisor, ingredients, widthInches,
  servingHousehold, addedSugarsG, transFatG, highlightSet,
}: LabelPreviewProps) {
  const hl = highlightSet ?? new Set<keyof MacroProfile>();
  const ingredientsString = buildIngredientsString(ingredients);

  // Per-serving net weight (g) for the FDA serving-size line.
  const serving = resolveServing(ingredients, portionDivisor, servingHousehold);

  return (
    <div style={{
      width: widthInches * 72,
      padding: GEO.pagePadding,
      background: "#fff",
      color: INK,
      fontFamily: LABEL_FONT,
    }}>
      <div style={{ border: `${GEO.box.border}px solid ${INK}`, padding: `${GEO.box.padV}px ${GEO.box.padH}px` }}>

        <div style={{ fontSize: GEO.title.fontSize, fontWeight: 900, lineHeight: 1, marginBottom: GEO.title.marginBottom }}>
          Nutrition Facts
        </div>

        <div style={{
          fontSize: GEO.servings.fontSize,
          borderBottom: `${GEO.servings.rule}px solid ${INK}`,
          paddingBottom: GEO.servings.padBottom,
          marginBottom: GEO.servings.marginBottom,
        }}>
          <div>{portionDivisor} servings per container</div>
          <div style={{
            display: "flex", justifyContent: "space-between",
            fontSize: GEO.servingSize.fontSize, fontWeight: "bold", marginTop: GEO.servingSize.marginTop,
          }}>
            <span>Serving size</span>
            <span>{serving.label} ({serving.grams}g)</span>
          </div>
        </div>

        <div style={{ fontSize: GEO.amountLabel.fontSize }}>Amount per serving</div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `${GEO.calories.rule}px solid ${INK}`,
          paddingBottom: GEO.calories.padBottom, marginBottom: GEO.calories.marginBottom,
        }}>
          <span style={{ fontSize: GEO.calories.label, fontWeight: 900 }}>Calories</span>
          <span style={{ fontSize: GEO.calories.value, fontWeight: 900 }}>{Math.round(macros.calories)}</span>
        </div>

        <div style={{
          textAlign: "right", fontSize: GEO.dvHeader.fontSize, fontWeight: "bold",
          borderBottom: `${GEO.dvHeader.rule}px solid ${INK}`,
          paddingBottom: GEO.dvHeader.padBottom, marginBottom: GEO.dvHeader.marginBottom,
        }}>
          % Daily Value*
        </div>

        {MACRO_ROWS.map((row) => (
          <NutrientRow
            key={row.label}
            row={row}
            macros={macros}
            transFatG={transFatG}
            addedSugarsG={addedSugarsG}
            highlight={row.nutrient ? hl.has(row.nutrient) : false}
          />
        ))}

        {/* Protein closes the macro block with the regulatory 6pt rule (d)(8). */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontSize: GEO.row.fontSize, borderBottom: `${GEO.proteinRule}px solid ${INK}`,
          padding: `${GEO.row.padV}px 0`,
          background: hl.has("protein_g") ? "var(--color-accent-blush)" : "transparent",
          transition: "background 0.22s ease",
        }}>
          <strong>Protein {formatNutrientAmount("protein_g", macros.protein_g)}</strong>
          <span style={{ visibility: "hidden" }}>—</span>
        </div>

        {MICRO_ROWS.map((row, i) => (
          <NutrientRow
            key={row.label}
            row={row}
            macros={macros}
            transFatG={transFatG}
            addedSugarsG={addedSugarsG}
            highlight={row.nutrient ? hl.has(row.nutrient) : false}
            lastRow={i === MICRO_ROWS.length - 1}
          />
        ))}

        <div style={{ fontSize: GEO.footnote.fontSize, marginTop: GEO.footnote.marginTop, lineHeight: GEO.footnote.lineHeight }}>
          * The % Daily Value (DV) tells you how much a nutrient in a serving of food contributes to a daily
          diet. 2,000 calories a day is used for general nutrition advice.
        </div>
      </div>

      {ingredientsString && (
        <div style={{ fontSize: GEO.ingredients.fontSize, marginTop: GEO.ingredients.marginTop, lineHeight: GEO.ingredients.lineHeight, color: INK }}>
          <strong>INGREDIENTS:</strong> {ingredientsString}
        </div>
      )}
    </div>
  );
}
