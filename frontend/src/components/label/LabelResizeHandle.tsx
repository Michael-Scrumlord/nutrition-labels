// label/LabelResizeHandle.tsx
//
// Edge and corner grips that let the user drag-resize the label preview.
// All three variants share useLabelResize — they only differ in which
// axes they pass through and how they're styled.

import { useLabelResize } from "../../hooks/useLabelResize";

type Variant = "corner" | "east" | "south";

const COMMON: React.CSSProperties = {
  position: "absolute",
  background: "var(--accent)",
  opacity: 0.55,
  borderRadius: 2,
  touchAction: "none",
  zIndex: 2,
  transition: "opacity 0.15s ease, transform 0.15s ease",
};

const VARIANT_STYLE: Record<Variant, React.CSSProperties> = {
  // Bottom-right corner — 2D resize
  corner: {
    right: -6, bottom: -6,
    width: 14, height: 14,
    cursor: "nwse-resize",
    borderRadius: 3,
  },
  // Right edge — width only
  east: {
    right: -4,
    top: "50%",
    transform: "translateY(-50%)",
    width: 7, height: 44,
    cursor: "ew-resize",
  },
  // Bottom edge — height only
  south: {
    bottom: -4,
    left: "50%",
    transform: "translateX(-50%)",
    width: 44, height: 7,
    cursor: "ns-resize",
  },
};

export function LabelResizeHandle({ variant }: { variant: Variant }) {
  const { onPointerDownCorner, onPointerDownEast, onPointerDownSouth } = useLabelResize();
  const onPointerDown =
    variant === "corner" ? onPointerDownCorner :
    variant === "east"   ? onPointerDownEast :
                           onPointerDownSouth;

  const title =
    variant === "corner" ? "Drag to resize width and height" :
    variant === "east"   ? "Drag to resize width" :
                           "Drag to resize height";

  return (
    <div
      role="separator"
      aria-orientation={variant === "south" ? "horizontal" : "vertical"}
      title={title}
      onPointerDown={onPointerDown}
      style={{ ...COMMON, ...VARIANT_STYLE[variant] }}
      onPointerEnter={(e) => { (e.currentTarget as HTMLElement).style.opacity = "1"; }}
      onPointerLeave={(e) => { (e.currentTarget as HTMLElement).style.opacity = "0.55"; }}
    />
  );
}
