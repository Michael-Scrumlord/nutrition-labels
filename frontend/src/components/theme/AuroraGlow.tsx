// AuroraGlow.tsx — soft accent-color glow + bokeh dust, behind the label sidebar.
// Per the Final A · Editorial direction, this only renders on Midnight; every
// other theme stays clean for readability.

import { useMemo } from "react";
import { useActiveTheme } from "../../store/themeStore";

interface AuroraGlowProps {
  /** Which themes to render on. Defaults to ["midnight"]. */
  themes?: string[];
  /** If true, renders the "plinth glow" variant (used behind the white label). */
  plinth?: boolean;
}

export function AuroraGlow({ themes = ["midnight"], plinth = false }: AuroraGlowProps) {
  const { theme, accent } = useActiveTheme();
  if (!themes.includes(theme)) return null;
  if (plinth) return <PlinthGlow accentHex={accent.hex} />;
  return <BodyGlow accentHex={accent.hex} />;
}

function BodyGlow({ accentHex }: { accentHex: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      <div
        style={{
          position: "absolute",
          top: "-25%",
          right: "-15%",
          width: "75%",
          height: "85%",
          background: `radial-gradient(closest-side, ${accentHex}33, ${accentHex}11 50%, transparent 75%)`,
          filter: "blur(40px)",
        }}
      />
      <div
        style={{
          position: "absolute",
          bottom: "-30%",
          left: "-10%",
          width: "60%",
          height: "70%",
          background: `radial-gradient(closest-side, ${accentHex}1a, transparent 70%)`,
          filter: "blur(60px)",
        }}
      />
      <Bokeh seed={3} accent={accentHex} />
    </div>
  );
}

function PlinthGlow({ accentHex }: { accentHex: string }) {
  return (
    <div style={{ position: "absolute", inset: 0, pointerEvents: "none", zIndex: 0 }}>
      {/* Moonlit gradient — light falling from above onto the plinth */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          background: "linear-gradient(180deg, rgba(255,255,255,0.06) 0%, transparent 35%)",
        }}
      />
      {/* Soft accent glow behind where the label sits */}
      <div
        style={{
          position: "absolute",
          top: "30%",
          left: "50%",
          transform: "translate(-50%, -20%)",
          width: "85%",
          height: "60%",
          background: `radial-gradient(ellipse at center, ${accentHex}26, transparent 70%)`,
          filter: "blur(50px)",
        }}
      />
    </div>
  );
}

interface BokehDot {
  x: number;
  y: number;
  r: number;
  op: number;
  c: string;
}

function Bokeh({ seed, accent }: { seed: number; accent: string }) {
  const dots = useMemo<BokehDot[]>(() => {
    const out: BokehDot[] = [];
    let s = seed * 9301 + 49297;
    const rng = () => {
      s = (s * 9301 + 49297) % 233280;
      return s / 233280;
    };
    for (let i = 0; i < 26; i++) {
      out.push({
        x: rng() * 100,
        y: rng() * 100,
        r: 1 + rng() * 2.5,
        op: 0.15 + rng() * 0.35,
        c: rng() > 0.7 ? accent : "#ffffff",
      });
    }
    return out;
  }, [seed, accent]);
  return (
    <svg
      style={{ position: "absolute", inset: 0, width: "100%", height: "100%" }}
      viewBox="0 0 100 100"
      preserveAspectRatio="none"
    >
      {dots.map((d, i) => (
        <circle key={i} cx={d.x} cy={d.y} r={d.r / 10} fill={d.c} opacity={d.op} />
      ))}
    </svg>
  );
}
