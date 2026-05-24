// tests/store/recipeStore.test.ts
//
// Unit tests for the Zustand recipe store (recipeStore.ts).
// Each test resets store state via setState to avoid cross-test bleed.

import { describe, it, expect, beforeEach } from "vitest";
import { useRecipeStore } from "../../src/store/recipeStore";
import type { IngredientItem, MacroProfile, SavedRecipe } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

function makeIngredient(fdc_id: number, name: string, amount = 100, unit: "g" | "oz" | "lb" | "kg" | "ml" = "g", macros = BUTTER_MACROS): Omit<IngredientItem, "instanceId"> {
  return { fdc_id, name, amount, unit, baseMacros: macros };
}

// Add an ingredient and return its assigned instanceId — most tests need
// a handle to the row just added so they can target store actions at it.
function addAndGetId(ing: Omit<IngredientItem, "instanceId">): string {
  useRecipeStore.getState().addIngredient(ing);
  const list = useRecipeStore.getState().ingredients;
  return list[list.length - 1].instanceId;
}

const STORE_DEFAULTS = {
  ingredients: [],
  portionDivisor: 8,
  labelName: "",
  highlightedNutrients: new Set<keyof MacroProfile>(),
  instructions: [],
  variables: [],
  currentRecipeId: null,
  viewingVersionId: null,
  dimensions: { widthInches: 2.75, heightInches: null },
};

beforeEach(() => {
  useRecipeStore.setState(STORE_DEFAULTS);
});

// ── Ingredient actions ─────────────────────────────────────────────────────

describe("addIngredient", () => {
  it("appends an ingredient to an empty list", () => {
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    expect(useRecipeStore.getState().ingredients).toHaveLength(1);
    expect(useRecipeStore.getState().ingredients[0].name).toBe("Butter");
  });

  it("appends multiple ingredients in order", () => {
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    useRecipeStore.getState().addIngredient(makeIngredient(2, "Flour"));
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Butter", "Flour"]);
  });

  it("allows multiple ingredients with the same fdc_id", () => {
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    expect(useRecipeStore.getState().ingredients).toHaveLength(2);
  });

  it("assigns a distinct instanceId to each added ingredient", () => {
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    useRecipeStore.getState().addIngredient(makeIngredient(1, "Butter"));
    const [a, b] = useRecipeStore.getState().ingredients;
    expect(a.instanceId).toBeTruthy();
    expect(b.instanceId).toBeTruthy();
    expect(a.instanceId).not.toBe(b.instanceId);
  });
});

describe("removeIngredient", () => {
  it("removes only the targeted ingredient by instanceId", () => {
    const butterId = addAndGetId(makeIngredient(1, "Butter"));
    addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().removeIngredient(butterId);
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Flour"]);
  });

  it("does not remove same-fdc_id siblings — instanceId scopes the removal", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    const secondId = addAndGetId(makeIngredient(1, "Butter 2"));
    useRecipeStore.getState().removeIngredient(secondId);
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Butter"]);
  });

  it("is a no-op for an instanceId not in the list", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    useRecipeStore.getState().removeIngredient("nope");
    expect(useRecipeStore.getState().ingredients).toHaveLength(1);
  });
});

describe("updateIngredientName", () => {
  it("changes the name of the matching ingredient", () => {
    const id = addAndGetId(makeIngredient(1, "Butter"));
    useRecipeStore.getState().updateIngredientName(id, "Unsalted Butter");
    expect(useRecipeStore.getState().ingredients[0].name).toBe("Unsalted Butter");
  });

  it("does not mutate other ingredients", () => {
    const butterId = addAndGetId(makeIngredient(1, "Butter"));
    addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().updateIngredientName(butterId, "New Butter");
    expect(useRecipeStore.getState().ingredients[1].name).toBe("Flour");
  });

  it("does not bleed across rows sharing the same fdc_id", () => {
    const firstId  = addAndGetId(makeIngredient(1, "Butter"));
    const secondId = addAndGetId(makeIngredient(1, "Butter"));
    useRecipeStore.getState().updateIngredientName(secondId, "Brown Butter");
    const [a, b] = useRecipeStore.getState().ingredients;
    expect(a.instanceId).toBe(firstId);
    expect(a.name).toBe("Butter");
    expect(b.name).toBe("Brown Butter");
  });
});

