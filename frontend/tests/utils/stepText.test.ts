// tests/utils/stepText.test.ts
//
// Full unit-test coverage for utils/stepText.ts.
// stepText.ts had no prior test coverage; these tests cover all five exports:
//   slugify, findVariable, parseStepText, referencedVariableNames, insertVariableAt

import { describe, it, expect } from "vitest";
import {
  slugify,
  findVariable,
  parseStepText,
  referencedVariableNames,
  insertVariableAt,
} from "../../src/utils/stepText";
import type { RecipeVariable } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

function makeVar(
  label: string,
  value = 0,
  suffix?: string,
): RecipeVariable {
  return { name: slugify(label), label, value, suffix };
}

const BAKE_TIME: RecipeVariable = makeVar("Bake Time", 25, "minutes");
const TEMP:      RecipeVariable = makeVar("Temperature", 375, "°F");
const SERVINGS:  RecipeVariable = makeVar("Servings", 12);

const VARS: RecipeVariable[] = [BAKE_TIME, TEMP, SERVINGS];

// ── slugify ────────────────────────────────────────────────────────────────

describe("slugify", () => {
  it("lowercases and replaces spaces with underscores", () => {
    expect(slugify("Bake Time")).toBe("bake_time");
  });

  it("collapses consecutive non-alphanumeric chars to a single underscore", () => {
    expect(slugify("Hello  World")).toBe("hello_world");
    expect(slugify("It's hot!")).toBe("it_s_hot");
  });

  it("strips leading and trailing underscores produced by non-alphanumeric edges", () => {
    expect(slugify("---danger---")).toBe("danger");
    expect(slugify("!hello!")).toBe("hello");
  });

  it("trims surrounding whitespace before processing", () => {
    expect(slugify("  Bake Time  ")).toBe("bake_time");
  });

  it("returns 'var' for an empty string", () => {
    expect(slugify("")).toBe("var");
  });

  it("returns 'var' for a whitespace-only string", () => {
    expect(slugify("   ")).toBe("var");
  });

  it("returns 'var' for a string of only non-alphanumeric chars", () => {
    expect(slugify("---")).toBe("var");
  });

  it("preserves digits", () => {
    expect(slugify("Step 2")).toBe("step_2");
  });

  it("already-slugified input is idempotent", () => {
    expect(slugify("bake_time")).toBe("bake_time");
  });

  it("single word needs no underscores", () => {
    expect(slugify("Temperature")).toBe("temperature");
  });
});

// ── findVariable ───────────────────────────────────────────────────────────

describe("findVariable", () => {
  it("finds a variable by its canonical slug name", () => {
    // slugify('Bake Time') = 'bake_time'
    expect(findVariable(VARS, "bake_time")).toBe(BAKE_TIME);
  });

  it("finds a variable by display label (exact case)", () => {
    expect(findVariable(VARS, "Bake Time")).toBe(BAKE_TIME);
  });

  it("finds a variable by display label (case-insensitive)", () => {
    expect(findVariable(VARS, "bake time")).toBe(BAKE_TIME);
    expect(findVariable(VARS, "BAKE TIME")).toBe(BAKE_TIME);
  });

  it("finds by label with surrounding whitespace in the key", () => {
    expect(findVariable(VARS, "  Bake Time  ")).toBe(BAKE_TIME);
  });

  it("returns undefined when no variable matches", () => {
    expect(findVariable(VARS, "unknown")).toBeUndefined();
  });

  it("returns undefined for an empty key", () => {
    expect(findVariable(VARS, "")).toBeUndefined();
  });

  it("returns undefined when the variable list is empty", () => {
    expect(findVariable([], "Bake Time")).toBeUndefined();
  });

  it("finds the second variable in the list", () => {
    expect(findVariable(VARS, "Temperature")).toBe(TEMP);
  });

  it("finds the last variable in the list", () => {
    expect(findVariable(VARS, "Servings")).toBe(SERVINGS);
  });
});

// ── parseStepText ──────────────────────────────────────────────────────────

