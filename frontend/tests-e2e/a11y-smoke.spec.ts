// Automated accessibility scan (Pillar 3).
//
// axe-core/playwright run at each viewport project. We fail on serious +
// critical only — minor/moderate issues (decorative-only contrast, etc.)
// are surfaced as report attachments but do not block the build, so we
// don't drown the signal on the issues that actually break users.
//
// Tag filter: wcag2a + wcag2aa cover the standards we commit to.

import AxeBuilder from "@axe-core/playwright";
import { test, expect, waitStable, ROUTES } from "./fixtures/page";

// Rules that surface as warnings (attached to the test) but don't block CI.
// (Empty for now — color-contrast was the only entry and was retired when
// the palette was darkened to meet AA 4.5:1 across all four themes. Re-add
// rule ids here if a future design decision is intentionally non-conforming.)
const NON_BLOCKING_RULES = new Set<string>();

test.describe("axe accessibility smoke", () => {
  for (const route of ROUTES) {
    test(`${route.name} (${route.path})`, async ({ readyPage: page }, testInfo) => {
      await page.goto(route.path);
      await waitStable(page);

      const results = await new AxeBuilder({ page })
        .withTags(["wcag2a", "wcag2aa"])
        .analyze();

      // Annotate warnings so they appear in the run summary without failing.
      for (const v of results.violations) {
        if (NON_BLOCKING_RULES.has(v.id)) {
          testInfo.annotations.push({
            type: `a11y-warning (${v.id})`,
            description: `${route.path}: ${v.nodes.length} node(s) — ${v.help}`,
          });
        }
      }

      const blocking = results.violations.filter(
        (v) =>
          (v.impact === "serious" || v.impact === "critical") &&
          !NON_BLOCKING_RULES.has(v.id),
      );

      if (results.violations.length > 0) {
        await testInfo.attach("axe-violations.json", {
          body: JSON.stringify(results.violations, null, 2),
          contentType: "application/json",
        });
      }

      const summary = blocking
        .map(
          (v) =>
            `  • [${v.impact}] ${v.id} — ${v.help}\n` +
            `      ${v.nodes.length} node(s); first: ${v.nodes[0]?.target.join(" ")}`,
        )
        .join("\n");

      expect(
        blocking,
        `axe found ${blocking.length} serious/critical violation(s) on ${route.path}:\n${summary}`,
      ).toEqual([]);
    });
  }
});
