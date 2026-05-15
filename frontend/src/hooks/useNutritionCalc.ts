// hooks/useNutritionCalc.ts
//
// Derives the per-serving MacroProfile from the current recipe store state.
// Re-runs whenever ingredients or portionDivisor change.

import { useMemo } from "react";
import { useRecipeStore } from "../store/recipeStore";
import { calculateRecipeMacros } from "../utils/nutrition";
import type { MacroProfile } from "../types";

export function useNutritionCalc(): MacroProfile {
  const ingredients = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);

  return useMemo(
    () => calculateRecipeMacros(ingredients, portionDivisor),
    [ingredients, portionDivisor],
  );
}
