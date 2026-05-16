// recipes/RecipeCard.tsx
//
// A single saved recipe row inside the RecipesModal. Shows the latest version's
// summary, supports inline rename, inline load confirmation, inline delete,
// and an expandable timeline of all versions.

import { useState } from "react";
import type { SavedRecipe } from "../../types";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useRecipeStore } from "../../store/recipeStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { useActiveTheme } from "../../store/themeStore";
import { VersionTimeline } from "./VersionTimeline";

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
  const [expanded,      setExpanded]      = useState(false);

  const deleteRecipe    = useSavedRecipesStore((s) => s.deleteRecipe);
  const renameRecipe    = useSavedRecipesStore((s) => s.renameRecipe);
  const ingredients     = useRecipeStore((s) => s.ingredients);
  const currentRecipeId = useRecipeStore((s) => s.currentRecipeId);
  const { loadRecipe }  = useRecipeActions();
  const { def: themeDef } = useActiveTheme();

  const latest = recipe.versions.length > 0
    ? recipe.versions[recipe.versions.length - 1]
    : undefined;
  if (!latest) return null;

  const isCurrent = currentRecipeId === recipe.id;
  const ingCount  = latest.ingredients.length;
  const versionCount = recipe.versions.length;
  const indexStr  = String(index + 1).padStart(2, "0");
  const savedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" }).format(new Date(latest.savedAt));

  function handleLoadClick() {
    if (ingredients.length > 0 && !isCurrent) {
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

  const ctaTextColor = themeDef.oled ? "#000" : "#fff";

  return (
    <li
      style={{
        display: "flex",
        gap: 20,
        padding: "18px 24px",
        borderBottom: "1px solid var(--hair)",
        alignItems: "flex-start",
        animation: "popfade 0.2s ease",
        background: isCurrent ? "color-mix(in srgb, var(--accent) 6%, transparent)" : "transparent",
      }}
    >
      {/* Index numeral — display face */}
      <span
        className="pl-display"
        style={{
          fontSize: 36,
          color: "var(--ink-3)",
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
            className="pl-display"
            style={{
              background: "transparent",
              border: "none",
              borderBottom: "1px solid var(--ink)",
              outline: "none",
              fontSize: 22,
              color: "var(--ink)",
              padding: "0 0 2px",
              width: "100%",
            }}
          />
        ) : (
          <span
            title="Click to rename"
            onClick={() => { setEditingName(true); setDraftName(recipe.name); }}
            className="pl-display"
            style={{
              fontSize: 22,
              color: "var(--ink)",
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
        <div style={{ display: "flex", gap: 14, alignItems: "baseline", flexWrap: "wrap" }}>
          <span className="pl-meta" style={{ letterSpacing: "0.12em" }}>
            {ingCount} INGREDIENT{ingCount !== 1 ? "S" : ""} · {latest.portionDivisor} SERVING{latest.portionDivisor !== 1 ? "S" : ""}
            {latest.instructions.length > 0 && ` · ${latest.instructions.length} STEP${latest.instructions.length !== 1 ? "S" : ""}`}
          </span>
          <button
            onClick={() => setExpanded(!expanded)}
            className="pl-meta"
            style={{
              background: "transparent", border: "none",
              cursor: "pointer", padding: 0,
              letterSpacing: "0.14em",
              color: "var(--accent)",
              fontWeight: 700,
            }}
          >
            {versionCount} VERSION{versionCount !== 1 ? "S" : ""} {expanded ? "▴" : "▾"}
          </button>
        </div>
        <span className="pl-meta" style={{ letterSpacing: "0.12em" }}>
          LATEST {savedDate}
          {latest.note && <span style={{ color: "var(--ink-2)" }}> · &ldquo;{latest.note}&rdquo;</span>}
        </span>

        {/* Version timeline (expanded) */}
        {expanded && <VersionTimeline recipe={recipe} onView={onLoad} />}

        {/* Inline load confirmation */}
        {confirmLoad && (
          <div style={{ display: "flex", gap: 8, alignItems: "center", marginTop: 6, flexWrap: "wrap", animation: "popfade 0.14s ease" }}>
            <span style={{ fontFamily: "var(--f-body)", fontSize: 11, color: "var(--ink-2)" }}>
              Replace your current recipe?
            </span>
            <button
              onClick={doLoad}
              style={{
                background: "var(--accent)", color: ctaTextColor, border: "none",
                padding: "5px 10px", cursor: "pointer",
                fontFamily: "var(--f-body)", fontWeight: 700,
                fontSize: 10, letterSpacing: "0.1em",
              }}
            >
              YES, LOAD
            </button>
            <button
              onClick={() => setConfirmLoad(false)}
              style={{
                background: "transparent", border: "1px solid var(--ink)",
                color: "var(--ink)",
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "var(--f-body)", fontWeight: 600,
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
            <span style={{ fontFamily: "var(--f-body)", fontSize: 11, color: "var(--ink-2)" }}>
              Delete this recipe and all {versionCount} version{versionCount !== 1 ? "s" : ""}?
            </span>
            <button
              onClick={() => deleteRecipe(recipe.id)}
              style={{
                background: "var(--color-danger)", color: "#fff", border: "none",
                padding: "5px 10px", cursor: "pointer",
                fontFamily: "var(--f-body)", fontWeight: 700,
                fontSize: 10, letterSpacing: "0.1em",
              }}
            >
              DELETE
            </button>
            <button
              onClick={() => setConfirmDelete(false)}
              style={{
                background: "transparent", border: "1px solid var(--ink)",
                color: "var(--ink)",
                padding: "4px 10px", cursor: "pointer",
                fontFamily: "var(--f-body)", fontWeight: 600,
                fontSize: 10, letterSpacing: "0.08em",
              }}
            >
              CANCEL
            </button>
          </div>
        )}
      </div>

      {/* Action buttons */}
      {!confirmLoad && !confirmDelete && (
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexShrink: 0 }}>
          <button
            onClick={handleLoadClick}
            disabled={isCurrent}
            style={{
              background: isCurrent ? "transparent" : "var(--accent)",
              color: isCurrent ? "var(--ink-3)" : ctaTextColor,
              border: isCurrent ? "1px solid var(--hair-strong)" : "none",
              padding: "8px 14px",
              cursor: isCurrent ? "default" : "pointer",
              fontFamily: "var(--f-body)", fontWeight: 700,
              fontSize: 11, letterSpacing: "0.1em",
            }}
          >
            {isCurrent ? "LOADED" : "LOAD"}
          </button>
          <button
            onClick={() => setConfirmDelete(true)}
            aria-label="Delete recipe"
            style={{
              background: "transparent", border: "none",
              color: "var(--ink-3)", fontSize: 20,
              cursor: "pointer", lineHeight: 1, padding: "4px 6px",
            }}
            onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
            onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--ink-3)"; }}
          >
            ×
          </button>
        </div>
      )}
    </li>
  );
}