describe("updateIngredientAmount", () => {
  it("updates the amount of the matching ingredient", () => {
    const id = addAndGetId(makeIngredient(1, "Butter", 100));
    useRecipeStore.getState().updateIngredientAmount(id, 250);
    expect(useRecipeStore.getState().ingredients[0].amount).toBe(250);
  });
});

describe("updateIngredientUnit", () => {
  it("updates the unit of the matching ingredient", () => {
    const id = addAndGetId(makeIngredient(1, "Butter", 100, "g"));
    useRecipeStore.getState().updateIngredientUnit(id, "oz");
    expect(useRecipeStore.getState().ingredients[0].unit).toBe("oz");
  });
});

describe("moveIngredient", () => {
  it("moves an ingredient down (direction=1) by swapping with the next", () => {
    const butterId = addAndGetId(makeIngredient(1, "Butter"));
    addAndGetId(makeIngredient(2, "Flour"));
    addAndGetId(makeIngredient(3, "Sugar"));
    useRecipeStore.getState().moveIngredient(butterId, 1);  // Butter at idx 0 → idx 1
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Flour", "Butter", "Sugar"]);
  });

  it("moves an ingredient up (direction=-1) by swapping with the previous", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    const flourId = addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().moveIngredient(flourId, -1);  // Flour at idx 1 → idx 0
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Flour", "Butter"]);
  });

  it("does not move the first ingredient further up (boundary guard)", () => {
    const butterId = addAndGetId(makeIngredient(1, "Butter"));
    addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().moveIngredient(butterId, -1);  // Butter already at top
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Butter", "Flour"]);
  });

  it("does not move the last ingredient further down (boundary guard)", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    const flourId = addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().moveIngredient(flourId, 1);   // Flour already at bottom
    const names = useRecipeStore.getState().ingredients.map((i) => i.name);
    expect(names).toEqual(["Butter", "Flour"]);
  });

  it("is a no-op for an unknown instanceId", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    useRecipeStore.getState().moveIngredient("nope", 1);
    expect(useRecipeStore.getState().ingredients).toHaveLength(1);
  });

  it("moves only the targeted row when two share the same fdc_id", () => {
    const firstId  = addAndGetId(makeIngredient(1, "Butter"));
    const secondId = addAndGetId(makeIngredient(1, "Butter"));
    addAndGetId(makeIngredient(2, "Flour"));
    useRecipeStore.getState().moveIngredient(secondId, 1);   // second Butter at idx 1 → idx 2
    const order = useRecipeStore.getState().ingredients.map((i) => i.instanceId);
    expect(order[0]).toBe(firstId);
    expect(order[2]).toBe(secondId);
  });
});

// ── Recipe meta actions ───────────────────────────────────────────────────

describe("setPortionDivisor", () => {
  it("updates the portion divisor", () => {
    useRecipeStore.getState().setPortionDivisor(12);
    expect(useRecipeStore.getState().portionDivisor).toBe(12);
  });
});

describe("setLabelName", () => {
  it("updates the label name", () => {
    useRecipeStore.getState().setLabelName("Chocolate Cake");
    expect(useRecipeStore.getState().labelName).toBe("Chocolate Cake");
  });

  it("allows empty string", () => {
    useRecipeStore.getState().setLabelName("Existing Name");
    useRecipeStore.getState().setLabelName("");
    expect(useRecipeStore.getState().labelName).toBe("");
  });
});

describe("setDimensions", () => {
  it("merges partial dimension updates (width only)", () => {
    useRecipeStore.getState().setDimensions({ widthInches: 3.5 });
    const dims = useRecipeStore.getState().dimensions;
    expect(dims.widthInches).toBe(3.5);
    expect(dims.heightInches).toBeNull(); // unchanged default
  });

  it("sets heightInches when specified", () => {
    useRecipeStore.getState().setDimensions({ heightInches: 6.0 });
    expect(useRecipeStore.getState().dimensions.heightInches).toBe(6.0);
  });
});

// ── clearRecipe ───────────────────────────────────────────────────────────

