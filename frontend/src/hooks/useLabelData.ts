// hooks/useLabelData.ts
//
// Consolidates the seven label-rendering fields that multiple components need
// (GenerateButton, LabelPdfDoc, useLabelSave). One useShallow call instead of
// seven individual useRecipeStore selectors.

import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../store/recipeStore";
import type { IngredientItem, LabelDimensions } from "../types";

export interface LabelData {
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
  servingHousehold: string;
  addedSugarsG: number;
  transFatG: number;
}

export function useLabelData(): LabelData {
  return useRecipeStore(
    useShallow((s) => ({
      ingredients:      s.ingredients,
      portionDivisor:   s.portionDivisor,
      labelName:        s.labelName,
      dimensions:       s.dimensions,
      servingHousehold: s.servingHousehold,
      addedSugarsG:     s.addedSugarsG,
      transFatG:        s.transFatG,
    })),
  );
}
