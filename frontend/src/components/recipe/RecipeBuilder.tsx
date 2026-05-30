// recipe/RecipeBuilder.tsx
//
// Editorial recipe body — Final A direction.
//   • 56px hero recipe name (IBM Plex Serif italic 500)
//   • Single-line stats: "yields X servings · per serving Y kcal · batch Z g"
//   • Ingredient rows on hairline rules
//   • Method section below

import { useState, useMemo, useRef } from "react";
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
import { useTitleAutoResize } from "../../hooks/useTitleAutoResize";

export function RecipeBuilder() {
  const ingredients      = useRecipeStore((s) => s.ingredients);
  const portionDivisor   = useRecipeStore((s) => s.portionDivisor);
  const labelName        = useRecipeStore((s) => s.labelName);
  const viewingVersionId = useRecipeStore((s) => s.viewingVersionId);
  const { setLabelName, setPortionDivisor, setHighlightedNutrients, exitVersionView } = useRecipeActions();

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const titleRef = useRef<HTMLTextAreaElement>(null);
  useTitleAutoResize(titleRef, labelName);

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
          padding: "var(--ms-pad-y) var(--ms-pad-x)",
          overflow: "auto",
          fontFamily: "var(--f-body)",
          color: "var(--ink)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── Viewing older version banner ─────────────────────────────── */}
        {viewingVersionId && <VersionBanner onDismiss={exitVersionView} />}

        {/* ── Recipe name (editorial hero — 56px, sig-editable groove) ── */}
        <div style={{ width: "100%", marginBottom: 18 }}>
          <textarea
            ref={titleRef}
            value={labelName}
            onChange={(e) => setLabelName(e.target.value)}
            placeholder="Name your recipe…"
            className="sig-editable sig-input pl-display"
            rows={1}
            style={{
              width: "100%", minWidth: 0,
              fontSize: "var(--ms-hero)",
              lineHeight: 1.1,
              padding: "8px 36px 10px 12px",
              resize: "none",
              overflow: "hidden",
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
        <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 4 }}>
          <span className="sig-static pl-meta">
            <span style={{ color: "var(--accent)" }}>▾</span>  INGREDIENTS —
          </span>
          <span style={{ flex: 1, height: 1, background: "var(--hair-strong)" }} />
          <span className="sig-static pl-meta">
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
              key={ing.instanceId}
              ingredient={ing}
              isHovered={hoveredIdx === i}
              totalGrams={totalGrams}
              onHoverEnter={() => handleHoverEnter(i)}
              onHoverLeave={handleHoverLeave}
            />
          ))}
        </ul>

        {/* ── Per-ingredient breakdown ─────────────────────────────────── */}
        <NutritionBreakdownTable />

        {/* ── Add ingredient (sig-btn plinth) ──────────────────────────── */}
        <div style={{ paddingTop: 14, paddingBottom: 6, marginTop: 4 }}>
          <button
            onClick={() => setPickerOpen(true)}
            className="sig-btn"
          >
            <span style={{ color: "var(--accent)" }}>▸</span>
            Add Ingredient
          </button>
        </div>

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
            ariaLabel="servings per batch"
          />
          {" "}servings. The label rounds per 21 CFR 101.9(c) — what you see is what would print.
        </p>
      </main>

      {/* ── Ingredient picker modal ──────────────────────────────────────── */}
      <IngredientSearch open={pickerOpen} onClose={() => setPickerOpen(false)} />
    </>
  );
}
