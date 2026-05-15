// recipe/RecipeBuilder.tsx
//
// Pop magazine-spread recipe builder.
// Each ingredient row has a large italic numeral, scrubable gram weight,
// and hover-driven synchronized highlight on the FDA label.

import { useState, useMemo } from "react";
import { useRecipeStore } from "../../store/recipeStore";
import { useNutritionCalc } from "../../hooks/useNutritionCalc";
import { useAnimatedNumber } from "../../hooks/useAnimatedNumber";
import { ScrubNumber } from "../ui/ScrubNumber";
import { IngredientSearch } from "../search/IngredientSearch";
import { convertToGrams } from "../../utils/units";
import { FDA_DAILY_VALUES } from "../../utils/nutrition";
import type { MacroProfile } from "../../types";
import type { HighlightSet } from "../layout/AppShell";

const ACCENT = "var(--color-accent)";
const INK    = "#0a0a0a";

// Derive the 2 nutrients most influenced by an ingredient (by %DV contribution).
function getHighlightKeys(baseMacros: MacroProfile): HighlightSet {
  const ranked: [keyof MacroProfile, number][] = [];
  for (const [key, dv] of Object.entries(FDA_DAILY_VALUES) as [keyof MacroProfile, number][]) {
    if (dv && baseMacros[key] > 0) ranked.push([key, baseMacros[key] / dv]);
  }
  ranked.sort((a, b) => b[1] - a[1]);
  return new Set(ranked.slice(0, 2).map(([k]) => k));
}

interface RecipeBuilderProps {
  onHighlightChange?: (set: HighlightSet) => void;
}

