// recipe/VersionBanner.tsx
//
// Alert strip shown when the user is previewing an older saved version.
// Saving while this banner is visible appends to the current latest —
// nothing in history is overwritten.

interface VersionBannerProps {
  onDismiss: () => void;
}

export function VersionBanner({ onDismiss }: VersionBannerProps) {
  return (
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
        onClick={onDismiss}
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
  );
}
