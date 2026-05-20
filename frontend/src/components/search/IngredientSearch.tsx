// search/IngredientSearch.tsx
//
// Ingredient picker — modal drawer that overlays the page.
// Tabs: Search (USDA) / Common / Recent / Favorites.
// Selecting a food drops into an inline add-form inside the modal.

import { useState, useRef, useEffect, Fragment } from "react";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useIngredientSearch } from "../../hooks/useIngredientSearch";
import { useQuery } from "@tanstack/react-query";
import { getFoodDetail } from "../../api/client";
import { useRecipeStore } from "../../store/recipeStore";
import { useActiveTheme } from "../../store/themeStore";
import { Spinner } from "../ui/Spinner";
import { COMMON_FOODS } from "../../constants/commonFoods";
import { normalizePortion } from "../../utils/units";
import { UNIT_LABELS } from "../../types";
import type { FoodSearchResult, SavedFood, UnitKey, PortionRef, PortionSize } from "../../types";

const UNIT_KEYS = Object.keys(UNIT_LABELS) as UnitKey[];

type TabId = "search" | "common" | "recent" | "favorites";

// ── Inline add-form ──────────────────────────────────────────────────────────

function AddForm({ food, onClose }: { food: FoodSearchResult; onClose: () => void }) {
  // The picker state is encoded the same way as in IngredientRow:
  //   "unit:g" | "unit:oz" | … | "portion:tablespoon" | …
  // Default flips between "1 of the first portion" (e.g. 1 tbsp) when the
  // food has known portions, and "100 g" when it doesn't.
  const [amount, setAmount] = useState("1");
  const [picker, setPicker] = useState<string>("unit:g");
  const [defaulted, setDefaulted] = useState(false);
  const addIngredient = useRecipeStore((s) => s.addIngredient);
  const addRecent     = usePreferencesStore((s) => s.addRecent);
  const { def: themeDef } = useActiveTheme();

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ["food", food.fdc_id],
    queryFn:  () => getFoodDetail(food.fdc_id),
    staleTime: Infinity,
  });

  // Once we know what portions exist, set a smart default ONCE. We don't
  // overwrite the user's choice on re-renders; the `defaulted` flag locks it.
  useEffect(() => {
    if (defaulted || !detail) return;
    if (detail.portions.length > 0) {
      setPicker(`portion:${detail.portions[0].modifier}`);
      setAmount("1");
    } else {
      setPicker("unit:g");
      setAmount("100");
    }
    setDefaulted(true);
  }, [detail, defaulted]);

  // Reset the form when the user picks a different food.
  useEffect(() => {
    setDefaulted(false);
    setAmount("1");
    setPicker("unit:g");
  }, [food.fdc_id]);

  function handleAdd() {
    if (!detail) return;
    const parsed = parseFloat(amount);
    if (isNaN(parsed) || parsed <= 0) return;
    const rounded = Math.round(parsed * 100) / 100;

    let unit: UnitKey = "g";
    let portionRef: PortionRef | null = null;

    if (picker.startsWith("portion:")) {
      const modifier = picker.slice("portion:".length);
      const match = detail.portions.find((p) => p.modifier === modifier);
      if (match) portionRef = normalizePortion(match);
    } else if (picker.startsWith("unit:")) {
      unit = picker.slice("unit:".length) as UnitKey;
    }

    addIngredient({
      fdc_id:     food.fdc_id,
      name:       food.name,
      amount:     rounded,
      unit,
      portionRef,
      availablePortions: detail.portions,
      baseMacros: detail.macros,
    });
    addRecent({ fdc_id: food.fdc_id, name: food.name });
    onClose();
  }

  const portions: PortionSize[] = detail?.portions ?? [];

  return (
    <div style={{ padding: "16px 22px", borderTop: "1px solid var(--hair)", background: "var(--surface)" }}>
      <p className="pl-display" style={{ margin: "0 0 10px", fontSize: 20, color: "var(--ink)" }}>
        {food.name}
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end", flexWrap: "wrap" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-3)", fontFamily: "var(--f-mono)" }}>AMOUNT</span>
          <input
            type="number" min="0.01" step="0.01"
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            autoFocus
            aria-label="Amount"
            style={{
              width: 90,
              padding: "8px 10px",
              border: "1px solid var(--ink)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--f-mono)",
              fontSize: 18,
              fontWeight: 700,
              outline: "none",
            }}
          />
        </label>

        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "var(--ink-3)", fontFamily: "var(--f-mono)" }}>UNIT</span>
          <select
            value={picker}
            onChange={(e) => setPicker(e.target.value)}
            aria-label="Unit"
            disabled={!detail}
            style={{
              minWidth: 140,
              padding: "8px 10px",
              border: "1px solid var(--ink)",
              background: "var(--bg)",
              color: "var(--ink)",
              fontFamily: "var(--f-body)",
              fontSize: 14,
              fontWeight: 500,
              outline: "none",
              cursor: detail ? "pointer" : "default",
            }}
          >
            {portions.length > 0 && (
              <optgroup label="Food portions">
                {portions.map((p) => (
                  <option key={`portion-${p.modifier}`} value={`portion:${p.modifier}`}>
                    {p.modifier}
                  </option>
                ))}
              </optgroup>
            )}
            <optgroup label={portions.length > 0 ? "Standard units" : undefined}>
              {UNIT_KEYS.map((u) => (
                <option key={`unit-${u}`} value={`unit:${u}`}>{u}</option>
              ))}
            </optgroup>
          </select>
        </label>

        {isLoading && <Spinner size={16} />}
        {isError   && <span style={{ fontSize: 11, color: "var(--color-danger)" }}>Failed to load</span>}

        <button
          onClick={handleAdd}
          disabled={!detail || isLoading}
          style={{
            background: detail && !isLoading ? "var(--accent)" : "color-mix(in srgb, var(--ink) 8%, transparent)",
            color: detail && !isLoading ? (themeDef.oled ? "#000" : "#fff") : "var(--ink-3)",
            border: "none",
            padding: "10px 20px",
            cursor: detail ? "pointer" : "default",
            fontFamily: "var(--f-body)",
            fontWeight: 700,
            letterSpacing: "0.12em",
            fontSize: 12,
          }}
        >
          ADD TO RECIPE
        </button>
        <button
          onClick={onClose}
          style={{
            background: "transparent",
            border: "1px solid var(--ink)",
            color: "var(--ink)",
            padding: "10px 14px",
            cursor: "pointer",
            fontFamily: "var(--f-body)",
            fontWeight: 600,
            fontSize: 11,
            letterSpacing: "0.08em",
          }}
        >
          CANCEL
        </button>
      </div>
    </div>
  );
}

