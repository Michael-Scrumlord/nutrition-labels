// hooks/useLabelSave.ts
//
// Encapsulates the save/version workflow for the label column:
// snapshot construction, relative-time formatting, save handlers, and
// transient feedback state. Extracted from LabelColumn to keep that
// component focused on layout and presentation.

import { useState, useMemo, useCallback } from "react";
import { useShallow } from "zustand/react/shallow";
import { useRecipeStore } from "../store/recipeStore";
import { useSavedRecipesStore, type RecipeSnapshot } from "../store/savedRecipesStore";
import { useRecipeActions } from "./useRecipeActions";

function formatRelativeTime(timestamp: number): string {
  const diff = Date.now() - timestamp;
  const mins = Math.round(diff / 60_000);
  if (mins < 1) return "just now";
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} hr ago`;
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric" }).format(
    new Date(timestamp),
  );
}

export function useLabelSave() {
  const {
    ingredients, portionDivisor, labelName, dimensions,
    instructions, variables, servingHousehold, addedSugarsG, transFatG,
    currentRecipeId,
  } = useRecipeStore(
    useShallow((s) => ({
      ingredients:      s.ingredients,
      portionDivisor:   s.portionDivisor,
      labelName:        s.labelName,
      dimensions:       s.dimensions,
      instructions:     s.instructions,
      variables:        s.variables,
      servingHousehold: s.servingHousehold,
      addedSugarsG:     s.addedSugarsG,
      transFatG:        s.transFatG,
      currentRecipeId:  s.currentRecipeId,
    })),
  );

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
  const lastSavedAt  = savedRecipe && savedRecipe.versions.length > 0
    ? savedRecipe.versions[savedRecipe.versions.length - 1].savedAt
    : undefined;

  const lastSavedRel = useMemo(
    () => (lastSavedAt ? formatRelativeTime(lastSavedAt) : null),
    [lastSavedAt],
  );

  const snapshot = useMemo<RecipeSnapshot>(
    () => ({
      ingredients, portionDivisor, labelName, dimensions, instructions, variables,
      servingHousehold, addedSugarsG, transFatG,
    }),
    [ingredients, portionDivisor, labelName, dimensions, instructions, variables,
     servingHousehold, addedSugarsG, transFatG],
  );

  function flash(msg: string) {
    setFeedback(msg);
    setTimeout(() => setFeedback(null), 1500);
  }

  const handleSaveVersion = useCallback(
    (note?: string) => {
      if (!canSave) return;
      if (isLoaded) {
        appendVersion(currentRecipeId!, snapshot, note);
        flash("SAVED ✓");
      } else {
        const newId = createRecipe(snapshot, note);
        setCurrentRecipeId(newId);
        flash("SAVED ✓");
      }
    },
    [canSave, isLoaded, currentRecipeId, snapshot, createRecipe, appendVersion, setCurrentRecipeId],
  );

  const handleSaveAsNew = useCallback(
    (note?: string) => {
      if (!canSave) return;
      const newId = createRecipe(snapshot, note);
      setCurrentRecipeId(newId);
      flash("SAVED AS NEW ✓");
    },
    [canSave, snapshot, createRecipe, setCurrentRecipeId],
  );

  return {
    canSave,
    isLoaded,
    versionCount,
    lastSavedRel,
    savedRecipeName: savedRecipe?.name,
    feedback,
    handleSaveVersion,
    handleSaveAsNew,
  };
}
