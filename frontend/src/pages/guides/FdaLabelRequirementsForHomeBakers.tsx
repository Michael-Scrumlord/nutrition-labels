import { Link } from "react-router-dom";
import { GuideShell } from "../../components/layout/GuideShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { guideBySlug } from "./registry";

const SLUG = "fda-label-requirements-for-home-bakers";

export function FdaLabelRequirementsForHomeBakers() {
  const guide = guideBySlug(SLUG)!;
  usePageMeta({
    title: guide.title,
    description: guide.summary,
    canonical: `/guides/${SLUG}`,
  });

  return (
    <GuideShell guide={guide}>
      <p>
        If you're selling baked goods, jams, or any packaged food at
        farmers' markets, online, or to a local café, the rules you have
        to follow live in two places: <strong>state cottage food law</strong>{" "}
        for the smallest operators, and <strong>federal FDA labeling
        regulations</strong> (21 CFR Part 101) for anyone selling across
        state lines, into stores, or beyond a state-specific revenue cap.
        This guide focuses on the FDA half.
      </p>

      <h2>When you need a Nutrition Facts panel</h2>
      <p>
        Most packaged foods sold in interstate commerce require a
        Nutrition Facts panel. The big exception is the{" "}
        <strong>Small Business Nutrition Labeling Exemption</strong>: if
        you sell fewer than 100,000 units of a given product per year and
        your business has fewer than 100 full-time-equivalent employees,
        you can file an annual notice with the FDA and skip the nutrition
        panel itself. <em>You still owe every other label element.</em>
      </p>
      <p>
        Making a nutrient-content or health claim ("low fat," "high
        fiber," "supports immune health") voids the exemption — claims
        require the panel.
      </p>

      <h2>The five elements every label needs</h2>
      <ol>
        <li>
          <strong>Statement of identity.</strong> The common name of the
          food, on the principal display panel, in bold type at least half
          the height of the largest type on the label.
        </li>
        <li>
          <strong>Net quantity of contents.</strong> Both US customary
          (oz, lb) and metric (g, kg) units, in the bottom 30% of the
          principal display panel.
        </li>
        <li>
          <strong>Ingredient list.</strong> Every ingredient in descending
          order by weight, with sub-ingredients in parentheses.
        </li>
        <li>
          <strong>Nutrition Facts panel</strong> (or a valid exemption
          filed).
        </li>
        <li>
          <strong>Name and place of business</strong> of the manufacturer,
          packer, or distributor — a full street address unless the firm
          is in a current US city directory or phone listing.
        </li>
      </ol>

      <h2>Allergen disclosure is non-negotiable</h2>
      <p>
        The Big 9 allergens — milk, eggs, fish, crustacean shellfish, tree
        nuts, peanuts, wheat, soybeans, and (since the 2023 FASTER Act)
        sesame — must be disclosed either inside the ingredient list or
        in a "Contains:" statement immediately below it. There is no
        exemption from this for small producers. See{" "}
        <Link to="/guides/labeling-allergens-correctly">
          Labeling Allergens Correctly
        </Link>{" "}
        for the two valid formats and the most common mistakes.
      </p>

      <h2>Serving size: not your choice</h2>
      <p>
        The serving size on your label is determined by the FDA's
        Reference Amounts Customarily Consumed (RACCs) for your product
        category, not by what you'd consider a serving. A muffin between
        100g and 200g is one serving; cookies are measured to roughly 30g.
        The full mechanics are in{" "}
        <Link to="/guides/serving-size-rules-racc-explained">
          Serving Size Rules: RACC Explained
        </Link>.
      </p>

      <h2>Format options for the panel</h2>
      <p>
        Three panel formats are valid:
      </p>
      <ul>
        <li>
          <strong>Standard vertical</strong> — the familiar block. Use it
          whenever you have room.
        </li>
        <li>
          <strong>Tabular</strong> — horizontal layout for short, wide
          packages.
        </li>
        <li>
          <strong>Linear</strong> — a single-line list of nutrients,
          permitted only when the package's total available label space is
          smaller than 40 square inches.
        </li>
      </ul>
      <p>
        Whatever you pick, the type sizes are spelled out: "Nutrition
        Facts" at minimum 13 pt, the serving size and calories at minimum
        10 pt with calories in bold, the rest at minimum 8 pt. Bold rules
        of specific thicknesses separate the calorie block, the
        nutrients, and the %DV footnote.
      </p>

      <h2>Country of origin and other supplementary marks</h2>
      <p>
        Imported ingredients usually trigger a country-of-origin mark.
        Organic, kosher, halal, non-GMO, and similar third-party marks
        are voluntary but must match the certifier's published rules. If
        you're not certified, don't use the seal.
      </p>

      <h2>A practical workflow for home bakers</h2>
      <ol>
        <li>
          Lock the recipe — every ingredient by exact weight, including
          water, salt, and trace inclusions like vanilla extract.
        </li>
        <li>
          Generate the nutrition panel using a tool that pulls from a
          public database such as USDA FoodData Central.
        </li>
        <li>
          Determine the RACC for your product category and confirm your
          serving size matches.
        </li>
        <li>
          Draft the allergen statement from the ingredient list itself,
          not from memory.
        </li>
        <li>
          Lay out the principal display panel and the information panel,
          check type sizes against 21 CFR 101.15, and proof against a
          packaging dummy at actual size.
        </li>
        <li>
          If you're claiming the small business exemption, file the
          annual notice with the FDA before you ship.
        </li>
        <li>
          When you scale into stores, retain a regulatory consultant.
          Compliance starts cheap and gets expensive when it fails.
        </li>
      </ol>

      <h2>The most common reasons labels get rejected</h2>
      <ul>
        <li>Serving size doesn't match the product's RACC.</li>
        <li>Missing "Contains:" allergen statement.</li>
        <li>
          Ingredient list out of order, or compound ingredients without
          their sub-ingredients.
        </li>
        <li>Net quantity in only one unit system.</li>
        <li>
          Name and address abbreviated to a brand name with no street
          address.
        </li>
        <li>Type sizes too small on the panel.</li>
      </ul>

      <h2>Apply it</h2>
      <p>
        The generator produces the Nutrition Facts panel itself in a
        print-ready PDF at the dimensions you choose. The other four
        elements — statement of identity, net quantity, ingredient list,
        and your business info — are part of your packaging artwork, not
        the panel. Build the panel first, then design the rest of the
        label around it.
      </p>
    </GuideShell>
  );
}
