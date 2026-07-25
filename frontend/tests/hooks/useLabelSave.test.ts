// tests/hooks/useLabelSave.test.ts
//
// Unit tests for useLabelSave — the save/version workflow extracted out of
// LabelColumn. No test previously existed for this hook even though it owns
// the branching between "append a version to the loaded recipe" and
// "create a brand-new recipe", plus the save-feedback flash and relative-time
// label shown next to "last saved".
//
// The hook reads/writes the real recipeStore + savedRecipesStore (both
// Zustand stores), so tests drive it by resetting store state directly,
// exactly like tests/store/recipeStore.test.ts and
// tests/store/savedRecipesStore.test.ts do.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabelSave } from "../../src/hooks/useLabelSave";
import { useRecipeStore } from "../../src/store/recipeStore";
import { useSavedRecipesStore } from "../../src/store/savedRecipesStore";
import type { MacroProfile } from "../../src/types";

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

const RECIPE_DEFAULTS = {
  ingredients: [],
  portionDivisor: 8,
  labelName: "",
  dimensions: { widthInches: 2.75, heightInches: null },
  instructions: [],
  variables: [],
  servingHousehold: "",
  addedSugarsG: 0,
  transFatG: 0,
  currentRecipeId: null,
  viewingVersionId: null,
  highlightedNutrients: new Set<keyof MacroProfile>(),
};

function addOneIngredient() {
  useRecipeStore.getState().addIngredient({
    fdc_id: 1, name: "Butter", amount: 100, unit: "g", baseMacros: ZERO_MACROS,
  });
}

beforeEach(() => {
  useRecipeStore.setState(RECIPE_DEFAULTS);
  useSavedRecipesStore.setState({ recipes: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── canSave gate — zero-ingredient recipes ─────────────────────────────────

describe("useLabelSave — canSave", () => {
  it("canSave is false for an empty recipe", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(false);
  });

  it("handleSaveVersion is a no-op when canSave is false", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
    expect(result.current.feedback).toBeNull();
  });

  it("handleSaveAsNew is a no-op when canSave is false", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveAsNew());
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });

  it("canSave becomes true once an ingredient is added", () => {
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(true);
  });
});

// ── handleSaveVersion — create vs. append branching ────────────────────────

describe("useLabelSave — handleSaveVersion", () => {
  it("creates a new recipe and adopts its id when nothing is loaded yet", () => {
    addOneIngredient();
    useRecipeStore.getState().setLabelName("Banana Bread");
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].name).toBe("Banana Bread");
    expect(useRecipeStore.getState().currentRecipeId).toBe(recipes[0].id);
  });

  it("sets feedback to 'SAVED ✓' after creating a new recipe", () => {
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    expect(result.current.feedback).toBe("SAVED ✓");
  });

  it("appends a version instead of creating a second recipe when one is already loaded", () => {
    addOneIngredient();
    const id = useSavedRecipesStore.getState().createRecipe({
      ingredients: [], portionDivisor: 8, labelName: "Existing", dimensions: { widthInches: 2.75, heightInches: null },
      instructions: [], variables: [], servingHousehold: "", addedSugarsG: 0, transFatG: 0,
    });
    useRecipeStore.setState({ currentRecipeId: id });

    const { result } = renderHook(() => useLabelSave());
    expect(result.current.isLoaded).toBe(true);

    act(() => result.current.handleSaveVersion());

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1); // still one recipe...
    expect(recipes[0].versions).toHaveLength(2); // ...with a second version
  });

  it("passes the current servingHousehold/addedSugarsG/transFatG through to the saved snapshot", () => {
    addOneIngredient();
    useRecipeStore.getState().setServingHousehold("2/3 cup");
    useRecipeStore.getState().setAddedSugarsG(6);
    useRecipeStore.getState().setTransFatG(0.5);

    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());

    const version = useSavedRecipesStore.getState().recipes[0].versions[0];
    expect(version.servingHousehold).toBe("2/3 cup");
    expect(version.addedSugarsG).toBe(6);
    expect(version.transFatG).toBe(0.5);
  });
});

// ── handleSaveAsNew — always forks, even when a recipe is loaded ──────────

describe("useLabelSave — handleSaveAsNew", () => {
  it("creates a second recipe even when one is already loaded", () => {
    addOneIngredient();
    const id = useSavedRecipesStore.getState().createRecipe({
      ingredients: [], portionDivisor: 8, labelName: "Original", dimensions: { widthInches: 2.75, heightInches: null },
      instructions: [], variables: [], servingHousehold: "", addedSugarsG: 0, transFatG: 0,
    });
    useRecipeStore.setState({ currentRecipeId: id });

    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveAsNew());

    expect(useSavedRecipesStore.getState().recipes).toHaveLength(2);
    expect(useRecipeStore.getState().currentRecipeId).not.toBe(id);
  });

  it("sets feedback to 'SAVED AS NEW ✓'", () => {
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveAsNew());
    expect(result.current.feedback).toBe("SAVED AS NEW ✓");
  });
});

// ── derived state: versionCount / lastSavedRel ─────────────────────────────

describe("useLabelSave — versionCount and lastSavedRel", () => {
  it("versionCount is 0 when nothing is loaded", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.versionCount).toBe(0);
    expect(result.current.lastSavedRel).toBeNull();
  });

  it("lastSavedRel reads 'just now' immediately after saving", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    expect(result.current.lastSavedRel).toBe("just now");
  });

  it("lastSavedRel reads 'N min ago' once minutes have elapsed", () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2026-01-01T12:00:00Z"));
    const id = useSavedRecipesStore.getState().createRecipe({
      ingredients: [], portionDivisor: 8, labelName: "Cookies", dimensions: { widthInches: 2.75, heightInches: null },
      instructions: [], variables: [], servingHousehold: "", addedSugarsG: 0, transFatG: 0,
    });
    useRecipeStore.setState({ currentRecipeId: id });

    vi.setSystemTime(new Date("2026-01-01T12:05:00Z")); // +5 min
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.lastSavedRel).toBe("5 min ago");
  });

  it("versionCount tracks the number of saved versions", () => {
    const id = useSavedRecipesStore.getState().createRecipe({
      ingredients: [], portionDivisor: 8, labelName: "Cookies", dimensions: { widthInches: 2.75, heightInches: null },
      instructions: [], variables: [], servingHousehold: "", addedSugarsG: 0, transFatG: 0,
    });
    useSavedRecipesStore.getState().appendVersion(id, {
      ingredients: [], portionDivisor: 8, labelName: "Cookies v2", dimensions: { widthInches: 2.75, heightInches: null },
      instructions: [], variables: [], servingHousehold: "", addedSugarsG: 0, transFatG: 0,
    });
    useRecipeStore.setState({ currentRecipeId: id });

    const { result } = renderHook(() => useLabelSave());
    expect(result.current.versionCount).toBe(2);
  });
});

// ── feedback auto-clear ─────────────────────────────────────────────────────

describe("useLabelSave — feedback flash", () => {
  it("clears feedback back to null 1500ms after a save", () => {
    vi.useFakeTimers();
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());
    expect(result.current.feedback).toBe("SAVED ✓");

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.feedback).toBeNull();
  });

  it("does not clear feedback before the 1500ms window elapses", () => {
    vi.useFakeTimers();
    addOneIngredient();
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());
    act(() => vi.advanceTimersByTime(1000));
    expect(result.current.feedback).toBe("SAVED ✓");
  });
});
