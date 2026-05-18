// config/adsense.ts — single source of truth for AdSense identifiers
// and the runtime bootstrap that injects the AdSense + Funding Choices
// (CMP) scripts.
//
// Everything that depends on the publisher ID, the ad slot IDs, or the
// "is AdSense enabled" flag imports from here. That way, when you get
// your real IDs from Google after Phase 4, there's exactly one place to
// update them.
//
// ────────────────────────────────────────────────────────────────────────
// PLACEHOLDERS — REPLACE BEFORE PHASE 6 GO-LIVE
// ────────────────────────────────────────────────────────────────────────
//
//   ADSENSE_PUBLISHER_ID  →  your "ca-pub-…" client ID from AdSense
//   ADSENSE_SIDEBAR_SLOT  →  the slot ID for the sidebar rectangle
//                            (created in AdSense → Ads → By ad unit)
//
// Until both are replaced with real values, IS_ADSENSE_CONFIGURED stays
// false and bootstrapAdSense() is a no-op. The placeholder strings below
// intentionally don't look like valid IDs (no all-digit suffix) so that
// an accidental ship to prod with placeholders in place fails fast
// rather than silently 404'ing inside Google.

export const ADSENSE_PUBLISHER_ID =
  (import.meta.env.VITE_ADSENSE_PUBLISHER_ID as string | undefined) ??
  "ca-pub-REPLACE_ME";

export const ADSENSE_SIDEBAR_SLOT =
  (import.meta.env.VITE_ADSENSE_SIDEBAR_SLOT as string | undefined) ??
  "REPLACE_ME";

export const IS_ADSENSE_CONFIGURED =
  !ADSENSE_PUBLISHER_ID.includes("REPLACE_ME") &&
  !ADSENSE_SIDEBAR_SLOT.includes("REPLACE_ME");

/** Set `VITE_ADSENSE_LOAD_IN_DEV=1` to load AdSense + CMP in `vite dev`
 *  too. By default the bootstrap only runs in production builds, because
 *  AdSense reports invalid-traffic for dev domains and serves housekeeping
 *  ads that pollute the editor experience. */
const LOAD_IN_DEV = import.meta.env.VITE_ADSENSE_LOAD_IN_DEV === "1";

function injectScript(
  src: string,
  attrs: Record<string, string> = {},
): HTMLScriptElement | null {
  if (typeof document === "undefined") return null;
  if (document.querySelector(`script[src="${src}"]`)) return null;
  const s = document.createElement("script");
  s.async = true;
  s.src = src;
  s.crossOrigin = "anonymous";
  for (const [k, v] of Object.entries(attrs)) s.setAttribute(k, v);
  document.head.appendChild(s);
  return s;
}

/** Idempotent — safe to call from React.StrictMode double-effects. */
export function bootstrapAdSense(): void {
  if (!IS_ADSENSE_CONFIGURED) return;
  if (!import.meta.env.PROD && !LOAD_IN_DEV) return;

  // Main AdSense library. AdSense's Auto Ads + the per-unit <ins
  // class="adsbygoogle"> tags both rely on this script being present.
  injectScript(
    `https://pagead2.googlesyndication.com/pagead/js/adsbygoogle.js?client=${encodeURIComponent(
      ADSENSE_PUBLISHER_ID,
    )}`,
  );

  // Funding Choices (Google's certified CMP). Loaded as a separate
  // script so the GDPR / UK GDPR / Swiss FADP consent banner appears
  // for EEA/UK/CH visitors even before any ad slot mounts. Behaviour is
  // configured in AdSense → Privacy & messaging, not here.
  injectScript(
    `https://fundingchoicesmessages.google.com/i/${encodeURIComponent(
      ADSENSE_PUBLISHER_ID.replace(/^ca-/, ""),
    )}?ers=1`,
    { "data-cfasync": "false" },
  );
}
