// recipe/SlashMenu.tsx
//
// The dropdown anchored at a "/" caret inside a SlashStepEditor.
//
// Two states:
//   • PICK — filtered list of existing variables; each row shows the
//     live value so the user knows what they're inserting.
//   • CREATE — inline form (label / value / suffix) to define a new
//     variable AND insert it in one step. Replaces the old modal
//     VariablePopover entirely.
//
// Positioning:
//   We use `position: fixed` against the page viewport because the
//   step editor lives inside a scrolling region (the recipe builder).
//   The `anchorRect` is the bounding rect of the literal "/" character
//   captured by the editor. We flip above the caret if there's not
//   enough room below — common for the last step in a tall recipe.
//
// Keyboard:
//   ↑↓ navigate, ⏎ select, Esc closes. Numeric typing in the query
//   filters the list (the editor passes the filter string in `query`).

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import type { RecipeVariable } from "../../types";

const MENU_WIDTH = 320;
// Approximate "tall enough that we should consider flipping above the
// caret if the menu would overflow the viewport". Doesn't have to be
// exact — the browser doesn't care if we leave a little extra room.
const MENU_MAX_HEIGHT = 340;

interface SlashMenuProps {
  anchorRect: DOMRect;
  query: string;
  variables: RecipeVariable[];
  creating: null | { label: string; value: string; suffix: string };
  setCreating: (
    s: null | { label: string; value: string; suffix: string },
  ) => void;
  onPick: (v: RecipeVariable) => void;
  onCreate: (draft: { label: string; value: string; suffix: string }) => void;
  onClose: () => void;
}

