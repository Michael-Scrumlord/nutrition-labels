import { Link } from "react-router-dom";
import { GuideShell } from "../../components/layout/GuideShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { guideBySlug } from "./registry";

const SLUG = "how-to-read-a-nutrition-facts-label";

export function HowToReadANutritionFactsLabel() {
  const guide = guideBySlug(SLUG)!;
  usePageMeta({
    title: guide.title,
    description: guide.summary,
    canonical: `/guides/${SLUG}`,
  });

  return (
    <GuideShell guide={guide}>
      <p>
        The Nutrition Facts panel on the back of a US food package looks
        dense, but it follows a strict order from top to bottom. Once you
        know what each line is doing, you can read the whole thing in
        about ten seconds. This guide walks the panel top to bottom and
        flags the lines most people misread.
      </p>

      <h2>Serving size is the lens for everything else</h2>
      <p>
        The first line under the heading is the serving size, given in a
        household measure (cups, pieces, tablespoons) followed by grams in
        parentheses. <strong>Every other number on the label is per that
        serving.</strong> If the package says "Servings per container: 3"
        and you eat the whole thing, multiply every number by three.
      </p>
      <p>
        The serving size isn't a recommendation. The FDA picks it for a
        product category based on what people actually eat in one sitting
        — the Reference Amount Customarily Consumed, or RACC. See{" "}
        <Link to="/guides/serving-size-rules-racc-explained">
          Serving Size Rules: RACC Explained
        </Link>{" "}
        for why your "serving" of ice cream is two-thirds of a cup and not
        the whole pint.
      </p>

      <h2>Calories</h2>
      <p>
        Since the 2016 label refresh, calories are set in oversized type
        because they're the single most-used number on the panel. They
        come from the macronutrients above them in the calculation, not
        from a separate measurement: 4 calories per gram of carbohydrate
        and protein, 9 per gram of fat, 7 per gram of alcohol, with small
        adjustments for fiber.
      </p>

      <h2>The "limit these" block</h2>
      <p>
        Saturated fat, <em>trans</em> fat, cholesterol, and sodium are
        grouped together because they're the nutrients public-health
        guidance asks adults to keep on the low side. <em>Trans</em> fat
        is now functionally zero on most US packages — the FDA banned
        partially hydrogenated oils in 2018 — but the line stays on the
        label so anything residual gets disclosed.
      </p>
      <p>
        A short rule: anything in this block with a %DV of 5 or less is
        "low," and 20 or more is "high." That's the FDA's own framing.
      </p>

      <h2>The "get enough of these" block</h2>
      <p>
        Fiber, vitamin D, calcium, iron, and potassium are listed because
        most Americans don't get enough of them. The same 5%/20% rule
        flips its meaning here: 5 or less is a poor source, 20 or more is
        an excellent one. The 2016 refresh added vitamin D and potassium
        and dropped vitamins A and C, which most US adults already get in
        sufficient quantities.
      </p>

      <h2>Total sugars and added sugars are different lines</h2>
      <p>
        Total sugars include naturally occurring sugars (the lactose in
        milk, the fructose in fruit). Added sugars is the line that
        matters for most public-health questions — it's what was put into
        the product during processing. Added sugars has a %DV; total
        sugars does not, because there's no consensus daily target for
        naturally occurring sugars.
      </p>
      <p>
        A jar of strawberry jam and an equal-volume serving of fresh
        strawberries can have similar total sugars and wildly different
        added sugars. Read the added line.
      </p>

      <h2>The ingredients list — read it like an audit trail</h2>
      <p>
        Ingredients are listed in descending order by weight. The first
        three usually account for most of the product. Sub-ingredients
        appear in parentheses after a compound ingredient ("enriched flour
        (wheat flour, niacin, reduced iron, …)"). The Big 9 allergens are
        called out either in the ingredient list itself or in a separate
        "Contains:" statement immediately below — see{" "}
        <Link to="/guides/labeling-allergens-correctly">
          Labeling Allergens Correctly
        </Link>.
      </p>

      <h2>The footnote</h2>
      <p>
        At the bottom of the panel: <em>"* The % Daily Value (DV) tells
        you how much a nutrient in a serving of food contributes to a
        daily diet. 2,000 calories a day is used for general nutrition
        advice."</em> That 2,000-calorie reference is where every %DV on
        the label comes from. The full math, and why the reference exists,
        is in{" "}
        <Link to="/guides/what-percent-daily-value-actually-means">
          What "% Daily Value" Actually Means
        </Link>.
      </p>

      <h2>The three things most people get wrong</h2>
      <ul>
        <li>
          <strong>Reading "per package" instead of "per serving."</strong>{" "}
          A 20 oz drink that lists 110 calories per 8 oz serving is 275
          calories for the bottle, not 110.
        </li>
        <li>
          <strong>Confusing total sugars with added sugars.</strong> Plain
          yogurt has a lot of total sugars and zero added.
        </li>
        <li>
          <strong>Ignoring the %DV column.</strong> Grams of sodium don't
          mean anything to most people; "60% DV" instantly does.
        </li>
      </ul>

      <h2>Apply it</h2>
      <p>
        When you build a recipe in the generator, every line you see on
        the live preview follows the same order as a packaged label.
        Serving size at the top, calories large, limit-these block,
        get-enough-of block, sugars split into total and added, the
        ingredients list under the panel, and the footnote at the bottom.
        Read your own labels the same way you'd read someone else's.
      </p>
    </GuideShell>
  );
}
