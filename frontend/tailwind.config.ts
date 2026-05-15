import type { Config } from "tailwindcss";

const config: Config = {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      spacing: {
        18: "72px",
      },
      colors: {
        // These match the CSS custom properties defined in index.css.
        // Use them in Tailwind classes like bg-bg-surface, text-accent, etc.
        "bg-base":     "#08080B",
        "bg-surface":  "#101014",
        "bg-elevated": "#18181F",
        "bg-overlay":  "#1F1F28",
        "border-subtle":  "#1E1E26",
        "border-std":     "#2A2A36",
        "border-strong":  "#3A3A4A",
        "accent":         "#E8B400",
        "accent-dim":     "#A07D00",
        "accent-text":    "#FFD447",
        "text-primary":   "#EEEEF2",
        "text-secondary": "#8080A0",
        "text-tertiary":  "#50506A",
        "text-inverse":   "#08080B",
        "success":        "#22C55E",
        "danger":         "#EF4444",
        "warning":        "#F59E0B",
      },
      fontFamily: {
        sans:  ["Inter", "system-ui", "sans-serif"],
        mono:  ["JetBrains Mono", "Fira Code", "monospace"],
      },
      borderRadius: {
        sm:   "2px",
        md:   "4px",
        lg:   "6px",
        pill: "999px",
      },
      fontSize: {
        xs:   ["0.6875rem", { lineHeight: "1rem" }],    // 11px
        sm:   ["0.8125rem", { lineHeight: "1.25rem" }], // 13px
        base: ["0.9375rem", { lineHeight: "1.5rem" }],  // 15px
        lg:   ["1.0625rem", { lineHeight: "1.75rem" }], // 17px
        xl:   ["1.25rem",   { lineHeight: "1.75rem" }], // 20px
        "2xl":["1.5rem",    { lineHeight: "2rem" }],    // 24px
        "3xl":["2rem",      { lineHeight: "2.5rem" }],  // 32px
      },
    },
  },
  plugins: [],
};

export default config;
