// label/LabelColumn.tsx
//
// Editorial plinth aside (Final A · Editorial direction):
//   • plinth-bg surface with the moonlit accent glow on Midnight only
//   • white FDA label paper sitting on the plinth (treated as a print artifact)
//   • size controls + GENERATE PDF as the primary action
//   • Save / Save-As-New / Reset controls (existing functionality)
//   • Sponsored AdSlot anchored at the very bottom of the column

import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../../store/recipeStore";
import { useActiveTheme } from "../../store/themeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { useLabelLayout } from "../../hooks/useLabelLayout";
import { useSaveControls } from "../../hooks/useSaveControls";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { LabelResizeHandle } from "./LabelResizeHandle";
import { GenerateButton } from "./GenerateButton";
import { SaveControls } from "./SaveControls";
import { AdSlot } from "./AdSlot";
import { GuidesCard } from "./GuidesCard";
import { AuroraGlow } from "../theme/AuroraGlow";
import { LABEL_COLUMN_MAX_WIDTH } from "./labelSpec";

export function LabelColumn() {
  const {
    ingredients, portionDivisor, dimensions, highlightedNutrients,
  } = useRecipeStore(
    useShallow((s) => ({
      ingredients:          s.ingredients,
      portionDivisor:       s.portionDivisor,
      dimensions:           s.dimensions,
      highlightedNutrients: s.highlightedNutrients,
    })),
  );

  const { clearRecipe }  = useRecipeActions();
  const macros           = useNutritionCalc();
  const { def: themeDef } = useActiveTheme();

  const { baseWidthPx, targetPx, scale, measureRef, containerH, isClipped } =
    useLabelLayout(dimensions, ingredients, portionDivisor);

  const {
    canSave, isLoaded, versionCount, viewingVersionId,
    lastSavedRel, savedRecipeName, feedback,
    handleSaveVersion, handleSaveAsNew,
  } = useSaveControls();

  return (
    <aside className="label-column-layout">
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
        {/* Panel caption — Label / Prep tabs + LIVE indicator */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "baseline",
            width: "100%",
            maxWidth: LABEL_COLUMN_MAX_WIDTH,
            paddingBottom: 6,
            borderBottom: "1px solid var(--hair)",
          }}
        >
          <div style={{ display: "flex", gap: 4 }}>
            {/* Prep tab is a placeholder for a future surface — only Label
                renders today, so Prep is disabled. */}
            <button className="sig-tab is-active" aria-current="page">Label</button>
            <button className="sig-tab" disabled title="Coming soon">Prep</button>
          </div>
          <span
            className="sig-static pl-meta"
            style={{
              color: "var(--accent)",
              filter: themeDef.oled ? "drop-shadow(0 0 6px var(--accent))" : "none",
            }}
          >
            ● LIVE
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
                // `clip` instead of `hidden`: `hidden` establishes a scroll
                // container, which means the inner authoring-width (288px)
                // div leaks into our scrollWidth even though it's visually
                // clipped. `clip` does not establish a scroll container, so
                // scrollWidth == clientWidth and the layout test sees the
                // box as it actually paints.
                overflow: "clip",
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

        <div style={{ width: "100%", maxWidth: LABEL_COLUMN_MAX_WIDTH }}>
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

        <div style={{ width: "100%", maxWidth: LABEL_COLUMN_MAX_WIDTH }}>
          <GenerateButton />
        </div>

        <SaveControls
          canSave={canSave}
          isLoaded={isLoaded}
          versionCount={versionCount}
          viewingVersionId={viewingVersionId}
          lastSavedRel={lastSavedRel}
          savedRecipeName={savedRecipeName}
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
            maxWidth: LABEL_COLUMN_MAX_WIDTH,
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
