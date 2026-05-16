// recipe/VariablePopover.tsx
//
// Popover for inserting a variable into a step. Two tabs:
//   • PICK   — choose an existing variable
//   • CREATE — define a new one (label + default value + optional suffix)
// Returns the chosen/created variable to the parent via onInsert.

import { useState, useEffect, useRef } from "react";
import type { RecipeVariable } from "../../types";
import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { slugify } from "../../utils/stepText";
import { ACCENT, INK } from "../../constants/theme";

interface VariablePopoverProps {
  onInsert:  (variable: RecipeVariable) => void;
  onClose:   () => void;
  anchorRef: React.RefObject<HTMLElement>;
}

type Mode = "pick" | "create";

export function VariablePopover({ onInsert, onClose, anchorRef }: VariablePopoverProps) {
  const variables = useRecipeStore((s) => s.variables);
  const { addVariable } = useRecipeActions();

  const initialMode: Mode = variables.length === 0 ? "create" : "pick";
  const [mode, setMode] = useState<Mode>(initialMode);

  const [label,  setLabel]  = useState("");
  const [value,  setValue]  = useState("0");
  const [suffix, setSuffix] = useState("");

  const popRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Position: anchored under the trigger
  const [pos, setPos] = useState<{ top: number; left: number } | null>(null);
  useEffect(() => {
    const anchor = anchorRef.current;
    if (!anchor) return;
    const rect = anchor.getBoundingClientRect();
    setPos({ top: rect.bottom + window.scrollY + 6, left: rect.left + window.scrollX });
  }, [anchorRef]);

  // Autofocus the right field when mode changes
  useEffect(() => {
    if (mode === "create") setTimeout(() => labelInputRef.current?.focus(), 30);
  }, [mode]);

  // Dismiss on outside click / Escape
  useEffect(() => {
    function onDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) onClose();
    }
    function onKey(e: KeyboardEvent) { if (e.key === "Escape") onClose(); }
    window.addEventListener("mousedown", onDown);
    window.addEventListener("keydown", onKey);
    return () => {
      window.removeEventListener("mousedown", onDown);
      window.removeEventListener("keydown", onKey);
    };
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
    // Reuse an existing variable with the same canonical name if one exists
    const existing = variables.find((x) => x.name === v.name);
    if (existing) {
      onInsert(existing);
    } else {
      addVariable(v);
      onInsert(v);
    }
    onClose();
  }

  if (!pos) return null;

  return (
    <div
      ref={popRef}
      style={{
        position: "absolute",
        top: pos.top, left: pos.left,
        zIndex: 50,
        background: "#fff",
        border: `1px solid ${INK}`,
        boxShadow: "6px 6px 0 var(--color-accent)",
        minWidth: 280,
        maxWidth: 360,
        animation: "popfade 0.14s ease",
      }}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {/* Tabs */}
      <div style={{
        display: "flex",
        borderBottom: "1px solid #ebebeb",
        background: "#fafafa",
      }}>
        <TabBtn active={mode === "pick"}   disabled={variables.length === 0} onClick={() => setMode("pick")}>EXISTING</TabBtn>
        <TabBtn active={mode === "create"} onClick={() => setMode("create")}>NEW</TabBtn>
        <button
          onClick={onClose}
          style={{
            marginLeft: "auto", background: "transparent", border: "none",
            cursor: "pointer", color: "#bbb", fontSize: 16, padding: "0 12px",
          }}
        >×</button>
      </div>

      {/* PICK */}
      {mode === "pick" && (
        <ul style={{ listStyle: "none", margin: 0, padding: "6px 0", maxHeight: 220, overflowY: "auto" }}>
          {variables.map((v) => (
            <li key={v.name}>
              <button
                onClick={() => { onInsert(v); onClose(); }}
                style={{
                  width: "100%", textAlign: "left",
                  background: "transparent", border: "none", cursor: "pointer",
                  padding: "8px 14px",
                  display: "flex", alignItems: "baseline", gap: 10,
                  fontFamily: "'Inter Tight', sans-serif",
                }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-blush)"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span style={{ fontStyle: "italic", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 18 }}>
                  {v.label}
                </span>
                <span style={{ marginLeft: "auto", color: ACCENT, fontWeight: 700, fontFamily: "'JetBrains Mono', monospace", fontSize: 13 }}>
                  {v.value}{v.suffix ? ` ${v.suffix}` : ""}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}

      {/* CREATE */}
      {mode === "create" && (
        <form
          onSubmit={(e) => { e.preventDefault(); handleCreate(); }}
          style={{ padding: "12px 14px", display: "grid", gap: 10 }}
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
                type="text" inputMode="decimal"
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
                background: "transparent", border: `1px solid ${INK}`,
                padding: "6px 12px", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 600,
                fontSize: 11, letterSpacing: "0.08em",
              }}
            >
              CANCEL
            </button>
            <button
              type="submit"
              disabled={!label.trim()}
              style={{
                background: label.trim() ? ACCENT : "#e5e5e5",
                color: label.trim() ? "#fff" : "#bbb",
                border: "none",
                padding: "6px 14px",
                cursor: label.trim() ? "pointer" : "not-allowed",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 700,
                fontSize: 11, letterSpacing: "0.08em",
              }}
            >
              INSERT
            </button>
          </div>
        </form>
      )}
    </div>
  );
}

function TabBtn({ active, disabled, onClick, children }: { active: boolean; disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        background: "transparent", border: "none",
        padding: "10px 14px",
        cursor: disabled ? "default" : "pointer",
        fontFamily: "'Inter Tight', sans-serif",
        fontSize: 11, letterSpacing: "0.12em",
        fontWeight: active ? 700 : 500,
        color: disabled ? "#ccc" : active ? INK : "#777",
        borderBottom: active ? `2px solid ${ACCENT}` : "2px solid transparent",
      }}
    >
      {children}
    </button>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label style={{ display: "grid", gap: 4 }}>
      <span style={{
        fontFamily: "'JetBrains Mono', monospace",
        fontSize: 9,
        letterSpacing: "0.18em",
        color: "#999",
      }}>{label}</span>
      {children}
    </label>
  );
}

const fieldInputStyle: React.CSSProperties = {
  padding: "7px 9px",
  border: `1px solid ${INK}`,
  background: "#fff",
  outline: "none",
  fontFamily: "'Inter Tight', sans-serif",
  fontSize: 13,
};
