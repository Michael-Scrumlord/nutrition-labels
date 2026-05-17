import { Link } from "react-router-dom";
import { GuideShell } from "../../components/layout/GuideShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { guideBySlug } from "./registry";

const SLUG = "what-percent-daily-value-actually-means";

export function WhatPercentDailyValueActuallyMeans() {
  const guide = guideBySlug(SLUG)!;
  usePageMeta({
    title: guide.title,
    description: guide.summary,
    canonical: `/guides/${SLUG}`,
  });

  return (
    <GuideShell guide={guide}>
      <p>
        The percent values down the right side of a Nutrition Facts panel
        — 12%, 25%, 4% — are the single most useful column on the label,
        and the most widely misread. They aren't a percentage of "the
        food," and they aren't personalized to you. They're a shorthand
        that compares one serving to a fixed reference diet.
      </p>

      <h2>The reference is 2,000 calories per day</h2>
      <p>
        Every %DV on a US Nutrition Facts panel comes from one assumption:
        an average daily intake of 2,000 calories, with macronutrient and
        micronutrient targets that an average healthy adult would aim for
        on that intake. The 2,000-calorie reference is printed in small
        type at the bottom of every label.
      </p>
      <p>
        The actual targets are split into two families. <strong>Daily
        Reference Values (DRVs)</strong> cover the macronutrients and a few
        electrolytes: 65 g total fat, 20 g saturated fat, 300 mg
        cholesterol, 2,300 mg sodium, 275 g total carbohydrate, 28 g
        fiber, 50 g added sugars, 50 g protein. <strong>Reference Daily
        Intakes (RDIs)</strong> cover vitamins and minerals: 20 mcg vitamin
        D, 1,300 mg calcium, 18 mg iron, 4,700 mg potassium, and so on.
      </p>

      <h2>The 5/20 rule</h2>
      <p>
        You can read a Nutrition Facts panel almost completely without
        doing math if you remember one shortcut, which the FDA itself
        publishes:
      </p>
      <ul>
        <li><strong>5% DV or less</strong> of a nutrient per serving is "low."</li>
        <li><strong>20% DV or more</strong> per serving is "high."</li>
      </ul>
      <p>
        Apply it as a quick double-pass. Scan the "limit these" block
        (saturated fat, sodium, added sugars): you want those numbers
        below 5% per serving when you can. Then scan the "get enough"
        block (fiber, vitamin D, calcium, iron, potassium): you want at
        least one of those above 20%. A food that hits both halves of the
        rule is doing real nutritional work.
      </p>

      <h2>Why the same food is "high" for one person and "low" for another</h2>
      <p>
        If your actual energy needs are 2,800 calories — endurance
        athletes, growing teenagers, manual labor — the percentages on
        the label are conservative for you. A 25% sodium serving is
        closer to 18% of <em>your</em> day. If you're on a
        1,500-calorie reducing diet, the label is overly generous: 25%
        sodium is more like 33%.
      </p>
      <p>
        The label can't know your numbers, so it pins itself to one
        reference. That's a feature: it lets two products on the same
        shelf be compared on the same scale.
      </p>

      <h2>What changed in the 2016 label refresh</h2>
      <p>
        The DVs were last revised in 2016 (mandatory compliance by 2020
        for most manufacturers, 2021 for small ones). The biggest
        adjustments:
      </p>
      <ul>
        <li>
          <strong>Added sugars</strong> appeared for the first time with
          its own %DV (50 g target).
        </li>
        <li>
          <strong>Sodium</strong> dropped from 2,400 mg to 2,300 mg.
        </li>
        <li>
          <strong>Vitamin D</strong> increased from 400 IU to 20 mcg
          (800 IU).
        </li>
        <li>
          <strong>Potassium</strong> jumped from 3,500 mg to 4,700 mg,
          which is why even "good source of potassium" products now show
          modest %DVs.
        </li>
        <li>
          <strong>Fiber</strong> rose from 25 g to 28 g.
        </li>
        <li>
          Vitamins A and C lost their mandatory status (still allowed,
          but no longer required).
        </li>
      </ul>

      <h2>The lines without a %DV</h2>
      <p>
        Two lines on the panel deliberately have no %DV. <strong>Total
        sugars</strong> doesn't have one because there's no scientific
        consensus on a daily target for naturally occurring sugars.
        <strong> Trans fat</strong> doesn't have one because the public
        health target is "as close to zero as possible," and assigning a
        percentage would imply some daily allowance is reasonable.
      </p>
      <p>
        Protein <em>can</em> show a %DV, but it's only required if the
        product makes a protein claim or is intended for children under
        four. Most packages skip it.
      </p>

      <h2>How the generator computes %DV</h2>
      <p>
        For every nutrient on the panel, the generator divides the
        per-serving amount by the corresponding 2016 DV and rounds to the
        nearest whole percent. Rounding follows the FDA's own rules:
        values under 50% round to the nearest 2%, values 50–99% round to
        the nearest 5%, and values at or above 100% round to the nearest
        10%. That's why you'll often see 6%, 12%, 25%, 50%, 110% rather
        than oddly precise numbers.
      </p>

      <h2>Apply it</h2>
      <p>
        When you read your live preview, check the %DV column with the
        5/20 rule before you check anything else. If sodium and added
        sugars are above 20% and fiber is below 5%, the formulation needs
        work — not the label. Then check the full panel against{" "}
        <Link to="/guides/how-to-read-a-nutrition-facts-label">
          How to Read a Nutrition Facts Label
        </Link>{" "}
        to make sure nothing else is out of balance.
      </p>
    </GuideShell>
  );
}
