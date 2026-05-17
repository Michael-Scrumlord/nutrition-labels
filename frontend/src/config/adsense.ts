// config/adsense.ts — single source of truth for AdSense identifiers.
//
// Everything that depends on the publisher ID, the ad slot IDs, or the
// "is AdSense enabled" flag should import from here. That way, when you
// get your real IDs from Google after Phase 4, there's exactly one
// place to update them.
//
// ────────────────────────────────────────────────────────────────────────
// PLACEHOLDERS — REPLACE BEFORE PHASE 5 / PHASE 6 GO-LIVE
// ────────────────────────────────────────────────────────────────────────
//
//   ADSENSE_PUBLISHER_ID  →  your "ca-pub-…" client ID from AdSense
//   ADSENSE_SIDEBAR_SLOT  →  the slot ID for the sidebar rectangle
//                            (created in AdSense → Ads → By ad unit)
//
// Until both are replaced with real values, IS_ADSENSE_CONFIGURED stays
// false and no AdSense code should be loaded. The placeholder strings
// below intentionally don't look like valid IDs (no all-digit suffix) so
// that an accidental ship to prod with placeholders in place fails fast
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
