// recipes/VersionTimeline.tsx
//
// Vertical timeline of all versions of a recipe.
// Each row: dot · vN label · timestamp · optional note · VIEW button.

import type { SavedRecipe, RecipeVersion } from "../../types";
import { useRecipeStore } from "../../store/recipeStore";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { useRecipeActions } from "../../hooks/useRecipeActions";
import { ACCENT, INK } from "../../constants/theme";

interface VersionTimelineProps {
  recipe: SavedRecipe;
  onView: () => void;
}

export function VersionTimeline({ recipe, onView }: VersionTimelineProps) {
  const currentRecipeId  = useRecipeStore((s) => s.currentRecipeId);
  const viewingVersionId = useRecipeStore((s) => s.viewingVersionId);
  const { loadVersion }  = useRecipeActions();
  const deleteVersion    = useSavedRecipesStore((s) => s.deleteVersion);

  // Render newest first
  const versionsDesc = [...recipe.versions].reverse();
  const isLoadedRecipe = currentRecipeId === recipe.id;
  const latestId = recipe.versions.length > 0
    ? recipe.versions[recipe.versions.length - 1].id
    : undefined;

  function handleView(version: RecipeVersion) {
    loadVersion(recipe, version);
    onView();
  }

  return (
    <div style={{
      marginTop: 10,
      padding: "10px 0 4px 4px",
      borderLeft: `2px solid var(--color-accent-blush)`,
      animation: "popfade 0.18s ease",
    }}>
      {versionsDesc.map((v, i) => {
        const isLatest = v.id === latestId;
        const isCurrent = isLoadedRecipe && (
          viewingVersionId ? viewingVersionId === v.id : isLatest && !viewingVersionId
        );
        const vNum = recipe.versions.length - i;
        const date = new Intl.DateTimeFormat("en-US", {
          month: "short", day: "numeric",
          hour: "numeric", minute: "2-digit",
        }).format(new Date(v.savedAt));

        return (
          <div
            key={v.id}
            style={{
              display: "grid",
              gridTemplateColumns: "16px 1fr auto",
              gap: 10,
              alignItems: "flex-start",
              padding: "6px 4px 6px 0",
            }}
          >
            {/* Dot */}
            <span style={{
              display: "inline-block",
              width: 9, height: 9, borderRadius: "50%",
              marginTop: 4, marginLeft: -5,
              background: isCurrent ? ACCENT : "#fff",
              border: `2px solid ${isCurrent ? ACCENT : "#ccc"}`,
            }} />

            {/* Label + date + note */}
            <div style={{ minWidth: 0 }}>
              <div style={{
                display: "flex",
                gap: 8,
                alignItems: "baseline",
                fontFamily: "'JetBrains Mono', monospace",
                fontSize: 10,
                letterSpacing: "0.1em",
                color: "#666",
              }}>
                <span style={{ fontWeight: 700, color: INK }}>v{vNum}</span>
                {isLatest && (
                  <span style={{ color: ACCENT, letterSpacing: "0.16em" }}>LATEST</span>
                )}
                <span>· {date}</span>
              </div>
              {v.note && (
                <div style={{
                  fontFamily: "'Instrument Serif', Georgia, serif",
                  fontStyle: "italic",
                  fontSize: 14,
                  color: "#666",
                  marginTop: 2,
                  lineHeight: 1.3,
                }}>
                  &ldquo;{v.note}&rdquo;
                </div>
              )}
            </div>

            {/* Actions */}
            <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
              {!isCurrent && (
                <button
                  onClick={() => handleView(v)}
                  style={{
                    background: "transparent",
                    border: `1px solid ${INK}`,
                    padding: "3px 9px",
                    cursor: "pointer",
                    fontFamily: "'Inter Tight', sans-serif",
                    fontWeight: 700,
                    fontSize: 9,
                    letterSpacing: "0.12em",
                    color: INK,
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "var(--color-accent-blush)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
                >
                  VIEW
                </button>
              )}
              {recipe.versions.length > 1 && (
                <button
                  onClick={() => { if (confirm(`Delete version v${vNum}?`)) deleteVersion(recipe.id, v.id); }}
                  aria-label={`Delete version ${vNum}`}
                  style={{
                    background: "transparent",
                    border: "none",
                    color: "#ccc",
                    fontSize: 14,
                    cursor: "pointer",
                    lineHeight: 1,
                    padding: "2px 4px",
                  }}
                  onMouseEnter={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "var(--color-danger)"; }}
                  onMouseLeave={(e) => { (e.currentTarget as HTMLButtonElement).style.color = "#ccc"; }}
                >
                  ×
                </button>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
