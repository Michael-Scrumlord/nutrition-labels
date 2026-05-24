// Shared Playwright fixtures.
//
// Goals:
//   • Deterministic state — block /api/* so an in-flight ingredient search or
//     analytics ping can't shift layout mid-assertion. The editor's default
//     in-memory state (empty recipe, 2.75" × auto label) is what we test
//     against; that state is the one a first-time visitor sees.
//   • Reduced motion + disabled animations so transitions can't race a
//     measurement.
//   • Stable fonts: we explicitly wait for `document.fonts.ready` since the
//     editorial type ramp uses IBM Plex and a late font swap would change
//     widths under us.

import { test as base, expect, type Page } from "@playwright/test";

export const test = base.extend<{ readyPage: Page }>({
  readyPage: async ({ page }, use) => {
    // Block backend calls — keeps state deterministic. The matcher must
    // anchor on the URL pathname, *not* glob the substring "api", because
    // Vite serves source modules from /src/api/client.ts in dev mode and a
    // loose glob would block the app's own JS, leaving the page blank.
    await page.route(
      (url) => url.pathname.startsWith("/api/"),
      (route) => route.abort(),
    );
    // Block third-party ads (AdSense, Google Anchor) so they can't inject
    // unmeasured iframes.
    await page.route(/(googlesyndication|googletagmanager|doubleclick)/, (r) => r.abort());

    // Reduced motion.
    await page.emulateMedia({ reducedMotion: "reduce" });

    // Kill CSS transitions/animations defensively.
    await page.addInitScript(() => {
      const style = document.createElement("style");
      style.textContent = `*, *::before, *::after {
        transition: none !important;
        animation: none !important;
      }`;
      document.documentElement.appendChild(style);
    });

    await use(page);
  },
});

export { expect };

/** Wait for fonts + a settled frame before measuring. */
export async function waitStable(page: Page) {
  await page.evaluate(() => document.fonts?.ready);
  // Two RAFs — first lets React commit, second lets layout settle.
  await page.evaluate(
    () =>
      new Promise<void>((r) =>
        requestAnimationFrame(() => requestAnimationFrame(() => r())),
      ),
  );
}

/** Routes exercised by every viewport-sensitive suite. */
export const ROUTES = [
  { path: "/",        name: "home (AppShell)" },
  { path: "/about",   name: "about" },
  { path: "/privacy", name: "privacy" },
  { path: "/terms",   name: "terms" },
  { path: "/guides",  name: "guides index" },
];
