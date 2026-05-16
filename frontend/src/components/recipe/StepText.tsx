// recipe/StepText.tsx
//
// Renders a step's text in read mode — text segments interleaved with
// live ScrubNumber tokens for each variable reference.

import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ScrubNumber } from "../ui/ScrubNumber";
import { parseStepText } from "../../utils/stepText";
import { ACCENT } from "../../constants/theme";

interface StepTextProps {
  text: string;
}

export function StepText({ text }: StepTextProps) {
  const variables = useRecipeStore((s) => s.variables);
  const { setVariableValue } = useRecipeActions();

  const tokens = parseStepText(text, variables);

  if (text.trim() === "") {
    return (
      <span className="pl-display" style={{ color: "var(--ink-3)" }}>
        Empty step — click to edit.
      </span>
    );
  }

  return (
    <span style={{ lineHeight: 1.55, fontSize: 16 }}>
      {tokens.map((token, i) => {
        if (token.kind === "text") {
          return <span key={i}>{token.content}</span>;
        }
        if (token.kind === "var") {
          const v = token.variable;
          return (
            <span key={i} title={v.label} className="step-var">
              <ScrubNumber
                value={v.value}
                onChange={(n) => setVariableValue(v.name, n)}
                min={v.min}
                max={v.max}
                step={v.step ?? 1}
                ariaLabel={v.label}
                style={{
                  color: ACCENT,
                  fontWeight: 700,
                  fontFamily: "var(--f-body)",
                  fontSize: 16,
                  fontVariantNumeric: "tabular-nums",
                }}
              />
              {v.suffix && (
                <span
                  style={{
                    color: ACCENT,
                    fontSize: 13,
                    fontFamily: "var(--f-body)",
                    letterSpacing: "0.04em",
                  }}
                >
                  {v.suffix}
                </span>
              )}
            </span>
          );
        }
        // Missing variable — show as muted, indicates a stale reference
        return (
          <span
            key={i}
            title={`Undefined variable: ${token.label}`}
            style={{
              color: "var(--ink-3)",
              textDecoration: "underline dotted",
              padding: "0 2px",
            }}
          >
            {token.raw}
          </span>
        );
      })}
    </span>
  );
}
