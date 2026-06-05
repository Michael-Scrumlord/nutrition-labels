// hooks/useLabelLayout.ts
//
// Encapsulates the label-column scaling and layout math.
// Accepts the recipe dimensions (and the fields that affect label height)
// as parameters so LabelColumn stays focused on composition.

import { useRef, useState, useLayoutEffect } from "react";
import type { LabelDimensions, IngredientItem } from "../types";
import {
  LABEL_BASE_WIDTH_PX,
  LABEL_MIN_TARGET_PX,
} from "../components/label/labelSpec";

export interface LabelLayoutResult {
  /** Unscaled authoring width — pass as `widthPx` to LabelPreview. */
  baseWidthPx: number;
  /** Actual rendered width in pixels after applying the user's widthInches. */
  targetPx: number;
  /** CSS transform scale factor (targetPx / baseWidthPx). */
  scale: number;
  /** Attach to the inner (unscaled) div so ResizeObserver can track its height. */
  measureRef: React.RefObject<HTMLDivElement>;
  /** Height the paper container should occupy, in pixels. */
  containerH: number;
  /** True when a fixed heightInches crops the label content. */
  isClipped: boolean;
}

/**
 * Derive all sizing values needed to render the scaled label paper.
 *
 * @param dimensions  - Current width/height from the recipe store.
 * @param ingredients - Passed as a dep so the ResizeObserver re-fires when
 *                      the ingredient list changes (which affects label height).
 * @param portionDivisor - Similarly used as a layout effect dep.
 */
export function useLabelLayout(
  dimensions: LabelDimensions,
  ingredients: IngredientItem[],
  portionDivisor: number,
): LabelLayoutResult {
  const targetPx = Math.max(dimensions.widthInches * 96, LABEL_MIN_TARGET_PX);
  const scale    = targetPx / LABEL_BASE_WIDTH_PX;

  const measureRef = useRef<HTMLDivElement>(null);
  const [naturalH, setNaturalH] = useState(560);

  useLayoutEffect(() => {
    const el = measureRef.current;
    if (!el) return;
    const update = () => setNaturalH(el.offsetHeight);
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ingredients, portionDivisor, dimensions.widthInches]);

  const requestedH     = dimensions.heightInches ? dimensions.heightInches * 96 : null;
  const scaledNaturalH = naturalH * scale;
  const containerH     = requestedH ?? scaledNaturalH;
  const isClipped      = requestedH != null && scaledNaturalH > requestedH + 1;

  return { baseWidthPx: LABEL_BASE_WIDTH_PX, targetPx, scale, measureRef, containerH, isClipped };
}
