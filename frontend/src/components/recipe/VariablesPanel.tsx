// recipe/VariablesPanel.tsx
//
// Collapsible panel listing all variables defined for this recipe.
// Each row: editable label, scrubable value, editable suffix, and remove button.
// "Used in step X, Y" badge shows which steps reference each variable.

import { useState, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ScrubNumber } from "../ui/ScrubNumber";
import { referencedVariableNames } from "../../utils/stepText";

export function VariablesPanel() {
  const variables    = useRecipeStore((s) => s.variables);
  const instructions = useRecipeStore((s) => s.instructions);
  const { updateVariable, setVariableValue, removeVariable } = useRecipeActions();

  // Closed by default — under the slash-command paradigm the panel is a
  // quiet reference at the bottom of the method, not the primary editing
  // surface. Users invoke inline via "/" in step text instead.
  const [open, setOpen] = useState(false);

  // Map each variable name → array of step indices that reference it
  const usageMap = useMemo(() => {
    const map = new Map<string, number[]>();
    instructions.forEach((step, i) => {
      const refs = referencedVariableNames(step.text, variables);
      refs.forEach((name) => {
        if (!map.has(name)) map.set(name, []);
        map.get(name)!.push(i + 1);
      });
    });
    return map;
  }, [instructions, variables]);

  if (variables.length === 0) return null;

  return (
    <section style={{ marginTop: 28, paddingTop: 18, borderTop: "1px solid var(--hair-strong)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="sig-btn"
        style={{ marginBottom: 12 }}
      >
        <span style={{ color: "var(--accent)", marginRight: 4 }}>{open ? "▾" : "▸"}</span>
        Variables · {variables.length}
      </button>

      {open && (
        <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
          {variables.map((v) => {
            const usage = usageMap.get(v.name) ?? [];
            return (
              <li
                key={v.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(180px, 1.3fr) 130px 110px 1fr auto",
                  gap: 14,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--hair)",
                }}
              >
                {/* Label (editable groove) */}
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(v.name, { label: e.target.value })}
                  className="sig-editable sig-input pl-display"
                  style={{
                    width: "100%",
                    fontSize: 19,
                    padding: "4px 24px 4px 8px",
                  }}
                />

                {/* Value (accent chip) */}
                <span className="sig-chip" style={{ justifySelf: "start" }}>
                  <ScrubNumber
                    value={v.value}
                    onChange={(n) => setVariableValue(v.name, n)}
                    min={v.min}
                    max={v.max}
                    step={v.step ?? 1}
                    ariaLabel={v.label}
                    suffix={v.suffix ? ` ${v.suffix}` : ""}
                    style={{
                      color: "var(--bg)",
                      cursor: "ew-resize",
                      userSelect: "none",
                    }}
                  />
                </span>

                {/* Suffix (editable groove) */}
                <input
                  value={v.suffix ?? ""}
                  onChange={(e) => updateVariable(v.name, { suffix: e.target.value || undefined })}
                  placeholder="suffix"
                  className="sig-editable sig-input"
                  style={{
                    width: "100%",
                    fontFamily: "var(--f-mono)",
                    fontSize: 11,
                    padding: "4px 24px 4px 8px",
                  }}
                />

                {/* Usage (static anchor) */}
                <span
                  className="sig-static pl-meta"
                  style={{
                    textAlign: "right",
                    paddingRight: 8,
                    display: "inline-flex",
                    justifyContent: "flex-end",
                    alignItems: "baseline",
                    gap: 8,
                  }}
                >
                  <span style={{ width: 2, height: 14, background: "var(--hair-strong)" }} />
                  {usage.length === 0 ? (
                    <span style={{ color: "var(--hair-strong)" }}>UNUSED</span>
                  ) : (
                    `USED IN STEP ${usage.map((n) => String(n).padStart(2, "0")).join(", ")}`
                  )}
                </span>

                {/* Remove (sig-icon danger) */}
                <button
                  onClick={() => removeVariable(v.name)}
                  className="sig-btn sig-icon sig-danger"
                  aria-label={`Remove ${v.label}`}
                >×</button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
