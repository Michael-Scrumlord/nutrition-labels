// layout/AppShell.tsx
//
// Editorial plinth layout (R · Ledger direction).
//   head head        ← sticky masthead
//   body label       ← scrolling recipe body | raised plinth with FDA label
//   foot foot        ← partner ribbon (footer ad slot — Phase 2 will replace
//                      with a Google Anchor Ad and this row may go away)
//   site site        ← always-visible text footer (Privacy · Terms · About …)
//
// The grid sets `container-type: inline-size; container-name: app;` so the
// cqw-based fluid type ramp in index.css scales the whole shell across
// 1080p / 1440p / 4K (swap to vw at the root if container queries are ever
// unavailable — equivalent for a root-level layout).
//
// The entire shell is wrapped in <ThemedFrame> which:
//   • applies the 4-theme CSS vars to its root
//   • runs the ~720ms cinematic wipe transition between themes

import { Header } from "./Header";
import { Footer } from "./Footer";
import { SiteFooter } from "./SiteFooter";
import { RecipeBuilder } from "../recipe/RecipeBuilder";
import { LabelColumn } from "../label/LabelColumn";
import { ThemedFrame } from "../theme/ThemedFrame";
import { usePageMeta } from "../../hooks/usePageMeta";

export function AppShell() {
  usePageMeta({
    title: "Nutrition Label Generator — FDA Nutrition Label Builder",
    description:
      "Design FDA-style Nutrition Facts labels for your recipes — pull ingredient data from USDA FoodData Central, set portions, and export a print-ready PDF in the dimensions you need. Free, browser-based, no account required.",
    canonical: "/",
  });

  return (
    <ThemedFrame>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) var(--ms-label-w)",
          gridTemplateRows: "auto 1fr auto auto",
          gridTemplateAreas: '"head head" "body label" "foot foot" "site site"',
          minHeight: "100vh",
          fontFamily: "var(--f-body)",
          containerType: "inline-size",
          containerName: "app",
        }}
      >
        <Header />
        <RecipeBuilder />
        <LabelColumn />
        <Footer />
        <SiteFooter />
      </div>
    </ThemedFrame>
  );
}
