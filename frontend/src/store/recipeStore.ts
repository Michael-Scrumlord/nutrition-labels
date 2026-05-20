import { create } from "zustand";
import type {
  IngredientItem, LabelDimensions, UnitKey, HighlightSet,
  RecipeStep, RecipeVariable, SavedRecipe, RecipeVersion,
  PortionRef,
} from "../types";
import { UNIT_CONVERSIONS, ingredientGrams } from "../utils/units";

// crypto.randomUUID() is unavailable in insecure contexts (http://hostname).
function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}
import { makeId } from "../utils/id";

interface RecipeState {
  // ── Recipe content ────────────────────────────────────────────────────
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
  highlightedNutrients: HighlightSet;
  instructions: RecipeStep[];
  variables: RecipeVariable[];

  // ── Version tracking ──────────────────────────────────────────────────
  currentRecipeId:   string | null;   // null = unsaved/new recipe
  viewingVersionId:  string | null;   // non-null when viewing an older version

  // ── Ingredient actions ────────────────────────────────────────────────
  addIngredient:           (ingredient: IngredientItem) => void;
  removeIngredient:        (fdc_id: number) => void;
  updateIngredientName:    (fdc_id: number, name: string) => void;
  updateIngredientAmount:  (fdc_id: number, amount: number) => void;
  updateIngredientUnit:    (fdc_id: number, unit: UnitKey) => void;
  // Switch the row to a food-specific portion ("1 tbsp"). Passing `null`
  // clears any active portionRef and falls back to the row's `unit`.
  updateIngredientPortion: (fdc_id: number, portion: PortionRef | null) => void;
  moveIngredient:          (fdc_id: number, direction: -1 | 1) => void;

  // ── Recipe meta actions ───────────────────────────────────────────────
  setPortionDivisor:       (divisor: number) => void;
  setLabelName:            (name: string) => void;
  setDimensions:           (dimensions: Partial<LabelDimensions>) => void;
  setHighlightedNutrients: (nutrients: HighlightSet) => void;

  // ── Method actions ────────────────────────────────────────────────────
  addStep:           (afterId?: string) => string;
  updateStepText:    (id: string, text: string) => void;
  removeStep:        (id: string) => void;
  moveStep:          (id: string, direction: -1 | 1) => void;

  addVariable:       (variable: RecipeVariable) => void;
  setVariableValue:  (name: string, value: number) => void;
  updateVariable:    (name: string, patch: Partial<RecipeVariable>) => void;
  removeVariable:    (name: string) => void;

  // ── Recipe lifecycle ──────────────────────────────────────────────────
  clearRecipe:        () => void;
  loadRecipe:         (recipe: SavedRecipe)  => void;   // loads latest version
  loadVersion:        (recipe: SavedRecipe, version: RecipeVersion) => void;
  exitVersionView:    () => void;
  setCurrentRecipeId: (id: string) => void;
}

const DEFAULTS = {
  ingredients:          [] as IngredientItem[],
  portionDivisor:       8,
  labelName:            "",
  dimensions:           { widthInches: 2.75, heightInches: null } as LabelDimensions,
  highlightedNutrients: new Set() as HighlightSet,
  instructions:         [] as RecipeStep[],
  variables:            [] as RecipeVariable[],
  currentRecipeId:      null as string | null,
  viewingVersionId:     null as string | null,
};

