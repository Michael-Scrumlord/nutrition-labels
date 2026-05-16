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
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ScrubNumber } from "../ui/ScrubNumber";
import { IngredientSearch } from "../search/IngredientSearch";
import { IngredientRow } from "./IngredientRow";
import { NutritionBreakdownTable } from "./NutritionBreakdownTable";
import { MethodSection } from "./MethodSection";
import { convertToGrams } from "../../utils/units";
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
          padding: "40px 48px 48px",
          overflow: "auto",
          fontFamily: "var(--f-body)",
          color: "var(--ink)",
          position: "relative",
          zIndex: 1,
        }}
      >
        {/* ── Viewing older version banner ─────────────────────────────── */}
        {viewingVersionId && (
          <div style={{
            display: "flex",
            alignItems: "center",
            gap: 14,
            marginBottom: 18,
            padding: "10px 14px",
            background: "color-mix(in srgb, var(--accent) 6%, transparent)",
            border: "1px solid var(--accent)",
            animation: "popfade 0.18s ease",
          }}>
            <span className="pl-meta" style={{ color: "var(--accent)", fontWeight: 700 }}>
              ◉ VIEWING OLDER VERSION
            </span>
            <span style={{ fontSize: 12, color: "var(--ink-2)", flex: 1 }}>
              saving will append a new version on top of the current latest — nothing is overwritten.
            </span>
            <button
              onClick={exitVersionView}
              className="pl-meta"
              style={{
                background: "transparent",
                border: "1px solid var(--ink)",
                padding: "5px 12px",
                cursor: "pointer",
                fontWeight: 700,
                color: "var(--ink)",
              }}
            >
              DISMISS
            </button>
          </div>
        )}

        {/* ── Recipe № mark ────────────────────────────────────────────── */}
        <div className="pl-meta" style={{ marginBottom: 4 }}>RECIPE №&nbsp;04</div>

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
        <div style={{
          display: "flex",
          alignItems: "baseline",
          gap: 18,
          flexWrap: "wrap",
          marginBottom: 28,
          paddingBottom: 20,
          borderBottom: "1px solid var(--hair-strong)",
          fontSize: 18,
          color: "var(--ink-2)",
        }}>
          <span>yields&nbsp;
            <ScrubNumber
              value={portionDivisor} min={1} max={96} step={1}
              onChange={setPortionDivisor}
              ariaLabel="servings per batch"
              className="pl-scrub"
              style={{ fontSize: 24 }}
            />
            &nbsp;servings
          </span>
          <span style={{ color: "var(--hair-strong)" }}>·</span>
          <span>per serving&nbsp;
            <span
              key={animatedCal}
              className="pl-scrub"
              style={{ fontSize: 24, display: "inline-block", animation: "popPulse 0.42s ease-out" }}
            >
              {animatedCal}
            </span>
            &nbsp;kcal
          </span>
          <span style={{ color: "var(--hair-strong)" }}>·</span>
          <span>batch&nbsp;
            <span className="pl-scrub" style={{ fontSize: 24 }}>{Math.round(totalGrams)}</span>
            &nbsp;g
          </span>
        </div>

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
