// label/LabelColumn.tsx
//
// Sticky right panel: FDA label preview, W/H controls, Generate PDF button,
// Save Recipe button, and Reset Recipe button.

import { useState, useCallback } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { GenerateButton } from "./GenerateButton";
import { ACCENT, INK } from "../../constants/theme";

export function LabelColumn() {
  const ingredients          = useRecipeStore((s) => s.ingredients);
  const portionDivisor       = useRecipeStore((s) => s.portionDivisor);
  const labelName            = useRecipeStore((s) => s.labelName);
  const dimensions           = useRecipeStore((s) => s.dimensions);
  const highlightedNutrients = useRecipeStore((s) => s.highlightedNutrients);
  const { clearRecipe }      = useRecipeActions();
  const saveRecipe           = useSavedRecipesStore((s) => s.saveRecipe);
  const macros               = useNutritionCalc();

  const [savedFeedback, setSavedFeedback] = useState(false);

  const baseWidthPx = 288;
  const targetPx    = Math.max(dimensions.widthInches * 96, 192);
  const scale       = targetPx / baseWidthPx;
  const estimatedH  = 560;
  const containerH  = dimensions.heightInches
    ? dimensions.heightInches * 96
    : estimatedH * scale;

  const handleSave = useCallback(() => {
    if (ingredients.length === 0) return;
    saveRecipe({ ingredients, portionDivisor, labelName, dimensions });
    setSavedFeedback(true);
    setTimeout(() => setSavedFeedback(false), 1500);
  }, [ingredients, portionDivisor, labelName, dimensions, saveRecipe]);

  const canSave = ingredients.length > 0;

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
            highlightSet={highlightedNutrients}
          />
        </div>
      </div>

      <LabelDimensions />

      <GenerateButton />

      {/* Save recipe */}
      <button
        onClick={handleSave}
        disabled={!canSave}
        style={{
          background: savedFeedback ? "var(--color-success)" : canSave ? ACCENT : "#e5e5e5",
          color: canSave ? "#fff" : "#bbb",
          border: "none",
          padding: "10px 14px",
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: 11,
          cursor: canSave ? "pointer" : "not-allowed",
          transition: "background 0.2s ease",
          animation: savedFeedback ? "popPulse 0.42s ease-out" : "none",
        }}
      >
        {savedFeedback ? "SAVED ✓" : "SAVE RECIPE"}
      </button>

      {/* Reset recipe */}
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
