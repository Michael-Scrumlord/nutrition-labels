// hooks/useNutritionCalc.ts
//
// Derives the per-serving MacroProfile from the current recipe store state.
// Re-runs whenever ingredients or portionDivisor change.

import { useMemo } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../store/recipeStore";
import { calculateRecipeMacros } from "../utils/nutrition";
import type { MacroProfile } from "../types";

export function useNutritionCalc(): MacroProfile {
  const { ingredients, portionDivisor } = useRecipeStore(
    useShallow((s) => ({ ingredients: s.ingredients, portionDivisor: s.portionDivisor })),
  );

  return useMemo(
    () => calculateRecipeMacros(ingredients, portionDivisor),
    [ingredients, portionDivisor],
  );
}
