// ui/ScrubNumber.tsx
//
// Tactile numeric input: drag left/right to scrub, click to type, scroll wheel to step.
// No slider chrome — just the number itself, styled by the parent.

import { useRef, useState, useEffect } from "react";

interface ScrubNumberProps {
  value: number;
  onChange: (n: number) => void;
  min?: number;
  max?: number;
  step?: number;
  suffix?: string;
  className?: string;
  style?: React.CSSProperties;
  ariaLabel?: string;
}

export function ScrubNumber({
  value, onChange,
  min = 0, max = 9999, step = 1,
  suffix = "", className = "", style, ariaLabel,
}: ScrubNumberProps) {
  const [editing, setEditing] = useState(false);
  const [draft,   setDraft]   = useState(String(value));
  const dragRef  = useRef<{ moved: boolean; startX: number; startV: number } | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => { if (!editing) setDraft(String(value)); }, [value, editing]);
  useEffect(() => { if (editing) { inputRef.current?.focus(); inputRef.current?.select(); } }, [editing]);

  const clamp = (n: number) => Math.min(max, Math.max(min, n));

  function commit() {
    const n = Number(draft);
    if (Number.isFinite(n)) onChange(clamp(n));
    setEditing(false);
  }

  function handlePointerDown(e: React.PointerEvent<HTMLSpanElement>) {
    e.preventDefault();
    const startX = e.clientX;
    const startV = value;
    dragRef.current = { moved: false, startX, startV };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);

    function onMove(ev: PointerEvent) {
      const dx = ev.clientX - startX;
      if (!dragRef.current!.moved && Math.abs(dx) < 3) return;
      dragRef.current!.moved = true;
      onChange(clamp(Math.round((startV + dx * step) / step) * step));
    }
    function onUp() {
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerup",   onUp);
      if (!dragRef.current?.moved) setEditing(true);
    }
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup",   onUp);
  }

  if (editing) {
    return (
      <input
        ref={inputRef}
        type="text"
        inputMode="decimal"
        value={draft}
        onChange={(e) => setDraft(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === "Enter")  commit();
          if (e.key === "Escape") setEditing(false);
        }}
        className={className}
        style={{
          width: `${Math.max(2, draft.length)}ch`,
          background: "transparent", border: "none", outline: "none",
          ...style,
        }}
      />
    );
  }

  return (
    <span
      role="spinbutton"
      tabIndex={0}
      aria-label={ariaLabel}
      aria-valuenow={value}
      onPointerDown={handlePointerDown}
      onKeyDown={(e) => {
        if (e.key === "ArrowUp"   || e.key === "ArrowRight") { e.preventDefault(); onChange(clamp(value + step)); }
        if (e.key === "ArrowDown" || e.key === "ArrowLeft")  { e.preventDefault(); onChange(clamp(value - step)); }
        if (e.key === "Enter"     || e.key === " ")          { e.preventDefault(); setEditing(true); }
      }}
      onWheel={(e) => { e.preventDefault(); onChange(clamp(value - Math.sign(e.deltaY) * step)); }}
      className={className}
      style={{ cursor: "ew-resize", userSelect: "none", touchAction: "none", ...style }}
    >
      {value}{suffix}
    </span>
  );
}
