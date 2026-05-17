// label/GuidesCard.tsx — compact link to the /guides index that sits
// above the AdSlot on the editor's right column. Editorial language
// keeps it from reading as an ad; it's first-party site nav.

import { Link } from "react-router-dom";

export function GuidesCard() {
  return (
    <Link
      to="/guides"
      style={{
        width: "100%",
        maxWidth: 380,
        display: "block",
        padding: "12px 14px",
        border: "1px solid var(--hair-strong)",
        background: "color-mix(in srgb, var(--ink) 3%, var(--bg))",
        color: "inherit",
        textDecoration: "none",
        transition: "border-color 160ms ease, background 160ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--ink)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--hair-strong)";
      }}
    >
      <div
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 9,
          letterSpacing: "0.32em",
          color: "var(--accent)",
          textTransform: "uppercase",
          marginBottom: 4,
        }}
      >
        ▸ Guides
      </div>
      <div
        className="pl-display"
        style={{ fontSize: 18, lineHeight: 1.15, color: "var(--ink)" }}
      >
        Reading a label, RACC,
        <br />
        %DV, allergens.
      </div>
      <div
        style={{
          marginTop: 6,
          fontFamily: "var(--f-mono)",
          fontSize: 9,
          letterSpacing: "0.24em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
        }}
      >
        Plain-English explainers →
      </div>
    </Link>
  );
}
