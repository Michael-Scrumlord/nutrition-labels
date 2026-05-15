// search/IngredientSearch.tsx
//
// Pop ingredient picker — modal drawer that overlays the page.
// Tabs: Search (USDA) / Common / Recent / Favorites.
// Selecting a food drops into an inline add-form inside the modal.

import { useState, useRef, useEffect } from "react";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useIngredientSearch } from "../../hooks/useIngredientSearch";
import { useQuery } from "@tanstack/react-query";
import { getFoodDetail } from "../../api/client";
import { useRecipeStore } from "../../store/recipeStore";
import { Spinner } from "../ui/Spinner";
import type { FoodSearchResult, SavedFood } from "../../types";

const ACCENT = "var(--color-accent)";
const INK    = "#0a0a0a";

const COMMON_FOODS: SavedFood[] = [
  { fdc_id: 1097512, name: "Butter, unsalted"            },
  { fdc_id: 1097517, name: "Eggs, whole, raw"            },
  { fdc_id: 1104330, name: "Sugar, granulated white"     },
  { fdc_id: 1100209, name: "All-purpose flour, white"    },
  { fdc_id: 1097516, name: "Whole milk"                  },
  { fdc_id: 1097514, name: "Cream cheese"                },
  { fdc_id: 1104332, name: "Honey"                       },
  { fdc_id: 1102201, name: "Baking powder"               },
  { fdc_id: 1102203, name: "Salt, table"                 },
  { fdc_id: 1102204, name: "Vanilla extract"             },
  { fdc_id: 1103301, name: "Olive oil"                   },
  { fdc_id: 1105001, name: "Chicken breast, raw"         },
  { fdc_id: 1105002, name: "Ground beef, 80% lean, raw"  },
  { fdc_id: 1100216, name: "Cocoa powder, unsweetened"   },
  { fdc_id: 1108001, name: "Chocolate chips, semi-sweet" },
];

type TabId = "search" | "common" | "recent" | "favorites";

// ── Inline add-form ──────────────────────────────────────────────────────────

