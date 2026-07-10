// utils/stepText.ts
//
// Parsing and slug helpers for step text containing {Variable Label} tokens.

import type { RecipeVariable } from "../types";

export type StepToken =
  | { kind: "text"; content: string }
  | { kind: "var";  variable: RecipeVariable; raw: string }
  | { kind: "missing"; label: string; raw: string };

const TOKEN_RE = /\{([^{}]+)\}/g;

export function slugify(label: string): string {
  return label
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "") || "var";
}

/** Find a variable by either canonical name or display label (case-insensitive). */
export function findVariable(
  variables: RecipeVariable[],
  key: string,
): RecipeVariable | undefined {
  const slug = slugify(key);
  const lcLabel = key.trim().toLowerCase();
  return variables.find(
    (v) => v.name === slug || v.label.trim().toLowerCase() === lcLabel,
  );
}

/** Parse a step's text into alternating text / variable tokens. */
export function parseStepText(text: string, variables: RecipeVariable[]): StepToken[] {
  const out: StepToken[] = [];
  let lastIndex = 0;
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    if (match.index > lastIndex) {
      out.push({ kind: "text", content: text.slice(lastIndex, match.index) });
    }
    const inner = match[1];
    const variable = findVariable(variables, inner);
    if (variable) {
      out.push({ kind: "var", variable, raw: match[0] });
    } else {
      out.push({ kind: "missing", label: inner, raw: match[0] });
    }
    lastIndex = match.index + match[0].length;
  }
  if (lastIndex < text.length) {
    out.push({ kind: "text", content: text.slice(lastIndex) });
  }
  return out;
}

/** Names of variables that the given text references (slugified). */
export function referencedVariableNames(
  text: string,
  variables: RecipeVariable[],
): Set<string> {
  const out = new Set<string>();
  TOKEN_RE.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = TOKEN_RE.exec(text)) !== null) {
    const variable = findVariable(variables, match[1]);
    if (variable) out.add(variable.name);
  }
  return out;
}
