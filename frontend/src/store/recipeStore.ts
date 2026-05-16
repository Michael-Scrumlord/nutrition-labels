import { create } from "zustand";
import type { IngredientItem, LabelDimensions, UnitKey, HighlightSet } from "../types";

interface RecipeState {
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
  highlightedNutrients: HighlightSet;

  addIngredient:           (ingredient: IngredientItem) => void;
  removeIngredient:        (fdc_id: number) => void;
  updateIngredientName:    (fdc_id: number, name: string) => void;
  updateIngredientAmount:  (fdc_id: number, amount: number) => void;
  updateIngredientUnit:    (fdc_id: number, unit: UnitKey) => void;
  moveIngredient:          (fdc_id: number, direction: -1 | 1) => void;
  setPortionDivisor:       (divisor: number) => void;
  setLabelName:            (name: string) => void;
  setDimensions:           (dimensions: Partial<LabelDimensions>) => void;
  setHighlightedNutrients: (nutrients: HighlightSet) => void;
  clearRecipe:             () => void;
}

export const useRecipeStore = create<RecipeState>((set) => ({
  ingredients:          [],
  portionDivisor:       8,
  labelName:            "",
  dimensions:           { widthInches: 2.75, heightInches: null },
  highlightedNutrients: new Set(),

  addIngredient: (ingredient) =>
    set((state) => ({ ingredients: [...state.ingredients, ingredient] })),

  removeIngredient: (fdc_id) =>
    set((state) => ({ ingredients: state.ingredients.filter((i) => i.fdc_id !== fdc_id) })),

  updateIngredientName: (fdc_id, name) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => i.fdc_id === fdc_id ? { ...i, name } : i),
    })),

  updateIngredientAmount: (fdc_id, amount) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => i.fdc_id === fdc_id ? { ...i, amount } : i),
    })),

  updateIngredientUnit: (fdc_id, unit) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => i.fdc_id === fdc_id ? { ...i, unit } : i),
    })),

  moveIngredient: (fdc_id, direction) =>
    set((state) => {
      const idx = state.ingredients.findIndex((i) => i.fdc_id === fdc_id);
      if (idx === -1) return state;
      const to = idx + direction;
      if (to < 0 || to >= state.ingredients.length) return state;
      const next = [...state.ingredients];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { ingredients: next };
    }),

  setPortionDivisor: (portionDivisor) => set({ portionDivisor }),
  setLabelName:      (labelName)      => set({ labelName }),

  setDimensions: (partial) =>
    set((state) => ({ dimensions: { ...state.dimensions, ...partial } })),

  setHighlightedNutrients: (nutrients) => set({ highlightedNutrients: nutrients }),

  clearRecipe: () => set({
    ingredients: [], portionDivisor: 8, labelName: "", highlightedNutrients: new Set(),
  }),
}));