// ── Main modal ───────────────────────────────────────────────────────────────

interface IngredientSearchProps {
  open: boolean;
  onClose: () => void;
}

export function IngredientSearch({ open, onClose }: IngredientSearchProps) {
  const [tab, setTab]           = useState<TabId>("common");
  const [query, setQuery]       = useState("");
  const [selected, setSelected] = useState<FoodSearchResult | null>(null);
  const inputRef                = useRef<HTMLInputElement>(null);

  const recents   = usePreferencesStore((s) => s.recents);
  const favorites = usePreferencesStore((s) => s.favorites);
  const { isFavorite, toggleFavorite } = usePreferencesStore();

  const { results: searchResults, isLoading: searchLoading } = useIngredientSearch(query);

  useEffect(() => {
    if (open) {
      setSelected(null);
      setTimeout(() => inputRef.current?.focus(), 60);
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

  const activeList: SavedFood[] = (
    tab === "search"    ? searchResults :
    tab === "common"    ? COMMON_FOODS :
    tab === "recent"    ? recents :
    /* favorites */       favorites
  );

  const TABS: { id: TabId; label: string }[] = [
    { id: "common",    label: "Common"    },
    { id: "search",    label: "Search"    },
    { id: "recent",    label: "Recent"    },
    { id: "favorites", label: "Favorites" },
  ];

  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0,
        background: "rgba(10,10,10,0.45)",
        zIndex: 40,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
        animation: "popfade 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "var(--bg)",
          color: "var(--ink)",
          border: "1px solid var(--ink)",
          width: "min(720px, calc(100vw - 60px))",
          boxShadow: "12px 12px 0 var(--accent)",
          maxHeight: "70vh",
          display: "flex", flexDirection: "column",
          animation: "popslide 0.26s cubic-bezier(.2,.7,.1,1)",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "18px 22px 8px" }}>
          <div className="pl-display" style={{ fontSize: 28 }}>
            add an ingredient
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "var(--ink-3)", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Tabs + search */}
        <div style={{ display: "flex", gap: 18, padding: "0 22px", borderBottom: "1px solid var(--hair)", alignItems: "flex-end" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelected(null); }}
              style={{
                background: "transparent", border: "none",
                padding: "10px 0", cursor: "pointer",
                fontFamily: "var(--f-body)",
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                borderBottom: tab === id ? "3px solid var(--accent)" : "3px solid transparent",
                color: tab === id ? "var(--ink)" : "var(--ink-3)",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </button>
          ))}

          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTab("search"); setSelected(null); }}
            placeholder="search USDA database…"
            style={{
              marginLeft: "auto", marginBottom: 6,
              background: "transparent", border: "none", outline: "none",
              fontFamily: "var(--f-body)", fontSize: 14,
              padding: "8px 0", width: 260,
              borderBottom: "1px solid var(--hair-strong)",
              fontStyle: "italic",
              color: "var(--ink)",
            }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {tab === "search" && searchLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 22px", color: "var(--ink-3)" }}>
              <Spinner size={14} /> Searching…
            </div>
          )}

          {activeList.length === 0 && !searchLoading && (
            <p className="pl-display" style={{ padding: "16px 22px", color: "var(--ink-3)", fontSize: 16 }}>
              {tab === "recent"    ? "No recents yet." :
               tab === "favorites" ? "No favorites yet — star an ingredient to save it." :
               tab === "search"    ? (query.length >= 2 ? `No results for "${query}".` : "Type to search the USDA database.") :
               "No items."}
            </p>
          )}

          <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
            {activeList.map((food, i) => {
              const fav = isFavorite(food.fdc_id);
              // On the Common tab, COMMON_FOODS carries a `category` field
              // and is already grouped — inject a header whenever the
              // category changes from the previous row.
              const cat = tab === "common" ? (food as { category?: string }).category : undefined;
              const prevCat = tab === "common" && i > 0
                ? (activeList[i - 1] as { category?: string }).category
                : undefined;
              const showHeader = cat && cat !== prevCat;

              return (
                <Fragment key={food.fdc_id}>
                  {showHeader && (
                    <li
                      style={{
                        padding: "14px 22px 6px",
                        fontSize: 10, letterSpacing: "0.16em",
                        fontFamily: "var(--f-mono)", color: "var(--ink-3)",
                        textTransform: "uppercase",
                        background: "var(--surface)",
                        borderBottom: "1px solid var(--hair)",
                      }}
                    >
                      {cat}
                    </li>
                  )}
                  <li
                    style={{
                      display: "flex", justifyContent: "space-between", alignItems: "center",
                      padding: "10px 22px", borderBottom: "1px solid var(--hair)",
                      cursor: "pointer",
                    }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = "color-mix(in srgb, var(--accent) 6%, transparent)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = ""; }}
                    onClick={() => setSelected(food)}
                  >
                    <span className="pl-display" style={{ fontSize: 20, color: "var(--ink)" }}>
                      {food.name}
                    </span>
                    <button
                      onClick={(e) => { e.stopPropagation(); toggleFavorite(food); }}
                      style={{
                        background: "transparent", border: "none", cursor: "pointer",
                        color: fav ? "var(--accent)" : "var(--ink-3)", fontSize: 18, padding: "0 4px",
                      }}
                      aria-label={fav ? "Unfavorite" : "Favorite"}
                    >
                      {fav ? "★" : "☆"}
                    </button>
                  </li>
                </Fragment>
              );
            })}
          </ul>
        </div>

        {selected && (
          <AddForm food={selected} onClose={() => { setSelected(null); onClose(); }} />
        )}
      </div>
    </div>
  );
}
