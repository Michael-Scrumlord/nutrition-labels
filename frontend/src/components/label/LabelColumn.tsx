// label/LabelColumn.tsx
//
// Editorial plinth aside (Final A · Editorial direction):
//   • plinth-bg surface with the moonlit accent glow on Midnight only
//   • white FDA label paper sitting on the plinth (treated as a print artifact)
//   • size controls + GENERATE PDF as the primary action
//   • Save / Save-As-New / Reset controls (existing functionality)
//   • Sponsored AdSlot anchored at the very bottom of the column

import { useState, useCallback, useMemo, useRef, useLayoutEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../../store/recipeStore";
import { useSavedRecipesStore, type RecipeSnapshot } from "../../store/savedRecipesStore";
import { useActiveTheme } from "../../store/themeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { LabelResizeHandle } from "./LabelResizeHandle";
import { GenerateButton } from "./GenerateButton";
import { SaveControls } from "./SaveControls";
import { AdSlot } from "./AdSlot";
import { GuidesCard } from "./GuidesCard";
import { AuroraGlow } from "../theme/AuroraGlow";

export function LabelColumn() {
  const {
    ingredients, portionDivisor, labelName, dimensions,
    highlightedNutrients, instructions, variables,
    currentRecipeId, viewingVersionId,
  } = useRecipeStore(
    useShallow((s) => ({
      ingredients:          s.ingredients,
      portionDivisor:       s.portionDivisor,
      labelName:            s.labelName,
      dimensions:           s.dimensions,
      highlightedNutrients: s.highlightedNutrients,
      instructions:         s.instructions,
      variables:            s.variables,
      currentRecipeId:      s.currentRecipeId,
      viewingVersionId:     s.viewingVersionId,
    })),
  );

  const { clearRecipe, setCurrentRecipeId } = useRecipeActions();
  const createRecipe  = useSavedRecipesStore((s) => s.createRecipe);
  const appendVersion = useSavedRecipesStore((s) => s.appendVersion);
  const savedRecipe   = useSavedRecipesStore((s) =>
    currentRecipeId ? s.recipes.find((r) => r.id === currentRecipeId) : undefined,
  );
  const macros        = useNutritionCalc();
  const { def: themeDef } = useActiveTheme();

  const [feedback, setFeedback] = useState<string | null>(null);

  const baseWidthPx = 288;
  const targetPx    = Math.max(dimensions.widthInches * 96, 192);
  const scale       = targetPx / baseWidthPx;

  // Measure the unscaled LabelPreview so the proof container hugs real content
  // instead of relying on a 560px estimate. Transforms don't affect layout, so
  // offsetHeight on the inner div is the natural (pre-scale) height.
  const measureRef = useRef<HTMLDivElement | null>(null);
  const [naturalH, setNaturalH] = useState(560);
  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setNaturalH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, [ingredients, portionDivisor, dimensions.widthInches]);

  const requestedH = dimensions.heightInches ? dimensions.heightInches * 96 : null;
  const scaledNaturalH = naturalH * scale;
  const containerH = requestedH ?? scaledNaturalH;
  const isClipped  = requestedH != null && scaledNaturalH > requestedH + 1;

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

  const snapshot = useMemo<RecipeSnapshot>(
    () => ({ ingredients, portionDivisor, labelName, dimensions, instructions, variables }),
    [ingredients, portionDivisor, labelName, dimensions, instructions, variables],
  );

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  }

  const handleSaveVersion = useCallback(() => {
    if (!canSave) return;
    if (isLoaded) {
      appendVersion(currentRecipeId!, snapshot);
      flash("SAVED ✓");
    } else {
      const newId = createRecipe(snapshot);
      setCurrentRecipeId(newId);
      flash("SAVED ✓");
    }
  }, [canSave, isLoaded, currentRecipeId, snapshot, createRecipe, appendVersion, setCurrentRecipeId]);

  const handleSaveAsNew = useCallback(() => {
    if (!canSave) return;
    const newId = createRecipe(snapshot);
    setCurrentRecipeId(newId);
    flash("SAVED AS NEW ✓");
  }, [canSave, snapshot, createRecipe, setCurrentRecipeId]);

  return (
    <aside
      style={{
        gridArea: "label",
        height: "100%",
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

        {/* Printable label — always white paper. The wrapper is `position: relative`
            so the edge and corner resize handles can absolute-position themselves
            against it. Handles are siblings of the label paper, not children, so
            they're never clipped by the `overflow: hidden` that prevents content
            spillover. */}
        <div style={{ display: "flex", justifyContent: "center" }}>
          <div style={{ position: "relative" }}>
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
              <div ref={measureRef} style={{ width: baseWidthPx, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <LabelPreview
                  macros={macros}
                  portionDivisor={portionDivisor}
                  ingredients={ingredients}
                  widthPx={baseWidthPx}
                  highlightSet={highlightedNutrients}
                />
              </div>
            </div>
            <LabelResizeHandle variant="east" />
            <LabelResizeHandle variant="south" />
            <LabelResizeHandle variant="corner" />
          </div>
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <LabelDimensions />
          {isClipped && (
            <div
              role="alert"
              style={{
                marginTop: 8,
                padding: "6px 10px",
                fontFamily: "var(--f-mono)",
                fontSize: 10,
                letterSpacing: "0.16em",
                textTransform: "uppercase",
                color: "var(--color-danger)",
                border: "1px solid var(--color-danger)",
                background: "color-mix(in srgb, var(--color-danger) 8%, transparent)",
              }}
            >
              ⚠ Content clipped — increase height or set to auto
            </div>
          )}
        </div>

        <div style={{ width: "100%", maxWidth: 380 }}>
          <GenerateButton />
        </div>

        <SaveControls
          canSave={canSave}
          isLoaded={isLoaded}
          versionCount={versionCount}
          viewingVersionId={viewingVersionId}
          lastSavedRel={lastSavedRel}
          savedRecipeName={savedRecipe?.name}
          onSaveVersion={handleSaveVersion}
          onSaveAsNew={handleSaveAsNew}
          onReset={() => {
            if (confirm("Reset recipe? This clears the editor — saved recipes are untouched.")) clearRecipe();
          }}
          feedback={feedback}
        />

        {/* Sidebar tail — Guides card + sponsored slot, anchored to the bottom. */}
        <div
          style={{
            marginTop: "auto",
            width: "100%",
            maxWidth: 380,
            display: "flex",
            flexDirection: "column",
            gap: 14,
            alignItems: "stretch",
          }}
        >
          <GuidesCard />
          <AdSlot />
        </div>
      </div>
    </aside>
  );
}
