// recipe/StepEditor.tsx
//
// Edit mode for a single step. Wraps a plain auto-growing textarea with
// an "+ Insert variable" button that opens a popover. Cmd/Ctrl+K does the same.
// Variables are inserted at the cursor position as {Label} tokens.

import { useRef, useState, useEffect } from "react";
import type { RecipeVariable } from "../../types";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { VariablePopover } from "./VariablePopover";
import { insertVariableAt } from "../../utils/stepText";

interface StepEditorProps {
  stepId: string;
  initialText: string;
  onCommit: () => void;
  onRemove: () => void;
}

export function StepEditor({ stepId, initialText, onCommit, onRemove }: StepEditorProps) {
  const [text, setText] = useState(initialText);
  const [popoverOpen, setPopoverOpen] = useState(false);

  const { updateStepText } = useRecipeActions();

  const taRef     = useRef<HTMLTextAreaElement>(null);
  const insertRef = useRef<HTMLButtonElement>(null);

  // Auto-grow textarea
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.style.height = "auto";
    ta.style.height = `${ta.scrollHeight}px`;
  }, [text]);

  // Focus on mount
  useEffect(() => {
    const ta = taRef.current;
    if (!ta) return;
    ta.focus();
    // Place cursor at end on mount
    const len = ta.value.length;
    ta.setSelectionRange(len, len);
  }, []);

  function commit() {
    updateStepText(stepId, text);
    onCommit();
  }

  function handleInsert(variable: RecipeVariable) {
    const ta = taRef.current;
    const cursor = ta ? ta.selectionStart : text.length;
    const next = insertVariableAt(text, cursor, variable);
    setText(next.text);
    updateStepText(stepId, next.text);
    setTimeout(() => {
      const taLater = taRef.current;
      if (!taLater) return;
      taLater.focus();
      taLater.setSelectionRange(next.cursorAfter, next.cursorAfter);
    }, 0);
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 6, width: "100%" }}>
      {/* Toolbar */}
      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        <button
          ref={insertRef}
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => setPopoverOpen(true)}
          style={{
            background: "transparent",
            border: "1px solid var(--hair-strong)",
            padding: "4px 10px",
            cursor: "pointer",
            fontFamily: "var(--f-body)",
            fontWeight: 700,
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--ink-2)",
            display: "inline-flex",
            alignItems: "center",
            gap: 6,
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--accent) 6%, transparent)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
        >
          + INSERT VARIABLE
          <span style={{ color: "var(--ink-3)", fontWeight: 500, letterSpacing: "0.04em" }}>⌘K</span>
        </button>

        <span
          style={{
            fontFamily: "var(--f-mono)",
            fontSize: 10,
            letterSpacing: "0.14em",
            color: "var(--ink-3)",
          }}
        >
          ⏎ to commit · ESC to cancel
        </span>

        <button
          type="button"
          onMouseDown={(e) => e.preventDefault()}
          onClick={onRemove}
          style={{
            marginLeft: "auto",
            background: "transparent",
            border: "none",
            cursor: "pointer",
            fontFamily: "var(--f-body)",
            fontSize: 10,
            letterSpacing: "0.12em",
            color: "var(--ink-3)",
            padding: "4px 6px",
          }}
          onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
          onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}
        >
          DELETE STEP
        </button>
      </div>

      <textarea
        ref={taRef}
        value={text}
        onChange={(e) => setText(e.target.value)}
        onBlur={() => {
          // The variable popover steals focus when it opens. If we exit
          // edit mode here, the popover unmounts before the user can use
          // it. The popover refocuses the textarea on close, so blurs
          // while it's open are spurious.
          if (popoverOpen) return;
          commit();
        }}
        onKeyDown={(e) => {
          if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
            e.preventDefault();
            setPopoverOpen(true);
          }
          if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault();
            commit();
          }
          if (e.key === "Escape") {
            // Revert: don't commit text changes
            setText(initialText);
            updateStepText(stepId, initialText);
            onCommit();
          }
        }}
        placeholder="Describe this step — press ⌘K to insert a variable for anything tweakable."
        style={{
          width: "100%",
          minHeight: 56,
          resize: "none",
          background: "color-mix(in srgb, var(--accent) 6%, transparent)",
          border: "1px solid var(--accent)",
          padding: "10px 12px",
          outline: "none",
          fontFamily: "var(--f-body)",
          fontSize: 16,
          lineHeight: 1.55,
          color: "var(--ink)",
        }}
      />

      {popoverOpen && (
        <VariablePopover
          anchorRef={insertRef}
          onClose={() => {
            setPopoverOpen(false);
            setTimeout(() => taRef.current?.focus(), 0);
          }}
          onInsert={handleInsert}
        />
      )}
    </div>
  );
}