describe("clearRecipe", () => {
  it("resets ingredients to empty", () => {
    addAndGetId(makeIngredient(1, "Butter"));
    useRecipeStore.getState().clearRecipe();
    expect(useRecipeStore.getState().ingredients).toHaveLength(0);
  });

  it("resets portionDivisor to 8", () => {
    useRecipeStore.getState().setPortionDivisor(20);
    useRecipeStore.getState().clearRecipe();
    expect(useRecipeStore.getState().portionDivisor).toBe(8);
  });

  it("resets labelName to empty string", () => {
    useRecipeStore.getState().setLabelName("Some Recipe");
    useRecipeStore.getState().clearRecipe();
    expect(useRecipeStore.getState().labelName).toBe("");
  });

  it("clears instructions and variables", () => {
    useRecipeStore.getState().addStep();
    useRecipeStore.getState().clearRecipe();
    expect(useRecipeStore.getState().instructions).toHaveLength(0);
    expect(useRecipeStore.getState().variables).toHaveLength(0);
  });

  it("resets currentRecipeId to null", () => {
    useRecipeStore.getState().setCurrentRecipeId("abc-123");
    useRecipeStore.getState().clearRecipe();
    expect(useRecipeStore.getState().currentRecipeId).toBeNull();
  });
});

// ── Step actions ──────────────────────────────────────────────────────────

describe("addStep", () => {
  it("appends a step with no afterId", () => {
    const id = useRecipeStore.getState().addStep();
    const steps = useRecipeStore.getState().instructions;
    expect(steps).toHaveLength(1);
    expect(steps[0].id).toBe(id);
    expect(steps[0].text).toBe("");
  });

  it("inserts a step after the specified step", () => {
    const firstId = useRecipeStore.getState().addStep();
    const secondId = useRecipeStore.getState().addStep();
    const thirdId  = useRecipeStore.getState().addStep(firstId); // after firstId
    const ids = useRecipeStore.getState().instructions.map((s) => s.id);
    expect(ids).toEqual([firstId, thirdId, secondId]);
  });

  it("appends when afterId is not found", () => {
    const firstId  = useRecipeStore.getState().addStep();
    const secondId = useRecipeStore.getState().addStep("non-existent-id");
    const ids = useRecipeStore.getState().instructions.map((s) => s.id);
    expect(ids).toEqual([firstId, secondId]);
  });

  it("returns a unique id each call", () => {
    const id1 = useRecipeStore.getState().addStep();
    const id2 = useRecipeStore.getState().addStep();
    expect(id1).not.toBe(id2);
  });
});

describe("updateStepText", () => {
  it("updates the text of the matching step", () => {
    const id = useRecipeStore.getState().addStep();
    useRecipeStore.getState().updateStepText(id, "Preheat oven to 350°F");
    expect(useRecipeStore.getState().instructions[0].text).toBe("Preheat oven to 350°F");
  });
});

describe("removeStep", () => {
  it("removes the step with the given id", () => {
    const id = useRecipeStore.getState().addStep();
    useRecipeStore.getState().addStep();
    useRecipeStore.getState().removeStep(id);
    expect(useRecipeStore.getState().instructions).toHaveLength(1);
    expect(useRecipeStore.getState().instructions[0].id).not.toBe(id);
  });
});

describe("moveStep", () => {
  it("swaps a step with the one below it (direction=1)", () => {
    const a = useRecipeStore.getState().addStep();
    const b = useRecipeStore.getState().addStep();
    useRecipeStore.getState().moveStep(a, 1);
    const ids = useRecipeStore.getState().instructions.map((s) => s.id);
    expect(ids).toEqual([b, a]);
  });

  it("does not move the last step further down", () => {
    const a = useRecipeStore.getState().addStep();
    const b = useRecipeStore.getState().addStep();
    useRecipeStore.getState().moveStep(b, 1);
    const ids = useRecipeStore.getState().instructions.map((s) => s.id);
    expect(ids).toEqual([a, b]);
  });
});

// ── Variable actions ──────────────────────────────────────────────────────

