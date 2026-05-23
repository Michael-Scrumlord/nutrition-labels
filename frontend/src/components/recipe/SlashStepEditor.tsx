// recipe/SlashStepEditor.tsx
//
// Edit mode for an instruction step. Implements the "Variant A — Slash
// Command · Inline Token Chips" design.
//
// What's new vs the old StepEditor:
//   • The editor is a contentEditable div, not a <textarea>. Variables
//     appear as chips inline with the prose — the user never confronts
//     the {Label} curly-brace syntax. (21 CFR-irrelevant; pure UX.)
//   • Typing "/" anywhere in the text opens a SlashMenu anchored at the
//     caret. The menu lists existing variables with live values and
//     offers a one-line "Create new" form. No modal, no toolbar button.
//   • Enter commits, Escape reverts, Backspace immediately after a chip
//     deletes the chip. ⌘K is preserved as a fallback for muscle memory.
//
// Architecture notes (read before changing):
//   1. The contentEditable is mounted ONCE from `initialText`. After that
//      the DOM is uncontrolled — React does not own the text content.
//      Reading is done via `serializeDom()` on commit.
//   2. Chips are static DOM spans with contentEditable=false. They show
//      "Label: value" frozen at the moment edit mode opened; full live
//      scrubbing happens in read mode. This is a deliberate trade-off —
//      portal-mounting React chip components into the contentEditable
//      was rejected as too much complexity for the marginal benefit of
//      scrubbing while typing.
//   3. The slash menu is positioned with a DOMRect captured from a
//      Range covering the literal "/" character — so its position is
//      pixel-correct regardless of layout, wrapping, or scroll.
//
// Persistence stays compatible with the existing data model:
// RecipeStep.text is still a `{Label}`-token string, and parseStepText
// continues to be the source of truth for read mode and the variables
// usage map. No migration of saved recipes is required.

import { useEffect, useRef, useState, useCallback, memo } from "react";
import type { RecipeVariable } from "../../types";
import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { parseStepText, slugify } from "../../utils/stepText";
import { SlashMenu } from "./SlashMenu";

// Style block hoisted out of the component body. Previously this was an
// inline <style>{...}</style> in the JSX, which meant every component
// render re-evaluated the template literal. Mounting it once at module
// load keeps the render path minimal and shields the contentEditable
// from spurious work on parent re-renders. The class names are unique
// enough that this won't collide with anything else.
const SLASH_EDITOR_CSS_INJECTED = (() => {
  if (typeof document === "undefined") return false;
  if (document.getElementById("slash-editor-styles")) return true;
  const tag = document.createElement("style");
  tag.id = "slash-editor-styles";
  tag.textContent = `
    .slash-chip {
      display: inline-block;
      padding: 1px 8px 2px;
      margin: 0 2px;
      background: color-mix(in srgb, var(--accent) 10%, transparent);
      color: var(--accent);
      border: 1px solid color-mix(in srgb, var(--accent) 28%, transparent);
      border-radius: 3px;
      font-family: var(--f-body);
      font-weight: 600;
      font-size: 14px;
      white-space: nowrap;
      line-height: 1.4;
      user-select: none;
      cursor: default;
    }
    .slash-editor:focus { outline: none; }
    .slash-editor [contenteditable="false"] { user-select: none; }
  `;
  document.head.appendChild(tag);
  return true;
})();
void SLASH_EDITOR_CSS_INJECTED;

interface SlashStepEditorProps {
  stepId: string;
  initialText: string;
  onCommit: () => void;
  onRemove: () => void;
  index: number;
}

interface SlashState {
  /** Bounding rect of the literal "/" character, used to anchor the menu. */
  rect: DOMRect;
  /** Characters typed after the "/" — filters the menu's variable list. */
  query: string;
  /** The text node containing the "/", and the offset of the "/" within it. */
  anchorNode: Text;
  anchorOffset: number;
}

const CHIP_CLASS = "slash-chip";

