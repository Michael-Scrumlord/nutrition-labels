// pages/TermsPage.tsx — Short site terms.
//
// Starting-draft terms for an indie tool. Not a substitute for legal
// review. AdSense application doesn't strictly require this, but
// reviewers expect it to be present.

import { InfoPageShell } from "../components/layout/InfoPageShell";
import { usePageMeta } from "../hooks/usePageMeta";

const LAST_UPDATED = "2026-05-17";

export function TermsPage() {
  usePageMeta({
    title: "Terms of Use",
    description:
      "Terms of Use for Nutrition Label Generator — the rules that govern access to and use of the free FDA-style label generator and the content it produces.",
    canonical: "/terms",
  });

  return (
    <InfoPageShell title="Terms of Use" kicker={`Last updated · ${LAST_UPDATED}`}>
      <p>
        These terms govern your use of Nutrition Label Generator ("the Site"). By
        accessing or using the Site, you agree to be bound by them. If you
        do not agree, do not use the Site.
      </p>

      <h2>The service</h2>
      <p>
        The Site is a free tool for generating FDA-style Nutrition Facts
        labels from ingredient data sourced from the USDA FoodData Central
        database. The Site is provided for personal and small-business
        use, including labeling recipes for home, classroom, market, or
        small-batch production purposes.
      </p>

      <h2>No professional advice</h2>
      <p>
        Output from the Site is generated from publicly available
        nutrition data and rounding rules. It is provided for general
        informational purposes and is not a substitute for laboratory
        analysis or formal FDA compliance review. If you intend to use a
        generated label on packaged food sold to the public, you are
        responsible for verifying its accuracy and for meeting all
        applicable regulatory requirements.
      </p>

      <h2>Acceptable use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the Site for any unlawful purpose.</li>
        <li>
          Interfere with, probe, scrape, or attempt to disrupt the Site or
          the systems supporting it.
        </li>
        <li>
          Use automated means to access the Site at rates exceeding the
          published rate limits.
        </li>
        <li>
          Attempt to reverse engineer, decompile, or extract source code
          beyond what is permitted by applicable law.
        </li>
      </ul>

      <h2>Intellectual property</h2>
      <p>
        The Site's design, layout, code, and content (excluding USDA data
        and third-party advertisements) are © Nutrition Label Generator and may not
        be reproduced without permission. Recipes you create with the Site
        belong to you.
      </p>

      <h2>Third-party content</h2>
      <p>
        The Site displays advertisements served by third parties. We are
        not responsible for the content of those advertisements or for the
        sites they link to.
      </p>

      <h2>Disclaimer of warranties</h2>
      <p>
        The Site is provided <strong>"as is"</strong> and{" "}
        <strong>"as available"</strong>, without warranties of any kind,
        express or implied, including merchantability, fitness for a
        particular purpose, and non-infringement. We do not warrant that
        the Site will be uninterrupted, error-free, or that nutrition
        calculations will exactly match any laboratory or regulatory
        result.
      </p>

      <h2>Limitation of liability</h2>
      <p>
        To the maximum extent permitted by law, Nutrition Label Generator and its
        operator shall not be liable for any indirect, incidental,
        consequential, special, or exemplary damages arising from your use
        of, or inability to use, the Site.
      </p>

      <h2>Changes</h2>
      <p>
        We may update these terms from time to time. Continued use of the
        Site after changes are posted constitutes acceptance of the
        updated terms.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about these terms can be sent to{" "}
        <a href="mailto:inquiries@nutrition-label-generator.org">
          inquiries@nutrition-label-generator.org
        </a>.
      </p>
    </InfoPageShell>
  );
}
