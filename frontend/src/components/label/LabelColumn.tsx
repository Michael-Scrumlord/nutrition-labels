// label/LabelColumn.tsx
//
// Editorial plinth aside (Final A · Editorial direction):
//   • plinth-bg surface with the moonlit accent glow on Midnight only
//   • white FDA label paper sitting on the plinth (treated as a print artifact)
//   • size controls + GENERATE PDF as the primary action
//   • Save / Save-As-New / Reset controls (existing functionality)
//   • Sponsored AdSlot anchored at the very bottom of the column

import { useState, useCallback, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useSavedRecipesStore, type RecipeSnapshot } from "../../store/savedRecipesStore";
import { useActiveTheme } from "../../store/themeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { GenerateButton } from "./GenerateButton";
import { AdSlot } from "./AdSlot";
import { AuroraGlow } from "../theme/AuroraGlow";

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
  const setCurrentRecipeId   = useRecipeStore.setState;

  const { clearRecipe }      = useRecipeActions();
  const createRecipe         = useSavedRecipesStore((s) => s.createRecipe);
  const appendVersion        = useSavedRecipesStore((s) => s.appendVersion);
  const savedRecipe          = useSavedRecipesStore((s) =>
    currentRecipeId ? s.recipes.find((r) => r.id === currentRecipeId) : undefined,
  );
  const macros               = useNutritionCalc();
  const { def: themeDef }    = useActiveTheme();

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

  const canSave      = ingredients.length > 0;
  const isLoaded     = !!currentRecipeId && !!savedRecipe;
  const versionCount = savedRecipe?.versions.length ?? 0;
  const lastSavedAt  = savedRecipe && savedRecipe.versions.length > 0
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
        position: "sticky",
        top: 0,
        alignSelf: "start",
        height: "100vh",
        overflow: "hidden", // glow is clipped here; inner scroller handles content
        background: "var(--plinth-bg)",
        borderLeft: "1px solid var(--hair-strong)",
      }}
    >
      {/* Aurora plinth glow — only renders on Midnight per Final A direction. */}
      <AuroraGlow plinth />

      <div
        style={{
          position: "relative",
          zIndex: 1,
          height: "100%",
          padding: "32px 28px",
          overflow: "auto",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          gap: 18,
        }}
      >
        {/* Panel caption */}
        <div style={{
          display: "flex", justifyContent: "space-between", alignItems: "baseline",
          width: "100%", maxWidth: 380,
          fontFamily: "var(--f-mono)", fontSize: 10,
          letterSpacing: "0.22em", textTransform: "uppercase",
          color: "var(--ink-2)",
        }}>
          <span style={{ opacity: 0.85 }}>Label · proof</span>
          <span
            style={{
              color: "var(--accent)",
              filter: themeDef.oled ? "drop-shadow(0 0 6px var(--accent))" : "none",
            }}
          >
            ● live
          </span>
        </div>

        {/* Printable label — always white paper */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div
            className="pop-printable"
            style={{
              width: targetPx,
              height: containerH,
              overflow: "hidden",
              background: "#ffffff",
              boxShadow: "var(--paper-shadow)",
            }}
          >
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
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <LabelDimensions />
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <GenerateButton />
        </div>

        {/* ── Save section ──────────────────────────────────────────────── */}
        <div
          style={{
            width: "100%", maxWidth: 380,
            display: "flex", flexDirection: "column", gap: 8,
            padding: "12px 0 0",
            borderTop: "1px solid var(--hair)",
          }}
        >
          {isLoaded && (
            <div className="pl-meta" style={{ fontSize: 9, lineHeight: 1.5, color: "var(--ink-3)" }}>
              EDITING — <span style={{ color: "var(--ink)", fontWeight: 700 }}>{savedRecipe!.name.toUpperCase()}</span>
              <br />
              v{versionCount} {viewingVersionId ? "· VIEWING OLDER" : `· SAVED ${lastSavedRel?.toUpperCase()}`}
            </div>
          )}

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
                border: "1px solid var(--ink)",
                background: "var(--bg)",
                color: "var(--ink)",
                outline: "none",
                fontFamily: "var(--f-display)",
                fontStyle: "var(--f-display-style)",
                fontSize: 13,
              }}
            />
          )}

          <button
            onClick={handleSaveVersion}
            onMouseEnter={() => { if (isLoaded && !feedback) setNoteOpen(true); }}
            disabled={!canSave}
            style={{
              background: feedback
                ? "var(--color-success)"
                : canSave
                ? "transparent"
                : "color-mix(in srgb, var(--ink) 6%, transparent)",
              color: feedback
                ? "#ffffff"
                : canSave
                ? "var(--ink)"
                : "var(--ink-3)",
              border: `1px solid ${canSave ? "var(--ink)" : "var(--hair)"}`,
              padding: "10px 14px",
              fontFamily: "var(--f-body)",
              fontWeight: 700,
              letterSpacing: "0.08em",
              fontSize: 11,
              textTransform: "uppercase",
              cursor: canSave ? "pointer" : "not-allowed",
              transition: "background 0.2s ease",
              animation: feedback ? "popPulse 0.42s ease-out" : "none",
            }}
          >
            {feedback ?? (isLoaded ? "SAVE NEW VERSION" : "SAVE RECIPE")}
          </button>

          {isLoaded && (
            <button
              onClick={handleSaveAsNew}
              disabled={!canSave}
              style={{
                background: "transparent",
                border: "1px solid var(--hair-strong)",
                padding: "8px 14px",
                fontFamily: "var(--f-body)",
                fontWeight: 600,
                letterSpacing: "0.08em",
                fontSize: 10,
                cursor: canSave ? "pointer" : "not-allowed",
                color: "var(--ink-2)",
                textTransform: "uppercase",
              }}
            >
              SAVE AS NEW
            </button>
          )}

          <button
            onClick={() => {
              if (confirm("Reset recipe? This clears the editor — saved recipes are untouched.")) clearRecipe();
            }}
            style={{
              background: "transparent",
              border: "1px solid var(--hair-strong)",
              padding: "8px 14px",
              fontFamily: "var(--f-body)",
              fontWeight: 600,
              letterSpacing: "0.08em",
              fontSize: 10,
              textTransform: "uppercase",
              cursor: "pointer",
              color: "var(--ink-2)",
            }}
          >
            RESET RECIPE
          </button>
        </div>

        {/* Sponsored slot — anchored to the bottom of the column. */}
        <AdSlot />
      </div>
    </aside>
  );
}
