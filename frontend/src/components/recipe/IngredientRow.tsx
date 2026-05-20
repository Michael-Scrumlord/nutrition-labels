// recipe/IngredientRow.tsx
//
// Editorial ingredient row — restrained, magazine-polish per the Plinth
// Final A direction. Three columns: a hover-only manicule (☞), the name
// and meta caption, and a scrubable gram weight. Row controls (move /
// remove) appear on hover.

import { useState } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { ScrubNumber } from "../ui/ScrubNumber";
import { ingredientGrams, normalizePortion } from "../../utils/units";
import { getHighlightKeys } from "../../utils/nutrition";
import { UNIT_LABELS } from "../../types";
import type { IngredientItem, UnitKey } from "../../types";

const UNIT_KEYS = Object.keys(UNIT_LABELS) as UnitKey[];
const MAX_INGREDIENT_AMOUNT = 1_000_000;  // matches backend validation

// Picker option encoding:
//   "unit:g", "unit:oz", ...        → global UnitKey
//   "portion:tablespoon", ...       → portion modifier (looked up in availablePortions)
type PickerValue = `unit:${UnitKey}` | `portion:${string}`;

function currentPickerValue(item: IngredientItem): PickerValue {
  if (item.portionRef) return `portion:${item.portionRef.modifier}`;
  return `unit:${item.unit}`;
}

interface IngredientRowProps {
  ingredient: IngredientItem;
  index: number;
  isHovered: boolean;
  totalGrams: number;
  onHoverEnter: () => void;
  onHoverLeave: () => void;
}

