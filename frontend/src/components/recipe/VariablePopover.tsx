// recipe/VariablePopover.tsx
//
// DEPRECATED — superseded by SlashMenu.tsx (Variant A — Slash Command).
// Only the legacy StepEditor.tsx (also deprecated) imports this, and
// nothing on the live edit path mounts StepEditor anymore. Keep alive for
// a release or two in case a revert is needed; safe to delete after that.
//
// Original purpose:
// Modal for inserting a variable into a step. Two tabs:
//   • EXISTING — pick a previously-defined variable
//   • NEW      — define a new one (label + default value + optional suffix)
// Returns the chosen/created variable to the parent via onInsert.
//
// Note: the `anchorRef` prop is kept for API compatibility with StepEditor
// but is no longer used for positioning — the form renders as a centered
// fixed-position modal, which avoids the off-viewport positioning problem
// the previous anchored-popover implementation had inside a scroll container.

import { useState, useEffect, useRef } from "react";
import type { RecipeVariable } from "../../types";
import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { slugify } from "../../utils/stepText";
import { useActiveTheme } from "../../store/themeStore";

interface VariablePopoverProps {
  onInsert:  (variable: RecipeVariable) => void;
  onClose:   () => void;
  /** Retained for API compatibility; not used for positioning anymore. */
  anchorRef: React.RefObject<HTMLElement>;
}

type Mode = "pick" | "create";

