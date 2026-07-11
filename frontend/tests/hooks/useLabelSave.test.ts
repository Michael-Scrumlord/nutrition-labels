// tests/hooks/useLabelSave.test.ts
//
// Unit tests for the useLabelSave hook — the save/version workflow for the
// label column (snapshot construction, save handlers, transient feedback).
// Resets recipeStore and savedRecipesStore via setState before each test,
// following the same pattern as tests/store/recipeStore.test.ts and
// tests/store/savedRecipesStore.test.ts.

import { describe, it, expect, beforeEach, afterEach, vi } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useLabelSave } from "../../src/hooks/useLabelSave";
import { useRecipeStore } from "../../src/store/recipeStore";
import { useSavedRecipesStore } from "../../src/store/savedRecipesStore";
import type { IngredientItem, MacroProfile } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

function makeIngredient(instanceId = "ing-1"): IngredientItem {
  return {
    instanceId, fdc_id: 1097512, name: "Butter", amount: 100, unit: "g",
    baseMacros: BUTTER_MACROS,
  };
}

const RECIPE_STORE_DEFAULTS = {
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

beforeEach(() => {
  useRecipeStore.setState(RECIPE_STORE_DEFAULTS);
  useSavedRecipesStore.setState({ recipes: [] });
});

afterEach(() => {
  vi.useRealTimers();
});

// ── canSave ─────────────────────────────────────────────────────────────

describe("canSave", () => {
  it("is false when ingredients is empty", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(false);
  });

  it("is true once at least one ingredient is present", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()] });
    });
    expect(result.current.canSave).toBe(true);
  });
});

// ── handleSaveVersion — no-op guard ────────────────────────────────────

describe("handleSaveVersion — empty recipe guard", () => {
  it("does not create/append a recipe or set feedback when canSave is false", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.canSave).toBe(false);

    act(() => {
      result.current.handleSaveVersion();
    });

    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
    expect(result.current.feedback).toBeNull();
  });
});

// ── handleSaveVersion — brand-new recipe ───────────────────────────────

describe("handleSaveVersion — brand-new recipe", () => {
  it("creates a new recipe, sets currentRecipeId, and flashes 'SAVED ✓'", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()], labelName: "Cookies" });
    });

    act(() => {
      result.current.handleSaveVersion();
    });

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].versions).toHaveLength(1);
    expect(useRecipeStore.getState().currentRecipeId).toBe(recipes[0].id);
    expect(result.current.feedback).toBe("SAVED ✓");
  });
});

// ── handleSaveVersion — recipe already loaded ──────────────────────────

describe("handleSaveVersion — recipe already loaded", () => {
  it("calls appendVersion (not createRecipe) on a second save, and isLoaded becomes true", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()], labelName: "Cookies" });
    });

    act(() => {
      result.current.handleSaveVersion(); // first save — creates the recipe
    });
    expect(result.current.isLoaded).toBe(true);
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(1);

    act(() => {
      result.current.handleSaveVersion(); // second save — should append, not create
    });

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1); // still just one recipe
    expect(recipes[0].versions).toHaveLength(2); // but two versions now
    expect(result.current.isLoaded).toBe(true);
  });
});

// ── handleSaveAsNew ─────────────────────────────────────────────────────

describe("handleSaveAsNew", () => {
  it("always creates a fresh recipe, even when one is already loaded, and flashes 'SAVED AS NEW ✓'", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()], labelName: "Cookies" });
    });

    act(() => {
      result.current.handleSaveVersion(); // load a recipe first
    });
    const firstId = useSavedRecipesStore.getState().recipes[0].id;

    act(() => {
      result.current.handleSaveAsNew();
    });

    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(2); // a new recipe was created, not appended
    expect(useRecipeStore.getState().currentRecipeId).not.toBe(firstId);
    expect(result.current.feedback).toBe("SAVED AS NEW ✓");
  });
});

// ── versionCount ────────────────────────────────────────────────────────

describe("versionCount", () => {
  it("is 0 when nothing is loaded", () => {
    const { result } = renderHook(() => useLabelSave());
    expect(result.current.versionCount).toBe(0);
  });

  it("reflects savedRecipe.versions.length after N versions are saved", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()], labelName: "Cookies" });
    });

    act(() => { result.current.handleSaveVersion(); });
    expect(result.current.versionCount).toBe(1);

    act(() => { result.current.handleSaveVersion(); });
    expect(result.current.versionCount).toBe(2);

    act(() => { result.current.handleSaveVersion(); });
    expect(result.current.versionCount).toBe(3);
  });
});

// ── Feedback auto-clear ─────────────────────────────────────────────────

describe("feedback auto-clear", () => {
  it("is truthy immediately after saving, then clears to null after 1500ms", () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({ ingredients: [makeIngredient()] });
    });

    act(() => {
      result.current.handleSaveVersion();
    });
    expect(result.current.feedback).toBeTruthy();

    act(() => {
      vi.advanceTimersByTime(1500);
    });
    expect(result.current.feedback).toBeNull();
  });
});

// ── Extreme portion divisor carries through the snapshot ──────────────

describe("snapshot fidelity — extreme portionDivisor", () => {
  it("carries portionDivisor=999 through to the saved version's snapshot", () => {
    const { result } = renderHook(() => useLabelSave());
    act(() => {
      useRecipeStore.setState({
        ingredients: [makeIngredient()],
        portionDivisor: 999,
      });
    });

    act(() => {
      result.current.handleSaveVersion();
    });

    const { recipes } = useSavedRecipesStore.getState();
    const latestVersion = recipes[0].versions.at(-1);
    expect(latestVersion?.portionDivisor).toBe(999);
  });
});
