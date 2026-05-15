// search/AddIngredientForm.tsx
//
// Appears below the search list when a food is selected.
// Shows the food name (editable), quantity, and unit, then adds to the recipe.

import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { getFoodDetail } from "../../api/client";
import { useRecipeStore } from "../../store/recipeStore";
import { usePreferencesStore } from "../../store/preferencesStore";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";
import { Select } from "../ui/Select";
import { Spinner } from "../ui/Spinner";
import { UNIT_LABELS } from "../../types";
import type { FoodSearchResult, UnitKey } from "../../types";

const UNIT_OPTIONS = Object.entries(UNIT_LABELS).map(([value, label]) => ({
  value,
  label,
}));

interface AddIngredientFormProps {
  food: FoodSearchResult;
  onClose: () => void;
}

export function AddIngredientForm({ food, onClose }: AddIngredientFormProps) {
  const [displayName, setDisplayName] = useState(food.name);
  const [amount, setAmount] = useState("100");
  const [unit, setUnit] = useState<UnitKey>("g");

  const addIngredient = useRecipeStore((s) => s.addIngredient);
  const addRecent     = usePreferencesStore((s) => s.addRecent);

  // Fetch full macro data for this food
  const { data: foodDetail, isLoading, isError } = useQuery({
    queryKey: ["food", food.fdc_id],
    queryFn: () => getFoodDetail(food.fdc_id),
    staleTime: Infinity, // Food macros never change
  });

  // Reset the name when a different food is selected
  useEffect(() => {
    setDisplayName(food.name);
    setAmount("100");
    setUnit("g");
  }, [food.fdc_id]);

  function handleAdd() {
    if (!foodDetail) return;
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) return;

    addIngredient({
      fdc_id:     food.fdc_id,
      name:       displayName,
      amount:     parsedAmount,
      unit,
      baseMacros: foodDetail.macros,
    });
    addRecent({ fdc_id: food.fdc_id, name: food.name });
    onClose();
  }

  return (
    <div className="bg-bg-elevated border border-border-std rounded-md p-4 mt-2 space-y-3">
      <p className="text-xs text-text-secondary uppercase tracking-wider font-medium">
        Add Ingredient
      </p>

      <Input
        label="Display name on label"
        value={displayName}
        onChange={(e) => setDisplayName(e.target.value)}
      />

      <div className="flex gap-2">
        <Input
          label="Quantity"
          type="number"
          min="0.01"
          step="any"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          className="w-24"
        />
        <Select
          label="Unit"
          value={unit}
          options={UNIT_OPTIONS}
          onChange={(e) => setUnit(e.target.value as UnitKey)}
          className="flex-1"
        />
      </div>

      {isLoading && (
        <div className="flex items-center gap-2 text-text-tertiary text-sm">
          <Spinner size={12} /> Loading nutrition data…
        </div>
      )}
      {isError && (
        <p className="text-danger text-sm">Failed to load nutrition data.</p>
      )}

      <div className="flex gap-2 pt-1">
        <Button
          variant="primary"
          onClick={handleAdd}
          disabled={!foodDetail || isLoading}
        >
          Add to Recipe
        </Button>
        <Button variant="secondary" onClick={onClose}>
          Cancel
        </Button>
      </div>
    </div>
  );
}
