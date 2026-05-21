// label/LabelPreview.tsx
//
// FDA 2020 Nutrition Facts panel rendered in the DOM.
// Accepts an optional `highlightSet` — nutrient keys whose rows are
// tinted with the blush accent when an ingredient is hovered.

import type { MacroProfile, IngredientItem, HighlightSet } from "../../types";
import { formatDV, buildIngredientsString } from "../../utils/nutrition";
import { MACRO_ROWS, MICRO_ROWS, type LabelRow } from "./labelSpec";

// The FDA label is a regulated print artifact — always black ink on white
// paper. Keep this local so theme changes never recolor the label borders.
const INK = "#0a0a0a";

interface LabelPreviewProps {
  macros: MacroProfile;
  portionDivisor: number;
  ingredients: IngredientItem[];
  widthPx: number;
  highlightSet?: HighlightSet;
}

function MacroRow({
  label, value, unit, bold = false, indent = 0, nutrient, macros, faded = false, highlight = false,
}: {
  label: string; value: number | string; unit: string;
  bold?: boolean; indent?: number;
  nutrient?: keyof MacroProfile; macros: MacroProfile;
  faded?: boolean; highlight?: boolean;
}) {
  const dv = nutrient ? formatDV(nutrient, macros) : null;
  return (
    <div
      style={{
        display: "flex",
        justifyContent: "space-between",
        alignItems: "baseline",
        fontSize: "0.625rem",
        borderBottom: `0.5px solid ${INK}`,
        padding: "1.5px 0",
        paddingLeft: indent * 12,
        color: faded ? "#888" : INK,
        background: highlight ? "var(--color-accent-blush)" : "transparent",
        transition: "background 0.22s ease",
      }}
    >
      <span>
        {bold ? <strong>{label}</strong> : label}{" "}{value}{unit}
      </span>
      {dv !== null ? (
        <strong style={{ fontSize: "0.625rem" }}>{dv}</strong>
      ) : (
        <span style={{ visibility: "hidden" }}>—</span>
      )}
    </div>
  );
}

export function LabelPreview({ macros, portionDivisor, ingredients, widthPx, highlightSet }: LabelPreviewProps) {
  const hl = highlightSet ?? new Set<keyof MacroProfile>();
  const ingredientsString = buildIngredientsString(ingredients);

  return (
    <div style={{ width: widthPx, fontFamily: "'Helvetica Neue', Helvetica, Arial, sans-serif" }}>
      <div style={{ border: `2px solid ${INK}`, padding: "4px 6px", background: "#fff", color: INK }}>

        <div style={{ fontSize: "1.6rem", fontWeight: 900, lineHeight: 1, marginBottom: 2 }}>
          Nutrition Facts
        </div>

        <div style={{ fontSize: "0.6rem", borderBottom: `6px solid ${INK}`, paddingBottom: 2, marginBottom: 2 }}>
          <div>{portionDivisor} servings per container</div>
          <div style={{ display: "flex", justifyContent: "space-between" }}>
            <strong>Serving size</strong>
            <strong>1 portion</strong>
          </div>
        </div>

        <div style={{ fontSize: "0.55rem", marginBottom: 0 }}>Amount per serving</div>
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          borderBottom: `3px solid ${INK}`, paddingBottom: 2, marginBottom: 2,
        }}>
          <span style={{ fontSize: "1rem", fontWeight: 900 }}>Calories</span>
          <span style={{ fontSize: "2rem", fontWeight: 900, lineHeight: 1 }}>{macros.calories}</span>
        </div>

        <div style={{ textAlign: "right", fontSize: "0.55rem", fontWeight: "bold", borderBottom: `0.5px solid ${INK}`, paddingBottom: 1, marginBottom: 1 }}>
          % Daily Value*
        </div>

        {MACRO_ROWS.map((row: LabelRow) => {
          const value = row.fixedValue ?? (row.nutrient ? macros[row.nutrient] : 0);
          return (
            <MacroRow
              key={row.label}
              label={row.label}
              value={value}
              unit={row.unit}
              bold={row.bold}
              indent={row.indent}
              nutrient={row.noDV ? undefined : row.nutrient}
              macros={macros}
              faded={row.faded}
              highlight={row.nutrient ? hl.has(row.nutrient) : false}
            />
          );
        })}

        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          fontSize: "0.625rem", borderBottom: `6px solid ${INK}`, padding: "1px 0",
          background: hl.has("protein_g") ? "var(--color-accent-blush)" : "transparent",
          transition: "background 0.22s ease",
        }}>
          <strong>Protein {macros.protein_g}g</strong>
          <span style={{ visibility: "hidden" }}>—</span>
        </div>

        {MICRO_ROWS.map((row, i) => {
          const key = row.nutrient as keyof MacroProfile;
          const value = macros[key];
          return (
            <div
              key={row.label}
              style={{
                display: "flex", justifyContent: "space-between",
                fontSize: "0.625rem",
                borderBottom: i < MICRO_ROWS.length - 1 ? `0.5px solid ${INK}` : "none",
                padding: "1.5px 0",
                background: hl.has(key) ? "var(--color-accent-blush)" : "transparent",
                transition: "background 0.22s ease",
              }}
            >
              <span>{row.label} {value}{row.unit}</span>
              <span>{formatDV(key, macros)}</span>
            </div>
          );
        })}

        <div style={{ fontSize: "0.45rem", marginTop: 3, lineHeight: 1.3 }}>
          * The % Daily Value (DV) tells you how much a nutrient in a serving contributes to a daily diet.
          2,000 calories a day is used for general nutrition advice.
        </div>
      </div>

      {ingredientsString && (
        <div style={{ fontSize: "0.5rem", marginTop: 4, lineHeight: 1.4, color: INK }}>
          <strong>INGREDIENTS:</strong> {ingredientsString}
        </div>
      )}
    </div>
  );
}
