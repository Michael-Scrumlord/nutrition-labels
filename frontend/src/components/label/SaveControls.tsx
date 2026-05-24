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
        display: "flex", flexDirection: "column", gap: 6,
        padding: "14px 0 0",
        borderTop: "1px solid var(--hair)",
      }}
    >
      <div className="sig-static pl-meta" style={{ marginBottom: 2, lineHeight: 1.5 }}>
        EDITING ·{" "}
        {isLoaded ? (
          <span style={{ color: "var(--ink)", fontWeight: 700 }}>{savedRecipeName?.toUpperCase()}</span>
        ) : (
          "UNTITLED RECIPE"
        )}
        {isLoaded && (
          <>
            <br />
            v{versionCount} {viewingVersionId ? "· VIEWING OLDER" : `· SAVED ${lastSavedRel?.toUpperCase()}`}
          </>
        )}
      </div>

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
          className="sig-editable sig-input"
          style={{
            width: "100%",
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
        className="sig-btn"
        style={{
          width: "100%",
          justifyContent: "flex-start",
          background: feedback ? "var(--color-success)" : undefined,
          color: feedback ? "#ffffff" : undefined,
          borderColor: feedback ? "var(--color-success)" : undefined,
          boxShadow: feedback ? "2px 2px 0 0 var(--color-success)" : undefined,
          animation: feedback ? "popPulse 0.42s ease-out" : "none",
        }}
      >
        {feedback ?? (isLoaded ? "Save new version" : "Save recipe")}
      </button>

      {isLoaded && (
        <button
          onClick={onSaveAsNew}
          disabled={!canSave}
          className="sig-btn"
          style={{ width: "100%", justifyContent: "flex-start" }}
        >
          Save as new
        </button>
      )}

      <button
        onClick={onReset}
        className="sig-btn sig-ghost"
        style={{ width: "100%", justifyContent: "flex-start" }}
      >
        Reset recipe
      </button>
    </div>
  );
}
