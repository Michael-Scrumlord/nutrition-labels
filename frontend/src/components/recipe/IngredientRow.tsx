// recipe/IngredientRow.tsx
//
// One row in the recipe ingredient list.
// Editable name, amount, unit, and a remove button.

import { X } from "lucide-react";
import { useRecipeStore } from "../../store/recipeStore";
import { UNIT_LABELS } from "../../types";
import type { IngredientItem, UnitKey } from "../../types";

const UNIT_OPTIONS = Object.entries(UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface IngredientRowProps {
  ingredient: IngredientItem;
}

export function IngredientRow({ ingredient }: IngredientRowProps) {
  const updateName   = useRecipeStore((s) => s.updateIngredientName);
  const updateAmount = useRecipeStore((s) => s.updateIngredientAmount);
  const updateUnit   = useRecipeStore((s) => s.updateIngredientUnit);
  const remove       = useRecipeStore((s) => s.removeIngredient);

  return (
    <div
      className="grid gap-2 items-center bg-bg-elevated border border-border-subtle rounded-sm px-3 py-2.5 mb-1.5"
      style={{ gridTemplateColumns: "1fr 80px 108px 28px" }}
    >
      {/* Editable name */}
      <input
        type="text"
        defaultValue={ingredient.name}
        onBlur={(e) => updateName(ingredient.fdc_id, e.target.value)}
        className={[
          "bg-transparent text-sm text-text-primary",
          "border-none outline-none",
          "focus:text-text-primary",
          "truncate",
        ].join(" ")}
      />

      {/* Amount */}
      <input
        type="number"
        min="0.01"
        step="any"
        value={ingredient.amount}
        onChange={(e) => {
          const val = parseFloat(e.target.value);
          if (!isNaN(val) && val > 0) updateAmount(ingredient.fdc_id, val);
        }}
        className={[
          "bg-bg-base border border-border-std rounded-sm",
          "px-2 py-1 text-sm font-mono text-text-primary text-right",
          "focus:outline-none focus:border-accent",
          "transition-colors duration-150",
        ].join(" ")}
      />

      {/* Unit */}
      <select
        value={ingredient.unit}
        onChange={(e) => updateUnit(ingredient.fdc_id, e.target.value as UnitKey)}
        className={[
          "bg-bg-base border border-border-std rounded-sm",
          "px-2 py-1 text-sm text-text-primary",
          "focus:outline-none focus:border-accent",
          "transition-colors duration-150 cursor-pointer",
        ].join(" ")}
      >
        {UNIT_OPTIONS.map((opt) => (
          <option key={opt.value} value={opt.value}>
            {opt.label}
          </option>
        ))}
      </select>

      {/* Remove */}
      <button
        onClick={() => remove(ingredient.fdc_id)}
        className="text-text-tertiary hover:text-danger transition-colors duration-150 flex items-center justify-center"
        aria-label={`Remove ${ingredient.name}`}
      >
        <X size={14} />
      </button>
    </div>
  );
}
