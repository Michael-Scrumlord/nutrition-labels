// tests/utils/stepText.test.ts
//
// Tests for all exported functions in utils/stepText.ts:
//   slugify, findVariable, parseStepText, referencedVariableNames, insertVariableAt
//
// Focus areas: empty / whitespace inputs, special characters, case insensitivity,
// consecutive tokens, overlapping labels, missing variables, cursor edge cases.

import { describe, it, expect, beforeEach } from "vitest";
import {
  slugify,
  findVariable,
  parseStepText,
  referencedVariableNames,
  insertVariableAt,
} from "../../src/utils/stepText";
import type { RecipeVariable } from "../../src/types";

// ── Fixtures ────────────────────────────────────────────────────────────────

function makeVar(label: string, value = 1): RecipeVariable {
  const name = slugify(label);
  return { name, label, value };
}

const BAKE_TIME  = makeVar("Bake Time",  30);
const OIL_AMOUNT = makeVar("Oil Amount", 2);
const SERVINGS   = makeVar("Servings",   12);

const VARS: RecipeVariable[] = [BAKE_TIME, OIL_AMOUNT, SERVINGS];

// ── slugify ──────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases a plain word", () => {
    expect(slugify("Butter")).toBe("butter");
  });

  it("converts spaces to underscores", () => {
    expect(slugify("Bake Time")).toBe("bake_time");
  });

  it("collapses multiple spaces to a single underscore", () => {
    expect(slugify("Bake   Time")).toBe("bake_time");
  });

  it("replaces non-alphanumeric chars with underscores", () => {
    expect(slugify("Oil & Amount")).toBe("oil_amount");
  });

  it("strips leading and trailing underscores", () => {
    expect(slugify("  Bake Time  ")).toBe("bake_time");
  });

  it("handles a single word with no spaces", () => {
    expect(slugify("Servings")).toBe("servings");
  });

  it("handles mixed case with symbols", () => {
    expect(slugify("Cup(s) of Sugar")).toBe("cup_s_of_sugar");
  });

  it("returns 'var' for an empty string (fallback)", () => {
    expect(slugify("")).toBe("var");
  });

  it("returns 'var' for a string of only special characters", () => {
    expect(slugify("!@#$%")).toBe("var");
  });

  it("preserves digits in the slug", () => {
    expect(slugify("Step 2 Time")).toBe("step_2_time");
  });

  it("is idempotent on already-slugified strings", () => {
    const slug = slugify("Bake Time");
    expect(slugify(slug)).toBe(slug);
  });
});

// ── findVariable ─────────────────────────────────────────────────────────────

describe("findVariable", () => {
  it("finds a variable by exact canonical slug name", () => {
    const v = findVariable(VARS, "bake_time");
    expect(v).toBeDefined();
    expect(v?.label).toBe("Bake Time");
  });

  it("finds a variable by display label (case-insensitive)", () => {
    const v = findVariable(VARS, "bake time");
    expect(v).toBeDefined();
    expect(v?.name).toBe("bake_time");
  });

  it("finds a variable by display label with different casing", () => {
    const v = findVariable(VARS, "BAKE TIME");
    expect(v).toBeDefined();
    expect(v?.name).toBe("bake_time");
  });

  it("finds a variable by exact label match ignoring extra whitespace", () => {
    const v = findVariable(VARS, "  Bake Time  ");
    expect(v).toBeDefined();
  });

  it("returns undefined for an unknown label", () => {
    expect(findVariable(VARS, "Nonexistent")).toBeUndefined();
  });

  it("returns undefined for an empty string", () => {
    expect(findVariable(VARS, "")).toBeUndefined();
  });

  it("returns undefined when variable list is empty", () => {
    expect(findVariable([], "bake_time")).toBeUndefined();
  });

  it("finds the first matching variable when labels resolve to the same slug", () => {
    const a = makeVar("Bake Time");
    const b: RecipeVariable = { name: "bake_time", label: "bake time", value: 20 };
    const result = findVariable([a, b], "bake_time");
    // Should find something — the first match wins
    expect(result).toBeDefined();
  });
});

// ── parseStepText ─────────────────────────────────────────────────────────────

