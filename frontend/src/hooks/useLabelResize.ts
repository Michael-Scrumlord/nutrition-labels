// hooks/useLabelResize.ts
//
// Drag-to-resize logic for the label preview.
// Returns a ref to attach to the resize handle and the current width in pixels.

import { useRef, useCallback } from "react";
import { useRecipeStore } from "../store/recipeStore";

const INCHES_PER_PX = 1 / 96; // 1 inch = 96px at screen DPI
const MIN_WIDTH_PX  = 200;
const MAX_WIDTH_PX  = 600;

export function useLabelResize() {
  const dimensions   = useRecipeStore((s) => s.dimensions);
  const setDimensions = useRecipeStore((s) => s.setDimensions);

  const isDragging = useRef(false);
  const startX     = useRef(0);
  const startWidth = useRef(0);

  const onMouseDown = useCallback(
    (e: React.MouseEvent) => {
      isDragging.current = true;
      startX.current     = e.clientX;
      startWidth.current = dimensions.widthInches * 96;

      const onMouseMove = (ev: MouseEvent) => {
        if (!isDragging.current) return;
        const delta    = ev.clientX - startX.current;
        const newPx    = Math.min(MAX_WIDTH_PX, Math.max(MIN_WIDTH_PX, startWidth.current + delta));
        const newInches = parseFloat((newPx * INCHES_PER_PX).toFixed(2));
        setDimensions({ widthInches: newInches });
      };

      const onMouseUp = () => {
        isDragging.current = false;
        window.removeEventListener("mousemove", onMouseMove);
        window.removeEventListener("mouseup",   onMouseUp);
      };

      window.addEventListener("mousemove", onMouseMove);
      window.addEventListener("mouseup",   onMouseUp);

      e.preventDefault();
    },
    [dimensions.widthInches, setDimensions],
  );

  return { onMouseDown };
}
