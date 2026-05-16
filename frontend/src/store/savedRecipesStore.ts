// store/savedRecipesStore.ts
//
// Persisted catalog of saved recipes. Stored in localStorage under nl_saved_recipes.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedRecipe, IngredientItem, LabelDimensions } from "../types";

const MAX_SAVED = 50;

type RecipeSnapshot = {
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
};

interface SavedRecipesState {
  recipes: SavedRecipe[];
  saveRecipe:   (snapshot: RecipeSnapshot) => void;
  deleteRecipe: (id: string) => void;
  renameRecipe: (id: string, name: string) => void;
}

export const useSavedRecipesStore = create<SavedRecipesState>()(
  persist(
    (set) => ({
      recipes: [],

      saveRecipe: (snapshot) =>
        set((state) => {
          const name = snapshot.labelName.trim() || "Untitled Recipe";
          const newRecipe: SavedRecipe = {
            ...snapshot,
            name,
            id: crypto.randomUUID(),
            savedAt: Date.now(),
          };
          return { recipes: [newRecipe, ...state.recipes].slice(0, MAX_SAVED) };
        }),

      deleteRecipe: (id) =>
        set((state) => ({ recipes: state.recipes.filter((r) => r.id !== id) })),

      renameRecipe: (id, name) =>
        set((state) => ({
          recipes: state.recipes.map((r) => (r.id === id ? { ...r, name } : r)),
        })),
    }),
    { name: "nl_saved_recipes" },
  ),
);