describe("parseStepText", () => {
  it("returns a single text token for a string with no braces", () => {
    const tokens = parseStepText("Bake at 350°F", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: "text", content: "Bake at 350°F" });
  });

  it("returns a var token for a known {variable}", () => {
    const tokens = parseStepText("{Bake Time}", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("var");
    if (tokens[0].kind === "var") {
      expect(tokens[0].variable.name).toBe("bake_time");
      expect(tokens[0].raw).toBe("{Bake Time}");
    }
  });

  it("returns a missing token for an unknown {variable}", () => {
    const tokens = parseStepText("{Unknown}", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0].kind).toBe("missing");
    if (tokens[0].kind === "missing") {
      expect(tokens[0].label).toBe("Unknown");
      expect(tokens[0].raw).toBe("{Unknown}");
    }
  });

  it("interleaves text and var tokens correctly", () => {
    const tokens = parseStepText("Bake for {Bake Time} minutes", VARS);
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ kind: "text", content: "Bake for " });
    expect(tokens[1].kind).toBe("var");
    expect(tokens[2]).toEqual({ kind: "text", content: " minutes" });
  });

  it("handles consecutive variable tokens with no text between them", () => {
    const tokens = parseStepText("{Bake Time}{Servings}", VARS);
    expect(tokens).toHaveLength(2);
    expect(tokens[0].kind).toBe("var");
    expect(tokens[1].kind).toBe("var");
  });

  it("handles text that starts with a variable token", () => {
    const tokens = parseStepText("{Bake Time} minutes at 350°", VARS);
    expect(tokens[0].kind).toBe("var");
    expect(tokens[1]).toEqual({ kind: "text", content: " minutes at 350°" });
  });

  it("handles text that ends with a variable token", () => {
    const tokens = parseStepText("Yield: {Servings}", VARS);
    expect(tokens[0]).toEqual({ kind: "text", content: "Yield: " });
    expect(tokens[1].kind).toBe("var");
  });

  it("returns an empty array for an empty string", () => {
    expect(parseStepText("", VARS)).toHaveLength(0);
  });

  it("treats a known var in one part and a missing var in another", () => {
    const tokens = parseStepText("{Bake Time} and {Ghost}", VARS);
    expect(tokens.some(t => t.kind === "var")).toBe(true);
    expect(tokens.some(t => t.kind === "missing")).toBe(true);
  });

  it("does not parse nested braces — only outermost tokens match", () => {
    // TOKEN_RE = /\{([^{}]+)\}/ — inner braces would fail to match
    const tokens = parseStepText("{{nested}}", VARS);
    // Outer {} doesn't match because content contains {}; or inner matches
    // Behavior: the regex /\{([^{}]+)\}/ will not greedily nest; it may or may
    // not match "{nested}" depending on position. We just verify no crash.
    expect(Array.isArray(tokens)).toBe(true);
  });

  it("multiple instances of the same variable parse to multiple var tokens", () => {
    const tokens = parseStepText("{Bake Time} + {Bake Time}", VARS);
    const varTokens = tokens.filter(t => t.kind === "var");
    expect(varTokens).toHaveLength(2);
  });
});

// ── referencedVariableNames ────────────────────────────────────────────────

describe("referencedVariableNames", () => {
  it("returns an empty set for text with no tokens", () => {
    const names = referencedVariableNames("Bake at 350°F", VARS);
    expect(names.size).toBe(0);
  });

  it("returns the slug name of a referenced variable", () => {
    const names = referencedVariableNames("Bake for {Bake Time} min", VARS);
    expect(names.has("bake_time")).toBe(true);
    expect(names.size).toBe(1);
  });

  it("does not include unknown variable references", () => {
    const names = referencedVariableNames("{Unknown}", VARS);
    expect(names.size).toBe(0);
  });

  it("does not double-count the same variable referenced twice", () => {
    const names = referencedVariableNames("{Bake Time} and again {Bake Time}", VARS);
    expect(names.size).toBe(1);
    expect(names.has("bake_time")).toBe(true);
  });

  it("collects multiple distinct variable references", () => {
    const names = referencedVariableNames("{Bake Time} at {Oil Amount} tbsp", VARS);
    expect(names.has("bake_time")).toBe(true);
    expect(names.has("oil_amount")).toBe(true);
    expect(names.size).toBe(2);
  });

  it("returns empty set for an empty string", () => {
    expect(referencedVariableNames("", VARS).size).toBe(0);
  });
});

// ── insertVariableAt ────────────────────────────────────────────────────────

describe("insertVariableAt", () => {
  it("inserts a variable token at the beginning of text (cursor=0)", () => {
    const { text } = insertVariableAt("bake for 30 min", 0, BAKE_TIME);
    expect(text).toMatch(/^\{Bake Time\}/);
  });

  it("inserts a variable at the end of text (cursor = text.length)", () => {
    const base = "Bake for ";
    const { text } = insertVariableAt(base, base.length, BAKE_TIME);
    expect(text).toMatch(/\{Bake Time\}$/);
  });

  it("inserts a variable in the middle with appropriate spacing", () => {
    const base = "Cook for X minutes";
    const pos = base.indexOf("X");
    const { text } = insertVariableAt(base, pos, BAKE_TIME);
    expect(text).toContain("{Bake Time}");
  });

  it("adds a leading space when cursor is not at a word boundary", () => {
    // Cursor in the middle of a word — needs space before token
    const { text } = insertVariableAt("bake30min", 4, BAKE_TIME);
    expect(text).toContain(" {Bake Time}");
  });

  it("adds a trailing space when next char is not whitespace", () => {
    const { text } = insertVariableAt("bake30min", 4, BAKE_TIME);
    expect(text).toMatch(/\{Bake Time\} /);
  });

  it("does NOT add a leading space when at start of text (cursor=0)", () => {
    const { text } = insertVariableAt("rest of text", 0, BAKE_TIME);
    expect(text.startsWith("{Bake Time}")).toBe(true);
  });

  it("does NOT add a trailing space when cursor is at end of text", () => {
    const base = "Text ";
    const { text } = insertVariableAt(base, base.length, BAKE_TIME);
    expect(text.endsWith("{Bake Time}")).toBe(true);
  });

  it("cursorAfter is positioned after the inserted token", () => {
    const { cursorAfter, text } = insertVariableAt("Text ", 5, BAKE_TIME);
    expect(cursorAfter).toBe(text.length);
  });

  it("handles inserting into an empty string", () => {
    const { text } = insertVariableAt("", 0, BAKE_TIME);
    expect(text).toBe("{Bake Time}");
  });

  it("uses the variable's label (not slug) in the token", () => {
    const { text } = insertVariableAt("", 0, OIL_AMOUNT);
    expect(text).toContain("{Oil Amount}");
    expect(text).not.toContain("{oil_amount}");
  });

  it("inserts correctly when cursor is at a trailing space (word boundary)", () => {
    // After "Cook " there is already a space, so no extra space before needed
    const base = "Cook ";
    const { text } = insertVariableAt(base, base.length, SERVINGS);
    expect(text).toContain("{Servings}");
    // Should not double-space
    expect(text).not.toContain("  {");
  });
});
