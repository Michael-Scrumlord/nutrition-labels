// tests/components/RecipeBuilder.test.tsx

import React from "react";
import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { RecipeBuilder } from "../../src/components/recipe/RecipeBuilder";
import { useRecipeStore } from "../../src/store/recipeStore";
import type { MacroProfile } from "../../src/types";

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

function Wrapper({ children }: { children: React.ReactNode }) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={qc}>{children}</QueryClientProvider>;
}

// Reset the Zustand store before each test so state doesn't bleed between tests
beforeEach(() => {
  useRecipeStore.setState({
    ingredients: [], portionDivisor: 8, labelName: "", highlightedNutrients: new Set(),
  });
});

describe("RecipeBuilder", () => {
  it("shows empty state message when no ingredients", () => {
    render(<RecipeBuilder />, { wrapper: Wrapper });
    expect(screen.getByText(/No ingredients yet/i)).toBeInTheDocument();
  });

  it("renders ingredient name when an ingredient is added", () => {
    useRecipeStore.getState().addIngredient({
      fdc_id: 1097512, name: "Butter", amount: 100, unit: "g",
      baseMacros: BUTTER_MACROS,
    });
    render(<RecipeBuilder />, { wrapper: Wrapper });
    // Name appears in the magazine ingredient row and in the breakdown table
    expect(screen.getAllByText("Butter").length).toBeGreaterThan(0);
  });

  it("removes the row when the remove button is clicked", () => {
    useRecipeStore.getState().addIngredient({
      fdc_id: 1097512, name: "Butter", amount: 100, unit: "g",
      baseMacros: BUTTER_MACROS,
    });
    render(<RecipeBuilder />, { wrapper: Wrapper });

    const removeBtn = screen.getByRole("button", { name: /remove butter/i });
    fireEvent.click(removeBtn);

    expect(useRecipeStore.getState().ingredients).toHaveLength(0);
    expect(screen.getByText(/No ingredients yet/i)).toBeInTheDocument();
  });

  it("updates portionDivisor when the servings scrubber changes via keyboard", () => {
    render(<RecipeBuilder />, { wrapper: Wrapper });

    const scrubber = screen.getByLabelText(/servings per batch/i);
    // ArrowUp increments by 1 step
    fireEvent.keyDown(scrubber, { key: "ArrowUp" });

    expect(useRecipeStore.getState().portionDivisor).toBe(9);
  });

  it("shows breakdown table when ingredients are present", () => {
    useRecipeStore.getState().addIngredient({
      fdc_id: 1097512, name: "Butter", amount: 100, unit: "g",
      baseMacros: BUTTER_MACROS,
    });
    render(<RecipeBuilder />, { wrapper: Wrapper });
    // NutritionBreakdownTable header row must be visible
    expect(screen.getByText(/Weight \(g\)/i)).toBeInTheDocument();
  });
});
