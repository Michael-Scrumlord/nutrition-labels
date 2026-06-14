// label/LabelDetails.tsx — FDA label fields not derivable from the USDA DB.
//
//   • Serving (household)  — the household measure, e.g. "2/3 cup". FDA requires
//                            a household description; the metric weight (g) is
//                            computed automatically on the label.
//   • Added sugars (g)     — mandatory FDA line with its own %DV (DV 50g).
//   • Trans fat (g)        — mandatory FDA line (no %DV).

import { useRecipeStore } from "../../store/recipeStore";
import { ScrubNumber } from "../ui/ScrubNumber";

export function LabelDetails() {
  const servingHousehold    = useRecipeStore((s) => s.servingHousehold);
  const addedSugarsG        = useRecipeStore((s) => s.addedSugarsG);
  const transFatG           = useRecipeStore((s) => s.transFatG);
  const setServingHousehold = useRecipeStore((s) => s.setServingHousehold);
  const setAddedSugarsG      = useRecipeStore((s) => s.setAddedSugarsG);
  const setTransFatG        = useRecipeStore((s) => s.setTransFatG);

  return (
    <div style={{ marginTop: 12, fontFamily: "var(--f-mono)", color: "var(--ink)" }}>
      {/* Household serving — free text */}
      <div style={{ marginBottom: 12 }}>
        <div className="sig-static pl-meta" style={{ marginBottom: 4 }}>SERVING (HOUSEHOLD)</div>
        <input
          value={servingHousehold}
          onChange={(e) => setServingHousehold(e.target.value)}
          placeholder="e.g. 2/3 cup"
          aria-label="Household serving description"
          className="sig-inline"
          style={{
            width: "100%",
            padding: "5px 8px 6px",
            fontSize: 15,
            fontFamily: "var(--f-mono)",
            color: "var(--ink)",
            background: "transparent",
            border: "none",
          }}
        />
        <div className="sig-static pl-meta" style={{ marginTop: 4, fontSize: 9 }}>
          NET WEIGHT (g) ADDED AUTOMATICALLY
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        {/* Added sugars (g) */}
        <div>
          <div className="sig-static pl-meta" style={{ marginBottom: 4 }}>ADDED SUGARS (g)</div>
          <div className="sig-inline" style={{ display: "inline-block", padding: "4px 8px 5px", minWidth: 100 }}>
            <ScrubNumber
              value={addedSugarsG}
              min={0}
              max={999}
              step={0.5}
              decimals={1}
              onChange={setAddedSugarsG}
              suffix="g"
              ariaLabel="Added sugars in grams"
              style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--f-mono)" }}
            />
          </div>
        </div>

        {/* Trans fat (g) */}
        <div>
          <div className="sig-static pl-meta" style={{ marginBottom: 4 }}>TRANS FAT (g)</div>
          <div className="sig-inline" style={{ display: "inline-block", padding: "4px 8px 5px", minWidth: 100 }}>
            <ScrubNumber
              value={transFatG}
              min={0}
              max={999}
              step={0.5}
              decimals={1}
              onChange={setTransFatG}
              suffix="g"
              ariaLabel="Trans fat in grams"
              style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)", fontFamily: "var(--f-mono)" }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
