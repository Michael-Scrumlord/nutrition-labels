// tests/hooks/useLabelSave.test.ts
//
// Unit tests for useLabelSave — the save/version workflow extracted from
// LabelColumn. Covers the canSave/isLoaded/versionCount/lastSavedRel
// derivations and the handleSaveVersion/handleSaveAsNew flows, including the
// zero-ingredient edge case (canSave must gate both save paths).

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
  instructions: [],
  variables: [],
  servingHousehold: "",
  addedSugarsG: 0,
  transFatG: 0,
  currentRecipeId: null as string | null,
  viewingVersionId: null as string | null,
};

function addButter() {
  useRecipeStore.getState().addIngredient({
    fdc_id: 1, name: "Butter", amount: 100, unit: "g", baseMacros: BUTTER_MACROS,
  });
}

beforeEach(() => {
  useRecipeStore.setState(RECIPE_DEFAULTS);
  useSavedRecipesStore.setState({ recipes: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── canSave ──────────────────────────────────────────────────────────────────

describe("canSave", () => {
  it("is false for an empty recipe (zero ingredients)", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(false);
  });

  it("is true once at least one ingredient is added", () => {
    addButter();
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(true);
  });
});

// ── isLoaded / versionCount / lastSavedRel ──────────────────────────────────

describe("isLoaded / versionCount / lastSavedRel", () => {
  it("is not loaded and has no version info for a brand-new recipe", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.versionCount).toBe(0);
    expect(result.current.lastSavedRel).toBeNull();
    expect(result.current.savedRecipeName).toBeUndefined();
  });

  it("reports isLoaded + versionCount + a relative save time once a recipe is saved", () => {
    addButter();
    const { result } = renderHook(() => useLabelSave());

    act(() => {
      result.current.handleSaveVersion();
    });

    expect(result.current.isLoaded).toBe(true);
    expect(result.current.versionCount).toBe(1);
    expect(result.current.lastSavedRel).toBe("just now");
  });

  it("is not loaded if currentRecipeId points at a recipe that no longer exists", () => {
    useRecipeStore.setState({ currentRecipeId: "ghost-id" });
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.isLoaded).toBe(false);
    expect(result.current.versionCount).toBe(0);
  });
});

// ── handleSaveVersion ────────────────────────────────────────────────────────

describe("handleSaveVersion", () => {
  it("does nothing when the recipe has no ingredients (canSave=false)", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      result.current.handleSaveVersion();
    });
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
    expect(useRecipeStore.getState().currentRecipeId).toBeNull();
    expect(result.current.feedback).toBeNull();
  });

  it("creates a new saved recipe and sets currentRecipeId on first save", () => {
    addButter();
    useRecipeStore.getState().setLabelName("Cookies");
    const { result } = renderHook(() => useLabelSave());

    act(() => {
      result.current.handleSaveVersion();
    });

    const recipes = useSavedRecipesStore.getState().recipes;
    expect(recipes).toHaveLength(1);
    expect(recipes[0].versions).toHaveLength(1);
    expect(useRecipeStore.getState().currentRecipeId).toBe(recipes[0].id);
    expect(result.current.feedback).toBe("SAVED ✓");
  });

  it("appends a new version to the existing recipe on subsequent saves, instead of creating another", () => {
    addButter();
    const { result, rerender } = renderHook(() => useLabelSave());

    act(() => {
      result.current.handleSaveVersion();
    });
    rerender();
    act(() => {
      result.current.handleSaveVersion("second pass");
    });

    const recipes = useSavedRecipesStore.getState().recipes;
    expect(recipes).toHaveLength(1);
    expect(recipes[0].versions).toHaveLength(2);
    expect(recipes[0].versions[1].note).toBe("second pass");
  });

  it("clears the feedback message after the flash timeout", () => {
    vi.useFakeTimers();
    addButter();
    const { result, rerender } = renderHook(() => useLabelSave());

    act(() => {
      result.current.handleSaveVersion();
    });
    rerender();
    expect(result.current.feedback).toBe("SAVED ✓");

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    rerender();
    expect(result.current.feedback).toBeNull();
  });
});

// ── handleSaveAsNew ──────────────────────────────────────────────────────────

describe("handleSaveAsNew", () => {
  it("does nothing when the recipe has no ingredients (canSave=false)", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      result.current.handleSaveAsNew();
    });
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });

  it("creates a brand-new recipe even when a recipe is already loaded", () => {
    addButter();
    const { result, rerender } = renderHook(() => useLabelSave());

    act(() => {
      result.current.handleSaveVersion(); // creates recipe #1, loads it
    });
    rerender();
    const firstId = useRecipeStore.getState().currentRecipeId;

    act(() => {
      result.current.handleSaveAsNew();
    });

    const recipes = useSavedRecipesStore.getState().recipes;
    expect(recipes).toHaveLength(2); // original untouched + a new one
    expect(useRecipeStore.getState().currentRecipeId).not.toBe(firstId);
    expect(result.current.feedback).toBe("SAVED AS NEW ✓");
  });
});
