// hooks/useSaveControls.ts
//
// Owns all save-related state and actions for the label column.
// Extracted from LabelColumn so the component stays focused on layout/rendering
// and this logic can be tested in isolation.

import { useState, useCallback, useMemo } from "react";
import { useRecipeStore } from "../store/recipeStore";
import { useSavedRecipesStore, type RecipeSnapshot } from "../store/savedRecipesStore";
import { useRecipeActions } from "./useRecipeActions";

const FEEDBACK_DURATION_MS = 1500;

export interface SaveControlsState {
  canSave: boolean;
  isLoaded: boolean;
  versionCount: number;
  viewingVersionId: string | null;
  lastSavedRel: string | null;
  savedRecipeName: string | undefined;
  feedback: string | null;
  snapshot: RecipeSnapshot;
  handleSaveVersion: () => void;
  handleSaveAsNew: () => void;
}

export function useSaveControls(): SaveControlsState {
  const ingredients      = useRecipeStore((s) => s.ingredients);
  const portionDivisor   = useRecipeStore((s) => s.portionDivisor);
  const labelName        = useRecipeStore((s) => s.labelName);
  const dimensions       = useRecipeStore((s) => s.dimensions);
  const instructions     = useRecipeStore((s) => s.instructions);
  const variables        = useRecipeStore((s) => s.variables);
  const currentRecipeId  = useRecipeStore((s) => s.currentRecipeId);
  const viewingVersionId = useRecipeStore((s) => s.viewingVersionId);

  const { setCurrentRecipeId } = useRecipeActions();
  const createRecipe  = useSavedRecipesStore((s) => s.createRecipe);
  const appendVersion = useSavedRecipesStore((s) => s.appendVersion);
  const savedRecipe   = useSavedRecipesStore((s) =>
    currentRecipeId ? s.recipes.find((r) => r.id === currentRecipeId) : undefined,
  );

  const [feedback, setFeedback] = useState<string | null>(null);

  const canSave      = ingredients.length > 0;
  const isLoaded     = !!currentRecipeId && !!savedRecipe;
  const versionCount = savedRecipe?.versions.length ?? 0;

  const lastSavedAt = savedRecipe && savedRecipe.versions.length > 0
    ? savedRecipe.versions[savedRecipe.versions.length - 1].savedAt
    : undefined;

  const lastSavedRel = useMemo(() => {
    if (!lastSavedAt) return null;
    const diff = Date.now() - lastSavedAt;
    const mins = Math.round(diff / 60_000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins} min ago`;
    const hrs = Math.round(mins / 60);
    if (hrs < 24) return `${hrs} hr ago`;
    return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(new Date(lastSavedAt));
  }, [lastSavedAt]);

  const snapshot = useMemo<RecipeSnapshot>(
    () => ({ ingredients, portionDivisor, labelName, dimensions, instructions, variables }),
    [ingredients, portionDivisor, labelName, dimensions, instructions, variables],
  );

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), FEEDBACK_DURATION_MS);
  }

  const handleSaveVersion = useCallback(() => {
    if (!canSave) return;
    if (isLoaded) {
      appendVersion(currentRecipeId!, snapshot);
      flash("SAVED ✓");
    } else {
      const newId = createRecipe(snapshot);
      setCurrentRecipeId(newId);
      flash("SAVED ✓");
    }
  }, [canSave, isLoaded, currentRecipeId, snapshot, createRecipe, appendVersion, setCurrentRecipeId]);

  const handleSaveAsNew = useCallback(() => {
    if (!canSave) return;
    const newId = createRecipe(snapshot);
    setCurrentRecipeId(newId);
    flash("SAVED AS NEW ✓");
  }, [canSave, snapshot, createRecipe, setCurrentRecipeId]);

  return {
    canSave,
    isLoaded,
    versionCount,
    viewingVersionId,
    lastSavedRel,
    savedRecipeName: savedRecipe?.name,
    feedback,
    snapshot,
    handleSaveVersion,
    handleSaveAsNew,
  };
}
