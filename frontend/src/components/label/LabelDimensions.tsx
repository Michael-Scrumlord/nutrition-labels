// label/LabelDimensions.tsx — scrubable W / H controls, themed.

import { useRecipeStore } from "../../store/recipeStore";
import { ScrubNumber } from "../ui/ScrubNumber";

export function LabelDimensions() {
  const dimensions    = useRecipeStore((s) => s.dimensions);
  const setDimensions = useRecipeStore((s) => s.setDimensions);

  // Round to 0.01" — the typed input lets users hit any 2-decimal value while
  // drag/wheel/arrow nudge by a coarser step (see step= below) so scrubbing
  // doesn't feel twitchy at hundredths-of-an-inch granularity.
  const setWidth  = (v: number) => setDimensions({ widthInches:  Math.max(2, Math.round(v * 100) / 100) });
  const setHeight = (v: number) => setDimensions({ heightInches: Math.max(2, Math.round(v * 100) / 100) });
  const clearHeight = () => setDimensions({ heightInches: null });

  return (
    <div
      style={{
        display: "grid",
        gridTemplateColumns: "1fr 1fr",
        gap: 14,
        fontFamily: "var(--f-mono)",
        color: "var(--ink)",
      }}
    >
      {/* Width */}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-2)" }}>
          Width (in)
        </span>
        <span style={{ borderBottom: "1px solid var(--accent)", padding: "4px 0", fontSize: 22, fontWeight: 700 }}>
          <ScrubNumber
            value={dimensions.widthInches}
            min={2}
            max={8}
            step={0.05}
            decimals={2}
            onChange={setWidth}
            suffix="″"
            style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
          />
        </span>
        <span style={{ fontSize: 9, color: "var(--ink-3)" }}>FDA min 2″</span>
      </label>

      {/* Height */}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "var(--ink-2)" }}>
          Height (in)
        </span>
        <span style={{ borderBottom: "1px solid var(--hair-strong)", padding: "4px 0", fontSize: 22, fontWeight: 700 }}>
          {dimensions.heightInches != null ? (
            <>
              <ScrubNumber
                value={dimensions.heightInches}
                min={2}
                max={12}
                step={0.05}
                decimals={2}
                onChange={setHeight}
                suffix="″"
                style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
              />
              <span
                onClick={clearHeight}
                style={{ marginLeft: 8, fontSize: 11, color: "var(--ink-3)", cursor: "pointer" }}
              >
                ↺
              </span>
            </>
          ) : (
            <span
              onClick={() => setHeight(4)}
              style={{ cursor: "pointer", color: "var(--ink-3)" }}
            >
              auto
            </span>
          )}
        </span>
        <span style={{ fontSize: 9, color: "var(--ink-3)" }}>blank = auto-fit</span>
      </label>
    </div>
  );
}
