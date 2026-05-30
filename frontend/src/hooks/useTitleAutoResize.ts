// hooks/useTitleAutoResize.ts
//
// Keeps a textarea's height flush with its content. Three triggers:
//   1. `value` change       — user typed.
//   2. document.fonts.ready — custom font finishes loading; placeholder
//                             width may change and wrap onto an extra line.
//   3. ResizeObserver       — viewport / container width changes re-wrap
//                             the placeholder.

import { useLayoutEffect, type RefObject } from "react";

export function useTitleAutoResize(
  ref: RefObject<HTMLTextAreaElement | null>,
  value: string,
): void {
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    const resize = () => {
      el.style.height = "auto";
      el.style.height = `${el.scrollHeight}px`;
    };
    resize();

    let cancelled = false;
    document.fonts?.ready?.then(() => {
      if (!cancelled) resize();
    });

    // ResizeObserver is unavailable in JSDOM; guard so tests don't throw.
    const ro = typeof ResizeObserver !== "undefined"
      ? new ResizeObserver(resize)
      : null;
    if (ro && el.parentElement) ro.observe(el.parentElement);

    return () => {
      cancelled = true;
      ro?.disconnect();
    };
  }, [ref, value]);
}
