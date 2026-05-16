// label/GenerateButton.tsx — Pop CTA style.

import { useState } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { generateLabel, downloadBlob } from "../../api/client";
import { ACCENT } from "../../constants/theme";

export function GenerateButton() {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const labelName      = useRecipeStore((s) => s.labelName);
  const dimensions     = useRecipeStore((s) => s.dimensions);

  const [isLoading, setIsLoading] = useState(false);
  const [error, setError]         = useState<string | null>(null);

  async function handleGenerate() {
    if (ingredients.length === 0) return;
    setIsLoading(true);
    setError(null);
    try {
      const blob = await generateLabel(ingredients, portionDivisor, labelName, dimensions);
      downloadBlob(blob, "nutrition_label.pdf");
    } catch (err) {
      setError(err instanceof Error ? err.message : "PDF generation failed");
    } finally {
      setIsLoading(false);
    }
  }

  const disabled = ingredients.length === 0;

  return (
    <div style={{ marginTop: 4 }}>
      <button
        onClick={handleGenerate}
        disabled={disabled || isLoading}
        style={{
          background: disabled ? "#e5e5e5" : ACCENT,
          color: disabled ? "#bbb" : "#fff",
          border: "none",
          padding: "16px 18px",
          fontFamily: "'Inter Tight', sans-serif",
          fontWeight: 800,
          letterSpacing: "0.2em",
          fontSize: 12,
          cursor: disabled ? "default" : "pointer",
          width: "100%",
          transition: "filter 0.15s",
        }}
        onMouseEnter={(e) => { if (!disabled) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)"; }}
        onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.filter = ""; }}
      >
        {isLoading ? "GENERATING…" : "↓ GENERATE PDF"}
      </button>

      {error && (
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--color-danger)" }}>{error}</p>
      )}
    </div>
  );
}
