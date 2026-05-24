// ThemeSwitcher.tsx — 4 accent dots (per theme) + 4 theme swatches.
// Lives in the editorial header.

import {
  THEME_DEFS,
  THEME_ORDER,
  useActiveTheme,
  useThemeStore,
} from "../../store/themeStore";

interface ThemeSwitcherProps {
  compact?: boolean;
}

export function ThemeSwitcher({ compact = false }: ThemeSwitcherProps) {
  const { theme, def, accent } = useActiveTheme();
  const setTheme = useThemeStore((s) => s.setTheme);
  const setAccent = useThemeStore((s) => s.setAccent);
  const accents = useThemeStore((s) => s.accents);
  const sw = compact ? 24 : 26;

  return (
    <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", gap: compact ? 10 : 14 }}>
      {/* Per-theme accent dots */}
      <div
        style={{ display: "flex", gap: 5, alignItems: "center" }}
        title={`accent for ${def.name}`}
      >
        {def.accents.map((a) => {
          const active = a.id === accent.id;
          return (
            <button
              key={a.id}
              onClick={() => setAccent(a.id)}
              aria-label={`accent ${a.name}`}
              title={a.name}
              style={{
                display: "inline-flex",
                alignItems: "center",
                justifyContent: "center",
                width: 24,
                height: 24,
                padding: 0,
                background: "transparent",
                border: "none",
                cursor: "pointer",
              }}
            >
              <span
                style={{
                  display: "inline-block",
                  width: active ? 14 : 10,
                  height: active ? 14 : 10,
                  borderRadius: 8,
                  background: a.hex,
                  border: active ? "2px solid var(--ink)" : "1px solid transparent",
                  boxShadow: active && def.oled ? `0 0 8px ${a.hex}` : "none",
                  transition: "all 160ms ease",
                }}
              />
            </button>
          );
        })}
      </div>
      <span style={{ width: 1, height: 16, background: "var(--hair-strong)", opacity: 0.6 }} />
      {/* Theme swatches */}
      <div style={{ display: "flex", gap: compact ? 4 : 5 }}>
        {THEME_ORDER.map((k) => {
          const d = THEME_DEFS[k];
          const active = theme === k;
          const dotId = k === theme ? accent.id : accents[k] || d.defaultAccent;
          const dotHex =
            d.accents.find((a) => a.id === dotId)?.hex || d.accents[0].hex;
          return (
            <button
              key={k}
              onClick={() => setTheme(k)}
              aria-label={`theme ${d.name}`}
              title={`${d.name} — ${d.desc}`}
              style={{
                width: sw,
                height: sw,
                padding: 0,
                cursor: "pointer",
                position: "relative",
                background: d.bg,
                borderRadius: 0,
                border: `1px solid ${active ? "var(--accent)" : "var(--hair-strong)"}`,
                outline: active ? "1px solid var(--accent)" : "none",
                outlineOffset: 1,
                transition: "outline 160ms ease, border-color 160ms ease",
              }}
            >
              <span
                style={{
                  position: "absolute",
                  left: 3,
                  right: 3,
                  bottom: 3,
                  height: 3,
                  background: d.ink,
                  opacity: 0.55,
                }}
              />
              <span
                style={{
                  position: "absolute",
                  left: 3,
                  top: 3,
                  width: 4,
                  height: 4,
                  borderRadius: 4,
                  background: dotHex,
                }}
              />
            </button>
          );
        })}
      </div>
    </div>
  );
}
