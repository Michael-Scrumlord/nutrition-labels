// ThemedFrame.tsx — applies the current theme as CSS vars to its root and
// runs the ~720ms cinematic wipe transition when the theme changes.

import { useEffect, useRef, useState, type ReactNode, type CSSProperties } from "react";
import { useActiveTheme, themeVars, THEME_DEFS, type ThemeDef } from "../../store/themeStore";

interface SweepFrom {
  def: ThemeDef;
  k: number;
}

interface ThemedFrameProps {
  children: ReactNode;
  className?: string;
  style?: CSSProperties;
}

export function ThemedFrame({ children, className, style }: ThemedFrameProps) {
  const { theme, def, accent } = useActiveTheme();

  const [sweepFrom, setSweepFrom] = useState<SweepFrom | null>(null);
  const prev = useRef(theme);
  useEffect(() => {
    if (prev.current !== theme) {
      const fromDef = THEME_DEFS[prev.current];
      setSweepFrom({ def: fromDef, k: Date.now() });
      const id = window.setTimeout(() => setSweepFrom(null), 820);
      prev.current = theme;
      return () => window.clearTimeout(id);
    }
    return undefined;
  }, [theme]);

  return (
    <div
      className={className}
      style={{
        ...(themeVars(def, accent.hex) as CSSProperties),
        background: "var(--bg)",
        color: "var(--ink)",
        position: "relative",
        transition: "background 220ms ease, color 220ms ease",
        ...style,
      }}
    >
      {children}
      {sweepFrom && (
        <div
          key={sweepFrom.k}
          aria-hidden
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 9999,
            pointerEvents: "none",
            background: sweepFrom.def.bg,
            animation: "nlSweep 720ms cubic-bezier(.78,.02,.18,1) both",
            willChange: "transform",
          }}
        >
          {/* Trailing edge — destination-accent stripe gives the wipe a director's stripe. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: -2,
              width: 6,
              background: accent.hex,
              opacity: 0.85,
              animation: "nlSweepLeader 720ms cubic-bezier(.78,.02,.18,1) both",
            }}
          />
          {/* Soft fade on the leading edge so it feels like fabric, not a wall. */}
          <div
            style={{
              position: "absolute",
              top: 0,
              bottom: 0,
              right: 4,
              width: 90,
              background: `linear-gradient(to left, ${sweepFrom.def.bg}, transparent)`,
            }}
          />
        </div>
      )}
    </div>
  );
}
