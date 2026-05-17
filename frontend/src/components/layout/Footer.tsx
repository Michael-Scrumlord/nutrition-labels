// layout/Footer.tsx — Featured-partner ribbon rendered in the `foot` grid
// area of the AppShell (not CSS-sticky; it's the bottom row of the page grid).
//
//   ┌── PARTNERED WITH │ ⌐ your brand, here. │ a tasteful line. │ VISIT → │ × ┐
//
// Anatomy:
//   • Slim 84px band at the bottom of the page grid.
//   • 1px hairline top + soft upward shadow give it lift without feeling pasted on.
//   • Center slot has corner brackets so a real ad dropped in reads as framed.
//   • Dismiss × hides the ribbon for the session (persisted via sessionStorage
//     so reloads in the same tab don't bring it back).
//
// VITE_FOOTER_AD_URL — if set, the whole row (tag + slot + CTA) becomes one
// clickable anchor. If unset, the row stays as the editorial "your brand, here."
// placeholder. The × dismiss button is always rendered OUTSIDE the anchor so
// clicking it never counts as a click on the partner link.
//
// NOTE (AdSense incorporation plan, Phase 2): when we adopt Google Anchor Ads
// via Auto Ads this whole component is expected to be deleted in favor of
// Google-served anchor units. Keep edits here minimal until then.

import { useState, type CSSProperties } from "react";

const AD_URL = import.meta.env.VITE_FOOTER_AD_URL as string | undefined;
const AD_HEADLINE =
  (import.meta.env.VITE_FOOTER_AD_HEADLINE as string | undefined) ?? "your brand, here.";
const AD_TAGLINE =
  (import.meta.env.VITE_FOOTER_AD_TAGLINE as string | undefined) ??
  "a tasteful line for thoughtful readers.";
const AD_CTA = (import.meta.env.VITE_FOOTER_AD_CTA as string | undefined) ?? "VISIT →";

const DISMISS_KEY = "nl-footer-ad-dismissed";

function readDismissed(): boolean {
  try {
    return sessionStorage.getItem(DISMISS_KEY) === "1";
  } catch {
    return false;
  }
}

function writeDismissed(value: boolean) {
  try {
    if (value) sessionStorage.setItem(DISMISS_KEY, "1");
    else sessionStorage.removeItem(DISMISS_KEY);
  } catch {
    /* storage unavailable — fall back to in-memory state only */
  }
}

