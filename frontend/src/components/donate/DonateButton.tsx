// DonateButton.tsx — Lives in the editorial masthead.
//
// Renders only when VITE_DONATE_URL is set at build time (see .env.example).
// The button is a plain anchor — no JS handles funds, no third-party widget,
// no runtime fetch. The destination is baked into the bundle at build time.

const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;
const DONATE_LABEL = (import.meta.env.VITE_DONATE_LABEL as string | undefined) ?? "DONATE";

export function DonateButton() {
  if (!DONATE_URL) return null;

  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer external"
      className="pl-meta"
      style={{
        display: "inline-flex",
        alignItems: "baseline",
        gap: 6,
        textDecoration: "none",
        color: "var(--ink-3)",
        transition: "color 160ms ease",
        cursor: "pointer",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-3)";
      }}
    >
      {DONATE_LABEL}
    </a>
  );
}
