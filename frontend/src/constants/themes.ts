// constants/themes.ts
//
// Theme definitions and ordering. Kept separate from themeStore so the data
// can be imported by components without pulling in Zustand.

export type ThemeKey = "paper" | "overcast" | "twilight" | "midnight";

export interface AccentDef {
  id: string;
  hex: string;
  name: string;
}

export interface ThemeDef {
  name: string;
  desc: string;
  bg: string;
  surface: string;
  elevated: string;
  ink: string;
  inkSecondary: string;
  inkTertiary: string;
  hairline: string;
  hairlineStrong: string;
  paperBg: string;
  paperShadow: string;
  plinthBg: string;
  accents: AccentDef[];
  defaultAccent: string;
  oled: boolean;
}

export const THEME_DEFS: Record<ThemeKey, ThemeDef> = {
  paper: {
    name: "Paper",
    desc: "morning",
    bg: "#ffffff",
    surface: "#faf9f5",
    elevated: "#f1efe9",
    ink: "#0a0a0a",
    inkSecondary: "#555555",
    inkTertiary: "#9a9a9a",
    hairline: "#e8e6e0",
    hairlineStrong: "#c8c6bf",
    paperBg: "#ffffff",
    paperShadow: "0 1px 2px rgba(0,0,0,.06), 0 16px 36px -12px rgba(0,0,0,.18)",
    plinthBg: "#f3f1eb",
    accents: [
      { id: "magenta", hex: "#ff2e88", name: "magenta" },
      { id: "vermillion", hex: "#e8362a", name: "vermillion" },
      { id: "cobalt", hex: "#2440ff", name: "cobalt" },
      { id: "forest", hex: "#15814f", name: "forest" },
    ],
    defaultAccent: "magenta",
    oled: false,
  },
  overcast: {
    name: "Overcast",
    desc: "cloud day",
    bg: "#d6d3cb",
    surface: "#cdc9c0",
    elevated: "#beb9ad",
    ink: "#1a1c1e",
    inkSecondary: "#52524d",
    inkTertiary: "#7c7972",
    hairline: "#aeaaa1",
    hairlineStrong: "#8a8679",
    paperBg: "#ffffff",
    paperShadow: "0 1px 2px rgba(0,0,0,.10), 0 22px 44px -10px rgba(0,0,0,.28)",
    plinthBg: "#b8b3a7",
    accents: [
      { id: "indigo", hex: "#384a8a", name: "indigo" },
      { id: "rust", hex: "#a8492b", name: "rust" },
      { id: "moss", hex: "#365c34", name: "moss" },
      { id: "plum", hex: "#6d3554", name: "plum" },
    ],
    defaultAccent: "indigo",
    oled: false,
  },
  twilight: {
    name: "Twilight",
    desc: "blue hour",
    bg: "#1d1928",
    surface: "#262232",
    elevated: "#322c3e",
    ink: "#f5efe0",
    inkSecondary: "#b6ad96",
    inkTertiary: "#7c7361",
    hairline: "#3d3645",
    hairlineStrong: "#5a5263",
    paperBg: "#ffffff",
    paperShadow: "0 6px 14px rgba(0,0,0,.5), 0 30px 60px -10px rgba(0,0,0,.7)",
    plinthBg: "#13101a",
    accents: [
      { id: "amber", hex: "#ffb86c", name: "amber" },
      { id: "salmon", hex: "#ff8a9b", name: "salmon" },
      { id: "periwinkle", hex: "#9aa6ff", name: "periwinkle" },
      { id: "sage", hex: "#a3d09e", name: "sage" },
    ],
    defaultAccent: "amber",
    oled: false,
  },
  midnight: {
    name: "Midnight",
    desc: "OLED",
    bg: "#000000",
    surface: "#080808",
    elevated: "#121212",
    ink: "#e8e8e6",
    inkSecondary: "#a0a09e",
    inkTertiary: "#6a6a68",
    hairline: "#262626",
    hairlineStrong: "#3d3d3d",
    paperBg: "#ffffff",
    paperShadow: "0 1px 0 rgba(255,255,255,.03), 0 30px 70px -10px rgba(0,0,0,.95)",
    plinthBg: "#000000",
    accents: [
      { id: "magenta", hex: "#ff3da0", name: "hot magenta" },
      { id: "cyan", hex: "#3dd6ff", name: "cyan" },
      { id: "lime", hex: "#b8ff5e", name: "lime" },
      { id: "peach", hex: "#ffb098", name: "peach" },
    ],
    defaultAccent: "magenta",
    oled: true,
  },
};

export const THEME_ORDER: ThemeKey[] = ["paper", "overcast", "twilight", "midnight"];
