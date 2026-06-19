// label/GenerateButton.tsx — primary CTA.
//
// PDF generation is entirely client-side: this dynamically imports
// @react-pdf/renderer + LabelPdfDoc only on click, so the ~450 KB library
// stays out of the initial bundle. LabelPdfDoc and the in-app LabelPreview
// share one spec (labelSpec.ts), so the download matches the preview exactly.

import { useState } from "react";
import { useLabelData } from "../../hooks/useLabelData";
import { useActiveTheme } from "../../store/themeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { downloadBlob } from "../../api/client";

// When the user leaves height in "auto" mode, react-pdf needs a concrete page
// height up front (no `auto`). We use a generous canvas — printers / users
// can trim. Matches the legacy WeasyPrint behaviour (20in max).
const AUTO_HEIGHT_INCHES = 11;

export function GenerateButton() {
  const { ingredients, portionDivisor, labelName, dimensions, servingHousehold, addedSugarsG, transFatG } = useLabelData();
  const macros = useNutritionCalc();
  const { def } = useActiveTheme();

  const [isLoading, setIsLoading] = useState(false);
  const [error,     setError]     = useState<string | null>(null);

  async function handleGenerate() {
    if (ingredients.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      // Lazy-load both the renderer and the doc so neither lands in the
      // initial JS bundle. Vite splits this into its own chunk automatically.
      const [{ pdf }, { LabelPdfDoc }] = await Promise.all([
        import("@react-pdf/renderer"),
        import("./LabelPdfDoc"),
      ]);

      const blob = await pdf(
        <LabelPdfDoc
          macros={macros}
          portionDivisor={portionDivisor}
          ingredients={ingredients}
          labelName={labelName}
          widthInches={dimensions.widthInches}
          heightInches={dimensions.heightInches ?? AUTO_HEIGHT_INCHES}
          servingHousehold={servingHousehold}
          addedSugarsG={addedSugarsG}
          transFatG={transFatG}
        />,
      ).toBlob();

      downloadBlob(blob, "nutrition_label.pdf");
    } catch (err) {
      console.error("PDF generation failed:", err);
      setError("PDF generation failed. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  const disabled = ingredients.length === 0;

  return (
    <div style={{ marginTop: 4, width: "100%" }}>
      <button
        onClick={handleGenerate}
        disabled={disabled || isLoading}
        className="sig-btn sig-primary"
        style={{
          width: "100%",
          // `.sig-btn` carries `margin: 0 2px 2px 0` so adjacent buttons don't
          // overlap each other's 2px hard-offset shadow. A full-width primary
          // CTA has no neighbour to clear, and the margin pushes it past its
          // container — null it out here.
          margin: 0,
          justifyContent: "center",
          padding: "12px 14px",
          fontSize: 12,
          color: def.oled && !disabled ? "#000" : undefined,
        }}
      >
        {isLoading ? "GENERATING…" : "↳ GENERATE PDF"}
      </button>

      {error && (
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--color-danger)" }}>{error}</p>
      )}
    </div>
  );
}
