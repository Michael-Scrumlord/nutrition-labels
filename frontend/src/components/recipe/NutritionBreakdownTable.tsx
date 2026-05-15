// recipe/NutritionBreakdownTable.tsx
//
// Shows each ingredient's per-ingredient contribution (before dividing by servings).
// Final row shows recipe totals (pre-division).
// All values are computed client-side.

import { useRecipeStore } from "../../store/recipeStore";
import { UNIT_CONVERSIONS } from "../../utils/units";
import type { IngredientItem } from "../../types";

function ingredientWeightGrams(ing: IngredientItem): number {
  return ing.amount * UNIT_CONVERSIONS[ing.unit];
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}

/** Macros for a single ingredient at its full (un-divided) quantity. */
function singleIngredientMacros(ing: IngredientItem) {
  const multiplier = ingredientWeightGrams(ing) / 100;
  return {
    calories: Math.round(ing.baseMacros.calories * multiplier),
    fat:      round1(ing.baseMacros.fat_total_g * multiplier),
    carbs:    round1(ing.baseMacros.carbohydrates_total_g * multiplier),
    protein:  round1(ing.baseMacros.protein_g * multiplier),
    weightG:  round1(ingredientWeightGrams(ing)),
  };
}

export function NutritionBreakdownTable() {
  const ingredients = useRecipeStore((s) => s.ingredients);

  if (ingredients.length === 0) return null;

  // Per-ingredient rows (no division)
  const rows = ingredients.map((ing) => ({
    name: ing.name,
    ...singleIngredientMacros(ing),
  }));

  // Totals (still undivided — shows what the full batch contains)
  const totals = {
    weightG:  round1(rows.reduce((sum, r) => sum + r.weightG, 0)),
    calories: rows.reduce((sum, r) => sum + r.calories, 0),
    fat:      round1(rows.reduce((sum, r) => sum + r.fat, 0)),
    carbs:    round1(rows.reduce((sum, r) => sum + r.carbs, 0)),
    protein:  round1(rows.reduce((sum, r) => sum + r.protein, 0)),
  };

  return (
    <div className="mt-4 overflow-x-auto">
      <table className="w-full border-collapse text-sm">
        <thead>
          <tr className="bg-bg-elevated text-text-secondary text-xs uppercase tracking-widest">
            <th className="px-2 py-1.5 text-left font-medium">Ingredient</th>
            <th className="px-2 py-1.5 text-right font-medium font-mono">Weight (g)</th>
            <th className="px-2 py-1.5 text-right font-medium font-mono">Cal</th>
            <th className="px-2 py-1.5 text-right font-medium font-mono">Fat (g)</th>
            <th className="px-2 py-1.5 text-right font-medium font-mono">Carbs (g)</th>
            <th className="px-2 py-1.5 text-right font-medium font-mono">Protein (g)</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row, i) => (
            <tr key={i} className="border-b border-border-subtle">
              <td className="px-2 py-1.5 text-text-secondary text-sm">{row.name}</td>
              <td className="px-2 py-1.5 text-right font-mono text-text-primary">{row.weightG}</td>
              <td className="px-2 py-1.5 text-right font-mono text-text-primary">{row.calories}</td>
              <td className="px-2 py-1.5 text-right font-mono text-text-primary">{row.fat}</td>
              <td className="px-2 py-1.5 text-right font-mono text-text-primary">{row.carbs}</td>
              <td className="px-2 py-1.5 text-right font-mono text-text-primary">{row.protein}</td>
            </tr>
          ))}
          {/* Totals row */}
          <tr className="border-t border-border-strong font-semibold text-accent-text">
            <td className="px-2 py-1.5 text-sm">Total (full batch)</td>
            <td className="px-2 py-1.5 text-right font-mono">{totals.weightG}</td>
            <td className="px-2 py-1.5 text-right font-mono">{totals.calories}</td>
            <td className="px-2 py-1.5 text-right font-mono">{totals.fat}</td>
            <td className="px-2 py-1.5 text-right font-mono">{totals.carbs}</td>
            <td className="px-2 py-1.5 text-right font-mono">{totals.protein}</td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}
