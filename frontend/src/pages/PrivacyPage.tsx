// pages/PrivacyPage.tsx — Privacy policy.
//
// This is the publicly accessible privacy policy required by the AdSense
// Online Terms of Service §10 ("Properties have a clearly labeled and
// easily accessible privacy policy"). It also references the third-party
// vendors and opt-out mechanisms required by the EU User Consent Policy.
//
// IMPORTANT: this is a starting draft for an indie project. Before
// applying for AdSense or going live in EU/UK/CH, have it reviewed by
// someone qualified to confirm it matches what the site actually does.

import { InfoPageShell } from "../components/layout/InfoPageShell";
import { usePageMeta } from "../hooks/usePageMeta";

const LAST_UPDATED = "2026-05-17";

export function PrivacyPage() {
  usePageMeta({
    title: "Privacy Policy",
    description:
      "How Nutrition Label Generator handles your data — what we collect, how cookies and Google AdSense work on this site, and the choices you have under GDPR, UK GDPR, and Swiss FADP.",
    canonical: "/privacy",
  });

  return (
    <InfoPageShell title="Privacy Policy" kicker={`Last updated · ${LAST_UPDATED}`}>
      <p>
        This policy describes what information Nutrition Label Generator
        ("the Site", "we") collects when you use it, what we do with that
        information, and the choices you have. By using the Site you agree
        to this policy.
      </p>

      <h2>Information we collect</h2>
      <p>
        <strong>You do not need an account to use the generator.</strong>{" "}
        Recipes you create are stored in your own browser using
        <code> localStorage</code> and are not transmitted to our servers.
      </p>
      <p>
        Our backend receives ordinary HTTP request metadata — IP address,
        user agent, and the URL requested — which is used for rate
        limiting, abuse prevention, and short-term operational logging. We
        do not associate this metadata with a personal profile.
      </p>
      <p>
        When you search for ingredients, the search query is forwarded to
        the USDA FoodData Central API in order to return matching foods.
      </p>

      <h2>Cookies, local storage, and similar technologies</h2>
      <p>
        The Site itself does not set tracking cookies for its own
        analytics. We use <code>localStorage</code> to remember the recipes
        you save and your theme preference.
      </p>
      <p>
        Once advertising is enabled (see below), Google and its partners
        may set cookies and similar identifiers on your device to serve
        and measure ads. You can manage these in your browser settings or
        via the opt-out tools listed under "Your choices".
      </p>

      <h2>Advertising</h2>
      <p>
        We use Google AdSense, a third-party ad network operated by
        Google LLC, to display advertisements on the Site. Google and its
        ad partners may use cookies, device identifiers, approximate
        location, and other information to serve ads, including ads
        personalized to your interests where you have consented to such
        use.
      </p>
      <p>
        For more information about how Google uses data from sites that
        use its services, see{" "}
        <a
          href="https://policies.google.com/technologies/partner-sites"
          target="_blank"
          rel="noopener noreferrer"
        >
          Google's privacy and terms
        </a>.
      </p>

      <h2>Users in the EEA, United Kingdom, and Switzerland</h2>
      <p>
        Where required by the GDPR, UK GDPR, or Swiss FADP, we ask for
        your consent before non-essential cookies are set on your device.
        You can change or withdraw consent at any time using the privacy
        controls available in the consent banner.
      </p>

      <h2>Your choices</h2>
      <ul>
        <li>
          Manage Google ad personalization at{" "}
          <a
            href="https://myadcenter.google.com/"
            target="_blank"
            rel="noopener noreferrer"
          >
            Google My Ad Center
          </a>.
        </li>
        <li>
          Industry opt-out tools:{" "}
          <a href="https://optout.networkadvertising.org/" target="_blank" rel="noopener noreferrer">
            NAI
          </a>
          ,{" "}
          <a href="https://optout.aboutads.info/" target="_blank" rel="noopener noreferrer">
            DAA (US)
          </a>
          ,{" "}
          <a href="https://www.youronlinechoices.eu/" target="_blank" rel="noopener noreferrer">
            EDAA (EU)
          </a>.
        </li>
        <li>
          Clear stored recipes by clearing site data in your browser, or
          by using the Reset Recipe control in the editor.
        </li>
      </ul>

      <h2>Data retention</h2>
      <p>
        Operational request logs are retained for a short period (no more
        than 30 days) and then discarded. Recipes you save in your browser
        remain there until you clear them.
      </p>

      <h2>Children</h2>
      <p>
        The Site is not directed to children under 13 and we do not
        knowingly collect personal information from them.
      </p>

      <h2>Changes to this policy</h2>
      <p>
        We may update this policy from time to time. The "Last updated"
        date at the top of this page reflects the most recent revision.
      </p>

      <h2>Contact</h2>
      <p>
        Questions about this policy can be sent to{" "}
        <a href="mailto:inquiries@nutrition-label-generator.org">
          inquiries@nutrition-label-generator.org
        </a>.
      </p>
    </InfoPageShell>
  );
}
