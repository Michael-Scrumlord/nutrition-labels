// recipes/RecipesModal.tsx
//
// Modal overlay showing the saved recipe catalog. Follows the same visual
// pattern as IngredientSearch — fixed backdrop, popslide animation, Escape to close.

import { useEffect } from "react";
import { useSavedRecipesStore } from "../../store/savedRecipesStore";
import { RecipeCard } from "./RecipeCard";

interface RecipesModalProps {
  open:    boolean;
  onClose: () => void;
}

export function RecipesModal({ open, onClose }: RecipesModalProps) {
  const recipes = useSavedRecipesStore((s) => s.recipes);

  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, onClose]);

  if (!open) return null;

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
          width: "min(680px, calc(100vw - 60px))",
          boxShadow: "12px 12px 0 var(--accent)",
          maxHeight: "70vh",
          display: "flex",
          flexDirection: "column",
          animation: "popslide 0.26s cubic-bezier(.2,.7,.1,1)",
        }}
      >
        {/* Modal header */}
        <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", padding: "18px 24px 14px" }}>
          <div>
            <div className="pl-display" style={{ fontSize: 28, lineHeight: 1 }}>
              my recipes
            </div>
            <div className="pl-meta" style={{ marginTop: 6, letterSpacing: "0.18em" }}>
              {recipes.length} SAVED RECIPE{recipes.length !== 1 ? "S" : ""}
            </div>
          </div>
          <button
            onClick={onClose}
            style={{
              background: "transparent", border: "none",
              fontSize: 20, cursor: "pointer",
              color: "var(--ink-3)", lineHeight: 1, padding: "0 0 0 12px",
            }}
          >
            ×
          </button>
        </div>

        <div style={{ borderTop: "1px solid var(--hair)" }} />

        {/* Recipe list */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {recipes.length === 0 ? (
            <div style={{ padding: "52px 24px", textAlign: "center" }}>
              <p className="pl-display" style={{ fontSize: 22, color: "var(--ink-3)", margin: "0 0 10px" }}>
                No saved recipes yet.
              </p>
              <p
                style={{
                  fontFamily: "var(--f-body)",
                  fontSize: 12,
                  color: "var(--ink-3)",
                  margin: 0,
                  letterSpacing: "0.04em",
                }}
              >
                Build something delicious and save it here.
              </p>
            </div>
          ) : (
            <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
              {recipes.map((recipe, i) => (
                <RecipeCard
                  key={recipe.id}
                  recipe={recipe}
                  index={i}
                  onLoad={onClose}
                />
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
