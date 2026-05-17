// pages/guides/registry.ts — single source of truth for guide metadata.
//
// Consumed by:
//   • GuidesIndexPage — to render the list
//   • GuideShell — to render the "Related guides" footer
//   • sitemap.xml — keep entries in sync when adding/removing guides
//
// Each guide module also calls usePageMeta with its own title/description.
// Keep the `description` field here aligned with the meta description in
// the guide module so the index card preview matches what crawlers see.

export interface GuideEntry {
  slug: string;             // path segment after /guides/
  title: string;            // article title (also <h1>)
  summary: string;          // 1–2 sentence card preview / meta description
  lastUpdated: string;      // ISO date — surfaced as kicker
  minutes: number;          // approximate read time
}

export const GUIDES: GuideEntry[] = [
  {
    slug: "how-to-read-a-nutrition-facts-label",
    title: "How to Read a Nutrition Facts Label",
    summary:
      "A plain-English walk through every line of the FDA's Nutrition Facts panel — what each number means, what to look at first, and what most people get wrong.",
    lastUpdated: "2026-05-17",
    minutes: 4,
  },
  {
    slug: "fda-label-requirements-for-home-bakers",
    title: "FDA Label Requirements for Home Bakers and Small Producers",
    summary:
      "Which products need a label, the Small Business Nutrition Labeling Exemption, the five elements every package must show, and the workflow that keeps you compliant.",
    lastUpdated: "2026-05-17",
    minutes: 6,
  },
  {
    slug: "what-percent-daily-value-actually-means",
    title: "What “% Daily Value” Actually Means",
    summary:
      "Where the 2,000-calorie reference comes from, the 5/20 rule for reading %DV at a glance, and why the same food can be “high” in one nutrient for you and “low” for someone else.",
    lastUpdated: "2026-05-17",
    minutes: 4,
  },
  {
    slug: "serving-size-rules-racc-explained",
    title: "Serving Size Rules: RACC Explained",
    summary:
      "Why serving sizes aren't yours to choose, how the FDA's Reference Amounts Customarily Consumed (RACC) drive the label, and when you need a dual-column panel.",
    lastUpdated: "2026-05-17",
    minutes: 5,
  },
  {
    slug: "labeling-allergens-correctly",
    title: "Labeling Allergens Correctly",
    summary:
      "The Big 9 allergens (post-FASTER Act), the two valid ways to declare them, the difference between “contains” and “may contain,” and the gotchas that trip up small producers.",
    lastUpdated: "2026-05-17",
    minutes: 5,
  },
];

export function guideBySlug(slug: string): GuideEntry | undefined {
  return GUIDES.find((g) => g.slug === slug);
}

export function relatedGuides(currentSlug: string, count = 2): GuideEntry[] {
  return GUIDES.filter((g) => g.slug !== currentSlug).slice(0, count);
}
