// label/LabelColumn.tsx
//
// Pop sticky right panel: FDA label, W/H size controls, Generate PDF button.
// Receives `highlightSet` from AppShell (derived from the hovered ingredient row).

import { useRecipeStore } from "../../store/recipeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { GenerateButton } from "./GenerateButton";
import type { HighlightSet } from "../layout/AppShell";

interface LabelColumnProps {
  highlightSet: HighlightSet;
}

const ACCENT = "var(--color-accent)";
const INK    = "#0a0a0a";

export function LabelColumn({ highlightSet }: LabelColumnProps) {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const dimensions     = useRecipeStore((s) => s.dimensions);
  const clearRecipe    = useRecipeStore((s) => s.clearRecipe);
  const macros         = useNutritionCalc();

  const baseWidthPx  = 288;
  const targetPx     = Math.max(dimensions.widthInches * 96, 192);
  const scale        = targetPx / baseWidthPx;
  const estimatedH   = 560; // approximate label height before scale
  const containerH   = dimensions.heightInches
    ? dimensions.heightInches * 96
    : estimatedH * scale;

  return (
    <aside
      style={{
        gridArea: "label",
        borderLeft: `1px solid ${INK}`,
        background: "var(--color-accent-blush)",
        padding: "32px 28px",
        display: "flex",
        flexDirection: "column",
        gap: 18,
        position: "sticky",
        top: 0,
        alignSelf: "start",
        height: "100vh",
        overflow: "auto",
      }}
    >
      {/* Panel caption */}
      <div style={{
        display: "flex", justifyContent: "space-between", alignItems: "baseline",
        fontFamily: "'JetBrains Mono', monospace", fontSize: 10,
        letterSpacing: "0.22em", color: "#999",
      }}>
        <span>FIG. A — LABEL · LIVE</span>
        <span style={{ color: ACCENT }}>● REC</span>
      </div>

      {/* Printable label */}
      <div className="pop-printable" style={{ overflow: "hidden", width: targetPx, height: containerH }}>
        <div style={{ width: baseWidthPx, transform: `scale(${scale})`, transformOrigin: "top left" }}>
          <LabelPreview
            macros={macros}
            portionDivisor={portionDivisor}
            ingredients={ingredients}
            widthPx={baseWidthPx}
            highlightSet={highlightSet}
          />
        </div>
      </div>

      <LabelDimensions />

      <GenerateButton />

      <button
        onClick={() => {
          if (confirm("Reset recipe?")) clearRecipe();
        }}
        style={{
          background: "transparent",
          border: `1px solid ${INK}`,
          padding: "10px 14px",
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 600,
          letterSpacing: "0.08em",
          fontSize: 11,
          cursor: "pointer",
          color: INK,
        }}
        onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
      >
        RESET RECIPE
      </button>
    </aside>
  );
}
