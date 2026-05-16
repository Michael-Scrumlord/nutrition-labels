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
      <span style={{
        color: "var(--color-text-tertiary)",
        fontStyle: "italic",
        fontFamily: "'Instrument Serif', Georgia, serif",
      }}>
        Empty step — click to edit.
      </span>
    );
  }

  return (
    <span style={{ lineHeight: 1.55, fontSize: 17 }}>
      {tokens.map((token, i) => {
        if (token.kind === "text") {
          return <span key={i}>{token.content}</span>;
        }
        if (token.kind === "var") {
          const v = token.variable;
          return (
            <span
              key={i}
              title={v.label}
              style={{
                display: "inline-flex", alignItems: "baseline", gap: 2,
                padding: "0 6px", margin: "0 2px",
                background: "var(--color-accent-blush)",
                borderRadius: 3,
                whiteSpace: "nowrap",
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
                  color: ACCENT,
                  fontWeight: 800,
                  fontFamily: "'JetBrains Mono', monospace",
                  fontSize: 16,
                }}
              />
              {v.suffix && (
                <span style={{
                  color: ACCENT,
                  fontSize: 12,
                  fontFamily: "'Inter Tight', sans-serif",
                  letterSpacing: "0.04em",
                }}>
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
              color: "var(--color-text-tertiary)",
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
