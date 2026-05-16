// store/savedRecipesStore.ts
//
// Persisted catalog of saved recipes. Stored in localStorage under nl_saved_recipes.
// Each recipe holds a stack of versions (versions.at(-1) is the latest).

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type {
  SavedRecipe, RecipeVersion,
  IngredientItem, LabelDimensions, RecipeStep, RecipeVariable,
} from "../types";

const MAX_RECIPES          = 50;
const MAX_VERSIONS_PER     = 20;

// crypto.randomUUID() is unavailable in insecure contexts (http://hostname).
function makeId(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 11)}`;
}

export type RecipeSnapshot = {
  ingredients:    IngredientItem[];
  portionDivisor: number;
  labelName:      string;
  dimensions:     LabelDimensions;
  instructions:   RecipeStep[];
  variables:      RecipeVariable[];
};

interface SavedRecipesState {
  recipes: SavedRecipe[];

  /** Create a new recipe with one version. Returns the new recipe's id. */
  createRecipe:  (snapshot: RecipeSnapshot, note?: string) => string;

  /** Append a new version to an existing recipe. */
  appendVersion: (recipeId: string, snapshot: RecipeSnapshot, note?: string) => void;

  /** Rename an existing recipe. Metadata only — does not create a version. */
  renameRecipe:  (recipeId: string, name: string) => void;

  /** Delete an entire recipe. */
  deleteRecipe:  (recipeId: string) => void;

  /** Delete a single version. If it's the last version, deletes the recipe. */
  deleteVersion: (recipeId: string, versionId: string) => void;
}

// ── Schema migration ────────────────────────────────────────────────────────

interface LegacySavedRecipe {
  id: string;
  name: string;
  savedAt: number;
  ingredients: IngredientItem[];
  portionDivisor: number;
  labelName: string;
  dimensions: LabelDimensions;
}

function isLegacyRecipe(r: unknown): r is LegacySavedRecipe {
  return !!r && typeof r === "object"
    && "savedAt" in r && !("versions" in r);
}

function migrateLegacyRecipe(r: LegacySavedRecipe): SavedRecipe {
  const version: RecipeVersion = {
    id:             makeId(),
    savedAt:        r.savedAt,
    ingredients:    r.ingredients,
    portionDivisor: r.portionDivisor,
    labelName:      r.labelName,
    dimensions:     r.dimensions,
    instructions:   [],
    variables:      [],
  };
  return {
    id:        r.id,
    name:      r.name,
    createdAt: r.savedAt,
    versions:  [version],
  };
}

// ── Store ───────────────────────────────────────────────────────────────────

export const useSavedRecipesStore = create<SavedRecipesState>()(
  persist(
    (set) => ({
      recipes: [],

      createRecipe: (snapshot, note) => {
        const id = makeId();
        set((state) => {
          const now = Date.now();
          const name = snapshot.labelName.trim() || "Untitled Recipe";
          const version: RecipeVersion = {
            id:      makeId(),
            savedAt: now,
            note,
            ...snapshot,
          };
          const newRecipe: SavedRecipe = {
            id,
            name,
            createdAt: now,
            versions:  [version],
          };
          return { recipes: [newRecipe, ...state.recipes].slice(0, MAX_RECIPES) };
        });
        return id;
      },

      appendVersion: (recipeId, snapshot, note) =>
        set((state) => {
          const now = Date.now();
          const recipes = state.recipes.map((r) => {
            if (r.id !== recipeId) return r;
            const newVersion: RecipeVersion = {
              id:      makeId(),
              savedAt: now,
              note,
              ...snapshot,
            };
            // Keep newest MAX_VERSIONS_PER, oldest pruned
            const versions = [...r.versions, newVersion].slice(-MAX_VERSIONS_PER);
            const name = snapshot.labelName.trim() || r.name;
            return { ...r, name, versions };
          });
          // Bump this recipe to the top of the list
          const updated = recipes.find((r) => r.id === recipeId);
          const others  = recipes.filter((r) => r.id !== recipeId);
          return { recipes: updated ? [updated, ...others] : recipes };
        }),

      renameRecipe: (recipeId, name) =>
        set((state) => ({
          recipes: state.recipes.map((r) => r.id === recipeId ? { ...r, name } : r),
        })),

      deleteRecipe: (recipeId) =>
        set((state) => ({ recipes: state.recipes.filter((r) => r.id !== recipeId) })),

      deleteVersion: (recipeId, versionId) =>
        set((state) => {
          const out: SavedRecipe[] = [];
          for (const r of state.recipes) {
            if (r.id !== recipeId) { out.push(r); continue; }
            const versions = r.versions.filter((v) => v.id !== versionId);
            if (versions.length === 0) continue; // drop the recipe
            out.push({ ...r, versions });
          }
          return { recipes: out };
        }),
    }),
    {
      name: "nl_saved_recipes",
      version: 2,
      migrate: (persisted, fromVersion) => {
        // v1 → v2: each persisted recipe was a flat snapshot; wrap it as a single version.
        if (fromVersion < 2 && persisted && typeof persisted === "object") {
          const raw = (persisted as Record<string, unknown>).recipes;
          if (Array.isArray(raw)) {
            const upgraded: SavedRecipe[] = raw.map((r: unknown) => {
              if (isLegacyRecipe(r)) return migrateLegacyRecipe(r);
              return r as SavedRecipe;
            });
            return { ...(persisted as object), recipes: upgraded } as SavedRecipesState;
          }
        }
        return persisted as SavedRecipesState;
      },
    },
  ),
);
