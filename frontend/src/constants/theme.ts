// Shared design tokens. All three resolve to live CSS custom properties
// driven by the active theme — components consuming them automatically
// retune to Paper / Overcast / Twilight / Midnight without any rewrite.

export const ACCENT = "var(--accent)";
export const INK    = "var(--ink)";
export const BLUSH  = "color-mix(in srgb, var(--accent) 6%, var(--bg))";
