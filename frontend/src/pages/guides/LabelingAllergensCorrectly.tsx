import { Link } from "react-router-dom";
import { GuideShell } from "../../components/layout/GuideShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { guideBySlug } from "./registry";

const SLUG = "labeling-allergens-correctly";

export function LabelingAllergensCorrectly() {
  const guide = guideBySlug(SLUG)!;
  usePageMeta({
    title: guide.title,
    description: guide.summary,
    canonical: `/guides/${SLUG}`,
  });

  return (
    <GuideShell guide={guide}>
      <p>
        Allergen labeling is the part of a food label that's most likely
        to trigger a recall or send someone to an emergency room. The
        rules are simple to read and easy to misapply. This guide covers
        what has to be disclosed, the two valid formats, and the gotchas
        that catch small producers.
      </p>

      <h2>The Big 9</h2>
      <p>
        The Food Allergen Labeling and Consumer Protection Act (FALCPA)
        of 2004 named eight major allergens. The FASTER Act, effective
        January 1, 2023, added sesame as the ninth:
      </p>
      <ol>
        <li>Milk</li>
        <li>Eggs</li>
        <li>Fish (must specify species: cod, salmon, etc.)</li>
        <li>Crustacean shellfish (must specify: shrimp, crab, lobster)</li>
        <li>Tree nuts (must specify: almonds, walnuts, etc.)</li>
        <li>Peanuts</li>
        <li>Wheat</li>
        <li>Soybeans</li>
        <li>Sesame</li>
      </ol>
      <p>
        Anything else — gluten beyond wheat, mustard, celery, sulfites —
        is regulated separately or only voluntarily disclosed. The Big 9
        are the ones with mandatory plain-English disclosure under
        federal law.
      </p>

      <h2>The two valid formats</h2>
      <p>
        You must disclose each Big 9 allergen present in the product in{" "}
        <strong>one</strong> of two ways:
      </p>
      <ol>
        <li>
          <strong>In-line in the ingredient list.</strong> Use the
          allergen's common name, in parentheses, immediately after the
          ingredient that contains it. Example: <code>natural flavor
          (soy)</code>, or <code>whey (milk)</code>.
        </li>
        <li>
          <strong>In a "Contains" statement</strong> immediately below
          the ingredient list, in type at least as large as the ingredient
          list itself. Example: <code>Contains: wheat, milk, soy.</code>
        </li>
      </ol>
      <p>
        Most small producers pick format #2 because it's harder to mess
        up. Pick one format per label — don't mix them on the same
        package.
      </p>

      <h2>"Tree nuts" and "fish" are not allergen names</h2>
      <p>
        FDA wants the species. "Contains: tree nuts" is not compliant;
        "Contains: almonds, walnuts" is. The same rule applies to fish
        ("salmon, cod") and crustacean shellfish ("shrimp, crab"). If
        you reformulate from almonds to cashews mid-run, the label needs
        to change.
      </p>

      <h2>Gotchas that get small producers in trouble</h2>
      <ul>
        <li>
          <strong>Lecithin</strong> usually means soy lecithin. Disclose
          "soy" unless your supplier confirms sunflower lecithin.
        </li>
        <li>
          <strong>Hydrolyzed protein</strong> often means wheat or soy.
          Disclose the source.
        </li>
        <li>
          <strong>Natural flavors</strong> may contain Big 9 derivatives.
          Get the allergen statement from your supplier in writing and
          disclose accordingly.
        </li>
        <li>
          <strong>Tahini</strong> is sesame. Many small producers added
          tahini to a recipe years ago and forgot to update the label
          when sesame became the 9th allergen in 2023.
        </li>
        <li>
          <strong>Spelt, einkorn, kamut, durum, semolina</strong> are all
          wheat. So is "ancient grain blend" unless your supplier
          documents otherwise.
        </li>
        <li>
          <strong>Albacore tuna in olive oil</strong> contains both fish
          and, often, sulfites — declare each.
        </li>
      </ul>

      <h2>"May contain" / cross-contact statements</h2>
      <p>
        Advisory statements like <em>"may contain peanuts"</em> or{" "}
        <em>"made in a facility that processes tree nuts"</em> are{" "}
        <strong>voluntary</strong> and address cross-contact, not
        deliberate ingredients. They're meant for unavoidable shared-
        equipment situations after you've taken real steps to prevent
        contamination. They are not a substitute for the "Contains"
        statement, and they are not a license to be sloppy in production.
      </p>
      <p>
        If you use an advisory statement, it should be truthful and based
        on your actual facility risk. FDA can challenge over-broad
        advisory statements that confuse consumers ("may contain"
        everything signals to a consumer that nothing is really safe).
      </p>

      <h2>Gluten-free is a separate framework</h2>
      <p>
        "Wheat-free" and "gluten-free" don't mean the same thing.
        Gluten-free labeling is governed by 21 CFR 101.91 and requires
        the product to contain less than 20 ppm gluten. You can be
        wheat-free and still over the gluten limit (from barley or rye,
        or from oats not certified gluten-free). If you make a
        gluten-free claim, validate it with testing.
      </p>

      <h2>A practical workflow</h2>
      <ol>
        <li>
          List every ingredient and every sub-ingredient. Don't skip
          spice blends, flavor systems, or processing aids that carry
          over.
        </li>
        <li>
          Map each ingredient to any of the Big 9 it derives from.
        </li>
        <li>
          For ambiguous ingredients (natural flavor, lecithin, hydrolyzed
          protein), get a supplier letter on file confirming the
          allergen status.
        </li>
        <li>
          Draft the "Contains" statement directly from that map, not from
          memory.
        </li>
        <li>
          Decide whether you genuinely need a cross-contact advisory. If
          you do, make it specific.
        </li>
        <li>
          Re-validate every time the recipe or a supplier changes.
        </li>
      </ol>

      <h2>When to bring in a testing lab</h2>
      <p>
        If you're making a "free-from" claim (gluten-free, peanut-free,
        dairy-free) on a product manufactured anywhere near the relevant
        allergen, validate it. A short batch of finished-product testing
        costs less than a single recall.
      </p>

      <h2>Apply it</h2>
      <p>
        The generator focuses on the Nutrition Facts panel itself — the
        ingredient list and "Contains" statement live in your packaging
        artwork next to the panel. Treat the allergen statement as a
        first-class deliverable, not an afterthought, and write it
        directly from the audited ingredient list. For the rest of the
        small-producer compliance picture, see{" "}
        <Link to="/guides/fda-label-requirements-for-home-bakers">
          FDA Label Requirements for Home Bakers
        </Link>.
      </p>
    </GuideShell>
  );
}
