// recipe/StepRow.tsx
//
// A single instruction row. Renders in read mode (big italic numeral +
// rendered text with inline ScrubNumbers) and toggles to edit mode on click.

import { useState } from "react";
import type { RecipeStep } from "../../types";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { StepText } from "./StepText";
import { SlashStepEditor } from "./SlashStepEditor";

interface StepRowProps {
  step:    RecipeStep;
  index:   number;
  total:   number;
}

export function StepRow({ step, index, total }: StepRowProps) {
  const [editing, setEditing] = useState(step.text === "");
  const [hovered, setHovered] = useState(false);

  const { removeStep, moveStep } = useRecipeActions();

  const indexStr = String(index + 1).padStart(2, "0");

  return (
    <li
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      style={{
        display: "flex",
        gap: 18,
        padding: "16px 0",
        borderBottom: "1px solid var(--hair)",
        alignItems: "flex-start",
        animation: "popInRow 0.32s cubic-bezier(.2,.7,.1,1) both",
      }}
    >
      {/* Step numeral — display face */}
      <span
        className="pl-display"
        style={{
          fontSize: 38,
          color: "var(--ink-3)",
          lineHeight: 1,
          minWidth: 50,
          userSelect: "none",
        }}
      >
        {indexStr}
      </span>

      {/* Body */}
      <div style={{ flex: 1, minWidth: 0 }}>
        {editing ? (
          <SlashStepEditor
            stepId={step.id}
            initialText={step.text}
            onCommit={() => setEditing(false)}
            onRemove={() => removeStep(step.id)}
            index={index}
          />
        ) : (
          <div
            onClick={() => setEditing(true)}
            style={{
              cursor: "text",
              fontFamily: "var(--f-body)",
              color: "var(--ink)",
              fontSize: 16,
              lineHeight: 1.6,
              padding: "2px 0",
            }}
          >
            <StepText text={step.text} />
          </div>
        )}
      </div>

      {/* Controls — visible on hover */}
      {!editing && (
        <div style={{
          display: "flex", flexDirection: "column", gap: 2,
          opacity: hovered ? 1 : 0,
          transition: "opacity 0.15s ease",
          flexShrink: 0,
        }}>
          <CtrlBtn label="↑" disabled={index === 0}         onClick={() => moveStep(step.id, -1)} />
          <CtrlBtn label="↓" disabled={index === total - 1} onClick={() => moveStep(step.id,  1)} />
          <CtrlBtn label="×" danger                         onClick={() => removeStep(step.id)} />
        </div>
      )}
    </li>
  );
}

function CtrlBtn({ label, onClick, disabled, danger }: { label: string; onClick: () => void; disabled?: boolean; danger?: boolean }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: "none",
        cursor: disabled ? "default" : "pointer",
        color: disabled ? "var(--hair-strong)" : "var(--ink-3)",
        fontSize: 14,
        padding: "2px 6px",
        lineHeight: 1,
      }}
      onMouseEnter={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.color = danger ? "var(--color-danger)" : "var(--ink)";
      }}
      onMouseLeave={(e) => {
        if (disabled) return;
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)";
      }}
    >
      {label}
    </button>
  );
}
