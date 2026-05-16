// layout/Header.tsx — Pop editorial masthead with Recipes catalog entry point.

import { useState } from "react";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { RecipesModal } from "../recipes/RecipesModal";
import { ACCENT } from "../../constants/theme";

export function Header() {
  const [recipesOpen, setRecipesOpen] = useState(false);
  const recipeCount = useSavedRecipesStore((s) => s.recipes.length);

  return (
    <>
      <header
        style={{
          gridArea: "head",
          display: "flex",
          alignItems: "baseline",
          justifyContent: "space-between",
          padding: "18px 48px",
          borderBottom: "1px solid #0a0a0a",
          position: "sticky",
          top: 0,
          background: "#ffffff",
          zIndex: 20,
        }}
      >
        <span style={{ fontWeight: 900, letterSpacing: "0.22em", fontSize: 12 }}>
          NUTRITION<span style={{ color: ACCENT }}>LABELS</span>
        </span>

        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 11,
            color: "#999",
            letterSpacing: "0.18em",
          }}
        >
          FDA NUTRITION LABEL BUILDER · COMPLIANCE 21 CFR 101.9
        </span>

        <div style={{ display: "flex", alignItems: "baseline", gap: 20 }}>
          <button
            onClick={() => setRecipesOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              fontFamily: "'JetBrains Mono', monospace",
              fontSize: 11,
              letterSpacing: "0.12em",
              color: "#999",
              padding: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = ACCENT; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#999"; }}
          >
            RECIPES
            {recipeCount > 0 && (
              <span style={{ color: ACCENT, fontWeight: 700 }}>·{recipeCount}</span>
            )}
          </button>

          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.12em" }}>
            ✓ LIVE
          </span>
        </div>
      </header>

      <RecipesModal open={recipesOpen} onClose={() => setRecipesOpen(false)} />
    </>
  );
}
