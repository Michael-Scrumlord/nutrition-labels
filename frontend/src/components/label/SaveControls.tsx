// label/SaveControls.tsx
//
// Save / version / reset controls rendered at the bottom of LabelColumn.
// Owns the optional "note" input that appears on hover when a recipe is loaded.

import { useState } from "react";

export interface SaveControlsProps {
  canSave: boolean;
  isLoaded: boolean;
  versionCount: number;
  viewingVersionId: string | null;
  lastSavedRel: string | null;
  savedRecipeName: string | undefined;
  onSaveVersion: () => void;
  onSaveAsNew: () => void;
  onReset: () => void;
  feedback: string | null;
}

export function SaveControls({
  canSave, isLoaded, versionCount, viewingVersionId,
  lastSavedRel, savedRecipeName,
  onSaveVersion, onSaveAsNew, onReset, feedback,
}: SaveControlsProps) {
  const [noteOpen, setNoteOpen] = useState(false);
  const [note, setNote]         = useState("");

  function handleSave() {
    onSaveVersion();
    setNote("");
    setNoteOpen(false);
  }

  return (
    <div
      style={{
        width: "100%", maxWidth: 380,
        display: "flex", flexDirection: "column", gap: 8,
        padding: "12px 0 0",
        borderTop: "1px solid var(--hair)",
      }}
    >
      {isLoaded && (
        <div className="pl-meta" style={{ fontSize: 9, lineHeight: 1.5, color: "var(--ink-3)" }}>
          EDITING — <span style={{ color: "var(--ink)", fontWeight: 700 }}>{savedRecipeName?.toUpperCase()}</span>
          <br />
          v{versionCount} {viewingVersionId ? "· VIEWING OLDER" : `· SAVED ${lastSavedRel?.toUpperCase()}`}
        </div>
      )}

      {noteOpen && (
        <input
          value={note}
          onChange={(e) => setNote(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === "Enter") { e.preventDefault(); handleSave(); }
            if (e.key === "Escape") { setNoteOpen(false); setNote(""); }
          }}
          placeholder="what changed? (optional)"
          autoFocus
          style={{
            padding: "8px 10px",
            border: "1px solid var(--ink)",
            background: "var(--bg)",
            color: "var(--ink)",
            outline: "none",
            fontFamily: "var(--f-display)",
            fontStyle: "var(--f-display-style)",
            fontSize: 13,
          }}
        />
      )}

      <button
        onClick={handleSave}
        onMouseEnter={() => { if (isLoaded && !feedback) setNoteOpen(true); }}
        disabled={!canSave}
        style={{
          background: feedback
            ? "var(--color-success)"
            : canSave
            ? "transparent"
            : "color-mix(in srgb, var(--ink) 6%, transparent)",
          color: feedback
            ? "#ffffff"
            : canSave
            ? "var(--ink)"
            : "var(--ink-3)",
          border: `1px solid ${canSave ? "var(--ink)" : "var(--hair)"}`,
          padding: "10px 14px",
          fontFamily: "var(--f-body)",
          fontWeight: 700,
          letterSpacing: "0.08em",
          fontSize: 11,
          textTransform: "uppercase",
          cursor: canSave ? "pointer" : "not-allowed",
          transition: "background 0.2s ease",
          animation: feedback ? "popPulse 0.42s ease-out" : "none",
        }}
      >
        {feedback ?? (isLoaded ? "SAVE NEW VERSION" : "SAVE RECIPE")}
      </button>

      {isLoaded && (
        <button
          onClick={onSaveAsNew}
          disabled={!canSave}
          style={{
            background: "transparent",
            border: "1px solid var(--hair-strong)",
            padding: "8px 14px",
            fontFamily: "var(--f-body)",
            fontWeight: 600,
            letterSpacing: "0.08em",
            fontSize: 10,
            cursor: canSave ? "pointer" : "not-allowed",
            color: "var(--ink-2)",
            textTransform: "uppercase",
          }}
        >
          SAVE AS NEW
        </button>
      )}

      <button
        onClick={onReset}
        style={{
          background: "transparent",
          border: "1px solid var(--hair-strong)",
          padding: "8px 14px",
          fontFamily: "var(--f-body)",
          fontWeight: 600,
          letterSpacing: "0.08em",
          fontSize: 10,
          textTransform: "uppercase",
          cursor: "pointer",
          color: "var(--ink-2)",
        }}
      >
        RESET RECIPE
      </button>
    </div>
  );
}
