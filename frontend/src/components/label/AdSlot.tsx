// AdSlot.tsx — classy sponsored placeholder, framed for premium placement.
//
// Design intent (per the Final A · Editorial direction):
//   • Prominent enough that an advertiser feels their brand will be seen —
//     IAB Medium Rectangle (300 × 250), corner brackets, double-rule frame
//   • Unobtrusive to the end user — muted ink colors, no accent, no motion,
//     anchored at the very bottom of the sidebar so it never competes with
//     the label preview or the GENERATE PDF action above it.

export function AdSlot() {
  return (
    <section
      style={{
        width: "100%",
        maxWidth: 380,
        paddingTop: 12,
        display: "flex",
        flexDirection: "column",
        alignItems: "stretch",
        gap: 10,
      }}
    >
      {/* Hairline divider with caps marker centered */}
      <div style={{ position: "relative", height: 16, display: "flex", alignItems: "center" }}>
        <span style={{ flex: 1, height: 1, background: "var(--hair-strong)" }} />
        <span
          style={{
            padding: "0 12px",
            fontFamily: "var(--f-mono)",
            fontSize: 9,
            letterSpacing: "0.32em",
            color: "var(--ink-3)",
            textTransform: "uppercase",
          }}
        >
          Advertisement
        </span>
        <span style={{ flex: 1, height: 1, background: "var(--hair-strong)" }} />
      </div>

      {/* Frame — double-rule via inset shadow + corner brackets */}
      <div
        style={{
          position: "relative",
          aspectRatio: "6 / 5",
          border: "1px solid var(--hair-strong)",
          boxShadow: "inset 0 0 0 5px var(--bg), inset 0 0 0 6px var(--hair)",
          background: "color-mix(in srgb, var(--ink) 3%, var(--bg))",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "18px 22px",
          transition: "box-shadow 240ms ease",
        }}
      >
        <AdBrackets />
        <div style={{ textAlign: "center" }}>
          <div
            className="pl-display"
            style={{ fontSize: 30, lineHeight: 1.02, color: "var(--ink-2)" }}
          >
            this space,
            <br />
            your brand.
          </div>
          <div
            style={{
              marginTop: 12,
              fontFamily: "var(--f-mono)",
              fontSize: 9,
              letterSpacing: "0.32em",
              color: "var(--ink-3)",
              textTransform: "uppercase",
            }}
          >
            open for thoughtful brands
          </div>
        </div>
      </div>

      {/* Footer — size/placement note + tiny right-aligned marker */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "baseline",
          fontFamily: "var(--f-mono)",
          fontSize: 8,
          letterSpacing: "0.24em",
          color: "var(--ink-3)",
          textTransform: "uppercase",
        }}
      >
        <span>300 × 250 · medium rectangle</span>
        <span>inquiries@nutrition-label-generator.org</span>
      </div>
    </section>
  );
}

// L-shaped corner brackets that stamp the frame as a "slot".
function AdBrackets() {
  const arm = 14;
  const off = -1;
  const color = "var(--ink-2)";
  const base = {
    position: "absolute" as const,
    width: arm,
    height: arm,
  };
  return (
    <>
      <span
        style={{ ...base, top: off, left: off, borderTop: `2px solid ${color}`, borderLeft: `2px solid ${color}` }}
      />
      <span
        style={{ ...base, top: off, right: off, borderTop: `2px solid ${color}`, borderRight: `2px solid ${color}` }}
      />
      <span
        style={{ ...base, bottom: off, left: off, borderBottom: `2px solid ${color}`, borderLeft: `2px solid ${color}` }}
      />
      <span
        style={{ ...base, bottom: off, right: off, borderBottom: `2px solid ${color}`, borderRight: `2px solid ${color}` }}
      />
    </>
  );
}