export function VariablePopover({ onInsert, onClose }: VariablePopoverProps) {
  const variables = useRecipeStore((s) => s.variables);
  const { addVariable } = useRecipeActions();
  const { def: themeDef } = useActiveTheme();

  const initialMode: Mode = variables.length === 0 ? "create" : "pick";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [label,  setLabel]  = useState("");
  const [value,  setValue]  = useState("0");
  const [suffix, setSuffix] = useState("");

  const labelInputRef = useRef<HTMLInputElement>(null);

  // Autofocus the right field when create mode is active.
  useEffect(() => {
    if (mode === "create") setTimeout(() => labelInputRef.current?.focus(), 30);
  }, [mode]);

  // Dismiss on Escape (backdrop click is handled by the overlay's onClick).
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleCreate() {
    const trimmed = label.trim();
    if (!trimmed) return;
    const n = Number(value);
    const v: RecipeVariable = {
      name:   slugify(trimmed),
      label:  trimmed,
      value:  Number.isFinite(n) ? n : 0,
      suffix: suffix.trim() || undefined,
    };
    const existing = variables.find((x) => x.name === v.name);
    if (existing) {
      onInsert(existing);
    } else {
      addVariable(v);
      onInsert(v);
    }
    onClose();
  }

  return (
    <div
      onClick={onClose}
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        inset: 0,
        background: "rgba(10,10,10,0.45)",
        zIndex: 60,
        display: "flex",
        alignItems: "flex-start",
        justifyContent: "center",
        paddingTop: 120,
        animation: "popfade 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        onMouseDown={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          color: "var(--ink)",
          border: "1px solid var(--ink)",
          width: "min(420px, calc(100vw - 60px))",
          boxShadow: "8px 8px 0 var(--accent)",
          display: "flex",
          flexDirection: "column",
          animation: "popslide 0.22s cubic-bezier(.2,.7,.1,1)",
        }}
      >
        {/* Header */}
        <div
          style={{
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "space-between",
            padding: "16px 18px 10px",
          }}
        >
          <div className="pl-display" style={{ fontSize: 22, lineHeight: 1 }}>
            insert a variable
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            style={{
              background: "transparent",
              border: "none",
              fontSize: 20,
              cursor: "pointer",
              color: "var(--ink-3)",
              lineHeight: 1,
              padding: "0 0 0 12px",
            }}
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div style={{ display: "flex", borderBottom: "1px solid var(--hair)", padding: "0 18px" }}>
          <TabBtn
            active={mode === "pick"}
            disabled={variables.length === 0}
            onClick={() => setMode("pick")}
          >
            EXISTING
          </TabBtn>
          <TabBtn active={mode === "create"} onClick={() => setMode("create")}>
            NEW
          </TabBtn>
        </div>

        {/* EXISTING */}
        {mode === "pick" && (
          <ul style={{ listStyle: "none", margin: 0, padding: "6px 0", maxHeight: 280, overflowY: "auto" }}>
            {variables.map((v) => (
              <li key={v.name}>
                <button
                  onClick={() => { onInsert(v); onClose(); }}
                  style={{
                    width: "100%",
                    textAlign: "left",
                    background: "transparent",
                    border: "none",
                    cursor: "pointer",
                    padding: "10px 18px",
                    display: "flex",
                    alignItems: "baseline",
                    gap: 10,
                    fontFamily: "var(--f-body)",
                    color: "var(--ink)",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "color-mix(in srgb, var(--accent) 6%, transparent)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  <span className="pl-display" style={{ fontSize: 18 }}>
                    {v.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      color: "var(--accent)",
                      fontWeight: 700,
                      fontFamily: "var(--f-mono)",
                      fontSize: 13,
                    }}
                  >
                    {v.value}
                    {v.suffix ? ` ${v.suffix}` : ""}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}

        {/* NEW */}
        {mode === "create" && (
          <form
            onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
            style={{ padding: "14px 18px 16px", display: "grid", gap: 12 }}
          >
            <Field label="LABEL">
              <input
                ref={labelInputRef}
                value={label}
                onChange={(e) => setLabel(e.target.value)}
                placeholder="Bake Time"
                style={fieldInputStyle}
              />
            </Field>
            <div style={{ display: "grid", gap: 10, gridTemplateColumns: "1fr 1fr" }}>
              <Field label="VALUE">
                <input
                  value={value}
                  onChange={(e) => setValue(e.target.value)}
                  type="text"
                  inputMode="decimal"
                  style={fieldInputStyle}
                />
              </Field>
              <Field label="SUFFIX (opt.)">
                <input
                  value={suffix}
                  onChange={(e) => setSuffix(e.target.value)}
                  placeholder="°F · min · cups"
                  style={fieldInputStyle}
                />
              </Field>
            </div>
            <div style={{ display: "flex", gap: 8, justifyContent: "flex-end", marginTop: 4 }}>
              <button
                type="button"
                onClick={onClose}
                style={{
                  background: "transparent",
                  border: "1px solid var(--ink)",
                  color: "var(--ink)",
                  padding: "8px 14px",
                  cursor: "pointer",
                  fontFamily: "var(--f-body)",
                  fontWeight: 600,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                }}
              >
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!label.trim()}
                style={{
                  background: label.trim()
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  color: label.trim() ? (themeDef.oled ? "#000" : "#fff") : "var(--ink-3)",
                  border: "none",
                  padding: "8px 16px",
                  cursor: label.trim() ? "pointer" : "not-allowed",
                  fontFamily: "var(--f-body)",
                  fontWeight: 700,
                  fontSize: 11,
                  letterSpacing: "0.08em",
                }}
              >
                INSERT
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}

function TabBtn({
  active, disabled, onClick, children,
}: {
  active: boolean;
  disabled?: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent",
        border: "none",
        padding: "10px 14px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "var(--f-body)",
        fontSize: 11,
        letterSpacing: "0.12em",
        fontWeight: active ? 700 : 500,
        color: disabled ? "var(--ink-3)" : active ? "var(--ink)" : "var(--ink-2)",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span
        style={{
          fontFamily: "var(--f-mono)",
          fontSize: 9,
          letterSpacing: "0.18em",
          color: "var(--ink-3)",
        }}
      >
        {label}
      </span>
      {children}
    </label>
  );
}

const fieldInputStyle: React.CSSProperties = {
  padding: "8px 10px",
  border: "1px solid var(--ink)",
  background: "var(--bg)",
  color: "var(--ink)",
  outline: "none",
  fontFamily: "var(--f-body)",
  fontSize: 13,
};
