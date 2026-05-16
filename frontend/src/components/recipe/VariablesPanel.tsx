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
import { ACCENT, INK } from "../../constants/theme";

export function VariablesPanel() {
  const variables    = useRecipeStore((s) => s.variables);
  const instructions = useRecipeStore((s) => s.instructions);
  const { updateVariable, setVariableValue, removeVariable } = useRecipeActions();

  const [open, setOpen] = useState(true);

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
    <section style={{ marginTop: 18, borderTop: "1px solid var(--color-border-subtle)", paddingTop: 16 }}>
      <button
        onClick={() => setOpen(!open)}
        style={{
          background: "transparent", border: "none", cursor: "pointer",
          padding: 0,
          display: "flex", alignItems: "baseline", gap: 10,
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 10, letterSpacing: "0.22em", color: "#999",
        }}
      >
        <span>{open ? "▾" : "▸"}</span>
        <span>VARIABLES · {variables.length}</span>
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
                  borderBottom: "1px solid var(--color-border-subtle)",
                }}
              >
                {/* Label (editable) */}
                <input
                  value={v.label}
                  onChange={(e) => updateVariable(v.name, { label: e.target.value })}
                  style={{
                    background: "transparent",
                    border: "none",
                    outline: "none",
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 19,
                    color: INK,
                    padding: 0,
                  }}
                />

                {/* Value (scrub) */}
                <span style={{
                  display: "inline-flex", alignItems: "baseline",
                  padding: "2px 8px",
                  background: "var(--color-accent-blush)",
                  borderRadius: 3,
                  justifySelf: "start",
                }}>
                  <ScrubNumber
                    value={v.value}
                    onChange={(n) => setVariableValue(v.name, n)}
                    min={v.min}
                    max={v.max}
                    step={v.step ?? 1}
                    ariaLabel={v.label}
                    style={{
                      color: ACCENT, fontWeight: 800,
                      fontFamily: "'JetBrains Mono', monospace", fontSize: 14,
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
                    border: "1px solid var(--color-border-subtle)",
                    outline: "none",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontSize: 12,
                    padding: "3px 6px",
                    color: INK,
                  }}
                />

                {/* Usage */}
                <span style={{
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 9, letterSpacing: "0.14em", color: "#999",
                }}>
                  {usage.length === 0
                    ? <span style={{ color: "#ccc" }}>UNUSED</span>
                    : `STEP ${usage.map((n) => String(n).padStart(2, "0")).join(", ")}`}
                </span>

                {/* Remove */}
                <button
                  onClick={() => removeVariable(v.name)}
                  style={{
                    background: "transparent", border: "none",
                    cursor: "pointer", color: "#ccc", fontSize: 16,
                    padding: "2px 6px", lineHeight: 1,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
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
