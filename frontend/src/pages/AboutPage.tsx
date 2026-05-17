// pages/AboutPage.tsx — Static "About" page.
//
// AdSense readiness: an /about page identifies the site operator and
// explains what the site does + how it's funded. Reviewers treat anonymous
// sites with no ownership info as a yellow flag.

import { InfoPageShell } from "../components/layout/InfoPageShell";

export function AboutPage() {
  return (
    <InfoPageShell title="About Nutrition Label" kicker="The Project">
      <p>
        Nutrition Label is a free, browser-based tool for designing
        FDA-style Nutrition Facts labels for the recipes you actually cook.
        Add ingredients, set portion sizes, and export a print-ready PDF in
        the dimensions you need.
      </p>

      <h2>What it does</h2>
      <p>
        The generator pulls ingredient data from the USDA FoodData Central
        database, calculates macronutrient totals per serving, and renders
        a label that matches the layout and typography rules used on
        packaged food in the United States. Recipes you save stay in your
        browser — there are no accounts, and recipe data is never sent to
        a server.
      </p>

      <h2>Who runs it</h2>
      <p>
        Built and maintained by Michael Daza. The project is open to
        feedback, bug reports, and partnership inquiries at the contact
        email in the footer.
      </p>

      <h2>How it's funded</h2>
      <p>
        Nutrition Label is free to use. Costs (domain, hosting, the time
        spent shipping new features) are covered by a small number of
        advertisements served by Google AdSense and by readers who choose
        to support the project through the Donate link. We do not sell
        access, run paid plans, or share data with third parties beyond
        what is described in the{" "}
        <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>What's next</h2>
      <p>
        On the near-term roadmap: a small library of original guides
        ("How to read a Nutrition Facts label", "FDA label requirements for
        home bakers"), additional unit and allergen support, and a
        downloadable print template pack.
      </p>
    </InfoPageShell>
  );
}