describe("parseStepText", () => {
  it("returns an empty array for empty text", () => {
    expect(parseStepText("", VARS)).toEqual([]);
  });

  it("returns a single text token for plain text with no tokens", () => {
    const tokens = parseStepText("Preheat the oven.", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: "text", content: "Preheat the oven." });
  });

  it("returns a single var token for a resolved variable reference", () => {
    const tokens = parseStepText("{Bake Time}", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ kind: "var", variable: BAKE_TIME, raw: "{Bake Time}" });
  });

  it("returns a missing token when the reference is unresolved", () => {
    const tokens = parseStepText("{Unknown Var}", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toEqual({ kind: "missing", label: "Unknown Var", raw: "{Unknown Var}" });
  });

  it("splits text around a resolved variable in the middle", () => {
    const tokens = parseStepText("Bake for {Bake Time} minutes.", VARS);
    expect(tokens).toHaveLength(3);
    expect(tokens[0]).toEqual({ kind: "text", content: "Bake for " });
    expect(tokens[1]).toMatchObject({ kind: "var", variable: BAKE_TIME });
    expect(tokens[2]).toEqual({ kind: "text", content: " minutes." });
  });

  it("handles multiple variable references in one string", () => {
    const tokens = parseStepText("Bake at {Temperature} for {Bake Time}.", VARS);
    const kinds = tokens.map((t) => t.kind);
    expect(kinds).toEqual(["text", "var", "text", "var", "text"]);
  });

  it("handles adjacent variable tokens with no text between them", () => {
    const tokens = parseStepText("{Temperature}{Bake Time}", VARS);
    expect(tokens).toHaveLength(2);
    expect(tokens[0]).toMatchObject({ kind: "var", variable: TEMP });
    expect(tokens[1]).toMatchObject({ kind: "var", variable: BAKE_TIME });
  });

  it("produces a missing token for a partial match (right label, wrong case slug)", () => {
    // 'bake time' (all lowercase) should still resolve via label match
    const tokens = parseStepText("{bake time}", VARS);
    expect(tokens).toHaveLength(1);
    expect(tokens[0]).toMatchObject({ kind: "var", variable: BAKE_TIME });
  });

  it("is stateless across multiple calls (TOKEN_RE.lastIndex is reset)", () => {
    // Call twice and verify the second call is not affected by the first
    parseStepText("First call: {Bake Time}", VARS);
    const tokens = parseStepText("Second call: {Temperature}", VARS);
    expect(tokens.find((t) => t.kind === "var")).toMatchObject({
      kind: "var",
      variable: TEMP,
    });
  });

  it("text at the end of string after the last token is captured", () => {
    const tokens = parseStepText("{Servings} portions each", VARS);
    expect(tokens.at(-1)).toEqual({ kind: "text", content: " portions each" });
  });

  it("ignores nested braces — TOKEN_RE does not match {{}}", () => {
    const tokens = parseStepText("Use {{double braces}}", VARS);
    // TOKEN_RE = /\{([^{}]+)\}/g — double braces do not nest, outer {} is not matched
    // The inner {double braces} matches as a missing token
    const missing = tokens.filter((t) => t.kind === "missing");
    expect(missing.length).toBeGreaterThanOrEqual(1);
  });
});

// ── referencedVariableNames ────────────────────────────────────────────────

describe("referencedVariableNames", () => {
  it("returns an empty set for text with no tokens", () => {
    expect(referencedVariableNames("Plain text.", VARS).size).toBe(0);
  });

  it("returns an empty set for empty text", () => {
    expect(referencedVariableNames("", VARS).size).toBe(0);
  });

  it("returns the slug of a single resolved variable", () => {
    const names = referencedVariableNames("{Bake Time}", VARS);
    expect(names).toEqual(new Set(["bake_time"]));
  });

  it("returns slugs for all resolved variables in a multi-token string", () => {
    const names = referencedVariableNames("{Temperature} and {Bake Time}", VARS);
    expect(names).toEqual(new Set(["temperature", "bake_time"]));
  });

  it("does not include unresolved references", () => {
    const names = referencedVariableNames("{Bake Time} and {Unknown}", VARS);
    expect(names.has("bake_time")).toBe(true);
    expect(names.has("unknown")).toBe(false);
  });

  it("deduplicates the same variable referenced twice", () => {
    const names = referencedVariableNames("{Bake Time} / {Bake Time}", VARS);
    expect(names.size).toBe(1);
    expect([...names]).toEqual(["bake_time"]);
  });

  it("is stateless across multiple calls", () => {
    referencedVariableNames("{Bake Time}", VARS);
    const names = referencedVariableNames("{Temperature}", VARS);
    expect(names).toEqual(new Set(["temperature"]));
  });
});

// ── insertVariableAt ───────────────────────────────────────────────────────

describe("insertVariableAt", () => {
  const V = BAKE_TIME; // label = "Bake Time"

  it("inserts at position 0 in an empty string (no spaces added)", () => {
    const { text, cursorAfter } = insertVariableAt("", 0, V);
    expect(text).toBe("{Bake Time}");
    expect(cursorAfter).toBe("{Bake Time}".length);
  });

  it("inserts at the start of a non-empty string (space added after token)", () => {
    const { text } = insertVariableAt("minutes.", 0, V);
    // cursor at start, before 'm' → no space before, space after
    expect(text).toBe("{Bake Time} minutes.");
  });

  it("inserts at the end of a string (space added before token)", () => {
    const { text } = insertVariableAt("Bake for", 8, V);
    // cursor at end, after 'r' → space before, no space after
    expect(text).toBe("Bake for {Bake Time}");
  });

  it("inserts in the middle with no surrounding spaces — adds both", () => {
    const base = "Bakefor";
    const { text } = insertVariableAt(base, 4, V);
    expect(text).toBe("Bake {Bake Time} for");
  });

  it("does not add extra space when cursor is after a space", () => {
    const base = "Bake ";
    const { text } = insertVariableAt(base, 5, V);
    // before ends with ' ' → no space before; nothing after → no space after
    expect(text).toBe("Bake {Bake Time}");
  });

  it("does not add extra space when cursor is before a space", () => {
    const base = " minutes";
    const { text } = insertVariableAt(base, 0, V);
    // cursor at start → no space before; after starts with ' ' → no space after
    expect(text).toBe("{Bake Time} minutes");
  });

  it("cursorAfter points to the end of the inserted token (including any added spaces)", () => {
    const { text, cursorAfter } = insertVariableAt("Bake for", 8, V);
    expect(text.slice(0, cursorAfter)).toBe("Bake for {Bake Time}");
  });

  it("produces a token using the variable's label (not its slug)", () => {
    const { text } = insertVariableAt("", 0, TEMP);
    expect(text).toContain("{Temperature}");
  });

  it("inserting twice produces two distinct tokens", () => {
    const first = insertVariableAt("", 0, BAKE_TIME);
    const second = insertVariableAt(first.text, first.cursorAfter, TEMP);
    expect(second.text).toContain("{Bake Time}");
    expect(second.text).toContain("{Temperature}");
  });
});
