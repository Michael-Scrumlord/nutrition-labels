// Convenience hook that returns all recipe store actions in one call.
// Using useShallow prevents re-renders since action references are stable.

import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../store/recipeStore";

export function useRecipeActions() {
  return useRecipeStore(
    useShallow((s) => ({
      addIngredient:           s.addIngredient,
      removeIngredient:        s.removeIngredient,
      updateIngredientName:    s.updateIngredientName,
      updateIngredientAmount:  s.updateIngredientAmount,
      updateIngredientUnit:    s.updateIngredientUnit,
      moveIngredient:          s.moveIngredient,
      setPortionDivisor:       s.setPortionDivisor,
      setLabelName:            s.setLabelName,
      setDimensions:           s.setDimensions,
      clearRecipe:             s.clearRecipe,
      setHighlightedNutrients: s.setHighlightedNutrients,
    })),
  );
}
