// DonateButton.tsx — Primary plinth CTA in the editorial masthead.
//
// Renders only when VITE_DONATE_URL is set at build time (see .env.example).
// The button is a plain anchor — no JS handles funds, no third-party widget,
// no runtime fetch. The destination is baked into the bundle at build time.
//
// Visual design (Affordance · Plinth direction): filled accent .sig-btn
// .sig-primary with a "↳" arrow glyph — reads as the canonical CTA, sits in
// the affordance system alongside the other plinth buttons.

const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;
const DONATE_LABEL = (import.meta.env.VITE_DONATE_LABEL as string | undefined) ?? "DONATE";

export function DonateButton() {
  if (!DONATE_URL) return null;

  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer external"
      className="sig-btn sig-primary"
      aria-label="Donate to support this project"
      style={{ textDecoration: "none" }}
    >
      <span aria-hidden="true">↳</span>
      {DONATE_LABEL}
    </a>
  );
}
