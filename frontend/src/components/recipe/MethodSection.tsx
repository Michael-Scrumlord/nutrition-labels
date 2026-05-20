// recipe/MethodSection.tsx
//
// "Method" — the instructions section of the recipe. Ordered numbered
// steps (each with edit / read mode) and a collapsible variables panel.
// The whole section is collapsible; the expand/collapse state lives in
// the preferences store so it persists across reloads.

import { useRecipeStore } from "../../store/recipeStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { StepRow } from "./StepRow";
import { VariablesPanel } from "./VariablesPanel";

export function MethodSection() {
  const instructions = useRecipeStore((s) => s.instructions);
  const { addStep } = useRecipeActions();
  const isExpanded = usePreferencesStore((s) => s.isMethodExpanded);
  const toggle = usePreferencesStore((s) => s.toggleMethodExpanded);

  return (
    <section style={{ marginTop: 44, paddingTop: 24, borderTop: "1px solid var(--hair-strong)" }}>
      {/* ── Section caption (clickable to expand/collapse) ───────────────── */}
      <button
        type="button"
        onClick={toggle}
        aria-expanded={isExpanded}
        aria-controls="method-section-body"
        style={{
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          marginBottom: 10,
          width: "100%",
          background: "transparent",
          border: "none",
          padding: 0,
          cursor: "pointer",
          textAlign: "left",
          color: "inherit",
          font: "inherit",
        }}
      >
        <span
          aria-hidden="true"
          className="pl-meta"
          style={{
            display: "inline-block",
            width: 10,
            transition: "transform 200ms ease",
            transform: isExpanded ? "rotate(90deg)" : "rotate(0deg)",
          }}
        >
          ▸
        </span>
        <span className="pl-meta">METHOD —</span>
        <span style={{ flex: 1, height: 1, background: "var(--hair-strong)" }} />
        <span className="pl-meta">
          {instructions.length} STEP{instructions.length !== 1 ? "S" : ""}
        </span>
      </button>

      {/* ── Section title (always visible — anchors the section even when collapsed) ── */}
      <h2
        className="pl-display"
        style={{
          fontSize: 44,
          lineHeight: 0.95,
          margin: "0 0 14px",
          color: "var(--ink)",
        }}
      >
        how to make it
      </h2>

      {/* ── Collapsible body ─────────────────────────────────────────────── */}
      {isExpanded && (
        <div id="method-section-body">
          {/* ── Step list ────────────────────────────────────────────────── */}
          <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--hair-strong)" }}>
            {instructions.length === 0 && (
              <li
                className="pl-display"
                style={{
                  padding: "28px 0",
                  color: "var(--ink-3)",
                  fontSize: 22,
                  borderBottom: "1px solid var(--hair)",
                }}
              >
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

          {/* ── Add step ─────────────────────────────────────────────────── */}
          <button
            onClick={() => addStep()}
            className="pl-display"
            style={{
              marginTop: 14,
              background: "transparent",
              border: "none",
              color: "var(--accent)",
              fontSize: 20,
              cursor: "pointer",
              padding: 0,
            }}
          >
            + add a step
          </button>

          {/* ── Variables panel ──────────────────────────────────────────── */}
          <VariablesPanel />

          {/* ── Methodology footnote ────────────────────────────────────── */}
          <p style={{ marginTop: 36, maxWidth: 720, fontSize: 13, lineHeight: 1.55, color: "var(--ink-3)" }}>
            Variables let readers tweak this recipe. Click{" "}
            <em className="pl-display" style={{ color: "var(--accent)" }}>+ insert variable</em>{" "}
            while editing a step to place any tweakable value — bake time, oven temp, even how many cups.
            Readers drag the accent numbers to adjust on the fly; every reference updates in lockstep.
          </p>
        </div>
      )}
    </section>
  );
}
