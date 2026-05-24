// layout/InfoPageShell.tsx — Layout used by static info pages (/about,
// /privacy, /terms). Shares the masthead and themed frame with the editor,
// but drops the label column, recipe builder, and ad ribbon. The site
// footer (text links) is the page's bottom row.
//
//   ┌ header ───────────────────────────────────────────────────────────────┐
//   │ <main> — page content, max 760px, generous vertical rhythm           │
//   │ site footer (privacy · terms · about · contact · ©)                   │
//   └────────────────────────────────────────────────────────────────────────┘

import type { ReactNode } from "react";
import { Header } from "./Header";
import { SiteFooter } from "./SiteFooter";
import { ThemedFrame } from "../theme/ThemedFrame";

interface InfoPageShellProps {
  title: string;
  /** Sub-line under the title — short, tracked-mono caps. */
  kicker?: string;
  children: ReactNode;
}

export function InfoPageShell({ title, kicker, children }: InfoPageShellProps) {
  return (
    <ThemedFrame>
      <div
        style={{
          display: "grid",
          gridTemplateRows: "auto 1fr auto",
          gridTemplateColumns: "minmax(0, 1fr)",
          gridTemplateAreas: '"head" "body" "site"',
          minHeight: "100vh",
          fontFamily: "var(--f-body)",
          containerType: "inline-size",
          containerName: "app",
          background: "var(--bg)",
        }}
      >
        <Header />

        <main
          style={{
            gridArea: "body",
            display: "flex",
            justifyContent: "center",
            padding: "48px 24px 72px",
            color: "var(--ink)",
            minWidth: 0,
          }}
        >
          <article style={{ width: "100%", maxWidth: 760, minWidth: 0, overflowWrap: "break-word" }}>
            {kicker && (
              <div
                style={{
                  fontFamily: "var(--f-mono)",
                  fontSize: "var(--ms-mono-micro)",
                  letterSpacing: "0.32em",
                  textTransform: "uppercase",
                  color: "var(--accent)",
                  marginBottom: 10,
                }}
              >
                {kicker}
              </div>
            )}
            <h1
              className="pl-display"
              style={{
                fontSize: "var(--ms-heading)",
                lineHeight: 1.05,
                margin: "0 0 28px",
                color: "var(--ink)",
              }}
            >
              {title}
            </h1>

            <div className="info-prose" style={{ color: "var(--ink-2)" }}>
              {children}
            </div>
          </article>
        </main>

        <SiteFooter />
      </div>
    </ThemedFrame>
  );
}