function SlashStepEditorImpl({
  stepId, initialText, onCommit, onRemove, index,
}: SlashStepEditorProps) {
  const variables = useRecipeStore((s) => s.variables);
  const { updateStepText, addVariable } = useRecipeActions();

  const editorRef = useRef<HTMLDivElement>(null);
  const menuOpenRef = useRef(false);   // synced with `slash` for blur logic
  const initialTextRef = useRef(initialText);

  const [slash, setSlash] = useState<SlashState | null>(null);
  const [creating, setCreating] = useState<null | {
    label: string; value: string; suffix: string;
  }>(null);

  menuOpenRef.current = !!slash;

  // ────────────────────────────────────────────────────────────────────
  //  Initial mount — render initial tokens into the contentEditable.
  //  Runs ONCE. After this, the DOM is uncontrolled until commit.
  // ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const el = editorRef.current;
    if (!el) return;
    el.innerHTML = "";
    const tokens = parseStepText(initialTextRef.current, variables);
    for (const tok of tokens) {
      if (tok.kind === "text") {
        el.appendChild(document.createTextNode(tok.content));
      } else if (tok.kind === "var") {
        el.appendChild(makeChipElement(tok.variable));
      } else {
        // missing: keep the original raw "{Bad Name}" text so the user
        // can fix it. Don't silently drop unknown tokens.
        el.appendChild(document.createTextNode(tok.raw));
      }
    }
    // Caret at end
    el.focus();
    const sel = window.getSelection();
    if (sel) {
      const r = document.createRange();
      r.selectNodeContents(el);
      r.collapse(false);
      sel.removeAllRanges();
      sel.addRange(r);
    }
    // We intentionally ignore variables on this effect — re-rendering when
    // variables change would wipe the user's typing. Read mode shows live
    // values; this editor is a snapshot of the moment edit mode opened.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ────────────────────────────────────────────────────────────────────
  //  Build a chip <span> element. Static DOM — value frozen at mount.
  // ────────────────────────────────────────────────────────────────────
  function makeChipElement(v: RecipeVariable): HTMLSpanElement {
    const span = document.createElement("span");
    span.className = CHIP_CLASS;
    span.contentEditable = "false";
    span.dataset.name = v.name;
    // Keep the visible text short — label + current value. The user can
    // get the suffix and full editing affordance from the ledger below.
    const valueText = `${v.value}${v.suffix ? ` ${v.suffix}` : ""}`;
    span.textContent = `${v.label} · ${valueText}`;
    return span;
  }

  // ────────────────────────────────────────────────────────────────────
  //  Walk the DOM and rebuild "{Label}"-token text for persistence.
  // ────────────────────────────────────────────────────────────────────
  const serializeDom = useCallback((): string => {
    const el = editorRef.current;
    if (!el) return initialTextRef.current;
    let out = "";
    el.childNodes.forEach((node) => {
      if (node.nodeType === Node.TEXT_NODE) {
        out += node.textContent ?? "";
      } else if (node.nodeType === Node.ELEMENT_NODE) {
        const e = node as HTMLElement;
        if (e.classList.contains(CHIP_CLASS) && e.dataset.name) {
          const v = variables.find((x) => x.name === e.dataset.name);
          // Persist with the variable's current label; if it was renamed
          // since the editor opened, we honour the rename on commit.
          if (v) out += `{${v.label}}`;
        } else {
          // Stray element (shouldn't happen, but be defensive).
          out += e.textContent ?? "";
        }
      }
    });
    return out;
  }, [variables]);

  const commit = useCallback(() => {
    updateStepText(stepId, serializeDom());
    onCommit();
  }, [stepId, serializeDom, updateStepText, onCommit]);

  const revert = useCallback(() => {
    updateStepText(stepId, initialTextRef.current);
    onCommit();
  }, [stepId, updateStepText, onCommit]);

  // ────────────────────────────────────────────────────────────────────
  //  Insert a chip at the slash position, replacing "/" + any query.
  //  Takes the variable OBJECT directly. We used to look it up by name
  //  here, but that broke the create-then-insert path: addVariable()
  //  updates zustand asynchronously, so the variables array captured
  //  in this callback's closure didn't yet contain the new variable on
  //  the same tick. Passing the object in skips the lookup entirely.
  // ────────────────────────────────────────────────────────────────────
  const insertChipAtSlash = useCallback(
    (v: RecipeVariable) => {
      const el = editorRef.current;
      const s = slash;
      if (!el || !s) return;

      // Delete the "/" + query characters from the anchor text node.
      const node = s.anchorNode;
      const text = node.textContent ?? "";
      const deleteEnd = s.anchorOffset + 1 + s.query.length;
      node.textContent =
        text.slice(0, s.anchorOffset) + text.slice(deleteEnd);

      // Place a range at the slash's old position so insertNode lands
      // the chip exactly where the "/" used to be.
      const range = document.createRange();
      range.setStart(node, s.anchorOffset);
      range.setEnd(node, s.anchorOffset);

      const chip = makeChipElement(v);
      range.insertNode(chip);

      // Caret right after the chip, then add a space so the next typed
      // character doesn't visually fuse with the chip's right edge.
      const space = document.createTextNode(" ");
      chip.after(space);
      const after = document.createRange();
      after.setStart(space, 1);
      after.setEnd(space, 1);
      const sel = window.getSelection();
      sel?.removeAllRanges();
      sel?.addRange(after);

      setSlash(null);
      setCreating(null);
      el.focus();
    },
    [slash],
  );

  const handlePick = (v: RecipeVariable) => insertChipAtSlash(v);

  const handleCreate = (draft: { label: string; value: string; suffix: string }) => {
    const trimmed = draft.label.trim();
    if (!trimmed) return;
    const name = slugify(trimmed);
    const existing = variables.find((x) => x.name === name);
    const n = Number(draft.value);
    // Build the variable record once; reuse it for both the store add
    // AND the chip insert so the two paths can't disagree about which
    // object we're inserting.
    const v: RecipeVariable = existing ?? {
      name,
      label: trimmed,
      value: Number.isFinite(n) ? n : 0,
      suffix: draft.suffix.trim() || undefined,
    };
    if (!existing) addVariable(v);
    insertChipAtSlash(v);
  };

  // ────────────────────────────────────────────────────────────────────
  //  Detect slash typing + maintain the post-slash query.
  // ────────────────────────────────────────────────────────────────────
  function handleInput() {
    const sel = window.getSelection();
    if (!sel || sel.rangeCount === 0) return;
    const range = sel.getRangeAt(0);

    if (slash) {
      // Already open — update the query by reading what's between the
      // slash and the current caret in the SAME text node.
      const text = slash.anchorNode.textContent ?? "";
      const caretInNode = range.startContainer === slash.anchorNode
        ? range.startOffset
        : -1;
      if (caretInNode === -1 || caretInNode <= slash.anchorOffset) {
        // Caret moved off the anchor node or before the slash — close.
        setSlash(null);
        return;
      }
      const between = text.slice(slash.anchorOffset + 1, caretInNode);
      // If the user typed a space, treat the menu as dismissed — a slash
      // followed by a space reads as prose, not a command.
      if (/\s/.test(between)) {
        setSlash(null);
        return;
      }
      setSlash({ ...slash, query: between });
      return;
    }

    // Not open — was the last char before caret a "/"? Resolve the
    // caret to a text node first: programmatic selection.collapse() can
    // place the focus on an element node (offset = child index), which
    // doesn't directly tell us the character before the caret.
    let node: Text;
    let offset: number;
    if (range.startContainer.nodeType === Node.TEXT_NODE) {
      node = range.startContainer as Text;
      offset = range.startOffset;
    } else if (range.startContainer.nodeType === Node.ELEMENT_NODE) {
      const parent = range.startContainer as HTMLElement;
      // The caret is "between children" — look at the child just before.
      const prevChild = parent.childNodes[range.startOffset - 1];
      if (!prevChild || prevChild.nodeType !== Node.TEXT_NODE) return;
      node = prevChild as Text;
      offset = node.textContent?.length ?? 0;
    } else {
      return;
    }
    if (offset === 0) return;
    const text = node.textContent ?? "";
    if (text.charAt(offset - 1) !== "/") return;
    // Avoid triggering on URLs / dates / fractions: only open if the "/"
    // is at the start of the node or follows whitespace.
    if (offset >= 2 && !/\s/.test(text.charAt(offset - 2))) return;

    // Compute rect of the literal "/" character.
    const slashRange = document.createRange();
    slashRange.setStart(node, offset - 1);
    slashRange.setEnd(node, offset);
    const rect = slashRange.getBoundingClientRect();

    setSlash({
      rect,
      query: "",
      anchorNode: node,
      anchorOffset: offset - 1,
    });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLDivElement>) {
    // ⌘K — open the slash menu at the current caret without requiring "/"
    if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
      e.preventDefault();
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      let node = range.startContainer;
      let offset = range.startOffset;
      if (node.nodeType !== Node.TEXT_NODE) {
        // Place a fresh text node we can anchor against.
        const t = document.createTextNode(" ");
        if (node.nodeType === Node.ELEMENT_NODE && (node as HTMLElement).contains(range.endContainer)) {
          (node as HTMLElement).appendChild(t);
        } else {
          editorRef.current?.appendChild(t);
        }
        node = t;
        offset = 0;
      }
      const textNode = node as Text;
      const text = textNode.textContent ?? "";
      textNode.textContent =
        text.slice(0, offset) + "/" + text.slice(offset);
      const slashRange = document.createRange();
      slashRange.setStart(textNode, offset);
      slashRange.setEnd(textNode, offset + 1);
      setSlash({
        rect: slashRange.getBoundingClientRect(),
        query: "",
        anchorNode: textNode,
        anchorOffset: offset,
      });
      // Move caret to right after the inserted "/"
      const caret = document.createRange();
      caret.setStart(textNode, offset + 1);
      caret.setEnd(textNode, offset + 1);
      sel.removeAllRanges();
      sel.addRange(caret);
      return;
    }

    if (e.key === "Escape") {
      if (slash) {
        e.preventDefault();
        setSlash(null);
        setCreating(null);
        return;
      }
      e.preventDefault();
      revert();
      return;
    }

    if (e.key === "Enter" && !e.shiftKey) {
      if (slash || creating) return; // let menu/form handle it
      e.preventDefault();
      commit();
      return;
    }

    // Backspace immediately after a chip → delete the chip whole.
    if (e.key === "Backspace") {
      const sel = window.getSelection();
      if (!sel || sel.rangeCount === 0) return;
      const range = sel.getRangeAt(0);
      if (!range.collapsed) return;
      const node = range.startContainer;
      const offset = range.startOffset;
      // Case A: caret at start of a text node, previous sibling is a chip.
      if (node.nodeType === Node.TEXT_NODE && offset === 0) {
        const prev = (node as Text).previousSibling;
        if (prev && (prev as HTMLElement).classList?.contains(CHIP_CLASS)) {
          e.preventDefault();
          prev.parentNode?.removeChild(prev);
        }
        return;
      }
      // Case B: caret directly inside the editor between siblings (rare,
      // happens after a chip insertion before a text node exists).
      if (node === editorRef.current && offset > 0) {
        const prev = node.childNodes[offset - 1];
        if (prev && (prev as HTMLElement).classList?.contains(CHIP_CLASS)) {
          e.preventDefault();
          prev.parentNode?.removeChild(prev);
        }
      }
    }
  }

  // Close on outside click (the menu itself stops propagation).
  useEffect(() => {
    if (!slash) return;
    const onDown = (ev: MouseEvent) => {
      const target = ev.target as Node;
      if (editorRef.current?.contains(target)) return;
      setSlash(null);
      setCreating(null);
    };
    window.addEventListener("mousedown", onDown);
    return () => window.removeEventListener("mousedown", onDown);
  }, [slash]);

  // ────────────────────────────────────────────────────────────────────
  //  Hint banner — replaces the "+ INSERT VARIABLE / ⌘K" toolbar from
  //  the previous editor. Mirrors the design's editorial caption row.
  // ────────────────────────────────────────────────────────────────────
  const stepLabel = String(index + 1).padStart(2, "0");
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      <div
        className="pl-meta"
        style={{
          display: "flex", gap: 14, alignItems: "baseline",
          fontFamily: "var(--f-mono)", fontSize: 10,
          letterSpacing: "0.18em", textTransform: "uppercase",
          color: "var(--ink-3)",
        }}
      >
        <span>EDITING — STEP {stepLabel}</span>
        <span style={{ color: "var(--ink-2)" }}>
          type <Kbd>/</Kbd> anywhere to insert a variable
        </span>
        <span style={{ flex: 1 }} />
        <span>⏎ COMMIT · ESC CANCEL</span>
        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          style={{
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--f-body)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--ink-3)",
            padding: "0 0 0 6px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}
        >
          DELETE STEP
        </button>
      </div>

      <div style={{ position: "relative" }}>
        <div
          ref={editorRef}
          className="slash-editor"
          contentEditable
          suppressContentEditableWarning
          onInput={handleInput}
          onKeyDown={handleKeyDown}
          onBlur={(e) => {
            // The menu lives outside the editor in the DOM. If focus moved
            // into it (or into the create-new inputs inside it), don't
            // commit yet — wait for the menu to close.
            if (menuOpenRef.current) return;
            const next = e.relatedTarget as HTMLElement | null;
            if (next && next.closest?.("[data-slash-menu]")) return;
            commit();
          }}
          role="textbox"
          aria-multiline="true"
          style={{
            background: "color-mix(in srgb, var(--accent) 6%, transparent)",
            border: "1px solid var(--accent)",
            padding: "10px 12px",
            minHeight: 56,
            fontFamily: "var(--f-body)",
            fontSize: 16,
            lineHeight: 1.7,
            color: "var(--ink)",
            outline: "none",
            whiteSpace: "pre-wrap",
            wordBreak: "break-word",
          }}
        />

        {slash && (
          <SlashMenu
            anchorRect={slash.rect}
            query={slash.query}
            variables={variables}
            creating={creating}
            setCreating={setCreating}
            onPick={handlePick}
            onCreate={handleCreate}
            onClose={() => { setSlash(null); setCreating(null); editorRef.current?.focus(); }}
          />
        )}
      </div>
    </div>
  );
}

// Memo the editor so the parent re-rendering (StepRow toggles hover state
// on every mouseenter/leave) doesn't ripple into the contentEditable —
// re-rendering the editor mid-typing is wasted work even when nothing
// visible changes, and may also poke at the contentEditable DOM in ways
// the browser doesn't love. We compare props by value; the inline arrow
// props (onCommit/onRemove) get new references on every parent render,
// but their effect is identical so we treat any same-stepId prop set as
// stable. If you need to force a remount, change the key in StepRow.
export const SlashStepEditor = memo(
  SlashStepEditorImpl,
  (prev, next) =>
    prev.stepId === next.stepId &&
    prev.initialText === next.initialText &&
    prev.index === next.index,
);

function Kbd({ children }: { children: React.ReactNode }) {
  return (
    <kbd
      style={{
        fontFamily: "var(--f-mono)",
        fontSize: 10,
        border: "1px solid var(--hair-strong)",
        borderRadius: 2,
        padding: "1px 5px",
        color: "var(--ink)",
        background: "var(--bg)",
      }}
    >
      {children}
    </kbd>
  );
}
