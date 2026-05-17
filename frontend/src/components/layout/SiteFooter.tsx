// layout/SiteFooter.tsx — Text footer present on every route.
//
// Holds the always-visible site links (Privacy · Terms · About · Contact)
// plus copyright. Required by AdSense §10 (Privacy) — the privacy policy
// must be clearly labeled and easily accessible from every page that runs
// ad code, so this footer ships before any AdSense integration.
//
// Visual: muted hairline strip, mono caps, sits in its own grid row below
// the ad ribbon in the editor shell and below the page body on info pages.

import { Link } from "react-router-dom";

const CONTACT_EMAIL =
  (import.meta.env.VITE_CONTACT_EMAIL as string | undefined) ?? "inquiries@nutritionlabels.app";

const linkStyle = {
  color: "var(--ink-2)",
  textDecoration: "none",
  borderBottom: "1px solid transparent",
  transition: "color 160ms ease, border-color 160ms ease",
} as const;

function FootLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      style={linkStyle}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
        (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "var(--hair-strong)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-2)";
        (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
      }}
    >
      {children}
    </Link>
  );
}

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <div
      role="contentinfo"
      style={{
        gridArea: "site",
        background: "var(--bg)",
        borderTop: "1px solid var(--hair)",
        padding: "14px 22px",
        display: "flex",
        flexWrap: "wrap",
        gap: "8px 22px",
        alignItems: "baseline",
        justifyContent: "space-between",
        fontFamily: "var(--f-mono)",
        fontSize: "var(--ms-mono-micro)",
        letterSpacing: "0.22em",
        textTransform: "uppercase",
        color: "var(--ink-3)",
      }}
    >
      <nav
        aria-label="Site"
        style={{ display: "inline-flex", flexWrap: "wrap", gap: "8px 18px", alignItems: "baseline" }}
      >
        <FootLink to="/">Generator</FootLink>
        <span aria-hidden="true" style={{ color: "var(--hair-strong)" }}>·</span>
        <FootLink to="/about">About</FootLink>
        <span aria-hidden="true" style={{ color: "var(--hair-strong)" }}>·</span>
        <FootLink to="/privacy">Privacy</FootLink>
        <span aria-hidden="true" style={{ color: "var(--hair-strong)" }}>·</span>
        <FootLink to="/terms">Terms</FootLink>
        <span aria-hidden="true" style={{ color: "var(--hair-strong)" }}>·</span>
        <a
          href={`mailto:${CONTACT_EMAIL}`}
          style={linkStyle}
          onMouseEnter={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "var(--hair-strong)";
          }}
          onMouseLeave={(e) => {
            (e.currentTarget as HTMLAnchorElement).style.color = "var(--ink-2)";
            (e.currentTarget as HTMLAnchorElement).style.borderBottomColor = "transparent";
          }}
        >
          Contact
        </a>
      </nav>

      <span>© {year} Nutrition Label</span>
    </div>
  );
}
