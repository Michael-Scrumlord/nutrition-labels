// recipe/IngredientRow.tsx
//
// One row in the magazine-style recipe list.
// Displays a big italic index numeral, ingredient name, gram-weight stats,
// and hover-driven highlight feedback. Row actions (move/remove/scrub)
// are handled here via direct store access, keeping RecipeBuilder lean.

import { useRecipeStore } from "../../store/recipeStore";
import { ScrubNumber } from "../ui/ScrubNumber";
import { convertToGrams } from "../../utils/units";
import { getHighlightKeys } from "../../utils/nutrition";
import { ACCENT, INK, BLUSH } from "../../constants/theme";
import type { IngredientItem } from "../../types";

interface IngredientRowProps {
  ingredient: IngredientItem;
  index: number;
  isHovered: boolean;
  totalGrams: number;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}

export function IngredientRow({
  ingredient, index, isHovered, totalGrams, onHoverEnter, onHoverLeave,
}: IngredientRowProps) {
  const updateAmount = useRecipeStore((s) => s.updateIngredientAmount);
  const updateUnit   = useRecipeStore((s) => s.updateIngredientUnit);
  const remove       = useRecipeStore((s) => s.removeIngredient);
  const move         = useRecipeStore((s) => s.moveIngredient);

  const grams   = Math.round(convertToGrams(ingredient.amount, ingredient.unit));
  const pctMix  = totalGrams > 0
    ? (convertToGrams(ingredient.amount, ingredient.unit) / totalGrams) * 100
    : 0;
  const kcal    = (ingredient.baseMacros.calories * grams) / 100;

  const dominantKeys = getHighlightKeys(ingredient.baseMacros);
  const dominantLabel = [...dominantKeys]
    .map((k) => k.replace(/_/g, " ").replace(/(mg|g|mcg)$/, "").trim())
    .join(", ")
    .toUpperCase();

  function setGrams(g: number) {
    updateAmount(ingredient.fdc_id, g);
    if (ingredient.unit !== "g") updateUnit(ingredient.fdc_id, "g");
  }

  const controls = [
    { label: "↑", ariaLabel: "Move up",                    onClick: () => move(ingredient.fdc_id, -1) },
    { label: "↓", ariaLabel: "Move down",                  onClick: () => move(ingredient.fdc_id,  1) },
    { label: "×", ariaLabel: `Remove ${ingredient.name}`,  onClick: () => remove(ingredient.fdc_id)   },
  ];

  return (
    <li
      onMouseEnter={onHoverEnter}
      onMouseLeave={onHoverLeave}
      style={{
        display: "grid",
        gridTemplateColumns: "90px 1fr auto 80px",
        gap: 22,
        alignItems: "baseline",
        padding: "16px 12px",
        position: "relative",
        background: isHovered ? BLUSH : "transparent",
        transition: "background 0.2s ease",
        animation: "popInRow 0.28s ease both",
      }}
    >
      {/* Big italic numeral */}
      <span style={{
        fontFamily: "'Instrument Serif', Georgia, serif",
        fontStyle: "italic",
        fontSize: 60,
        lineHeight: 0.9,
        color: isHovered ? ACCENT : "#ccc",
        letterSpacing: "-0.04em",
        transition: "transform 0.3s cubic-bezier(.2,.7,.1,1), color 0.25s ease",
        transform: isHovered ? "translateX(8px)" : "translateX(0)",
        display: "block",
      }}>
        {String(index + 1).padStart(2, "0")}
      </span>

      {/* Name + stats */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
        <span style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: "italic",
          fontSize: 28,
          letterSpacing: "-0.02em",
          color: INK,
        }}>
          {ingredient.name}
        </span>
        <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.16em" }}>
          {pctMix.toFixed(1)}% OF MIX · {Math.round(kcal)} KCAL
          {isHovered && dominantLabel ? <> · DOMINANT: {dominantLabel}</> : null}
        </span>
      </div>

      {/* Scrubable gram weight */}
      <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
        <ScrubNumber
          value={grams}
          min={0} max={5000} step={1}
          onChange={setGrams}
          style={{ fontSize: 32, fontWeight: 800, color: ACCENT }}
          ariaLabel={`${ingredient.name} grams`}
        />
        <span style={{ color: INK, fontSize: 16, marginLeft: 2 }}>g</span>
      </span>

      {/* Row controls */}
      <span style={{ display: "flex", gap: 2, justifyContent: "flex-end", alignItems: "center" }}>
        {controls.map(({ label, ariaLabel, onClick }) => (
          <button
            key={ariaLabel}
            aria-label={ariaLabel}
            title={ariaLabel}
            onClick={onClick}
            style={{
              background: "transparent", border: "1px solid transparent",
              padding: "4px 6px", cursor: "pointer", color: "#bbb",
              lineHeight: 1, fontFamily: "inherit", fontSize: 14,
              transition: "color 0.15s, border-color 0.15s",
            }}
            onMouseEnter={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = label === "×" ? "var(--color-danger)" : ACCENT;
              el.style.borderColor = "#e5e5e5";
            }}
            onMouseLeave={(e) => {
              const el = e.currentTarget as HTMLButtonElement;
              el.style.color = "#bbb";
              el.style.borderColor = "transparent";
            }}
          >
            {label}
          </button>
        ))}
      </span>

      {/* Row rule */}
      <span style={{
        gridColumn: "1 / -1", height: 1,
        background: isHovered ? ACCENT : "#ebebeb",
        transition: "background 0.25s ease",
        display: "block",
      }} />
    </li>
  );
}
