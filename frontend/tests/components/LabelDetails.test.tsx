// tests/components/LabelDetails.test.tsx
//
// Unit tests for LabelDetails — the FDA fields not derivable from the USDA
// DB (household serving, added sugars, trans fat). No test previously
// existed for this component even though it owns two ScrubNumber inputs
// with min={0} clamping that the store's own setters also clamp.

import { describe, it, expect, beforeEach } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { LabelDetails } from "../../src/components/label/LabelDetails";
import { useRecipeStore } from "../../src/store/recipeStore";

beforeEach(() => {
  useRecipeStore.setState({
    servingHousehold: "",
    addedSugarsG: 0,
    transFatG: 0,
  });
});

describe("LabelDetails — rendering current values", () => {
  it("renders the household serving text field's current value", () => {
    useRecipeStore.setState({ servingHousehold: "2/3 cup" });
    render(<LabelDetails />);
    expect(screen.getByLabelText("Household serving description")).toHaveValue("2/3 cup");
  });

  it("renders 0g for added sugars and trans fat by default", () => {
    render(<LabelDetails />);
    expect(screen.getByLabelText("Added sugars in grams")).toHaveTextContent("0g");
    expect(screen.getByLabelText("Trans fat in grams")).toHaveTextContent("0g");
  });
});

describe("LabelDetails — editing household serving", () => {
  it("calls setServingHousehold as the user types", () => {
    render(<LabelDetails />);
    const input = screen.getByLabelText("Household serving description");
    fireEvent.change(input, { target: { value: "1 cup" } });
    expect(useRecipeStore.getState().servingHousehold).toBe("1 cup");
  });

  it("allows clearing the field back to empty", () => {
    useRecipeStore.setState({ servingHousehold: "1 cup" });
    render(<LabelDetails />);
    const input = screen.getByLabelText("Household serving description");
    fireEvent.change(input, { target: { value: "" } });
    expect(useRecipeStore.getState().servingHousehold).toBe("");
  });
});

describe("LabelDetails — added sugars ScrubNumber", () => {
  it("ArrowUp increases added sugars by the 0.5g step", () => {
    render(<LabelDetails />);
    const spin = screen.getByLabelText("Added sugars in grams");
    fireEvent.keyDown(spin, { key: "ArrowUp" });
    expect(useRecipeStore.getState().addedSugarsG).toBe(0.5);
  });

  it("does not go below zero when decremented from zero (min=0 clamp)", () => {
    render(<LabelDetails />);
    const spin = screen.getByLabelText("Added sugars in grams");
    fireEvent.keyDown(spin, { key: "ArrowDown" });
    expect(useRecipeStore.getState().addedSugarsG).toBe(0);
  });
});

describe("LabelDetails — trans fat ScrubNumber", () => {
  it("ArrowUp increases trans fat by the 0.5g step", () => {
    render(<LabelDetails />);
    const spin = screen.getByLabelText("Trans fat in grams");
    fireEvent.keyDown(spin, { key: "ArrowUp" });
    expect(useRecipeStore.getState().transFatG).toBe(0.5);
  });

  it("does not go below zero when decremented from zero (min=0 clamp)", () => {
    render(<LabelDetails />);
    const spin = screen.getByLabelText("Trans fat in grams");
    fireEvent.keyDown(spin, { key: "ArrowDown" });
    expect(useRecipeStore.getState().transFatG).toBe(0);
  });
});
