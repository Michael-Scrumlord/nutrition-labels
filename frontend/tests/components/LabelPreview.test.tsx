// tests/components/LabelPreview.test.tsx

import { describe, it, expect } from "vitest";
import type { ComponentProps } from "react";
import { render, screen } from "@testing-library/react";
import { LabelPreview } from "../../src/components/label/LabelPreview";
import type { MacroProfile, IngredientItem } from "../../src/types";

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

const SAMPLE_MACROS: MacroProfile = {
  calories: 350, fat_total_g: 18.5, fat_saturated_g: 10.2,
  cholesterol_mg: 85, sodium_mg: 420, carbohydrates_total_g: 42.1,
  fiber_g: 2.3, sugar_g: 18.0, protein_g: 6.8,
  vitamin_d_mcg: 0.5, calcium_mg: 150, iron_mg: 2.1, potassium_mg: 220,
};

const BUTTER_MACROS: MacroProfile = {
  calories: 717, fat_total_g: 81.1, fat_saturated_g: 51.4,
  cholesterol_mg: 215, sodium_mg: 11, carbohydrates_total_g: 0.1,
  fiber_g: 0, sugar_g: 0.1, protein_g: 0.9,
  vitamin_d_mcg: 1.5, calcium_mg: 24, iron_mg: 0.02, potassium_mg: 24,
};

function makeIngredient(name: string, amount: number): IngredientItem {
  return { fdc_id: 1, name, amount, unit: "g", baseMacros: BUTTER_MACROS };
}

// Render with sensible defaults for the FDA label-meta props; override per test.
function renderPreview(props: Partial<ComponentProps<typeof LabelPreview>> = {}) {
  return render(
    <LabelPreview
      macros={ZERO_MACROS}
      portionDivisor={8}
      ingredients={[]}
      widthInches={2.75}
      servingHousehold=""
      addedSugarsG={0}
      transFatG={0}
      {...props}
    />,
  );
}

describe("LabelPreview", () => {
  it("shows 'Nutrition Facts' heading", () => {
    renderPreview();
    expect(screen.getByText("Nutrition Facts")).toBeInTheDocument();
  });

  it("displays 0 calories when no ingredients", () => {
    renderPreview();
    // The calories value "0" should appear in the large calories number
    expect(screen.getAllByText("0").length).toBeGreaterThan(0);
  });

  it("updates calorie display when macros change", () => {
    renderPreview({ macros: SAMPLE_MACROS });
    expect(screen.getByText("350")).toBeInTheDocument();
  });

  it("shows the portion divisor", () => {
    renderPreview({ portionDivisor: 12 });
    expect(screen.getByText(/12 servings per container/i)).toBeInTheDocument();
  });

  it("renders the serving size with the household measure and net grams", () => {
    renderPreview({
      portionDivisor: 1,
      servingHousehold: "2/3 cup",
      ingredients: [makeIngredient("Flour", 55)],
    });
    expect(screen.getByText(/2\/3 cup \(55g\)/)).toBeInTheDocument();
  });

  it("renders ingredients string uppercase and comma-separated", () => {
    renderPreview({ ingredients: [makeIngredient("Butter", 200), makeIngredient("Sugar", 150)] });
    // Heavier ingredient (Butter 200g) should come first
    expect(screen.getByText(/BUTTER/)).toBeInTheDocument();
    expect(screen.getByText(/SUGAR/)).toBeInTheDocument();
  });

  it("does not render ingredients block when list is empty", () => {
    renderPreview();
    expect(screen.queryByText("INGREDIENTS:")).not.toBeInTheDocument();
  });

  it("shows Added Sugars with its %DV (DV 50g)", () => {
    renderPreview({ addedSugarsG: 10 });
    expect(screen.getByText(/Includes 10g Added Sugars/)).toBeInTheDocument();
    expect(screen.getByText("20%")).toBeInTheDocument();
  });
});
