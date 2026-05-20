// recipe/RecipeBuilder.tsx
//
// Editorial recipe body — Final A direction.
//   • 56px hero recipe name (IBM Plex Serif italic 500)
//   • Single-line stats: "yields X servings · per serving Y kcal · batch Z g"
//   • Ingredient rows on hairline rules
//   • Method section below

import { useState, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ScrubNumber } from "../ui/ScrubNumber";
import { IngredientSearch } from "../search/IngredientSearch";
import { IngredientRow } from "./IngredientRow";
import { NutritionBreakdownTable } from "./NutritionBreakdownTable";
import { MethodSection } from "./MethodSection";
import { ingredientGrams } from "../../utils/units";
import { RecipeStatsBar } from "./RecipeStatsBar";
import { VersionBanner } from "./VersionBanner";
import { getHighlightKeys } from "../../utils/nutrition";

export function RecipeBuilder() {
  const ingredients      = useRecipeStore((s) => s.ingredients);
  const portionDivisor   = useRecipeStore((s) => s.portionDivisor);
  const labelName        = useRecipeStore((s) => s.labelName);
  const viewingVersionId = useRecipeStore((s) => s.viewingVersionId);
  const { setLabelName, setPortionDivisor, setHighlightedNutrients, exitVersionView } = useRecipeActions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const macros      = useNutritionCalc();
  const totalGrams  = useMemo(
    () => ingredients.reduce((s, i) => s + ingredientGrams(i), 0),
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
          padding: "40px 48px 48px",
          overflow: "auto",
          fontFamily: "var(--f-body)",
          color: "var(--ink)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── Viewing older version banner ─────────────────────────────── */}
        {viewingVersionId && <VersionBanner onDismiss={exitVersionView} />}

        {/* ── Recipe name (editorial hero — 56px) ──────────────────────── */}
        <div style={{ width: "100%", marginBottom: 18 }}>
          <input
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            placeholder="Name your recipe…"
            className="pl-display"
            style={{
              background: "transparent", border: "none", outline: "none",
              fontSize: 56,
              lineHeight: 1,
              width: "100%", minWidth: 0, color: "var(--ink)", padding: 0,
            }}
          />
        </div>

        {/* ── Stats — single typographic line (editorial mode) ─────────── */}
        <RecipeStatsBar
          portionDivisor={portionDivisor}
          calories={macros.calories}
          totalGrams={totalGrams}
          onPortionDivisorChange={setPortionDivisor}
        />

        {/* ── Ingredients section header ───────────────────────────────── */}
        <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginBottom: 8 }}>
          <span className="pl-meta">INGREDIENTS —</span>
          <span style={{ flex: 1, height: 1, background: "var(--hair-strong)" }} />
          <span className="pl-meta">
            {ingredients.length} ITEM{ingredients.length !== 1 ? "S" : ""} · DRAFT
          </span>
        </div>

        {/* ── Ingredient rows ──────────────────────────────────────────── */}
        <ul style={{ listStyle: "none", margin: 0, padding: 0, borderTop: "1px solid var(--hair-strong)" }}>
          {ingredients.length === 0 && (
            <li
              className="pl-display"
              style={{
                padding: "28px 0",
                color: "var(--ink-3)",
                fontSize: 22,
              }}
            >
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

        {/* ── Per-ingredient breakdown ─────────────────────────────────── */}
        <NutritionBreakdownTable />

        {/* ── Add ingredient ───────────────────────────────────────────── */}
        <button
          onClick={() => setPickerOpen(true)}
          className="pl-display"
          style={{
            marginTop: 18, background: "transparent", border: "none",
            color: "var(--accent)",
            fontSize: 20, cursor: "pointer", padding: 0,
          }}
        >
          + add an ingredient
        </button>

        {/* ── Method (instructions + variables) ───────────────────────── */}
        <MethodSection />

        {/* ── Methodology footnote ──────────────────────────────────────── */}
        <p style={{ marginTop: 56, maxWidth: 720, fontSize: 13, lineHeight: 1.55, color: "var(--ink-3)" }}>
          Macronutrient values are retrieved from the USDA FoodData Central database,
          summed across this batch, and divided by{" "}
          <ScrubNumber
            value={portionDivisor} min={1} max={96}
            onChange={setPortionDivisor}
            className="pl-scrub"
            style={{ fontWeight: 700 }}
          />
          {" "}servings. The label rounds per 21 CFR 101.9(c) — what you see is what would print.
        </p>
      </main>

      {/* ── Ingredient picker modal ──────────────────────────────────────── */}
      <IngredientSearch open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
