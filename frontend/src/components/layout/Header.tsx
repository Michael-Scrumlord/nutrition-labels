// layout/Header.tsx — Editorial masthead, R · Ledger direction.
//
//   ┌ Nutrition Label ─────────────────────────────── RECIPES · n · DONATE · ☰ ┐
//   │ ▸ GENERATOR · v · 04                                                     │
//
// LedgerMark replaces the legacy NUTRITIONLABELS strip: italic display
// "Nutrition Label" stacked over an accent FDA-rule, with a tracked mono
// "▸ GENERATOR · v · 04" kicker underneath. Sized off the cqw type ramp so
// the whole header reads correctly at 1080p, 1440p, and 4K.

import { useState } from "react";
import { Link } from "react-router-dom";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useActiveTheme } from "../../store/themeStore";
import { RecipesModal } from "../recipes/RecipesModal";
import { ThemeSwitcher } from "../theme/ThemeSwitcher";
import { DonateButton } from "../donate/DonateButton";

function LedgerMark({ oled }: { oled: boolean }) {
  return (
    <span
      style={{
        display: "inline-flex",
        flexDirection: "column",
        alignItems: "flex-start",
        lineHeight: 1,
        gap: 0,
      }}
    >
      <span
        className="pl-display"
        style={{
          fontSize: "var(--ms-mark-hero)",
          color: "var(--ink)",
          textShadow: oled
            ? "0 0 22px color-mix(in srgb, var(--accent) 45%, transparent)"
            : "none",
          paddingBottom: "calc(var(--ms-rule-h) * 1.4)",
        }}
      >
        Nutrition&nbsp;Label
      </span>
      <span
        style={{
          height: "var(--ms-rule-h)",
          background: "var(--accent)",
          width: "100%",
          boxShadow: oled ? "0 0 14px var(--accent)" : "none",
        }}
      />
      <span
        style={{
          marginTop: "calc(var(--ms-rule-h) * 1.6)",
          fontFamily: "var(--f-mono)",
          fontSize: "var(--ms-mark-kicker)",
          letterSpacing: "0.42em",
          textTransform: "uppercase",
          color: "var(--accent)",
          display: "inline-flex",
          alignItems: "center",
          gap: 8,
          textShadow: oled ? "0 0 8px var(--accent)" : "none",
        }}
      >
        <span style={{ fontWeight: 900 }}>▸ generator</span>
        <span style={{ color: "var(--ink-3)", letterSpacing: "0.3em" }}>v · 04</span>
      </span>
    </span>
  );
}

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
          padding: "calc(var(--ms-pad-y) * 1.2) var(--ms-pad-x)",
          position: "sticky",
          top: 0,
          zIndex: 20,
          borderBottom: "1px solid var(--hair-strong)",
          display: "grid",
          gridTemplateColumns: "auto 1fr auto",
          alignItems: "center",
          gap: "var(--ms-gap)",
          background: "color-mix(in srgb, var(--bg) 88%, transparent)",
          backdropFilter: "blur(8px)",
          WebkitBackdropFilter: "blur(8px)",
          color: "var(--ink)",
        }}
      >
        <Link
          to="/"
          aria-label="Nutrition Label Generator — home"
          style={{ textDecoration: "none", color: "inherit", display: "inline-flex" }}
        >
          <LedgerMark oled={oled} />
        </Link>
        <span aria-hidden="true" />

        <div
          style={{
            display: "inline-flex",
            alignItems: "center",
            gap: "calc(var(--ms-gap) * 1.1)",
          }}
        >
          <button
            onClick={() => setRecipesOpen(true)}
            style={{
              background: "transparent",
              border: "none",
              cursor: "pointer",
              padding: 0,
              display: "inline-flex",
              alignItems: "baseline",
              gap: 6,
              color: "var(--ink-3)",
              fontFamily: "var(--f-mono)",
              fontSize: "var(--ms-mono-small)",
              letterSpacing: "0.22em",
              textTransform: "uppercase",
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
