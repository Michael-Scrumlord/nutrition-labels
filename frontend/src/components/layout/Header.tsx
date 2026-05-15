// layout/Header.tsx — Pop editorial masthead.

export function Header() {
  return (
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
        NUTRITION<span style={{ color: "var(--color-accent)" }}>LABELS</span>
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

      <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.12em" }}>
        ✓ LIVE
      </span>
    </header>
  );
}
