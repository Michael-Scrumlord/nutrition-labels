// layout/GuideShell.tsx — Wraps an individual guide article.
//
// Adds, on top of InfoPageShell:
//   • a small "← All guides" back-link above the kicker
//   • a "Last updated · DATE · N min read" kicker
//   • a CTA strip back to the generator
//   • a "Read next" rail showing two related guides
//
// Kept thin — the InfoPageShell still owns header/site-footer/themed frame
// and the .info-prose class still handles the body typography.

import { Link } from "react-router-dom";
import { InfoPageShell } from "./InfoPageShell";
import { GUIDES, relatedGuides, type GuideEntry } from "../../pages/guides/registry";

interface GuideShellProps {
  guide: GuideEntry;
  children: React.ReactNode;
}

function formatDate(iso: string): string {
  const d = new Date(iso + "T00:00:00");
  return d.toLocaleDateString("en-US", { year: "numeric", month: "long", day: "numeric" });
}

export function GuideShell({ guide, children }: GuideShellProps) {
  const kicker = `Last updated · ${formatDate(guide.lastUpdated)} · ${guide.minutes} min read`;
  const next = relatedGuides(guide.slug, 2);

  return (
    <InfoPageShell title={guide.title} kicker={kicker}>
      <div style={{ marginBottom: 22 }}>
        <Link
          to="/guides"
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: "var(--ms-mono-micro)",
            letterSpacing: "0.24em",
            textTransform: "uppercase",
            color: "var(--ink-3)",
            textDecoration: "none",
            borderBottom: "1px solid transparent",
            transition: "color 160ms ease, border-color 160ms ease",
          }}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "var(--hair-strong)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-3)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
          }}
        >
          ← All guides
        </Link>
      </div>

      {children}

      {/* CTA — back to the generator. */}
      <aside
        style={{
          marginTop: 56,
          padding: "22px 24px",
          border: "1px solid var(--hair-strong)",
          background: "var(--surface)",
          display: "flex",
          flexWrap: "wrap",
          gap: 16,
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div>
          <div
            className="pl-display"
            style={{ fontSize: "var(--ms-body-lg)", color: "var(--ink)", lineHeight: 1.15 }}
          >
            Ready to build your own label?
          </div>
          <div
            style={{
              marginTop: 4,
              fontFamily: "var(--f-body)",
              fontSize: "var(--ms-meta)",
              color: "var(--ink-2)",
            }}
          >
            Free, browser-based, no account. Your recipes stay on your device.
          </div>
        </div>
        <Link
          to="/"
          style={{
            fontFamily: "var(--f-body)",
            fontWeight: 700,
            letterSpacing: "0.16em",
            textTransform: "uppercase",
            fontSize: "var(--ms-mono-small)",
            padding: "10px 18px",
            background: "var(--ink)",
            color: "var(--bg)",
            textDecoration: "none",
            border: "1px solid var(--ink)",
          }}
        >
          Open the generator →
        </Link>
      </aside>

      {/* Read next */}
      {next.length > 0 && (
        <section style={{ marginTop: 48 }}>
          <div
            style={{
              fontFamily: "var(--f-mono)",
              fontSize: "var(--ms-mono-micro)",
              letterSpacing: "0.32em",
              textTransform: "uppercase",
              color: "var(--accent)",
              marginBottom: 14,
            }}
          >
            Read next
          </div>
          <ul style={{ listStyle: "none", padding: 0, margin: 0, display: "grid", gap: 14 }}>
            {next.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/guides/${g.slug}`}
                  style={{
                    display: "block",
                    padding: "16px 18px",
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
                    className="pl-display"
                    style={{ fontSize: "var(--ms-body-lg)", color: "var(--ink)", lineHeight: 1.15 }}
                  >
                    {g.title}
                  </div>
                  <div
                    style={{
                      marginTop: 4,
                      fontFamily: "var(--f-body)",
                      fontSize: "var(--ms-meta)",
                      color: "var(--ink-2)",
                    }}
                  >
                    {g.summary}
                  </div>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      )}
    </InfoPageShell>
  );
}

// Re-export the list so guide modules can import a sibling without
// reaching across the directory boundary.
export { GUIDES };
