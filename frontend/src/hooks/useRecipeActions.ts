// Convenience hook that returns all recipe store actions in one call.
// Using useShallow prevents re-renders since action references are stable.

import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../store/recipeStore";

export function useRecipeActions() {
  return useRecipeStore(
    useShallow((s) => ({
      // Ingredient actions
      addIngredient:            s.addIngredient,
      removeIngredient:         s.removeIngredient,
      updateIngredientName:     s.updateIngredientName,
      updateIngredientAmount:   s.updateIngredientAmount,
      updateIngredientUnit:     s.updateIngredientUnit,
      updateIngredientPortion:  s.updateIngredientPortion,
      moveIngredient:           s.moveIngredient,

      // Recipe meta actions
      setPortionDivisor:       s.setPortionDivisor,
      setLabelName:            s.setLabelName,
      setDimensions:           s.setDimensions,
      clearRecipe:             s.clearRecipe,
      setHighlightedNutrients: s.setHighlightedNutrients,
      setServingHousehold:     s.setServingHousehold,
      setAddedSugarsG:         s.setAddedSugarsG,
      setTransFatG:            s.setTransFatG,

      // Method actions
      addStep:          s.addStep,
      updateStepText:   s.updateStepText,
      removeStep:       s.removeStep,
      moveStep:         s.moveStep,
      addVariable:      s.addVariable,
      setVariableValue: s.setVariableValue,
      updateVariable:   s.updateVariable,
      removeVariable:   s.removeVariable,

      // Recipe lifecycle
      loadRecipe:          s.loadRecipe,
      loadVersion:         s.loadVersion,
      exitVersionView:     s.exitVersionView,
      setCurrentRecipeId:  s.setCurrentRecipeId,
    })),
  );
}
