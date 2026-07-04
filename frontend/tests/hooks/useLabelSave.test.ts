// tests/hooks/useLabelSave.test.ts
//
// Unit tests for useLabelSave — the save/version workflow extracted from
// LabelColumn. Covers canSave/isLoaded derivation, the create-vs-append
// branch in handleSaveVersion, handleSaveAsNew's always-create behavior,
// and the transient feedback flash.
//
// Each test resets both recipeStore and savedRecipesStore state to avoid
// cross-test bleed (same pattern as recipeStore.test.ts / savedRecipesStore.test.ts).

import { describe, it, expect, beforeEach, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabelSave } from "../../src/hooks/useLabelSave";
import { useRecipeStore } from "../../src/store/recipeStore";
import { useSavedRecipesStore } from "../../src/store/savedRecipesStore";
import type { IngredientItem, MacroProfile } from "../../src/types";

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

const RECIPE_DEFAULTS = {
  ingredients: [] as IngredientItem[],
  portionDivisor: 8,
  labelName: "",
  dimensions: { widthInches: 2.75, heightInches: null },
  highlightedNutrients: new Set<keyof MacroProfile>(),
  instructions: [],
  variables: [],
  servingHousehold: "",
  addedSugarsG: 0,
  transFatG: 0,
  currentRecipeId: null,
  viewingVersionId: null,
};

function oneIngredient(): IngredientItem[] {
  return [{
    instanceId: "row-1", fdc_id: 1, name: "Butter", amount: 100, unit: "g",
    baseMacros: BUTTER_MACROS,
  }];
}

beforeEach(() => {
  useRecipeStore.setState(RECIPE_DEFAULTS);
  useSavedRecipesStore.setState({ recipes: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── canSave / isLoaded derivation ──────────────────────────────────────────

describe("useLabelSave — derived flags", () => {
  it("canSave is false when the recipe has no ingredients", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(false);
  });

  it("canSave is true once the recipe has at least one ingredient", () => {
    useRecipeStore.setState({ ingredients: oneIngredient() });
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(true);
  });

  it("isLoaded is false when there is no currentRecipeId", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.isLoaded).toBe(false);
  });

  it("versionCount is 0 and lastSavedRel is null before any save", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.versionCount).toBe(0);
    expect(result.current.lastSavedRel).toBeNull();
  });

  it("isLoaded is false when currentRecipeId points at a recipe that no longer exists", () => {
    useRecipeStore.setState({ currentRecipeId: "ghost-id" });
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.isLoaded).toBe(false);
  });
});

// ── handleSaveVersion — create branch (not yet loaded) ────────────────────

describe("useLabelSave — handleSaveVersion (unloaded recipe)", () => {
  it("does nothing when canSave is false (no ingredients)", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });

  it("creates a new saved recipe on first save", () => {
    useRecipeStore.setState({ ingredients: oneIngredient(), labelName: "Cookies" });
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].name).toBe("Cookies");
  });

  it("sets currentRecipeId on the recipe store after creating", () => {
    useRecipeStore.setState({ ingredients: oneIngredient(), labelName: "Cookies" });
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());

    const newId = useSavedRecipesStore.getState().recipes[0].id;
    expect(useRecipeStore.getState().currentRecipeId).toBe(newId);
  });

  it("shows 'SAVED ✓' feedback immediately after saving", () => {
    useRecipeStore.setState({ ingredients: oneIngredient() });
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());

    expect(result.current.feedback).toBe("SAVED ✓");
  });

  it("clears the feedback message after the flash timeout elapses", () => {
    vi.useFakeTimers();
    useRecipeStore.setState({ ingredients: oneIngredient() });
    const { result } = renderHook(() => useLabelSave());

    act(() => result.current.handleSaveVersion());
    expect(result.current.feedback).toBe("SAVED ✓");

    act(() => vi.advanceTimersByTime(1500));
    expect(result.current.feedback).toBeNull();
  });
});

// ── handleSaveVersion — append branch (already loaded) ────────────────────

describe("useLabelSave — handleSaveVersion (loaded recipe)", () => {
  it("appends a version to the existing recipe instead of creating a new one", () => {
    useRecipeStore.setState({ ingredients: oneIngredient(), labelName: "Cake" });
    const { result, rerender } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion()); // creates recipe #1
    rerender();

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.versionCount).toBe(1);

    act(() => result.current.handleSaveVersion()); // should append, not create
    rerender();

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].versions).toHaveLength(2);
    expect(result.current.versionCount).toBe(2);
  });

  it("does not touch the store at all when canSave is false, even if loaded", () => {
    useRecipeStore.setState({ ingredients: oneIngredient() });
    const { result, rerender } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    rerender();

    // Now clear ingredients so canSave flips false, but stay "loaded"
    act(() => useRecipeStore.setState({ ingredients: [] }));
    rerender();
    expect(result.current.canSave).toBe(false);

    act(() => result.current.handleSaveVersion());
    expect(useSavedRecipesStore.getState().recipes[0].versions).toHaveLength(1);
  });
});

// ── handleSaveAsNew ─────────────────────────────────────────────────────────

describe("useLabelSave — handleSaveAsNew", () => {
  it("creates a brand-new recipe even when a recipe is already loaded", () => {
    useRecipeStore.setState({ ingredients: oneIngredient(), labelName: "Original" });
    const { result, rerender } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion()); // load recipe #1
    rerender();
    const firstId = useRecipeStore.getState().currentRecipeId;

    act(() => result.current.handleSaveAsNew());
    rerender();

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(2);
    expect(useRecipeStore.getState().currentRecipeId).not.toBe(firstId);
  });

  it("shows 'SAVED AS NEW ✓' feedback", () => {
    useRecipeStore.setState({ ingredients: oneIngredient() });
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveAsNew());
    expect(result.current.feedback).toBe("SAVED AS NEW ✓");
  });

  it("does nothing when canSave is false", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveAsNew());
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });
});

// ── lastSavedRel / savedRecipeName ──────────────────────────────────────────

describe("useLabelSave — lastSavedRel / savedRecipeName", () => {
  it("reports 'just now' immediately after a save", () => {
    useRecipeStore.setState({ ingredients: oneIngredient(), labelName: "Fresh Bread" });
    const { result, rerender } = renderHook(() => useLabelSave());
    act(() => result.current.handleSaveVersion());
    rerender();

    expect(result.current.lastSavedRel).toBe("just now");
    expect(result.current.savedRecipeName).toBe("Fresh Bread");
  });
});
