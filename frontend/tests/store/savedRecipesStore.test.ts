// tests/store/savedRecipesStore.test.ts
//
// Unit tests for savedRecipesStore — the persisted recipe catalog.
// Each test resets store state via setState to avoid cross-test bleed.

import { describe, it, expect, beforeEach } from "vitest";
import { useSavedRecipesStore } from "../../src/store/savedRecipesStore";
import type { RecipeSnapshot } from "../../src/store/savedRecipesStore";
import type { MacroProfile } from "../../src/types";

// ── Fixtures ───────────────────────────────────────────────────────────────

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

function makeSnapshot(labelName = "Test Recipe"): RecipeSnapshot {
  return {
    labelName,
    portionDivisor: 8,
    dimensions: { widthInches: 2.75, heightInches: null },
    ingredients: [],
    instructions: [],
    variables: [],
  };
}

beforeEach(() => {
  useSavedRecipesStore.setState({ recipes: [] });
});

// ── createRecipe ───────────────────────────────────────────────────────────

describe("createRecipe", () => {
  it("adds a recipe with the labelName as the catalog name", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Banana Bread"));
    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].name).toBe("Banana Bread");
  });

  it("falls back to 'Untitled Recipe' when labelName is empty", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot(""));
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("Untitled Recipe");
  });

  it("falls back to 'Untitled Recipe' when labelName is only whitespace", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("   "));
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("Untitled Recipe");
  });

  it("creates exactly one version on the new recipe", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Cookies"));
    const { versions } = useSavedRecipesStore.getState().recipes[0];
    expect(versions).toHaveLength(1);
  });

  it("returns the id of the newly created recipe", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Cookies"));
    expect(typeof id).toBe("string");
    expect(id.length).toBeGreaterThan(0);
    expect(useSavedRecipesStore.getState().recipes[0].id).toBe(id);
  });

  it("places the newest recipe at the top of the list", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Older Recipe"));
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Newer Recipe"));
    const names = useSavedRecipesStore.getState().recipes.map((r) => r.name);
    expect(names[0]).toBe("Newer Recipe");
    expect(names[1]).toBe("Older Recipe");
  });

  it("caps the catalog at 50 recipes, dropping the oldest when over limit", () => {
    // Fill to 50
    for (let i = 0; i < 50; i++) {
      useSavedRecipesStore.getState().createRecipe(makeSnapshot(`Recipe ${i}`));
    }
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(50);

    // The 51st recipe is added; the 50th-oldest (currently at index 49) is dropped
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("The 51st"));
    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(50);
    expect(recipes[0].name).toBe("The 51st");
    // The very first recipe ever created should have been pruned
    expect(recipes.some((r) => r.name === "Recipe 0")).toBe(false);
  });
});

// ── appendVersion ─────────────────────────────────────────────────────────

describe("appendVersion", () => {
  it("adds a second version to an existing recipe", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Cake"));
    useSavedRecipesStore.getState().appendVersion(id, makeSnapshot("Cake v2"));
    const { versions } = useSavedRecipesStore.getState().recipes[0];
    expect(versions).toHaveLength(2);
  });

  it("the most recently appended version is last in the versions array", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Cake"));
    useSavedRecipesStore.getState().appendVersion(id, makeSnapshot("Cake v2"));
    const { versions } = useSavedRecipesStore.getState().recipes[0];
    expect(versions.at(-1)?.labelName).toBe("Cake v2");
  });

  it("updates the recipe name to the snapshot's labelName on append", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Old Name"));
    useSavedRecipesStore.getState().appendVersion(id, makeSnapshot("New Name"));
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("New Name");
  });

  it("keeps existing recipe name when the appended snapshot has an empty labelName", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Keep This"));
    useSavedRecipesStore.getState().appendVersion(id, makeSnapshot(""));
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("Keep This");
  });

  it("bumps the recipe to the top of the catalog after append", () => {
    const first = useSavedRecipesStore.getState().createRecipe(makeSnapshot("First"));
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Second"));
    // First is now at index 1. Appending a version should move it to index 0.
    useSavedRecipesStore.getState().appendVersion(first, makeSnapshot("First Updated"));
    expect(useSavedRecipesStore.getState().recipes[0].id).toBe(first);
  });

  it("prunes the oldest version when MAX_VERSIONS_PER (20) is exceeded", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("V1"));
    // Append 19 more → total 20 versions (the cap)
    for (let i = 2; i <= 20; i++) {
      useSavedRecipesStore.getState().appendVersion(id, makeSnapshot(`V${i}`));
    }
    expect(useSavedRecipesStore.getState().recipes[0].versions).toHaveLength(20);

    // The 21st append should drop version 1 and keep 2–21
    useSavedRecipesStore.getState().appendVersion(id, makeSnapshot("V21"));
    const { versions } = useSavedRecipesStore.getState().recipes[0];
    expect(versions).toHaveLength(20);
    expect(versions[0].labelName).toBe("V2");      // oldest kept
    expect(versions.at(-1)?.labelName).toBe("V21"); // newest
  });

  it("is a no-op for an unknown recipeId", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Real Recipe"));
    useSavedRecipesStore.getState().appendVersion("does-not-exist", makeSnapshot("Ghost"));
    // The real recipe's version count should be unchanged
    expect(useSavedRecipesStore.getState().recipes[0].versions).toHaveLength(1);
  });
});

