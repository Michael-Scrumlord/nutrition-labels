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
      gap: 20,
      flexWrap: "wrap",
      marginBottom: 26,
      paddingBottom: 18,
      borderBottom: "1px solid var(--hair-strong)",
      fontSize: 17,
      color: "var(--ink-2)",
    }}>
      <span className="sig-static">yields&nbsp;
        <ScrubNumber
          value={portionDivisor} min={1} max={96} step={1}
          onChange={onPortionDivisorChange}
          ariaLabel="servings per batch"
          className="sig-inline"
          style={{ fontSize: 22, fontWeight: 700, color: "var(--ink)" }}
        />
        &nbsp;servings
      </span>
      <span className="sig-static" style={{ color: "var(--hair-strong)" }}>·</span>
      <span className="sig-static">per serving&nbsp;
        <span
          key={animatedCal}
          className="sig-calc"
          style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)", animation: "popPulse 0.42s ease-out" }}
        >
          <span>{animatedCal}</span>
        </span>
        &nbsp;kcal
      </span>
      <span className="sig-static" style={{ color: "var(--hair-strong)" }}>·</span>
      <span className="sig-static">batch&nbsp;
        <span className="sig-calc" style={{ fontSize: 22, fontWeight: 700, color: "var(--accent)" }}>
          <span>{Math.round(totalGrams)}</span>
        </span>
        &nbsp;g
      </span>
    </div>
  );
}
