import { Link } from "react-router-dom";
import { GuideShell } from "../../components/layout/GuideShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { guideBySlug } from "./registry";

const SLUG = "serving-size-rules-racc-explained";

export function ServingSizeRulesRACCExplained() {
  const guide = guideBySlug(SLUG)!;
  usePageMeta({
    title: guide.title,
    description: guide.summary,
    canonical: `/guides/${SLUG}`,
  });

  return (
    <GuideShell guide={guide}>
      <p>
        New label drafters reach for "serving size" first and almost
        always set it wrong. The serving size isn't a recommendation, a
        portion suggestion, or a choice. It's a regulatory output derived
        from the FDA's Reference Amount Customarily Consumed — the
        RACC — for the product category. Get the RACC right and the
        whole panel falls into place.
      </p>

      <h2>What RACC is</h2>
      <p>
        The RACC is a number the FDA assigned to each food category based
        on national survey data — what people actually eat in one sitting,
        not what the manufacturer wishes they'd eat. Bread is 50 g.
        Cookies are 30 g. Ready-to-eat cereals are 30 g or 60 g depending
        on density. Ice cream, after a 2016 revision, is 2/3 cup.
        Beverages are 240 mL (8 fl oz) or 360 mL for sodas. There are
        hundreds of categories, listed in 21 CFR 101.12.
      </p>
      <p>
        The RACC is the <em>per-eating-occasion</em> baseline. Your
        serving size on the panel has to be derived from it using two
        rules below.
      </p>

      <h2>How RACC becomes the serving size</h2>
      <p>
        For most foods, the serving size on the panel is the household
        measure closest to the RACC, expressed in a unit a consumer
        recognizes (cups, tablespoons, pieces, slices). The grams in
        parentheses next to the household measure must equal the actual
        weight of that household measure for your specific product.
      </p>
      <p>
        Example: granola has a 60 g RACC. Your granola is dense and 1/2
        cup weighs 60 g. Your serving size is <em>1/2 cup (60g)</em>.
        Someone else's airier granola might need 3/4 cup to reach 60 g.
        The grams are anchored to the RACC; the household measure flexes.
      </p>

      <h2>Discrete units: muffins, cookies, bars</h2>
      <p>
        When a product comes in distinct pieces, the FDA layers a second
        rule on top of the RACC. The serving size is the <strong>number
        of whole pieces closest to the RACC</strong>:
      </p>
      <ul>
        <li>
          If one piece is between 50% and 200% of the RACC, the serving
          size is one piece.
        </li>
        <li>
          If one piece is less than 50% of the RACC, the serving size is
          the number of pieces that comes closest to the RACC without
          exceeding 200% of it.
        </li>
        <li>
          If one piece is more than 200% of the RACC, the serving size is
          still one piece — but you must also disclose a "per 100g" or
          "per piece" supplemental column if it pushes calorie or
          nutrient values into territory consumers will misread.
        </li>
      </ul>
      <p>
        A 110 g muffin (RACC 110 g) is one muffin. A 28 g cookie (RACC
        30 g) is one cookie. A 14 g cookie is two cookies (28 g, closest
        to the 30 g RACC without going over 60 g). A 240 g pastry is one
        pastry, with a "per 100g" callout encouraged because few
        consumers will eat the whole thing in one sitting.
      </p>

      <h2>The dual-column rule</h2>
      <p>
        Packages that contain between 2 and 3 servings — pint of ice
        cream, 24 oz drink — must show <strong>two columns</strong> on
        the panel: one per-serving, one per-container. The FDA added this
        in 2016 after research showed that people who buy a "shareable"
        container usually eat the whole thing alone. The dual column
        prevents a 20 oz drink from looking like a 110-calorie product
        when it's really a 275-calorie product.
      </p>
      <p>
        Packages with 4 or more servings stay single-column. Packages
        with 2 to 3 servings of a product that's typically consumed in
        one sitting (a 5-oz bag of chips, for instance) can also use a
        single-serving label that treats the whole package as one
        serving.
      </p>

      <h2>The 2016 RACC updates</h2>
      <p>
        Several long-standing RACCs were revised upward in 2016 to better
        match actual eating behavior:
      </p>
      <ul>
        <li>Ice cream: 1/2 cup → <strong>2/3 cup</strong></li>
        <li>Yogurt: 8 oz → <strong>6 oz</strong> (downward)</li>
        <li>Soft drinks: 8 fl oz → <strong>12 fl oz</strong></li>
        <li>Muffins/bagels: 55 g → <strong>110 g</strong></li>
      </ul>
      <p>
        These changes are why a serving of ice cream "got bigger" without
        the product changing. The numbers on the panel scaled with the
        RACC.
      </p>

      <h2>When household measures and grams disagree</h2>
      <p>
        The household measure is the one consumers read; the grams in
        parentheses are the legally binding amount. If the two disagree
        on a label, the grams win. That means if you change a recipe's
        density — different flour, less water, more inclusions — your
        household measure might need to update even if you keep the gram
        target the same.
      </p>

      <h2>The mistakes the generator catches and the ones it can't</h2>
      <p>
        The generator computes all per-serving values from a single
        editable serving weight, so as soon as you set the right grams,
        every number on the panel updates correctly. What it can't do for
        you is pick the right RACC for your product category — that
        depends on what the food <em>is</em>, not just what it weighs.
        Look up your category in 21 CFR 101.12 before you commit to a
        serving size.
      </p>

      <h2>Apply it</h2>
      <p>
        Two-step workflow: (1) identify your product's RACC from the FDA
        table, (2) translate it into a household measure for your
        specific recipe density. The generator handles the math from
        there. If you're building a multi-serving package, switch on the
        dual-column option as soon as your servings-per-container lands
        between 2 and 3 — see also{" "}
        <Link to="/guides/fda-label-requirements-for-home-bakers">
          FDA Label Requirements for Home Bakers
        </Link>{" "}
        for the rest of the artwork rules.
      </p>
    </GuideShell>
  );
}