export function Footer() {
  const [hidden, setHidden] = useState<boolean>(readDismissed);
  const [hover, setHover] = useState(false);
  const isPlaceholder = !AD_URL;

  function dismiss() {
    setHidden(true);
    writeDismissed(true);
  }
  function restore() {
    setHidden(false);
    writeDismissed(false);
  }

  if (hidden) {
    return (
      <div
        style={{
          gridArea: "foot",
          display: "flex",
          justifyContent: "flex-end",
          padding: "8px 16px",
          background: "var(--bg)",
          borderTop: "1px solid var(--hair)",
        }}
      >
        <button
          onClick={restore}
          aria-label="Show featured partner"
          style={{
            background: "var(--bg)",
            border: "1px solid var(--hair-strong)",
            padding: "8px 12px",
            cursor: "pointer",
            fontFamily: "var(--f-mono)",
            fontSize: "var(--ms-mono-micro)",
            letterSpacing: "0.28em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
          }}
        >
          show partner ↑
        </button>
      </div>
    );
  }

  const leftTag = (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 22px",
        borderRight: "1px solid var(--hair)",
      }}
    >
      <span
        style={{
          display: "inline-block",
          width: 14,
          height: 1,
          background: "var(--ink-3)",
        }}
      />
      <MarkCaps>{isPlaceholder ? "Advertisement" : "Partnered with"}</MarkCaps>
    </div>
  );

  const slot = (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        position: "relative",
        margin: "10px 18px",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: 14,
      }}
    >
      <Brackets color={hover ? "var(--accent)" : "var(--ink-3)"} />
      <span
        className="pl-display"
        style={{
          fontSize: "var(--ms-body-lg)",
          lineHeight: 1,
          color: "var(--ink)",
        }}
      >
        {AD_HEADLINE}
      </span>
      <span style={{ width: 1, height: 18, background: "var(--hair-strong)" }} />
      <span
        style={{
          fontFamily: "var(--f-body)",
          fontSize: "var(--ms-body)",
          color: "var(--ink-2)",
        }}
      >
        {AD_TAGLINE}
      </span>
    </div>
  );

  const rightCta = AD_URL ? (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        borderLeft: "1px solid var(--hair)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--f-body)",
          fontWeight: 700,
          fontSize: "var(--ms-mono-small)",
          color: "var(--accent)",
          letterSpacing: "0.16em",
          textTransform: "uppercase",
          borderBottom: "2px solid var(--accent)",
          paddingBottom: 2,
        }}
      >
        {AD_CTA}
      </span>
    </div>
  ) : (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 10,
        padding: "0 18px",
        borderLeft: "1px solid var(--hair)",
      }}
    >
      <span
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: "var(--ms-mono-micro)",
          color: "var(--ink-3)",
          letterSpacing: "0.24em",
          textTransform: "uppercase",
        }}
      >
        inquiries@nutrition-label-generator.org
      </span>
    </div>
  );

  // Inner row layout — single subgrid for tag · slot · CTA. Wrapped in either
  // a single <a> (when AD_URL is set) or a plain <div>. The dismiss × stays
  // outside this wrapper.
  const rowStyle: CSSProperties = {
    display: "grid",
    gridTemplateColumns: "auto 1fr auto",
    alignItems: "stretch",
    minWidth: 0,
  };

  const row = AD_URL ? (
    <a
      href={AD_URL}
      target="_blank"
      rel="noopener noreferrer sponsored"
      style={{ ...rowStyle, textDecoration: "none", color: "inherit" }}
    >
      {leftTag}
      {slot}
      {rightCta}
    </a>
  ) : (
    <div style={rowStyle}>
      {leftTag}
      {slot}
      {rightCta}
    </div>
  );

  return (
    <footer
      aria-label="Featured partner"
      style={{
        gridArea: "foot",
        position: "relative",
        background: "var(--bg)",
        borderTop: "1px solid var(--hair-strong)",
        boxShadow: "0 -16px 32px -20px rgba(0,0,0,0.18)",
        display: "grid",
        gridTemplateColumns: "1fr auto",
        alignItems: "stretch",
        minHeight: 84,
      }}
    >
      {row}

      {/* DISMISS — kept outside the anchor so clicks here never count as ad clicks. */}
      <button
        onClick={dismiss}
        aria-label="Dismiss featured partner"
        style={{
          background: "transparent",
          border: "none",
          padding: "0 22px",
          cursor: "pointer",
          color: "var(--ink-3)",
          fontSize: 18,
          lineHeight: 1,
          borderLeft: "1px solid var(--hair)",
        }}
      >
        ×
      </button>
    </footer>
  );
}

// L-shaped corner brackets — stamp the slot as a frame for the ad.
function Brackets({ color = "var(--ink-3)" }: { color?: string }) {
  const base: CSSProperties = {
    position: "absolute",
    width: 10,
    height: 10,
    pointerEvents: "none",
    transition: "border-color 160ms ease",
  };
  return (
    <>
      <span style={{ ...base, top: 0, left: 0, borderTop: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ ...base, top: 0, right: 0, borderTop: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
      <span style={{ ...base, bottom: 0, left: 0, borderBottom: `1px solid ${color}`, borderLeft: `1px solid ${color}` }} />
      <span style={{ ...base, bottom: 0, right: 0, borderBottom: `1px solid ${color}`, borderRight: `1px solid ${color}` }} />
    </>
  );
}

function MarkCaps({ children }: { children: React.ReactNode }) {
  return (
    <span
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: "var(--ms-mono-micro)",
        letterSpacing: "0.32em",
        textTransform: "uppercase",
        color: "var(--ink-3)",
      }}
    >
      {children}
    </span>
  );
}
