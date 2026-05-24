import { create } from "zustand";
import type {
  IngredientItem, LabelDimensions, UnitKey, HighlightSet,
  RecipeStep, RecipeVariable, SavedRecipe, RecipeVersion,
  PortionRef,
} from "../types";
import { UNIT_CONVERSIONS, ingredientGrams } from "../utils/units";
import { makeId } from "../utils/id";

// ── Pure helpers ─────────────────────────────────────────────────────────────

// Back-fill instanceId for ingredients loaded from older persisted recipes
// (saved before per-row identity existed). Without this, two same-fdc_id rows
// in a legacy recipe would share a key and edits would batch across them.
function withInstanceIds(ingredients: IngredientItem[]): IngredientItem[] {
  return ingredients.map((i) => i.instanceId ? i : { ...i, instanceId: makeId() });
}

/** Swap the element at `idx` with `idx + direction`. Returns a new array, or
 *  the original if the swap would go out of bounds. */
function swapItem<T>(arr: T[], idx: number, direction: -1 | 1): T[] {
  const to = idx + direction;
  if (to < 0 || to >= arr.length) return arr;
  const next = [...arr];
  [next[idx], next[to]] = [next[to], next[idx]];
  return next;
}

/** Produce a fresh slice of state from a recipe version, shared by loadRecipe
 *  and loadVersion to keep both in sync with a single source of truth. */
function stateFromVersion(
  recipe: SavedRecipe,
  version: RecipeVersion,
  viewingVersionId: string | null,
) {
  return {
    ingredients:          withInstanceIds(version.ingredients),
    portionDivisor:       version.portionDivisor,
    labelName:            version.labelName,
    dimensions:           version.dimensions,
    instructions:         version.instructions ?? [],
    variables:            version.variables ?? [],
    highlightedNutrients: new Set() as HighlightSet,
    currentRecipeId:      recipe.id,
    viewingVersionId,
  };
}

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
  // All actions key off `instanceId`, not `fdc_id`, so duplicate foods
  // (e.g. agave added twice at different stages of a recipe) are independently
  // editable, movable, and removable. `addIngredient` accepts an item without
  // an instanceId and assigns one — callers should never set it themselves.
  addIngredient:           (ingredient: Omit<IngredientItem, "instanceId">) => void;
  removeIngredient:        (instanceId: string) => void;
  updateIngredientName:    (instanceId: string, name: string) => void;
  updateIngredientAmount:  (instanceId: string, amount: number) => void;
  updateIngredientUnit:    (instanceId: string, unit: UnitKey) => void;
  // Switch the row to a food-specific portion ("1 tbsp"). Passing `null`
  // clears any active portionRef and falls back to the row's `unit`.
  updateIngredientPortion: (instanceId: string, portion: PortionRef | null) => void;
  moveIngredient:          (instanceId: string, direction: -1 | 1) => void;

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

/** Factory so clearRecipe always gets fresh array/Set/object references. */
function makeDefaultState() {
  return {
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
}

export const useRecipeStore = create<RecipeState>((set) => ({
  ...makeDefaultState(),

  // ── Ingredient actions ────────────────────────────────────────────────
  addIngredient: (ingredient) =>
    set((state) => ({
      ingredients: [...state.ingredients, { ...ingredient, instanceId: makeId() }],
    })),

  removeIngredient: (instanceId) =>
    set((state) => ({ ingredients: state.ingredients.filter((i) => i.instanceId !== instanceId) })),

  updateIngredientName: (instanceId, name) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => i.instanceId === instanceId ? { ...i, name } : i),
    })),

  updateIngredientAmount: (instanceId, amount) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => i.instanceId === instanceId ? { ...i, amount } : i),
    })),

  // Changing the unit on an existing ingredient re-expresses the amount in
  // the new unit so the physical gram weight stays constant. e.g. 100 g of
  // butter, switched to oz, becomes 3.53 oz — not 100 oz. If the row was on
  // a portion ("1 tbsp"), that portion is cleared. Displayed amount rounds
  // to 2 decimals to match the row UI's precision.
  updateIngredientUnit: (instanceId, unit) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => {
        if (i.instanceId !== instanceId) return i;
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
  updateIngredientPortion: (instanceId, portion) =>
    set((state) => ({
      ingredients: state.ingredients.map((i) => {
        if (i.instanceId !== instanceId) return i;
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

  moveIngredient: (instanceId, direction) =>
    set((state) => {
      const idx = state.ingredients.findIndex((i) => i.instanceId === instanceId);
      if (idx === -1) return state;
      return { ingredients: swapItem(state.ingredients, idx, direction) };
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
      return { instructions: swapItem(state.instructions, idx, direction) };
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
  clearRecipe: () => set(makeDefaultState()),

  loadRecipe: (recipe) => {
    const latest = recipe.versions[recipe.versions.length - 1];
    if (!latest) return;
    set(stateFromVersion(recipe, latest, null));
  },

  loadVersion: (recipe, version) => set(stateFromVersion(recipe, version, version.id)),

  exitVersionView: () => set({ viewingVersionId: null }),

  setCurrentRecipeId: (id) => set({ currentRecipeId: id, viewingVersionId: null }),
}));