export function IngredientRow({
  ingredient, index: _index, isHovered, totalGrams, onHoverEnter, onHoverLeave,
}: IngredientRowProps) {
  const updateAmount  = useRecipeStore((s) => s.updateIngredientAmount);
  const updateUnit    = useRecipeStore((s) => s.updateIngredientUnit);
  const updatePortion = useRecipeStore((s) => s.updateIngredientPortion);
  const remove        = useRecipeStore((s) => s.removeIngredient);
  const move          = useRecipeStore((s) => s.moveIngredient);
  const [actionsHover, setActionsHover] = useState(false);

  const grams   = ingredientGrams(ingredient);
  const pctMix  = totalGrams > 0 ? (grams / totalGrams) * 100 : 0;
  const kcal    = (ingredient.baseMacros.calories * grams) / 100;

  // Picker option list: food-specific portions first, then a divider, then
  // the global units. Portions normalize to "1 of these" so the user can
  // type a clean integer count.
  const portions = ingredient.availablePortions ?? [];

  function handlePickerChange(raw: string) {
    if (raw.startsWith("portion:")) {
      const modifier = raw.slice("portion:".length);
      const match = portions.find((p) => p.modifier === modifier);
      if (match) updatePortion(ingredient.fdc_id, normalizePortion(match));
    } else if (raw.startsWith("unit:")) {
      updateUnit(ingredient.fdc_id, raw.slice("unit:".length) as UnitKey);
    }
  }

  const dominantKeys = getHighlightKeys(ingredient.baseMacros);
  const dominantLabel = [...dominantKeys]
    .map((k) => k.replace(/_/g, " ").replace(/(mg|g|mcg)$/, "").trim())
    .join(", ")
    .toUpperCase();

  return (
    <li
      onMouseEnter={() => { onHoverEnter(); setActionsHover(true); }}
      onMouseLeave={() => { onHoverLeave(); setActionsHover(false); }}
      style={{
        display: "grid",
        gridTemplateColumns: "26px 1fr auto auto",
        gap: 16,
        alignItems: "baseline",
        padding: "13px 0",
        paddingLeft: isHovered ? 8 : 0,
        borderBottom: "1px solid var(--hair)",
        transition: "padding 200ms ease",
        animation: "popInRow 0.28s ease both",
      }}
    >
      {/* Manicule — fades in on hover */}
      <span
        aria-hidden="true"
        style={{
          color: isHovered ? "var(--accent)" : "var(--ink-3)",
          opacity: isHovered ? 1 : 0,
          transition: "opacity 200ms ease, color 200ms ease",
          fontSize: 16,
          userSelect: "none",
        }}
      >
        ☞
      </span>

      {/* Name + meta */}
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap", minWidth: 0 }}>
        <span
          className="pl-display"
          style={{
            fontSize: 22,
            color: "var(--ink)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            maxWidth: "100%",
          }}
        >
          {ingredient.name}
        </span>
        <span className="pl-meta" style={{ letterSpacing: "0.16em" }}>
          {pctMix.toFixed(1)}% · {Math.round(kcal)} KCAL
          {isHovered && dominantLabel ? <> · DOMINANT: {dominantLabel}</> : null}
        </span>
      </div>

      {/* Scrubable amount + inline unit picker */}
      <span style={{
        display: "inline-flex", alignItems: "baseline", gap: 4,
        fontSize: 22, fontWeight: 800, letterSpacing: "-0.02em", fontVariantNumeric: "tabular-nums",
      }}>
        <ScrubNumber
          value={ingredient.amount}
          min={0.01}
          max={MAX_INGREDIENT_AMOUNT}
          decimals={2}
          onChange={(n) => updateAmount(ingredient.fdc_id, n)}
          className="pl-scrub"
          style={{ fontSize: 22, fontWeight: 800 }}
          ariaLabel={`${ingredient.name} amount`}
        />
        <select
          aria-label={`${ingredient.name} unit`}
          value={currentPickerValue(ingredient)}
          onChange={(e) => handlePickerChange(e.target.value)}
          style={{
            background: "transparent",
            border: "none",
            color: "var(--ink)",
            font: "inherit",
            fontSize: 14,
            fontWeight: 500,
            padding: 0,
            marginLeft: 2,
            cursor: "pointer",
            appearance: "none",
            WebkitAppearance: "none",
            MozAppearance: "none",
          }}
        >
          {portions.length > 0 && (
            <optgroup label="Food portions">
              {portions.map((p) => (
                <option key={`portion-${p.modifier}`} value={`portion:${p.modifier}`}>
                  {p.modifier}
                </option>
              ))}
            </optgroup>
          )}
          <optgroup label={portions.length > 0 ? "Standard units" : undefined}>
            {UNIT_KEYS.map((u) => (
              <option key={`unit-${u}`} value={`unit:${u}`}>{u}</option>
            ))}
          </optgroup>
        </select>
      </span>

      {/* Row controls — hover only, stacked vertical */}
      <span
        style={{
          display: "flex",
          flexDirection: "column",
          gap: 0,
          opacity: actionsHover ? 1 : 0,
          transition: "opacity .15s ease",
          flexShrink: 0,
        }}
      >
        <CtrlBtn label="↑" ariaLabel="Move up"  onClick={() => move(ingredient.fdc_id, -1)} />
        <CtrlBtn label="↓" ariaLabel="Move down" onClick={() => move(ingredient.fdc_id,  1)} />
        <CtrlBtn label="×" ariaLabel={`Remove ${ingredient.name}`} danger onClick={() => remove(ingredient.fdc_id)} />
      </span>
    </li>
  );
}

function CtrlBtn({
  label, ariaLabel, onClick, danger,
}: {
  label: string;
  ariaLabel: string;
  onClick: () => void;
  danger?: boolean;
}) {
  return (
    <button
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      style={{
        background: "transparent",
        border: "none",
        cursor: "pointer",
        color: "var(--ink-3)",
        padding: "2px 6px",
        lineHeight: 1,
        fontSize: 14,
        transition: "color 150ms ease",
      }}
      onMouseEnter={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = danger ? "var(--color-danger)" : "var(--accent)";
      }}
      onMouseLeave={(e) => {
        (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)";
      }}
    >
      {label}
    </button>
  );
}