describe("addVariable", () => {
  it("appends a variable", () => {
    const v = { name: "servings", label: "Servings", value: 8, suffix: "", min: 1, max: 50, step: 1 };
    useRecipeStore.getState().addVariable(v);
    expect(useRecipeStore.getState().variables).toHaveLength(1);
    expect(useRecipeStore.getState().variables[0].name).toBe("servings");
  });

  it("ignores a variable with a duplicate name", () => {
    const v = { name: "servings", label: "Servings", value: 8, suffix: "", min: 1, max: 50, step: 1 };
    useRecipeStore.getState().addVariable(v);
    useRecipeStore.getState().addVariable({ ...v, value: 12 });
    expect(useRecipeStore.getState().variables).toHaveLength(1);
    expect(useRecipeStore.getState().variables[0].value).toBe(8);
  });
});

describe("setVariableValue", () => {
  it("updates the value of the named variable", () => {
    const v = { name: "servings", label: "Servings", value: 8, suffix: "", min: 1, max: 50, step: 1 };
    useRecipeStore.getState().addVariable(v);
    useRecipeStore.getState().setVariableValue("servings", 16);
    expect(useRecipeStore.getState().variables[0].value).toBe(16);
  });

  it("is a no-op for an unknown variable name", () => {
    const v = { name: "servings", label: "Servings", value: 8, suffix: "", min: 1, max: 50, step: 1 };
    useRecipeStore.getState().addVariable(v);
    useRecipeStore.getState().setVariableValue("unknown", 99);
    expect(useRecipeStore.getState().variables[0].value).toBe(8);
  });
});

describe("removeVariable", () => {
  it("removes the variable with the given name", () => {
    const v = { name: "servings", label: "Servings", value: 8, suffix: "", min: 1, max: 50, step: 1 };
    useRecipeStore.getState().addVariable(v);
    useRecipeStore.getState().removeVariable("servings");
    expect(useRecipeStore.getState().variables).toHaveLength(0);
  });
});

// ── Recipe lifecycle ──────────────────────────────────────────────────────

describe("loadRecipe", () => {
  it("loads the latest version of a saved recipe", () => {
    const recipe: SavedRecipe = {
      id: "recipe-1",
      name: "Cookie Dough",
      createdAt: Date.now(),
      versions: [
        {
          id: "v1",
          savedAt: Date.now(),
          note: "",
          labelName: "Cookie Dough v1",
          portionDivisor: 8,
          dimensions: { widthInches: 2.75, heightInches: null },
          // Legacy version saved before per-row instanceId existed — loadRecipe
          // should back-fill it on read.
          ingredients: [makeIngredient(1, "Butter") as IngredientItem],
          instructions: [],
          variables: [],
        },
      ],
    };

    useRecipeStore.getState().loadRecipe(recipe);
    const state = useRecipeStore.getState();
    expect(state.labelName).toBe("Cookie Dough v1");
    expect(state.ingredients).toHaveLength(1);
    expect(state.ingredients[0].instanceId).toBeTruthy();
    expect(state.currentRecipeId).toBe("recipe-1");
    expect(state.viewingVersionId).toBeNull();
  });

  it("is a no-op when the recipe has no versions", () => {
    const recipe: SavedRecipe = {
      id: "empty",
      name: "Empty",
      createdAt: Date.now(),
      versions: [],
    };
    useRecipeStore.getState().setLabelName("Existing");
    useRecipeStore.getState().loadRecipe(recipe);
    // Should not have changed anything
    expect(useRecipeStore.getState().labelName).toBe("Existing");
  });
});

describe("exitVersionView", () => {
  it("clears viewingVersionId without resetting other state", () => {
    useRecipeStore.setState({ viewingVersionId: "v1", portionDivisor: 12 });
    useRecipeStore.getState().exitVersionView();
    expect(useRecipeStore.getState().viewingVersionId).toBeNull();
    expect(useRecipeStore.getState().portionDivisor).toBe(12); // unchanged
  });
});

describe("setCurrentRecipeId", () => {
  it("sets currentRecipeId and clears viewingVersionId", () => {
    useRecipeStore.setState({ viewingVersionId: "v2" });
    useRecipeStore.getState().setCurrentRecipeId("recipe-99");
    expect(useRecipeStore.getState().currentRecipeId).toBe("recipe-99");
    expect(useRecipeStore.getState().viewingVersionId).toBeNull();
  });
});
