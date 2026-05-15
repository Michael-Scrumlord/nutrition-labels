// layout/AppShell.tsx
//
// Pop redesign: 2-column magazine grid.
//   Left (1fr):   sticky header + magazine recipe body + footer
//   Right (460px): sticky FDA label panel
//
// Hover state is lifted here so the ingredient row that's hovered
// can simultaneously tint its corresponding rows in the FDA label.

import { useState } from "react";
import { Header } from "./Header";
import { RecipeBuilder } from "../recipe/RecipeBuilder";
import { LabelColumn } from "../label/LabelColumn";
import type { MacroProfile } from "../../types";

export type HighlightSet = Set<keyof MacroProfile>;

export function AppShell() {
  const [highlightSet, setHighlightSet] = useState<HighlightSet>(new Set());

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 460px",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: '"head head" "body label" "foot label"',
        minHeight: "100vh",
        background: "#ffffff",
        color: "#0a0a0a",
        fontFamily: "'Inter Tight', system-ui, sans-serif",
      }}
    >
      <Header />

      <RecipeBuilder onHighlightChange={setHighlightSet} />

      <LabelColumn highlightSet={highlightSet} />

      <footer
        style={{
          gridArea: "foot",
          padding: "14px 48px",
          borderTop: "1px solid #0a0a0a",
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10,
          color: "#999",
          letterSpacing: "0.18em",
          display: "flex",
          justifyContent: "space-between",
          background: "#ffffff",
        }}
      >
        <span>DRAG · CLICK · WHEEL — EVERY NUMBER IS LIVE</span>
        <span>p.01</span>
      </footer>
    </div>
  );
}
