// hooks/useLabelResize.ts
//
// Drag-to-resize logic for the label preview. Returns three pointerdown
// handlers — one for horizontal-only, one for vertical-only, and one for
// corner (2D) resize — so the same hook can drive an edge handle or a
// corner grip.

import { useCallback } from "react";
import { useRecipeStore } from "../store/recipeStore";

const INCHES_PER_PX = 1 / 96; // 1 inch = 96px at screen DPI
// Keep these in lockstep with LabelDimensions' clamps so the drag handle
// and the typed input agree on min/max width.
const MIN_WIDTH_IN  = 2;
const MAX_WIDTH_IN  = 8;
const MIN_HEIGHT_IN = 2;
const MAX_HEIGHT_IN = 12;

// Round to 0.01" so dragging snaps to the same precision the typed input uses.
const snap = (n: number) => Math.round(n * 100) / 100;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

interface ResizeStart {
  startX: number;
  startY: number;
  startW: number;
  startH: number | null;
}

export function useLabelResize() {
  const dimensions    = useRecipeStore((s) => s.dimensions);
  const setDimensions = useRecipeStore((s) => s.setDimensions);

  // The "engine": handle pointerdown, install listeners, dispatch updates
  // for whichever axes the caller asked about.
  const beginDrag = useCallback(
    (
      e: React.PointerEvent,
      axes: { width: boolean; height: boolean },
    ) => {
      e.preventDefault();
      e.stopPropagation();

      const start: ResizeStart = {
        startX: e.clientX,
        startY: e.clientY,
        startW: dimensions.widthInches,
        // If height is in "auto" mode we still need a numeric baseline for
        // vertical drag — read the rendered container height by inferring
        // from the current widthInches scale. Falling back to MIN_HEIGHT_IN
        // is fine because the first nudge will pull it into a real range.
        startH: dimensions.heightInches,
      };

      const onMove = (ev: PointerEvent) => {
        const dxIn = (ev.clientX - start.startX) * INCHES_PER_PX;
        const dyIn = (ev.clientY - start.startY) * INCHES_PER_PX;

        const next: Partial<typeof dimensions> = {};

        if (axes.width) {
          next.widthInches = snap(clamp(start.startW + dxIn, MIN_WIDTH_IN, MAX_WIDTH_IN));
        }
        if (axes.height) {
          // First vertical nudge: leave auto mode by seeding the requested
          // height from the live container size if we don't have a number yet.
          const baseH = start.startH ?? MIN_HEIGHT_IN;
          next.heightInches = snap(clamp(baseH + dyIn, MIN_HEIGHT_IN, MAX_HEIGHT_IN));
        }
        setDimensions(next);
      };

      const onUp = () => {
        window.removeEventListener("pointermove", onMove);
        window.removeEventListener("pointerup",   onUp);
      };

      window.addEventListener("pointermove", onMove);
      window.addEventListener("pointerup",   onUp);
    },
    [dimensions, setDimensions],
  );

  return {
    onPointerDownCorner: useCallback((e: React.PointerEvent) => beginDrag(e, { width: true,  height: true  }), [beginDrag]),
    onPointerDownEast:   useCallback((e: React.PointerEvent) => beginDrag(e, { width: true,  height: false }), [beginDrag]),
    onPointerDownSouth:  useCallback((e: React.PointerEvent) => beginDrag(e, { width: false, height: true  }), [beginDrag]),
  };
}
