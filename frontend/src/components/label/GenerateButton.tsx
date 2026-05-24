// label/GenerateButton.tsx — primary CTA.
//
// Client-side PDF generation: dynamically imports @react-pdf/renderer +
// LabelPdfDoc only on click, so the ~450 KB library stays out of the
// initial bundle. The server's /api/generate_label endpoint is still
// available as a fallback for API consumers but the browser path is the
// default now.

import { useState } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useActiveTheme } from "../../store/themeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { downloadBlob } from "../../api/client";

// When the user leaves height in "auto" mode, react-pdf needs a concrete page
// height up front (no `auto`). We use a generous canvas — printers / users
// can trim. Matches the legacy WeasyPrint behaviour (20in max).
const AUTO_HEIGHT_INCHES = 11;

export function GenerateButton() {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const labelName      = useRecipeStore((s) => s.labelName);
  const dimensions     = useRecipeStore((s) => s.dimensions);
  const macros         = useNutritionCalc();
  const { def }        = useActiveTheme();

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
