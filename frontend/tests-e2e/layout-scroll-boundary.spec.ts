// Scroll-boundary layout test (Pillar 1).
//
// For each route, walks every element under <body> and flags any whose
// scrollWidth exceeds its clientWidth — the canonical "child is wider than
// its parent" signal. The same check runs for height to catch vertical
// overflow on fixed-height regions.
//
// On failure we report the *narrowest* offender — the deepest element in
// the chain whose own content overflows. Reporting the document root would
// just say "page is too wide"; the deepest overflowing node is the actual
// culprit because every ancestor is overflowing only as a consequence of it.
//
// The test runs at all three viewport projects in playwright.config.ts. The
// 320px project is the strict mobile boundary called out in the spec.

import { test, expect, waitStable, ROUTES } from "./fixtures/page";

interface OverflowHit {
  selector: string;
  tag: string;
  testId: string | null;
  ariaLabel: string | null;
  role: string | null;
  scrollW: number;
  clientW: number;
  scrollH: number;
  clientH: number;
  axis: "x" | "y" | "both";
  sourceText: string;
}

// Allowlist: elements where horizontal scroll is intentional. Keep this
// list explicit and narrow — every entry is a documented design choice,
// not a workaround.
const SCROLL_ALLOWLIST = [
  // NutritionBreakdownTable wraps the per-ingredient table in overflow-x-auto
  // intentionally so wide nutrient columns scroll within the card instead
  // of expanding the page.
  ".overflow-x-auto",
];

test.describe("scroll-boundary: no element exceeds its parent", () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path})`, async ({ readyPage: page }, testInfo) => {
      await page.goto(route.path);
      await waitStable(page);

      const hits: OverflowHit[] = await page.evaluate((allowlist) => {
        function describe(el: Element): string {
          const id = el.id ? `#${el.id}` : "";
          const cls =
            el instanceof HTMLElement && el.className && typeof el.className === "string"
              ? "." + el.className.trim().split(/\s+/).slice(0, 3).join(".")
              : "";
          const testId = el.getAttribute("data-testid");
          const tid = testId ? `[data-testid="${testId}"]` : "";
          return `${el.tagName.toLowerCase()}${id}${tid}${cls}`;
        }

        function inAllowlist(el: Element): boolean {
          return allowlist.some((sel) => el.closest(sel) !== null);
        }

        const all: OverflowHit[] = [];
        // viewport-relative tolerance: 1px guards against sub-pixel rounding
        // on HiDPI; do not loosen this.
        const TOL = 1;

        document.querySelectorAll<HTMLElement>("body *").forEach((el) => {
          if (inAllowlist(el)) return;
          const cs = getComputedStyle(el);
          // Skip absolutely-positioned elements themselves — they're checked
          // through their containing-block ancestor.
          if (cs.position === "absolute" || cs.position === "fixed") return;
          if (cs.display === "none" || cs.visibility === "hidden") return;

          // What counts as a violation depends on the element's overflow
          // value:
          //
          //   visible          — parent opts into bleeding children (e.g.
          //                      the label-paper wrapper whose resize
          //                      handles intentionally peek past the
          //                      paper's edges as drag affordances). The
          //                      meaningful check belongs on the nearest
          //                      scroll-container ancestor instead. Skip.
          //   auto | scroll    — element IS a scroll container. Having
          //                      content taller/wider than the viewport
          //                      is the entire point of these values; a
          //                      scrollbar appearing here is correct, not
          //                      a bug. Skip.
          //   hidden | clip    — content is silently CHOPPED OFF if it
          //                      overflows. Always a bug. Flag.
          function isBug(overflow: string): boolean {
            return overflow === "hidden" || overflow === "clip";
          }

          const overX = isBug(cs.overflowX) && el.scrollWidth  - el.clientWidth  > TOL;
          const overY = isBug(cs.overflowY) && el.scrollHeight - el.clientHeight > TOL;
          if (!overX && !overY) return;

          all.push({
            selector:   describe(el),
            tag:        el.tagName.toLowerCase(),
            testId:     el.getAttribute("data-testid"),
            ariaLabel:  el.getAttribute("aria-label"),
            role:       el.getAttribute("role"),
            scrollW:    el.scrollWidth,
            clientW:    el.clientWidth,
            scrollH:    el.scrollHeight,
            clientH:    el.clientHeight,
            axis:       overX && overY ? "both" : overX ? "x" : "y",
            sourceText: (el.textContent ?? "").trim().slice(0, 80),
          });
        });

        // Sort by depth descending → deepest offender first. Two elements
        // overflowing the same amount? Prefer the one furthest from <body>.
        all.sort((a, b) => b.selector.length - a.selector.length);
        return all;
      }, SCROLL_ALLOWLIST);

      // Annotate the test report with everything we found, in priority order.
      if (hits.length > 0) {
        await testInfo.attach("overflow-report.json", {
          body: JSON.stringify(hits, null, 2),
          contentType: "application/json",
        });
        await testInfo.attach("page.png", {
          body: await page.screenshot({ fullPage: true }),
          contentType: "image/png",
        });
      }

      // Build a clear failure message naming the culprit and its dimensions.
      const summary = hits
        .slice(0, 5)
        .map(
          (h) =>
            `  • ${h.selector}\n` +
            `      axis=${h.axis}  scrollW=${h.scrollW}px clientW=${h.clientW}px` +
            `  (overflow=${h.scrollW - h.clientW}px)\n` +
            `      role=${h.role ?? "—"}  aria-label=${h.ariaLabel ?? "—"}` +
            `  testid=${h.testId ?? "—"}\n` +
            `      text="${h.sourceText}"`,
        )
        .join("\n");

      expect(
        hits,
        `Found ${hits.length} element(s) overflowing their parent on ${route.path}:\n${summary}`,
      ).toEqual([]);
    });
  }
});