export const useRecipeStore = create<RecipeState>((set) => ({
  ...DEFAULTS,

  // ── Ingredient actions ────────────────────────────────────────────────
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

  // Changing the unit on an existing ingredient re-expresses the amount in
  // the new unit so the physical gram weight stays constant. e.g. 100 g of
  // butter, switched to oz, becomes 3.53 oz — not 100 oz. If the row was on
  // a portion ("1 tbsp"), that portion is cleared. Displayed amount rounds
  // to 2 decimals to match the row UI's precision.
  updateIngredientUnit: (fdc_id, unit) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => {
        if (i.fdc_id !== fdc_id) return i;
        // No-op if neither unit nor portion would change.
        if (!i.portionRef && i.unit === unit) return i;
        const grams = ingredientGrams(i);
        const newAmount = grams / UNIT_CONVERSIONS[unit];
        return {
          ...i,
          unit,
          portionRef: null,
          amount: Math.round(newAmount * 100) / 100,
        };
      }),
    })),

  // Switch to a food-specific portion ("1 cup ≈ 227 g") while preserving
  // gram weight. Passing `null` clears portionRef without changing unit.
  updateIngredientPortion: (fdc_id, portion) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => {
        if (i.fdc_id !== fdc_id) return i;
        const grams = ingredientGrams(i);
        if (portion === null) {
          // Falling back to the row's `unit` — re-express grams there.
          const newAmount = grams / UNIT_CONVERSIONS[i.unit];
          return { ...i, portionRef: null, amount: Math.round(newAmount * 100) / 100 };
        }
        const newAmount = grams / portion.gramsPerUnit;
        return { ...i, portionRef: portion, amount: Math.round(newAmount * 100) / 100 };
      }),
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

  // ── Recipe meta actions ───────────────────────────────────────────────
  setPortionDivisor: (portionDivisor) => set({ portionDivisor }),
  setLabelName:      (labelName)      => set({ labelName }),

  setDimensions: (partial) =>
    set((state) => ({ dimensions: { ...state.dimensions, ...partial } })),

  setHighlightedNutrients: (nutrients) => set({ highlightedNutrients: nutrients }),

  // ── Method actions ────────────────────────────────────────────────────
  addStep: (afterId) => {
    const id = makeId();
    set((state) => {
      const next: RecipeStep = { id, text: "" };
      if (!afterId) return { instructions: [...state.instructions, next] };
      const idx = state.instructions.findIndex((s) => s.id === afterId);
      if (idx === -1) return { instructions: [...state.instructions, next] };
      const out = [...state.instructions];
      out.splice(idx + 1, 0, next);
      return { instructions: out };
    });
    return id;
  },

  updateStepText: (id, text) =>
    set((state) => ({
      instructions: state.instructions.map((s) => s.id === id ? { ...s, text } : s),
    })),

  removeStep: (id) =>
    set((state) => ({ instructions: state.instructions.filter((s) => s.id !== id) })),

  moveStep: (id, direction) =>
    set((state) => {
      const idx = state.instructions.findIndex((s) => s.id === id);
      if (idx === -1) return state;
      const to = idx + direction;
      if (to < 0 || to >= state.instructions.length) return state;
      const next = [...state.instructions];
      [next[idx], next[to]] = [next[to], next[idx]];
      return { instructions: next };
    }),

  addVariable: (variable) =>
    set((state) => {
      // No duplicate names — if it exists, leave it alone
      if (state.variables.some((v) => v.name === variable.name)) return state;
      return { variables: [...state.variables, variable] };
    }),

  setVariableValue: (name, value) =>
    set((state) => ({
      variables: state.variables.map((v) => v.name === name ? { ...v, value } : v),
    })),

  updateVariable: (name, patch) =>
    set((state) => ({
      variables: state.variables.map((v) => v.name === name ? { ...v, ...patch } : v),
    })),

  removeVariable: (name) =>
    set((state) => ({ variables: state.variables.filter((v) => v.name !== name) })),

  // ── Recipe lifecycle ──────────────────────────────────────────────────
  clearRecipe: () => set({
    ...DEFAULTS,
    dimensions: { widthInches: 2.75, heightInches: null },
    highlightedNutrients: new Set(),
  }),

  loadRecipe: (recipe) => {
    const latest = recipe.versions.length > 0
      ? recipe.versions[recipe.versions.length - 1]
      : undefined;
    if (!latest) return;
    set({
      ingredients:          latest.ingredients,
      portionDivisor:       latest.portionDivisor,
      labelName:            latest.labelName,
      dimensions:           latest.dimensions,
      instructions:         latest.instructions ?? [],
      variables:            latest.variables ?? [],
      highlightedNutrients: new Set(),
      currentRecipeId:      recipe.id,
      viewingVersionId:     null,
    });
  },

  loadVersion: (recipe, version) => set({
    ingredients:          version.ingredients,
    portionDivisor:       version.portionDivisor,
    labelName:            version.labelName,
    dimensions:           version.dimensions,
    instructions:         version.instructions ?? [],
    variables:            version.variables ?? [],
    highlightedNutrients: new Set(),
    currentRecipeId:      recipe.id,
    viewingVersionId:     version.id,
  }),

  exitVersionView: () => set({ viewingVersionId: null }),

  setCurrentRecipeId: (id) => set({ currentRecipeId: id, viewingVersionId: null }),
}));
