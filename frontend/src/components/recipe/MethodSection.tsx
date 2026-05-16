// recipe/MethodSection.tsx
//
// "Method" — the instructions section of the recipe. Lists ordered steps
// (each with edit/read mode) and a collapsible variables panel below.

import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { StepRow } from "./StepRow";
import { VariablesPanel } from "./VariablesPanel";
import { ACCENT, INK } from "../../constants/theme";

export function MethodSection() {
  const instructions = useRecipeStore((s) => s.instructions);
  const { addStep } = useRecipeActions();

  return (
    <section style={{ marginTop: 56, paddingTop: 24, borderTop: `2px solid ${INK}` }}>
      {/* ── Section caption ──────────────────────────────────────────────── */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 12 }}>
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: "#999", letterSpacing: "0.2em",
        }}>
          METHOD —
        </span>
        <span style={{ flex: 1, height: 1, background: INK }} />
        <span style={{
          fontFamily: "'JetBrains Mono', monospace",
          fontSize: 11, color: "#999", letterSpacing: "0.2em",
        }}>
          {instructions.length} STEP{instructions.length !== 1 ? "S" : ""}
        </span>
      </div>

      {/* ── Section title ────────────────────────────────────────────────── */}
      <h2 style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontStyle: "italic",
        fontSize: "clamp(32px, 5vw, 56px)",
        lineHeight: 0.95,
        letterSpacing: "-0.025em",
        margin: "0 0 18px",
        color: INK,
        fontWeight: 400,
      }}>
        how to make it
      </h2>

      {/* ── Step list ────────────────────────────────────────────────────── */}
      <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `2px solid ${INK}` }}>
        {instructions.length === 0 && (
          <li style={{
            padding: "28px 0",
            color: "#bbb",
            fontStyle: "italic",
            fontFamily: "'Instrument Serif', Georgia, serif",
            fontSize: 22,
            borderBottom: "1px solid var(--color-border-subtle)",
          }}>
            No steps yet — add one below.
          </li>
        )}

        {instructions.map((step, i) => (
          <StepRow
            key={step.id}
            step={step}
            index={i}
            total={instructions.length}
          />
        ))}
      </ul>

      {/* ── Add step ─────────────────────────────────────────────────────── */}
      <button
        onClick={() => addStep()}
        style={{
          marginTop: 14,
          background: "transparent", border: "none",
          color: ACCENT,
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: "italic", fontSize: 22,
          cursor: "pointer", padding: 0,
        }}
      >
        + add a step
      </button>

      {/* ── Variables panel ──────────────────────────────────────────────── */}
      <VariablesPanel />

      {/* ── Methodology footnote ────────────────────────────────────────── */}
      <p style={{
        marginTop: 36,
        maxWidth: 720,
        fontSize: 13,
        lineHeight: 1.55,
        color: "#888",
      }}>
        Variables let readers tweak this recipe. Click <em style={{ color: ACCENT, fontFamily: "'Instrument Serif', Georgia, serif" }}>+ insert variable</em>
        {" "}while editing a step to place any tweakable value — bake time, oven temp, even how many cups.
        Readers drag the magenta numbers to adjust on the fly; every reference updates in lockstep.
      </p>
    </section>
  );
}
