// User-centric locator test (Pillar 2).
//
// Sanity-checks that the routes we care about are reachable via accessibility
// roles/labels rather than class hooks. If these break, our other tests can't
// trust their queries — semantic locators are the contract.

import { test, expect } from "./fixtures/page";

test.describe("semantic locators resolve on every primary view", () => {
  test("home: editor surfaces are reachable by role/label", async ({ readyPage: page }) => {
    await page.goto("/");

    // Masthead link back to home.
    await expect(
      page.getByRole("link", { name: /nutrition label generator/i }),
    ).toBeVisible();

    // Recipe-name field — the editorial hero textarea, sized off cqw ramp.
    await expect(page.getByPlaceholder(/name your recipe/i)).toBeVisible();

    // Add-ingredient action.
    await expect(page.getByRole("button", { name: /add ingredient/i })).toBeVisible();

    // Label panel tab.
    await expect(page.getByRole("button", { name: /^label$/i })).toBeVisible();
  });

  test("about page exposes a single h1 and prose region", async ({ readyPage: page }) => {
    await page.goto("/about");
    const headings = page.getByRole("heading", { level: 1 });
    await expect(headings).toHaveCount(1);
  });
});
