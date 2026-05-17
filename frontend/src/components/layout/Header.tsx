// layout/Header.tsx — Editorial masthead.
//   NUTRITIONLABELS · Plinth · Vol. IV · No. 04 · May 2026 · <theme name>
//   RECIPES · n          ThemeSwitcher

import { useState } from "react";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useActiveTheme } from "../../store/themeStore";
import { RecipesModal } from "../recipes/RecipesModal";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";
import { DonateButton } from "../donate/DonateButton";

export function Header() {
  const [recipesOpen, setRecipesOpen] = useState(false);
  const recipeCount = useSavedRecipesStore((s) => s.recipes.length);
  const { def } = useActiveTheme();
  const oled = def.oled;

  return (
    <>
      <header
        style={{
          gridArea: "head",
          padding: "20px 48px",
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid var(--hair-strong)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "var(--ink)",
        }}
      >
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, flexWrap: "wrap" }}>
          <span style={{ fontWeight: 900, letterSpacing: "0.22em", fontSize: 12 }}>
            NUTRITION
            <span
              style={{
                color: "var(--accent)",
                textShadow: oled ? "0 0 12px var(--accent)" : "none",
              }}
            >
              LABELS
            </span>
          </span>
        </div>

        <div style={{ display: "flex", alignItems: "center", gap: 22 }}>
          <button
            onClick={() => setRecipesOpen(true)}
            className="pl-meta"
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "flex",
              alignItems: "baseline",
              gap: 6,
              color: "var(--ink-3)",
              transition: "color 160ms ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--accent)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)";
            }}
          >
            RECIPES
            {recipeCount > 0 && (
              <span style={{ color: "var(--accent)", fontWeight: 700 }}>·{recipeCount}</span>
            )}
          </button>
          <DonateButton />
          <ThemeSwitcher />
        </div>
      </header>

      <RecipesModal open={recipesOpen} onClose={() => setRecipesOpen(false)} />
    </>
  );
}