export function RecipeBuilder({ onHighlightChange }: RecipeBuilderProps) {
  const ingredients    = useRecipeStore((s) => s.ingredients);
  const portionDivisor = useRecipeStore((s) => s.portionDivisor);
  const labelName      = useRecipeStore((s) => s.labelName);
  const setLabelName   = useRecipeStore((s) => s.setLabelName);
  const setDivisor     = useRecipeStore((s) => s.setPortionDivisor);
  const updateAmount   = useRecipeStore((s) => s.updateIngredientAmount);
  const updateUnit     = useRecipeStore((s) => s.updateIngredientUnit);
  const remove         = useRecipeStore((s) => s.removeIngredient);
  const move           = useRecipeStore((s) => s.moveIngredient);

  const [pickerOpen, setPickerOpen] = useState(false);
  const [hoveredIdx, setHoveredIdx] = useState<number | null>(null);

  const macros     = useNutritionCalc();
  const animatedCal = useAnimatedNumber(macros.calories);
  const totalGrams  = useMemo(
    () => ingredients.reduce((s, i) => s + convertToGrams(i.amount, i.unit), 0),
    [ingredients],
  );

  function handleHoverEnter(idx: number) {
    setHoveredIdx(idx);
    const ing = ingredients[idx];
    if (ing) onHighlightChange?.(getHighlightKeys(ing.baseMacros));
  }
  function handleHoverLeave() {
    setHoveredIdx(null);
    onHighlightChange?.(new Set());
  }

  function setGrams(fdc_id: number, grams: number) {
    updateAmount(fdc_id, grams);
    // ensure unit is grams so the stored value is interpreted correctly
    const ing = ingredients.find((i) => i.fdc_id === fdc_id);
    if (ing && ing.unit !== "g") updateUnit(fdc_id, "g");
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
              onChange={setDivisor}
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

          {ingredients.map((ing, i) => {
            const grams    = Math.round(convertToGrams(ing.amount, ing.unit));
            const pctMix   = totalGrams > 0 ? (convertToGrams(ing.amount, ing.unit) / totalGrams) * 100 : 0;
            const kcal     = (ing.baseMacros.calories * grams) / 100;
            const isHovered = hoveredIdx === i;

            const dominantKeys = getHighlightKeys(ing.baseMacros);
            const dominantLabel = [...dominantKeys]
              .map((k) => k.replace(/_/g, " ").replace(/(mg|g|mcg)$/, "").trim())
              .join(", ")
              .toUpperCase();

            return (
              <li
                key={ing.fdc_id}
                onMouseEnter={() => handleHoverEnter(i)}
                onMouseLeave={handleHoverLeave}
                style={{
                  display: "grid",
                  gridTemplateColumns: "90px 1fr auto 80px",
                  gap: 22,
                  alignItems: "baseline",
                  padding: "16px 12px",
                  position: "relative",
                  background: isHovered ? "var(--color-accent-blush)" : "transparent",
                  transition: "background 0.2s ease",
                  animation: "popInRow 0.28s ease both",
                }}
              >
                {/* Big italic numeral */}
                <span style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 60,
                  lineHeight: 0.9,
                  color: isHovered ? ACCENT : "#ccc",
                  letterSpacing: "-0.04em",
                  transition: "transform 0.3s cubic-bezier(.2,.7,.1,1), color 0.25s ease",
                  transform: isHovered ? "translateX(8px)" : "translateX(0)",
                  display: "block",
                }}>
                  {String(i + 1).padStart(2, "0")}
                </span>

                {/* Name + stats */}
                <div style={{ display: "flex", alignItems: "baseline", gap: 14, flexWrap: "wrap" }}>
                  <span style={{
                    fontFamily: "'Instrument Serif', Georgia, serif",
                    fontStyle: "italic",
                    fontSize: 28,
                    letterSpacing: "-0.02em",
                    color: INK,
                  }}>
                    {ing.name}
                  </span>
                  <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 11, color: "#999", letterSpacing: "0.16em" }}>
                    {pctMix.toFixed(1)}% OF MIX · {Math.round(kcal)} KCAL
                    {isHovered && dominantLabel ? <> · DOMINANT: {dominantLabel}</> : null}
                  </span>
                </div>

                {/* Scrubable gram weight */}
                <span style={{ fontSize: 32, fontWeight: 800, letterSpacing: "-0.03em", fontVariantNumeric: "tabular-nums" }}>
                  <ScrubNumber
                    value={grams}
                    min={0} max={5000} step={1}
                    onChange={(g) => setGrams(ing.fdc_id, g)}
                    style={{ fontSize: 32, fontWeight: 800, color: ACCENT }}
                    ariaLabel={`${ing.name} grams`}
                  />
                  <span style={{ color: INK, fontSize: 16, marginLeft: 2 }}>g</span>
                </span>

                {/* Row controls */}
                <span style={{ display: "flex", gap: 2, justifyContent: "flex-end", alignItems: "center" }}>
                  {(
                    [
                      { label: "↑", title: "Move up",   onClick: () => move(ing.fdc_id, -1) },
                      { label: "↓", title: "Move down", onClick: () => move(ing.fdc_id,  1) },
                      { label: "×", title: "Remove",    onClick: () => remove(ing.fdc_id)   },
                    ] as const
                  ).map(({ label, title, onClick }) => (
                    <button
                      key={title}
                      title={title}
                      onClick={onClick}
                      style={{
                        background: "transparent", border: "1px solid transparent",
                        padding: "4px 6px", cursor: "pointer", color: "#bbb",
                        lineHeight: 1, fontFamily: "inherit", fontSize: 14,
                        transition: "color 0.15s, border-color 0.15s",
                      }}
                      onMouseEnter={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = label === "×" ? "var(--color-danger)" : ACCENT;
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "#e5e5e5";
                      }}
                      onMouseLeave={(e) => {
                        (e.currentTarget as HTMLButtonElement).style.color = "#bbb";
                        (e.currentTarget as HTMLButtonElement).style.borderColor = "transparent";
                      }}
                    >
                      {label}
                    </button>
                  ))}
                </span>

                {/* Row rule */}
                <span style={{
                  gridColumn: "1 / -1", height: 1,
                  background: isHovered ? ACCENT : "#ebebeb",
                  transition: "background 0.25s ease",
                  display: "block",
                }} />
              </li>
            );
          })}
        </ul>

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
            onChange={setDivisor}
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
