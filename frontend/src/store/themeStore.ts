// themeStore.ts — 4-theme system (Paper / Overcast / Twilight / Midnight)
// + per-theme accent picker, persisted in localStorage.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import {
  type ThemeKey,
  type ThemeDef,
  type AccentDef,
  THEME_DEFS,
  THEME_ORDER,
} from "../constants/themes";

// Re-export so existing callers don't break.
export type { ThemeKey, ThemeDef, AccentDef };
export { THEME_DEFS, THEME_ORDER };

interface ThemeState {
  theme: ThemeKey;
  // Per-theme accent ids so each theme remembers its own accent.
  accents: Record<ThemeKey, string>;
  setTheme: (t: ThemeKey) => void;
  setAccent: (id: string) => void;
}

export const useThemeStore = create<ThemeState>()(
  persist(
    (set) => ({
      theme: "paper",
      accents: {
        paper: THEME_DEFS.paper.defaultAccent,
        overcast: THEME_DEFS.overcast.defaultAccent,
        twilight: THEME_DEFS.twilight.defaultAccent,
        midnight: THEME_DEFS.midnight.defaultAccent,
      },
      setTheme: (t) => set({ theme: t }),
      setAccent: (id) =>
        set((s) => ({ accents: { ...s.accents, [s.theme]: id } })),
    }),
    { name: "nl-theme" },
  ),
);

export function useActiveTheme() {
  const theme = useThemeStore((s) => s.theme);
  const accents = useThemeStore((s) => s.accents);
  const def = THEME_DEFS[theme];
  const activeAccentId = accents[theme] || def.defaultAccent;
  const accent =
    def.accents.find((a) => a.id === activeAccentId) || def.accents[0];
  return { theme, def, accent };
}

export function themeVars(
  def: ThemeDef,
  accentHex: string,
): Record<string, string> {
  return {
    "--bg": def.bg,
    "--surface": def.surface,
    "--elevated": def.elevated,
    "--ink": def.ink,
    "--ink-2": def.inkSecondary,
    "--ink-3": def.inkTertiary,
    "--hair": def.hairline,
    "--hair-strong": def.hairlineStrong,
    "--paper-bg": def.paperBg,
    "--paper-shadow": def.paperShadow,
    "--plinth-bg": def.plinthBg,
    "--accent": accentHex,
    "--accent-glow": def.oled
      ? `0 0 14px ${accentHex}cc, 0 0 28px ${accentHex}55`
      : "none",
  };
}