function AddForm({ food, onClose }: { food: FoodSearchResult; onClose: () => void }) {
  const [grams, setGrams] = useState("100");
  const addIngredient = useRecipeStore((s) => s.addIngredient);
  const addRecent     = usePreferencesStore((s) => s.addRecent);

  const { data: detail, isLoading, isError } = useQuery({
    queryKey: ["food", food.fdc_id],
    queryFn:  () => getFoodDetail(food.fdc_id),
    staleTime: Infinity,
  });

  function handleAdd() {
    if (!detail) return;
    const g = parseFloat(grams);
    if (isNaN(g) || g <= 0) return;
    addIngredient({ fdc_id: food.fdc_id, name: food.name, amount: g, unit: "g", baseMacros: detail.macros });
    addRecent({ fdc_id: food.fdc_id, name: food.name });
    onClose();
  }

  return (
    <div style={{ padding: "16px 22px", borderTop: "1px solid #ebebeb", background: "#fafafa" }}>
      <p style={{ margin: "0 0 10px", fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 20 }}>
        {food.name}
      </p>

      <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
        <label style={{ display: "grid", gap: 4 }}>
          <span style={{ fontSize: 10, letterSpacing: "0.14em", color: "#999", fontFamily: "'JetBrains Mono', monospace" }}>GRAMS</span>
          <input
            type="number" min="0.1" step="any"
            value={grams}
            onChange={(e) => setGrams(e.target.value)}
            autoFocus
            style={{
              width: 90, padding: "8px 10px", border: `1px solid ${INK}`,
              fontFamily: "'JetBrains Mono', monospace", fontSize: 18, fontWeight: 700,
              background: "#fff", outline: "none",
            }}
          />
        </label>

        {isLoading && <Spinner size={16} />}
        {isError   && <span style={{ fontSize: 11, color: "var(--color-danger)" }}>Failed to load</span>}

        <button
          onClick={handleAdd}
          disabled={!detail || isLoading}
          style={{
            background: detail && !isLoading ? ACCENT : "#e5e5e5",
            color: detail && !isLoading ? "#fff" : "#bbb",
            border: "none", padding: "10px 20px", cursor: detail ? "pointer" : "default",
            fontFamily: "'Inter Tight', sans-serif", fontWeight: 700,
            letterSpacing: "0.12em", fontSize: 12,
          }}
        >
          ADD TO RECIPE
        </button>
        <button
          onClick={onClose}
          style={{
            background: "transparent", border: `1px solid ${INK}`,
            padding: "10px 14px", cursor: "pointer",
            fontFamily: "'Inter Tight', sans-serif", fontWeight: 600,
            fontSize: 11, letterSpacing: "0.08em",
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
        background: "rgba(10,10,10,0.18)",
        zIndex: 40,
        display: "flex", alignItems: "flex-start", justifyContent: "center",
        paddingTop: 80,
        animation: "popfade 0.18s ease",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: "#ffffff",
          border: `1px solid ${INK}`,
          width: "min(720px, calc(100vw - 60px))",
          boxShadow: `12px 12px 0 var(--color-accent)`,
          maxHeight: "70vh",
          display: "flex", flexDirection: "column",
          animation: "popslide 0.26s cubic-bezier(.2,.7,.1,1)",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", padding: "18px 22px 8px" }}>
          <div style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 28, letterSpacing: "-0.02em" }}>
            add an ingredient
          </div>
          <button
            onClick={onClose}
            style={{ background: "transparent", border: "none", fontSize: 20, cursor: "pointer", color: "#bbb", lineHeight: 1 }}
          >
            ×
          </button>
        </div>

        {/* Tabs + search */}
        <div style={{ display: "flex", gap: 18, padding: "0 22px", borderBottom: "1px solid #ebebeb", alignItems: "flex-end" }}>
          {TABS.map(({ id, label }) => (
            <button
              key={id}
              onClick={() => { setTab(id); setSelected(null); }}
              style={{
                background: "transparent", border: "none",
                padding: "10px 0", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif",
                fontSize: 13, fontWeight: tab === id ? 700 : 500,
                borderBottom: tab === id ? `3px solid ${ACCENT}` : "3px solid transparent",
                color: tab === id ? INK : "#999",
                letterSpacing: "0.02em",
              }}
            >
              {label}
            </button>
          ))}

          {/* Search input — always visible */}
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => { setQuery(e.target.value); setTab("search"); setSelected(null); }}
            placeholder="search USDA database…"
            style={{
              marginLeft: "auto", marginBottom: 6,
              background: "transparent", border: "none", outline: "none",
              fontFamily: "'Inter Tight', sans-serif", fontSize: 14,
              padding: "8px 0", width: 260,
              borderBottom: "1px solid #d0d0d0",
              fontStyle: "italic",
            }}
          />
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {tab === "search" && searchLoading && (
            <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "16px 22px", color: "#999" }}>
              <Spinner size={14} /> Searching…
            </div>
          )}

          {activeList.length === 0 && !searchLoading && (
            <p style={{ padding: "16px 22px", color: "#bbb", fontStyle: "italic", fontFamily: "'Instrument Serif', Georgia, serif", fontSize: 16 }}>
              {tab === "recent"    ? "No recents yet." :
               tab === "favorites" ? "No favorites yet — star an ingredient to save it." :
               tab === "search"    ? "Type to search the USDA database." :
               "No items."}
            </p>
          )}

          <ul style={{ listStyle: "none", margin: 0, padding: "8px 0" }}>
            {activeList.map((food) => {
              const fav = isFavorite(food.fdc_id);
              return (
                <li
                  key={food.fdc_id}
                  style={{
                    display: "flex", justifyContent: "space-between", alignItems: "center",
                    padding: "10px 22px", borderBottom: "1px solid #f0f0f0",
                    cursor: "pointer",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = "var(--color-accent-blush)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = ""; }}
                  onClick={() => setSelected(food)}
                >
                  <span style={{ fontFamily: "'Instrument Serif', Georgia, serif", fontStyle: "italic", fontSize: 20 }}>
                    {food.name}
                  </span>
                  <button
                    onClick={(e) => { e.stopPropagation(); toggleFavorite(food); }}
                    style={{
                      background: "transparent", border: "none", cursor: "pointer",
                      color: fav ? ACCENT : "#ddd", fontSize: 18, padding: "0 4px",
                    }}
                    aria-label={fav ? "Unfavorite" : "Favorite"}
                  >
                    {fav ? "★" : "☆"}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Add form (when a food is selected) */}
        {selected && (
          <AddForm food={selected} onClose={() => { setSelected(null); onClose(); }} />
        )}
      </div>
    </div>
  );
}
