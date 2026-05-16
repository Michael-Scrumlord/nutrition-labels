// layout/AppShell.tsx
//
// 2-column magazine grid.
//   Left (1fr):   sticky header + recipe body + footer
//   Right (460px): sticky FDA label panel
//
// Highlight state (which nutrients to tint on the label when the user
// hovers an ingredient row) is now managed in recipeStore, so this
// component no longer needs to act as a message bus between siblings.

import { Header } from "./Header";
import { RecipeBuilder } from "../recipe/RecipeBuilder";
import { LabelColumn } from "../label/LabelColumn";
import { INK } from "../../constants/theme";

export function AppShell() {
  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "minmax(0, 1fr) 460px",
        gridTemplateRows: "auto 1fr auto",
        gridTemplateAreas: '"head head" "body label" "foot label"',
        minHeight: "100vh",
        background: "#ffffff",
        color: INK,
        fontFamily: "'Inter Tight', system-ui, sans-serif",
      }}
    >
      <Header />

      <RecipeBuilder />

      <LabelColumn />

      <footer
        style={{
          gridArea: "foot",
          padding: "14px 48px",
          borderTop: `1px solid ${INK}`,
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
