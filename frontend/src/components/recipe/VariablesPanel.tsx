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
    <section style={{ marginTop: 22, paddingTop: 16, borderTop: "1px solid var(--hair)" }}>
      <button
        onClick={() => setOpen(!open)}
        className="pl-meta"
        style={{
          background: "transparent",
          border: "none",
          cursor: "pointer",
          padding: 0,
          display: "flex",
          alignItems: "baseline",
          gap: 10,
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>ALL VARIABLES · {variables.length}</span>
      </button>

      {open && (
        <ul style={{ listStyle: "none", margin: "10px 0 0", padding: 0 }}>
          {variables.map((v) => {
            const usage = usageMap.get(v.name) ?? [];
            return (
              <li
                key={v.name}
                style={{
                  display: "grid",
                  gridTemplateColumns: "minmax(140px, 1fr) 90px 110px auto auto",
                  gap: 12,
                  alignItems: "center",
                  padding: "8px 0",
                  borderBottom: "1px solid var(--hair)",
                }}
              >
                {/* Label (editable) */}
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(v.name, { label: e.target.value })}
                  className="pl-display"
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontSize: 19,
                    color: "var(--ink)",
                    padding: 0,
                  }}
                />

                {/* Value (scrub) */}
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "baseline",
                    padding: "2px 10px",
                    background: "color-mix(in srgb, var(--accent) 12%, transparent)",
                    borderRadius: 2,
                    justifySelf: "start",
                  }}
                >
                  <ScrubNumber
                    value={v.value}
                    onChange={(n) => setVariableValue(v.name, n)}
                    min={v.min}
                    max={v.max}
                    step={v.step ?? 1}
                    ariaLabel={v.label}
                    style={{
                      color: "var(--accent)",
                      fontWeight: 800,
                      fontFamily: "var(--f-mono)",
                      fontSize: 14,
                    }}
                  />
                </span>

                {/* Suffix (editable) */}
                <input
                  value={v.suffix ?? ""}
                  onChange={(e) => updateVariable(v.name, { suffix: e.target.value || undefined })}
                  placeholder="suffix"
                  style={{
                    background: "transparent",
                    border: "1px solid var(--hair)",
                    outline: "none",
                    fontFamily: "var(--f-mono)",
                    fontSize: 11,
                    padding: "3px 6px",
                    color: "var(--ink-2)",
                  }}
                />

                {/* Usage */}
                <span
                  className="pl-meta"
                  style={{ fontSize: 9, letterSpacing: "0.14em", textAlign: "right" }}
                >
                  {usage.length === 0 ? (
                    <span style={{ color: "var(--hair-strong)" }}>UNUSED</span>
                  ) : (
                    `STEP ${usage.map((n) => String(n).padStart(2, "0")).join(", ")}`
                  )}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeVariable(v.name)}
                  style={{
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    color: "var(--ink-3)",
                    fontSize: 16,
                    padding: "2px 6px",
                    lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}
                  aria-label={`Remove ${v.label}`}
                >
                  ×
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </section>
  );
}
