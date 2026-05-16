// label/GenerateButton.tsx — primary CTA, themed.

import { useState } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useActiveTheme } from "../../store/themeStore";
import { generateLabel, downloadBlob } from "../../api/client";

export function GenerateButton() {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const labelName      = useRecipeStore((s) => s.labelName);
  const dimensions     = useRecipeStore((s) => s.dimensions);
  const { def }        = useActiveTheme();

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
    <div style={{ marginTop: 4, width: "100%" }}>
      <button
        onClick={handleGenerate}
        disabled={disabled || isLoading}
        style={{
          background: disabled
            ? "color-mix(in srgb, var(--ink) 8%, transparent)"
            : "var(--accent)",
          color: disabled ? "var(--ink-3)" : def.oled ? "#000" : "#fff",
          border: "none",
          padding: "16px 22px",
          fontFamily: "var(--f-body)",
          fontWeight: 800,
          letterSpacing: "0.22em",
          fontSize: 11,
          cursor: disabled ? "default" : "pointer",
          width: "100%",
          transition: "filter 0.15s",
          boxShadow: disabled ? "none" : "var(--accent-glow)",
        }}
        onMouseEnter={(e) => {
          if (!disabled) (e.currentTarget as HTMLButtonElement).style.filter = "brightness(1.08)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLButtonElement).style.filter = "";
        }}
      >
        {isLoading ? "GENERATING…" : "↓ GENERATE PDF"}
      </button>

      {error && (
        <p style={{ marginTop: 6, fontSize: 11, color: "var(--color-danger)" }}>{error}</p>
      )}
    </div>
  );
}
