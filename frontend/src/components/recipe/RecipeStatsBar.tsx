// recipe/RecipeStatsBar.tsx
//
// Single-line stats: "yields X servings · per serving Y kcal · batch Z g"
// The calorie value uses an animated number for smooth transitions.

import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { ScrubNumber } from "../ui/ScrubNumber";

interface RecipeStatsBarProps {
  portionDivisor: number;
  calories: number;
  totalGrams: number;
  onPortionDivisorChange: (value: number) => void;
}

export function RecipeStatsBar({
  portionDivisor,
  calories,
  totalGrams,
  onPortionDivisorChange,
}: RecipeStatsBarProps) {
  const animatedCal = useAnimatedNumber(calories);

  return (
    <div style={{
      display: "flex",
      alignItems: "baseline",
      gap: 18,
      flexWrap: "wrap",
      marginBottom: 28,
      paddingBottom: 20,
      borderBottom: "1px solid var(--hair-strong)",
      fontSize: 18,
      color: "var(--ink-2)",
    }}>
      <span>yields&nbsp;
        <ScrubNumber
          value={portionDivisor} min={1} max={96} step={1}
          onChange={onPortionDivisorChange}
          ariaLabel="servings per batch"
          className="pl-scrub"
          style={{ fontSize: 24 }}
        />
        &nbsp;servings
      </span>
      <span style={{ color: "var(--hair-strong)" }}>·</span>
      <span>per serving&nbsp;
        <span
          key={animatedCal}
          className="pl-scrub"
          style={{ fontSize: 24, display: "inline-block", animation: "popPulse 0.42s ease-out" }}
        >
          {animatedCal}
        </span>
        &nbsp;kcal
      </span>
      <span style={{ color: "var(--hair-strong)" }}>·</span>
      <span>batch&nbsp;
        <span className="pl-scrub" style={{ fontSize: 24 }}>{Math.round(totalGrams)}</span>
        &nbsp;g
      </span>
    </div>
  );
}
