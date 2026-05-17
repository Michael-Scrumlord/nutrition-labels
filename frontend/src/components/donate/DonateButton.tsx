// DonateButton.tsx — Filled accent CTA pill in the editorial masthead.
//
// Renders only when VITE_DONATE_URL is set at build time (see .env.example).
// The button is a plain anchor — no JS handles funds, no third-party widget,
// no runtime fetch. The destination is baked into the bundle at build time.
//
// Visual design (R · Ledger direction): filled accent block + bold tracked
// caps + arrow read as "action, not link", plus a small mono "SUPPORT · THIS
// PROJECT" caption that gives it editorial character. Styles live in
// index.css under the `.donate-pill` class so they participate in the cqw
// type ramp.

const DONATE_URL = import.meta.env.VITE_DONATE_URL as string | undefined;
const DONATE_LABEL = (import.meta.env.VITE_DONATE_LABEL as string | undefined) ?? "DONATE";
const DONATE_SUB =
  (import.meta.env.VITE_DONATE_SUB as string | undefined) ?? "SUPPORT · THIS PROJECT";

export function DonateButton() {
  if (!DONATE_URL) return null;

  return (
    <a
      href={DONATE_URL}
      target="_blank"
      rel="noopener noreferrer external"
      className="donate-pill"
      aria-label="Donate to support this project"
    >
      <span className="donate-pill__rail" aria-hidden="true" />
      <span className="donate-pill__label">
        <span className="donate-pill__cta">
          {DONATE_LABEL}
          <span className="donate-pill__arrow" aria-hidden="true">
            →
          </span>
        </span>
        <span className="donate-pill__sub">{DONATE_SUB}</span>
      </span>
    </a>
  );
}
