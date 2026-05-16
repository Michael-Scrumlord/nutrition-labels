// recipe/RecipeBuilder.tsx
//
// Pop magazine-spread recipe editor.
// Highlight state is managed in recipeStore — no props needed from AppShell.

import { useState, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ScrubNumber } from "../ui/ScrubNumber";
import { IngredientSearch } from "../search/IngredientSearch";
import { IngredientRow } from "./IngredientRow";
import { NutritionBreakdownTable } from "./NutritionBreakdownTable";
import { convertToGrams } from "../../utils/units";
import { getHighlightKeys } from "../../utils/nutrition";
import { ACCENT, INK } from "../../constants/theme";

export function RecipeBuilder() {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const labelName      = useRecipeStore((s) => s.labelName);
  const { setLabelName, setPortionDivisor, setHighlightedNutrients } = useRecipeActions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const macros      = useNutritionCalc();
  const animatedCal = useAnimatedNumber(macros.calories);
  const totalGrams  = useMemo(
    () => ingredients.reduce((s, i) => s + convertToGrams(i.amount, i.unit), 0),
    [ingredients],
  );

  function handleHoverEnter(idx: number) {
    setHoveredIdx(idx);
    const ing = ingredients[idx];
    if (ing) setHighlightedNutrients(getHighlightKeys(ing.baseMacros));
  }
  function handleHoverLeave() {
    setHoveredIdx(null);
    setHighlightedNutrients(new Set());
  }

  return (
    <>
      <main
        style={{
          gridArea: "body",
          padding: "32px 48px 8px",
          overflow: "auto",
          fontFamily: "'Inter Tight', system-ui, sans-serif",
        }}
      >
        {/* ── "A RECIPE FOR —" strip ───────────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 24, marginBottom: 18 }}>
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.2em" }}>
            A RECIPE FOR —
          </span>
          <span style={{ flex: 1, height: 1, background: INK }} />
          <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.2em" }}>
            {ingredients.length} INGREDIENT{ingredients.length !== 1 ? "S" : ""} · DRAFT
          </span>
        </div>

        {/* ── Recipe name ───────────────────────────────────────────────── */}
        <div style={{ containerType: "inline-size", width: "100%", marginBottom: 12 }}>
          <input
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            placeholder="Name your recipe…"
            style={{
              background: "transparent", border: "none", outline: "none",
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: "clamp(40px, 8vw, 96px)",
              lineHeight: 0.92,
              letterSpacing: "-0.035em",
              width: "100%", minWidth: 0, color: INK, padding: 0,
            }}
          />
        </div>

        {/* ── Stats bar ─────────────────────────────────────────────────── */}
        <div style={{ display: "flex", gap: 28, alignItems: "baseline", marginBottom: 28, flexWrap: "wrap" }}>
          <span style={{ fontSize: 18, color: "#666" }}>
            yields&nbsp;
            <ScrubNumber
              value={portionDivisor} min={1} max={96} step={1}
              onChange={setPortionDivisor}
              ariaLabel="servings per batch"
              style={{ fontSize: 22, fontWeight: 800, color: ACCENT, cursor: "ew-resize" }}
            />
            &nbsp;servings
          </span>
          <span style={{ fontSize: 18, color: "#666" }}>·</span>
          <span style={{ fontSize: 18, color: "#666" }}>
            batch <span style={{ fontSize: 22, fontWeight: 800, color: ACCENT }}>{Math.round(totalGrams)}g</span>
          </span>
          <span style={{ fontSize: 18, color: "#666" }}>·</span>
          <span style={{ fontSize: 18, color: "#666" }}>
            per serving{" "}
            <span
              key={animatedCal}
              style={{ fontSize: 22, fontWeight: 800, color: ACCENT, display: "inline-block", animation: "popPulse 0.42s ease-out" }}
            >
              {animatedCal}
            </span>{" "}
            kcal
          </span>
        </div>

        {/* ── Ingredient rows ───────────────────────────────────────────── */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: `2px solid ${INK}` }}>
          {ingredients.length === 0 && (
            <li style={{ padding: "28px 0", color: "#bbb", fontStyle: "italic", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 22 }}>
              No ingredients yet — add one below.
            </li>
          )}

          {ingredients.map((ing, i) => (
            <IngredientRow
              key={ing.fdc_id}
              ingredient={ing}
              index={i}
              isHovered={hoveredIdx === i}
              totalGrams={totalGrams}
              onHoverEnter={() => handleHoverEnter(i)}
              onHoverLeave={handleHoverLeave}
            />
          ))}
        </ul>

        {/* ── Per-ingredient breakdown ──────────────────────────────────── */}
        <NutritionBreakdownTable />

        {/* ── Add ingredient ─────────────────────────────────────────────── */}
        <button
          onClick={() => setPickerOpen(true)}
          style={{
            marginTop: 18, background: "transparent", border: "none",
            color: ACCENT, fontFamily: "'Instrument Serif', Georgia, serif",
            fontStyle: "italic", fontSize: 22, cursor: "pointer", padding: 0,
          }}
        >
          + add an ingredient
        </button>

        {/* ── Methodology footnote ──────────────────────────────────────── */}
        <p style={{ marginTop: 56, maxWidth: 720, fontSize: 13, lineHeight: 1.55, color: "#888" }}>
          Macronutrient values are retrieved from the USDA FoodData Central database,
          summed across this batch, and divided by{" "}
          <ScrubNumber
            value={portionDivisor} min={1} max={96}
            onChange={setPortionDivisor}
            style={{ fontWeight: 700, color: ACCENT, cursor: "ew-resize" }}
          />
          {" "}servings. The label rounds per 21 CFR 101.9(c) — what you see is what would print.
        </p>
      </main>

      {/* ── Ingredient picker modal ───────────────────────────────────────── */}
      <IngredientSearch open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
