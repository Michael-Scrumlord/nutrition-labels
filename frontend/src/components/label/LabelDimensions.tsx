// label/LabelDimensions.tsx — scrubable W / H controls in Pop style.

import { useRecipeStore } from "../../store/recipeStore";
import { ScrubNumber } from "../ui/ScrubNumber";
import { ACCENT, INK } from "../../constants/theme";

export function LabelDimensions() {
  const dimensions    = useRecipeStore((s) => s.dimensions);
  const setDimensions = useRecipeStore((s) => s.setDimensions);

  const setWidth  = (v: number) => setDimensions({ widthInches:  Math.max(2, Math.round(v * 10) / 10) });
  const setHeight = (v: number) => setDimensions({ heightInches: Math.max(2, Math.round(v * 10) / 10) });
  const clearHeight = () => setDimensions({ heightInches: null });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14, fontFamily: "'JetBrains Mono', monospace" }}>
      {/* Width */}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#999" }}>
          Width (in)
        </span>
        <span style={{ borderBottom: `1px solid ${ACCENT}`, padding: "4px 0", fontSize: 22, fontWeight: 700 }}>
          <ScrubNumber
            value={dimensions.widthInches}
            min={2} max={8} step={0.1}
            onChange={setWidth}
            suffix="″"
            style={{ fontSize: 22, fontWeight: 700, color: INK }}
          />
        </span>
        <span style={{ fontSize: 9, color: "#bbb" }}>FDA min 2″</span>
      </label>

      {/* Height */}
      <label style={{ display: "grid", gap: 4 }}>
        <span style={{ fontSize: 9, letterSpacing: "0.22em", textTransform: "uppercase", color: "#999" }}>
          Height (in)
        </span>
        <span style={{ borderBottom: "1px solid #ddd", padding: "4px 0", fontSize: 22, fontWeight: 700 }}>
          {dimensions.heightInches != null ? (
            <>
              <ScrubNumber
                value={dimensions.heightInches}
                min={2} max={12} step={0.1}
                onChange={setHeight}
                suffix="″"
                style={{ fontSize: 22, fontWeight: 700, color: INK }}
              />
              <span
                onClick={clearHeight}
                style={{ marginLeft: 8, fontSize: 11, color: "#bbb", cursor: "pointer" }}
              >↺</span>
            </>
          ) : (
            <span
              onClick={() => setHeight(4)}
              style={{ cursor: "pointer", color: "#bbb" }}
            >
              auto
            </span>
          )}
        </span>
        <span style={{ fontSize: 9, color: "#bbb" }}>blank = auto-fit</span>
      </label>
    </div>
  );
}
