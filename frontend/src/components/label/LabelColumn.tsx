// label/LabelColumn.tsx
//
// Sticky right panel: FDA label preview, W/H controls, Generate PDF button,
// smart save controls (Save / Save As New), and Reset Recipe button.

import { useState, useCallback, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useSavedRecipesStore, type RecipeSnapshot } from "../../store/savedRecipesStore";
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
  const instructions         = useRecipeStore((s) => s.instructions);
  const variables            = useRecipeStore((s) => s.variables);
  const currentRecipeId      = useRecipeStore((s) => s.currentRecipeId);
  const viewingVersionId     = useRecipeStore((s) => s.viewingVersionId);
  const setCurrentRecipeId   = useRecipeStore.setState;   // for promoting a new save to the loaded recipe

  const { clearRecipe }      = useRecipeActions();
  const createRecipe         = useSavedRecipesStore((s) => s.createRecipe);
  const appendVersion        = useSavedRecipesStore((s) => s.appendVersion);
  const savedRecipe          = useSavedRecipesStore((s) =>
    currentRecipeId ? s.recipes.find((r) => r.id === currentRecipeId) : undefined,
  );
  const macros               = useNutritionCalc();

  const [feedback, setFeedback] = useState<string | null>(null);
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote]         = useState("");

  const baseWidthPx = 288;
  const targetPx    = Math.max(dimensions.widthInches * 96, 192);
  const scale       = targetPx / baseWidthPx;
  const estimatedH  = 560;
  const containerH  = dimensions.heightInches
    ? dimensions.heightInches * 96
    : estimatedH * scale;

  const canSave = ingredients.length > 0;
  const isLoaded = !!currentRecipeId && !!savedRecipe;
  const versionCount = savedRecipe?.versions.length ?? 0;
  const lastSavedAt = savedRecipe && savedRecipe.versions.length > 0
    ? savedRecipe.versions[savedRecipe.versions.length - 1].savedAt
    : undefined;

  const lastSavedRel = useMemo(() => {
    if (!lastSavedAt) return null;
    const diff = Date.now() - lastSavedAt;
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(lastSavedAt));
  }, [lastSavedAt]);

  const snapshot: RecipeSnapshot = {
    ingredients, portionDivisor, labelName, dimensions, instructions, variables,
  };

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  }

  const handleSaveVersion = useCallback(() => {
    if (!canSave) return;
    if (isLoaded) {
      appendVersion(currentRecipeId!, snapshot, note.trim() || undefined);
      setNote("");
      setNoteOpen(false);
      flash("SAVED ✓");
    } else {
      const newId = createRecipe(snapshot, note.trim() || undefined);
      setCurrentRecipeId({ currentRecipeId: newId, viewingVersionId: null });
      setNote("");
      setNoteOpen(false);
      flash("SAVED ✓");
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, isLoaded, currentRecipeId, snapshot, note, createRecipe, appendVersion]);

  const handleSaveAsNew = useCallback(() => {
    if (!canSave) return;
    const newId = createRecipe(snapshot);
    setCurrentRecipeId({ currentRecipeId: newId, viewingVersionId: null });
    flash("SAVED AS NEW ✓");
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canSave, snapshot, createRecipe]);

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

      {/* ── Save section ──────────────────────────────────────────────── */}
      <div style={{
        display: "flex", flexDirection: "column", gap: 8,
        padding: "12px 0 0",
        borderTop: "1px solid var(--color-border-subtle)",
      }}>
        {isLoaded && (
          <div style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 9, letterSpacing: "0.16em", color: "#999",
            lineHeight: 1.5,
          }}>
            EDITING — <span style={{ color: INK, fontWeight: 700 }}>{savedRecipe!.name.toUpperCase()}</span>
            <br />
            v{versionCount} {viewingVersionId ? "· VIEWING OLDER" : `· SAVED ${lastSavedRel?.toUpperCase()}`}
          </div>
        )}

        {/* Optional note input — only shown when expanded */}
        {noteOpen && (
          <input
            value={note}
            onChange={(e) => setNote(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") { e.preventDefault(); handleSaveVersion(); }
              if (e.key === "Escape") { setNoteOpen(false); setNote(""); }
            }}
            placeholder="what changed? (optional)"
            autoFocus
            style={{
              padding: "8px 10px",
              border: `1px solid ${INK}`,
              background: "#fff",
              outline: "none",
              fontFamily: "'Inter Tight', sans-serif",
              fontStyle: "italic",
              fontSize: 12,
            }}
          />
        )}

        {/* Primary save button */}
        <button
          onClick={handleSaveVersion}
          onMouseEnter={() => { if (isLoaded && !feedback) setNoteOpen(true); }}
          disabled={!canSave}
          style={{
            background: feedback ? "var(--color-success)" : canSave ? ACCENT : "#e5e5e5",
            color: canSave ? "#fff" : "#bbb",
            border: "none",
            padding: "10px 14px",
            fontFamily: "'Inter Tight', sans-serif",
            fontWeight: 700,
            letterSpacing: "0.08em",
            fontSize: 11,
            cursor: canSave ? "pointer" : "not-allowed",
            transition: "background 0.2s ease",
            animation: feedback ? "popPulse 0.42s ease-out" : "none",
          }}
        >
          {feedback ?? (isLoaded ? `SAVE NEW VERSION` : "SAVE RECIPE")}
        </button>

        {/* Save-as-new (only when editing a loaded recipe) */}
        {isLoaded && (
          <button
            onClick={handleSaveAsNew}
            disabled={!canSave}
            style={{
              background: "transparent",
              border: `1px solid ${INK}`,
              padding: "8px 14px",
              fontFamily: "'Inter Tight', sans-serif",
              fontWeight: 600,
              letterSpacing: "0.08em",
              fontSize: 10,
              cursor: canSave ? "pointer" : "not-allowed",
              color: INK,
            }}
            onMouseEnter={(e) => { if (canSave) (e.currentTarget as HTMLButtonElement).style.background = "#f0f0f0"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
          >
            SAVE AS NEW
          </button>
        )}
      </div>

      {/* Reset recipe */}
      <button
        onClick={() => {
          if (confirm("Reset recipe? This clears the editor — saved recipes are untouched.")) clearRecipe();
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