export function SlashMenu({
  anchorRect, query, variables, creating, setCreating,
  onPick, onCreate, onClose,
}: SlashMenuProps) {
  const menuRef = useRef<HTMLDivElement>(null);
  const labelInputRef = useRef<HTMLInputElement>(null);

  // Filter case-insensitively over both label and name.
  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return variables;
    return variables.filter(
      (v) => v.label.toLowerCase().includes(q) || v.name.toLowerCase().includes(q),
    );
  }, [query, variables]);

  // Highlighted row for keyboard navigation. Resets when filtering changes.
  const [active, setActive] = useState(0);
  useEffect(() => { setActive(0); }, [query, creating]);

  // Focus the label input when entering create mode.
  //
  // The dep MUST be the boolean "are we in create mode" — not `creating`
  // itself. `creating` is an object I rebuild on every keystroke in the
  // value/suffix fields, so depending on it would re-fire focus on each
  // character and yank the caret back to the label field. Booleanizing
  // the dep means focus only happens on the null → object transition.
  const inCreate = !!creating;
  useEffect(() => {
    if (inCreate) setTimeout(() => labelInputRef.current?.focus(), 0);
  }, [inCreate]);

  // Decide whether to render below or above the caret.
  // 24px gap above/below the line keeps the menu off the typing cursor.
  const vh = typeof window !== "undefined" ? window.innerHeight : 800;
  const spaceBelow = vh - anchorRect.bottom;
  const flipAbove = spaceBelow < MENU_MAX_HEIGHT && anchorRect.top > MENU_MAX_HEIGHT;
  const top = flipAbove
    ? Math.max(8, anchorRect.top - 8 - MENU_MAX_HEIGHT)
    : anchorRect.bottom + 6;
  // Clamp left so the menu never goes off-screen on narrow viewports.
  const vw = typeof window !== "undefined" ? window.innerWidth : 1200;
  const left = Math.min(Math.max(8, anchorRect.left - 8), vw - MENU_WIDTH - 8);

  // Keyboard nav at the menu level. We let the editor handle the slash
  // query itself; arrow/enter is what we need here.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (creating) return;            // form handles its own keys
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setActive((i) => Math.min(filtered.length, i + 1));
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setActive((i) => Math.max(0, i - 1));
      } else if (e.key === "Enter") {
        e.preventDefault();
        if (active < filtered.length) {
          onPick(filtered[active]);
        } else {
          // "Create new…" row
          setCreating({ label: query.trim(), value: "0", suffix: "" });
        }
      } else if (e.key === "Escape") {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [active, filtered, creating, query, onPick, setCreating, onClose]);

  // PORTAL to document.body. Why: position:fixed is escaped by any
  // ancestor that establishes a containing block via `transform`,
  // `filter`, `perspective`, or `will-change: transform`. StepRow's
  // `popInRow` animation leaves an identity transform on the <li>
  // permanently (animation-fill-mode: both), which would trap a
  // descendant fixed element and re-anchor it to the row's top instead
  // of the viewport. Portaling guarantees viewport-relative coordinates
  // regardless of the surrounding layout.
  return createPortal(
    <div
      ref={menuRef}
      data-slash-menu
      onMouseDown={(e) => e.stopPropagation()}
      style={{
        position: "fixed",
        top, left,
        width: MENU_WIDTH,
        background: "var(--bg)",
        color: "var(--ink)",
        border: "1px solid var(--ink)",
        boxShadow: "6px 6px 0 var(--accent)",
        zIndex: 60,
        animation: "popslide 0.16s cubic-bezier(.2,.7,.1,1)",
      }}
    >
      <div
        className="pl-meta"
        style={{
          padding: "10px 12px 6px",
          color: "var(--ink-3)",
          display: "flex",
          alignItems: "baseline",
          gap: 8,
        }}
      >
        <span>INSERT VARIABLE</span>
        {query && (
          <span style={{ color: "var(--accent)", fontWeight: 700 }}>
            /{query}
          </span>
        )}
      </div>

      {!creating && (
        <ul
          style={{
            listStyle: "none", margin: 0, padding: 0,
            maxHeight: 200, overflowY: "auto",
          }}
        >
          {filtered.length === 0 ? (
            <li
              style={{
                padding: "10px 12px",
                color: "var(--ink-3)",
                fontStyle: "italic",
                fontSize: 13,
              }}
            >
              No matches for “{query}”
            </li>
          ) : (
            filtered.map((v, i) => (
              <li key={v.name}>
                <button
                  onClick={() => onPick(v)}
                  onMouseEnter={() => setActive(i)}
                  style={{
                    ...rowStyle,
                    background: active === i
                      ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                      : "transparent",
                  }}
                >
                  <span
                    className="pl-display"
                    style={{ fontSize: 15, color: "var(--ink)" }}
                  >
                    {v.label}
                  </span>
                  <span
                    style={{
                      marginLeft: "auto",
                      fontFamily: "var(--f-mono)",
                      fontWeight: 700,
                      fontSize: 11,
                      color: "var(--accent)",
                    }}
                  >
                    {v.value}{v.suffix ? ` ${v.suffix}` : ""}
                  </span>
                </button>
              </li>
            ))
          )}
        </ul>
      )}

      <div style={{ borderTop: "1px solid var(--hair)" }}>
        {!creating ? (
          <button
            onClick={() => setCreating({
              label: query.trim(),
              value: "0",
              suffix: "",
            })}
            onMouseEnter={() => setActive(filtered.length)}
            style={{
              ...rowStyle,
              color: "var(--accent)",
              fontWeight: 600,
              background: active === filtered.length
                ? "color-mix(in srgb, var(--accent) 10%, transparent)"
                : "transparent",
            }}
          >
            <span style={{ fontSize: 14 }}>
              + Create new variable{query ? ` “${query.trim()}”` : "…"}
            </span>
          </button>
        ) : (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!creating.label.trim()) return;
              onCreate(creating);
            }}
            onKeyDown={(e) => {
              // Escape inside the form cancels the create, keeps the menu.
              if (e.key === "Escape") {
                e.preventDefault();
                e.stopPropagation();
                setCreating(null);
              }
            }}
            style={{ padding: "10px 12px 12px", display: "grid", gap: 8 }}
          >
            <input
              ref={labelInputRef}
              value={creating.label}
              onChange={(e) => setCreating({ ...creating, label: e.target.value })}
              placeholder="Label (e.g. Bake Time)"
              style={inp}
            />
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6 }}>
              <input
                value={creating.value}
                onChange={(e) => setCreating({ ...creating, value: e.target.value })}
                placeholder="Value"
                inputMode="decimal"
                style={inp}
              />
              <input
                value={creating.suffix}
                onChange={(e) => setCreating({ ...creating, suffix: e.target.value })}
                placeholder="Suffix (tsp · g · °F)"
                style={inp}
              />
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: 6 }}>
              <button type="button" onClick={() => setCreating(null)} style={btnGhost}>
                CANCEL
              </button>
              <button
                type="submit"
                disabled={!creating.label.trim()}
                style={{
                  ...btnPrimary,
                  background: creating.label.trim()
                    ? "var(--accent)"
                    : "color-mix(in srgb, var(--ink) 8%, transparent)",
                  cursor: creating.label.trim() ? "pointer" : "not-allowed",
                  color: creating.label.trim() ? "#fff" : "var(--ink-3)",
                }}
              >
                INSERT
              </button>
            </div>
          </form>
        )}
      </div>
    </div>,
    document.body,
  );
}

const rowStyle: React.CSSProperties = {
  display: "flex", alignItems: "baseline", gap: 10,
  width: "100%", textAlign: "left",
  padding: "8px 12px",
  border: "none", cursor: "pointer",
  fontFamily: "var(--f-body)",
};

const inp: React.CSSProperties = {
  border: "1px solid var(--ink)",
  background: "var(--bg)",
  color: "var(--ink)",
  padding: "6px 8px",
  fontFamily: "var(--f-body)",
  fontSize: 13,
  outline: "none",
};

const btnGhost: React.CSSProperties = {
  background: "transparent",
  border: "1px solid var(--ink)",
  color: "var(--ink)",
  padding: "5px 12px",
  fontFamily: "var(--f-body)",
  fontSize: 10,
  letterSpacing: "0.08em",
  fontWeight: 600,
  cursor: "pointer",
};

const btnPrimary: React.CSSProperties = {
  border: "none",
  padding: "5px 14px",
  fontFamily: "var(--f-body)",
  fontSize: 10,
  letterSpacing: "0.08em",
  fontWeight: 700,
};
