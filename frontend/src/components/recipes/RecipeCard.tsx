// recipes/RecipeCard.tsx
//
// A single saved recipe row inside the RecipesModal. Supports inline rename,
// inline load confirmation, and inline delete confirmation.

import { useState } from "react";
import type { SavedRecipe } from "../../types";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useRecipeStore } from "../../store/recipeStore";
import { ACCENT, INK } from "../../constants/theme";

interface RecipeCardProps {
  recipe: SavedRecipe;
  index:  number;
  onLoad: () => void;
}

export function RecipeCard({ recipe, index, onLoad }: RecipeCardProps) {
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [confirmLoad,   setConfirmLoad]   = useState(false);
  const [editingName,   setEditingName]   = useState(false);
  const [draftName,     setDraftName]     = useState(recipe.name);

  const deleteRecipe  = useSavedRecipesStore((s) => s.deleteRecipe);
  const renameRecipe  = useSavedRecipesStore((s) => s.renameRecipe);
  const ingredients   = useRecipeStore((s) => s.ingredients);
  const loadRecipe    = useRecipeStore((s) => s.loadRecipe);

  function handleLoadClick() {
    if (ingredients.length > 0) {
      setConfirmLoad(true);
    } else {
      doLoad();
    }
  }

  function doLoad() {
    loadRecipe(recipe);
    onLoad();
  }

  function handleRenameBlur() {
    setEditingName(false);
    const trimmed = draftName.trim();
    if (trimmed && trimmed !== recipe.name) {
      renameRecipe(recipe.id, trimmed);
    } else {
      setDraftName(recipe.name);
    }
  }

  const indexStr  = String(index + 1).padStart(2, "0");
  const savedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(recipe.savedAt));
  const ingCount  = recipe.ingredients.length;

  return (
    <li
      style={{
        display: "flex",
        gap: 20,
        padding: "18px 24px",
        borderBottom: "1px solid #ebebeb",
        alignItems: "flex-start",
        animation: "popfade 0.2s ease",
      }}
      onMouseEnter={(e) => { (e.currentTarget as HTMLLIElement).style.background = "var(--color-accent-blush)"; }}
      onMouseLeave={(e) => { (e.currentTarget as HTMLLIElement).style.background = ""; }}
    >
      {/* Big italic index numeral */}
      <span
        style={{
          fontFamily: "'Instrument Serif', Georgia, serif",
          fontStyle: "italic",
          fontSize: 36,
          color: "var(--color-text-tertiary)",
          lineHeight: 1,
          minWidth: 40,
          userSelect: "none",
        }}
      >
        {indexStr}
      </span>

      {/* Main content */}
      <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 4, minWidth: 0 }}>

        {/* Recipe name (editable inline) */}
        {editingName ? (
          <input
            autoFocus
            value={draftName}
            onChange={(e) => setDraftName(e.target.value)}
            onBlur={handleRenameBlur}
            onKeyDown={(e) => {
              if (e.key === "Enter")  handleRenameBlur();
              if (e.key === "Escape") { setDraftName(recipe.name); setEditingName(false); }
            }}
            style={{
              background: "transparent",
              border: "none",
              borderBottom: `1px solid ${INK}`,
              outline: "none",
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: 22,
              color: INK,
              padding: "0 0 2px",
              width: "100%",
            }}
          />
        ) : (
          <span
            title="Click to rename"
            onClick={() => { setEditingName(true); setDraftName(recipe.name); }}
            style={{
              fontFamily: "'Instrument Serif', Georgia, serif",
              fontStyle: "italic",
              fontSize: 22,
              color: INK,
              cursor: "text",
              whiteSpace: "nowrap",
              overflow: "hidden",
              textOverflow: "ellipsis",
            }}
          >
            {recipe.name || "Untitled Recipe"}
          </span>
        )}

        {/* Metadata */}
        <span
          style={{
            fontFamily: "'JetBrains Mono', monospace",
            fontSize: 10,
            color: "var(--color-text-tertiary)",
            letterSpacing: "0.12em",
          }}
        >
          {ingCount} INGREDIENT{ingCount !== 1 ? "S" : ""} · {recipe.portionDivisor} SERVING{recipe.portionDivisor !== 1 ? "S" : ""} · {savedDate}
        </span>

        {/* Inline load confirmation */}
        {confirmLoad && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap", animation: "popfade 0.14s ease" }}>
            <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 11, color: "#666" }}>
              Replace your current recipe?
            </span>
            <button
              onClick={doLoad}
              style={{
                background: ACCENT, color: "#fff", border: "none",
                padding: "5px 10px", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 700,
                fontSize: 10, letterSpacing: "0.1em",
              }}
            >
              YES, LOAD
            </button>
            <button
              onClick={() => setConfirmLoad(false)}
              style={{
                background: "transparent", border: `1px solid ${INK}`,
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 600,
                fontSize: 10, letterSpacing: "0.08em",
              }}
            >
              CANCEL
            </button>
          </div>
        )}

        {/* Inline delete confirmation */}
        {confirmDelete && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap", animation: "popfade 0.14s ease" }}>
            <span style={{ fontFamily: "'Inter Tight', sans-serif", fontSize: 11, color: "#666" }}>
              Delete this recipe? This can&apos;t be undone.
            </span>
            <button
              onClick={() => deleteRecipe(recipe.id)}
              style={{
                background: "var(--color-danger)", color: "#fff", border: "none",
                padding: "5px 10px", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 700,
                fontSize: 10, letterSpacing: "0.1em",
              }}
            >
              DELETE
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: "transparent", border: `1px solid ${INK}`,
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "'Inter Tight', sans-serif", fontWeight: 600,
                fontSize: 10, letterSpacing: "0.08em",
              }}
            >
              CANCEL
            </button>
          </div>
        )}
      </div>

      {/* Action buttons (hidden while a confirmation is shown) */}
      {!confirmLoad && !confirmDelete && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleLoadClick}
            style={{
              background: ACCENT, color: "#fff", border: "none",
              padding: "8px 14px", cursor: "pointer",
              fontFamily: "'Inter Tight', sans-serif", fontWeight: 700,
              fontSize: 11, letterSpacing: "0.1em",
            }}
          >
            LOAD
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete recipe"
            style={{
              background: "transparent", border: "none",
              color: "#ccc", fontSize: 20,
              cursor: "pointer", lineHeight: 1, padding: "4px 6px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}
