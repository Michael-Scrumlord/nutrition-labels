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
        gap: 12,
        fontFamily: "var(--f-mono)",
        color: "var(--ink)",
      }}
    >
      {/* Width — sig-inline grooved scrub */}
      <div>
        <div className="sig-static pl-meta" style={{ marginBottom: 4 }}>WIDTH (IN)</div>
        <div
          className="sig-inline"
          style={{ display: "inline-block", padding: "4px 8px 5px", minWidth: 100 }}
        >
          <ScrubNumber
            value={dimensions.widthInches}
            min={2}
            max={8}
            step={0.05}
            decimals={2}
            onChange={setWidth}
            suffix="″"
            ariaLabel="Label width in inches"
            style={{
              fontSize: 22,
              fontWeight: 700,
              color: "var(--ink)",
              fontFamily: "var(--f-mono)",
            }}
          />
        </div>
        <div className="sig-static pl-meta" style={{ marginTop: 4, fontSize: 9 }}>FDA min 2″</div>
      </div>

      {/* Height — sig-inline grooved scrub, "auto" toggle */}
      <div>
        <div className="sig-static pl-meta" style={{ marginBottom: 4 }}>HEIGHT (IN)</div>
        <div
          className="sig-inline"
          style={{ display: "inline-block", padding: "4px 8px 5px", minWidth: 100 }}
        >
          {dimensions.heightInches != null ? (
            <span style={{ display: "inline-flex", alignItems: "baseline", gap: 8 }}>
              <ScrubNumber
                value={dimensions.heightInches}
                min={2}
                max={12}
                step={0.05}
                decimals={2}
                onChange={setHeight}
                suffix="″"
                ariaLabel="Label height in inches"
                style={{
                  fontSize: 22,
                  fontWeight: 700,
                  color: "var(--ink)",
                  fontFamily: "var(--f-mono)",
                }}
              />
              <button
                onClick={clearHeight}
                className="sig-btn sig-icon"
                aria-label="Reset to auto-fit"
                title="Reset to auto-fit"
              >↺</button>
            </span>
          ) : (
            <span
              onClick={() => setHeight(4)}
              style={{
                fontSize: 22,
                fontWeight: 700,
                color: "var(--ink-3)",
                cursor: "pointer",
                fontFamily: "var(--f-mono)",
              }}
            >
              auto
            </span>
          )}
        </div>
        <div className="sig-static pl-meta" style={{ marginTop: 4, fontSize: 9 }}>blank = auto-fit</div>
      </div>
    </div>
  );
}