// ── renameRecipe ──────────────────────────────────────────────────────────

describe("renameRecipe", () => {
  it("updates the recipe name", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Original"));
    useSavedRecipesStore.getState().renameRecipe(id, "Renamed");
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("Renamed");
  });

  it("does not create a new version", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Original"));
    useSavedRecipesStore.getState().renameRecipe(id, "Renamed");
    expect(useSavedRecipesStore.getState().recipes[0].versions).toHaveLength(1);
  });

  it("does not change the catalog order", () => {
    const first = useSavedRecipesStore.getState().createRecipe(makeSnapshot("First"));
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Second"));
    // 'Second' is at [0], 'First' is at [1]
    useSavedRecipesStore.getState().renameRecipe(first, "Renamed First");
    expect(useSavedRecipesStore.getState().recipes[1].name).toBe("Renamed First");
  });

  it("is a no-op for an unknown recipeId", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Real"));
    useSavedRecipesStore.getState().renameRecipe("unknown-id", "Ghost");
    expect(useSavedRecipesStore.getState().recipes[0].name).toBe("Real");
  });
});

// ── deleteRecipe ──────────────────────────────────────────────────────────

describe("deleteRecipe", () => {
  it("removes the recipe from the catalog", () => {
    const id = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Doomed"));
    useSavedRecipesStore.getState().deleteRecipe(id);
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });

  it("only removes the targeted recipe when multiple exist", () => {
    const first = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Keep Me"));
    const second = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Delete Me"));
    useSavedRecipesStore.getState().deleteRecipe(second);
    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes).toHaveLength(1);
    expect(recipes[0].id).toBe(first);
  });

  it("is a no-op for an unknown recipeId", () => {
    useSavedRecipesStore.getState().createRecipe(makeSnapshot("Safe"));
    useSavedRecipesStore.getState().deleteRecipe("not-a-real-id");
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(1);
  });
});

// ── deleteVersion ─────────────────────────────────────────────────────────

describe("deleteVersion", () => {
  it("removes the specified version from a recipe that has multiple versions", () => {
    const recipeId = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Multi"));
    useSavedRecipesStore.getState().appendVersion(recipeId, makeSnapshot("Multi v2"));
    const versionId = useSavedRecipesStore.getState().recipes[0].versions[0].id;

    useSavedRecipesStore.getState().deleteVersion(recipeId, versionId);
    const { versions } = useSavedRecipesStore.getState().recipes[0];
    expect(versions).toHaveLength(1);
    expect(versions[0].id).not.toBe(versionId);
  });

  it("deletes the entire recipe when the only remaining version is removed", () => {
    const recipeId = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Solo"));
    const versionId = useSavedRecipesStore.getState().recipes[0].versions[0].id;

    useSavedRecipesStore.getState().deleteVersion(recipeId, versionId);
    expect(useSavedRecipesStore.getState().recipes).toHaveLength(0);
  });

  it("does not affect sibling recipes when a version is deleted", () => {
    const r1 = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Sibling A"));
    const r2 = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Sibling B"));
    useSavedRecipesStore.getState().appendVersion(r2, makeSnapshot("B v2"));
    const r2VersionId = useSavedRecipesStore.getState().recipes[0].versions[0].id;

    useSavedRecipesStore.getState().deleteVersion(r2, r2VersionId);
    // r1 should be untouched
    const { recipes } = useSavedRecipesStore.getState();
    expect(recipes.some((r) => r.id === r1)).toBe(true);
    // r2 should still exist with one version
    const r2Recipe = recipes.find((r) => r.id === r2);
    expect(r2Recipe?.versions).toHaveLength(1);
  });

  it("is a no-op for an unknown versionId", () => {
    const recipeId = useSavedRecipesStore.getState().createRecipe(makeSnapshot("Stable"));
    useSavedRecipesStore.getState().deleteVersion(recipeId, "ghost-version-id");
    expect(useSavedRecipesStore.getState().recipes[0].versions).toHaveLength(1);
  });
});
