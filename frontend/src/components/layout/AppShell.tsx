// layout/AppShell.tsx
//
// Editorial plinth layout (Final A · Editorial).
//   head head        ← sticky masthead
//   body label       ← scrolling recipe body | raised plinth with FDA label
//
// The entire shell is wrapped in <ThemedFrame> which:
//   • applies the 4-theme CSS vars to its root
//   • runs the ~720ms cinematic wipe transition between themes

import { Header } from "./Header";
import { RecipeBuilder } from "../recipe/RecipeBuilder";
import { LabelColumn } from "../label/LabelColumn";
import { ThemedFrame } from "../theme/ThemedFrame";

export function AppShell() {
  return (
    <ThemedFrame>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1fr) 460px",
          gridTemplateRows: "auto 1fr",
          gridTemplateAreas: '"head head" "body label"',
          minHeight: "100vh",
          fontFamily: "var(--f-body)",
        }}
      >
        <Header />
        <RecipeBuilder />
        <LabelColumn />
      </div>
    </ThemedFrame>
  );
}
