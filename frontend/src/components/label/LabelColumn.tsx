// label/LabelColumn.tsx
//
// Editorial plinth aside (Final A · Editorial direction):
//   • plinth-bg surface with the moonlit accent glow on Midnight only
//   • white FDA label paper sitting on the plinth (treated as a print artifact)
//   • size controls + GENERATE PDF as the primary action
//   • Save / Save-As-New / Reset controls (existing functionality)
//   • Sponsored AdSlot anchored at the very bottom of the column

import { useState, useRef, useLayoutEffect } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../../store/recipeStore";
import { useActiveTheme } from "../../store/themeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { useLabelSave } from "../../hooks/useLabelSave";
import { LabelPreview } from "./LabelPreview";
import { LabelDimensions } from "./LabelDimensions";
import { LabelDetails } from "./LabelDetails";
import { LabelResizeHandle } from "./LabelResizeHandle";
import { GenerateButton } from "./GenerateButton";
import { SaveControls } from "./SaveControls";
import { AdSlot } from "./AdSlot";
import { GuidesCard } from "./GuidesCard";
import { AuroraGlow } from "../theme/AuroraGlow";

export function LabelColumn() {
  const {
    ingredients, portionDivisor, dimensions,
    highlightedNutrients, servingHousehold, addedSugarsG, transFatG,
    viewingVersionId,
  } = useRecipeStore(
    useShallow((s) => ({
      ingredients:          s.ingredients,
      portionDivisor:       s.portionDivisor,
      dimensions:           s.dimensions,
      highlightedNutrients: s.highlightedNutrients,
      servingHousehold:     s.servingHousehold,
      addedSugarsG:         s.addedSugarsG,
      transFatG:            s.transFatG,
      viewingVersionId:     s.viewingVersionId,
    })),
  );

  const { clearRecipe } = useRecipeActions();
  const macros = useNutritionCalc();
  const { def: themeDef } = useActiveTheme();

  const {
    canSave, isLoaded, versionCount, lastSavedRel, savedRecipeName,
    feedback, handleSaveVersion, handleSaveAsNew,
  } = useLabelSave();

  // The preview authors the label in points-as-pixels (1pt = 1px) at the page's
  // true point width (widthInches*72), matching LabelPdfDoc's geometry. We then
  // scale uniformly to the on-screen display width so the preview is an exact
  // scale of the PDF. targetPx == widthInches*96 for any width ≥ 2in, so the
  // scale resolves to 96/72 (i.e. render the 72dpi artwork at 96dpi).
  const authoredWidth = dimensions.widthInches * 72;
  const targetPx      = Math.max(dimensions.widthInches * 96, 192);
  const scale         = targetPx / authoredWidth;

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
  }, [ingredients, portionDivisor, dimensions.widthInches, servingHousehold, addedSugarsG, transFatG]);

  const requestedH    = dimensions.heightInches ? dimensions.heightInches * 96 : null;
  const scaledNaturalH = naturalH * scale;
  const containerH    = requestedH ?? scaledNaturalH;
  const isClipped     = requestedH != null && scaledNaturalH > requestedH + 1;

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
            maxWidth: 380,
            paddingBottom: 6,
            borderBottom: "1px solid var(--hair)",
          }}
        >
          {/* Panel label. (A second "Prep" tab used to live here but went
              nowhere — removed; the label is the only surface in this column.) */}
          <span className="sig-static pl-meta" style={{ fontWeight: 700, letterSpacing: "0.16em", textTransform: "uppercase" }}>
            Label
          </span>
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
              <div ref={measureRef} style={{ width: authoredWidth, transform: `scale(${scale})`, transformOrigin: "top left" }}>
                <LabelPreview
                  macros={macros}
                  portionDivisor={portionDivisor}
                  ingredients={ingredients}
                  widthInches={dimensions.widthInches}
                  servingHousehold={servingHousehold}
                  addedSugarsG={addedSugarsG}
                  transFatG={transFatG}
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
          <LabelDetails />
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
