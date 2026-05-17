// pages/guides/GuidesIndexPage.tsx — /guides
//
// Lists every entry from registry.ts as a clickable card. The list is
// also reflected in sitemap.xml — when you add a guide, update both.

import { Link } from "react-router-dom";
import { InfoPageShell } from "../../components/layout/InfoPageShell";
import { usePageMeta } from "../../hooks/usePageMeta";
import { GUIDES } from "./registry";

export function GuidesIndexPage() {
  usePageMeta({
    title: "Guides",
    description:
      "Plain-English explainers on FDA nutrition labels — how to read a label, RACC serving sizes, %DV math, allergen disclosure, and what small producers need to know before going to market.",
    canonical: "/guides",
  });

  return (
    <InfoPageShell title="Guides" kicker="Plain-English explainers">
      <p style={{ marginBottom: 28 }}>
        Short, practical articles on the rules behind FDA Nutrition Facts
        panels — written for home bakers, small producers, classroom
        instructors, and anyone who wants the label they ship to be
        defensible. Every guide links to the parts of the generator you'd
        use to apply it.
      </p>

      <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 16 }}>
        {GUIDES.map((g) => (
          <li key={g.slug}>
            <Link
              to={`/guides/${g.slug}`}
              style={{
                display: "block",
                padding: "20px 22px",
                border: "1px solid var(--hair)",
                color: "inherit",
                textDecoration: "none",
                transition: "border-color 160ms ease, background 160ms ease",
              }}
              onMouseEnter={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--hair-strong)";
                (e.currentTarget as HTMLAnchorElement).style.background = "var(--surface)";
              }}
              onMouseLeave={(e) => {
                (e.currentTarget as HTMLAnchorElement).style.borderColor = "var(--hair)";
                (e.currentTarget as HTMLAnchorElement).style.background = "transparent";
              }}
            >
              <div
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "var(--ms-mono-micro)",
                  letterSpacing: "0.28em",
                  textTransform: "uppercase",
                  color: "var(--ink-3)",
                  marginBottom: 6,
                }}
              >
                {g.minutes} min read
              </div>
              <div
                className="pl-display"
                style={{
                  fontSize: "calc(var(--ms-body-lg) * 1.1)",
                  color: "var(--ink)",
                  lineHeight: 1.15,
                  marginBottom: 8,
                }}
              >
                {g.title}
              </div>
              <div
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: "var(--ms-meta)",
                  color: "var(--ink-2)",
                  lineHeight: 1.55,
                }}
              >
                {g.summary}
              </div>
            </Link>
          </li>
        ))}
      </ul>
    </InfoPageShell>
  );
}
