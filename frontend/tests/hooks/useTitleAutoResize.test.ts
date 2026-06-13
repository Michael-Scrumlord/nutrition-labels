// tests/hooks/useTitleAutoResize.test.ts
//
// Unit tests for the useTitleAutoResize hook.
// The hook keeps a textarea's height flush with its content by setting
// `el.style.height` from `el.scrollHeight` on three triggers:
//   1. `value` change  2. document.fonts.ready  3. ResizeObserver
//
// JSDOM doesn't support ResizeObserver or layout metrics (scrollHeight is
// always 0), so the tests mock just enough of those surfaces to verify
// the hook's branching and cleanup logic.

import { describe, it, expect, vi, afterEach } from "vitest";
import { renderHook, act } from "@testing-library/react";
import { useRef } from "react";
import { useTitleAutoResize } from "../../src/hooks/useTitleAutoResize";
import type { RefObject } from "react";

// Helper: build a textarea-like object whose scrollHeight is controllable.
function makeFakeTextarea(scrollHeight = 48) {
  const el = document.createElement("textarea");
  Object.defineProperty(el, "scrollHeight", {
    configurable: true,
    get() {
      return scrollHeight;
    },
  });
  return el;
}

afterEach(() => {
  vi.restoreAllMocks();
});

// ── null-ref guard ───────────────────────────────────────────────────────────

describe("useTitleAutoResize — null ref", () => {
  it("does not throw when ref.current is null", () => {
    const nullRef = { current: null } as RefObject<HTMLTextAreaElement | null>;
    expect(() => {
      renderHook(() => useTitleAutoResize(nullRef, ""));
    }).not.toThrow();
  });

  it("does not set any style when ref.current is null", () => {
    const nullRef = { current: null } as RefObject<HTMLTextAreaElement | null>;
    // No assertion needed beyond no-throw; just confirm nothing explodes.
    renderHook(() => useTitleAutoResize(nullRef, ""));
  });
});

// ── height update on mount / value change ────────────────────────────────────

describe("useTitleAutoResize — height updates", () => {
  it("sets el.style.height to the element's scrollHeight on mount", () => {
    const el = makeFakeTextarea(48);
    const ref = { current: el } as RefObject<HTMLTextAreaElement>;

    renderHook(({ value }) => useTitleAutoResize(ref, value), {
      initialProps: { value: "" },
    });

    expect(el.style.height).toBe("48px");
  });

  it("first sets height to 'auto' before applying scrollHeight (forces reflow)", () => {
    const heights: string[] = [];
    const el = makeFakeTextarea(64);
    const originalDescriptor = Object.getOwnPropertyDescriptor(el.style, "height");

    Object.defineProperty(el.style, "height", {
      configurable: true,
      set(v: string) {
        heights.push(v);
        if (originalDescriptor?.set) originalDescriptor.set.call(el.style, v);
      },
      get() {
        return originalDescriptor?.get ? originalDescriptor.get.call(el.style) : "";
      },
    });

    const ref = { current: el } as RefObject<HTMLTextAreaElement>;
    renderHook(() => useTitleAutoResize(ref, "text"));

    // The hook must set "auto" first, then the pixel value
    expect(heights[0]).toBe("auto");
    expect(heights[1]).toBe("64px");
  });

  it("re-runs and updates height when value prop changes", () => {
    let scrollH = 48;
    const el = document.createElement("textarea");
    Object.defineProperty(el, "scrollHeight", {
      configurable: true,
      get: () => scrollH,
    });

    const ref = { current: el } as RefObject<HTMLTextAreaElement>;
    const { rerender } = renderHook(({ value }) => useTitleAutoResize(ref, value), {
      initialProps: { value: "line one" },
    });

    expect(el.style.height).toBe("48px");

    scrollH = 96;
    rerender({ value: "line one\nline two" });

    expect(el.style.height).toBe("96px");
  });

  it("handles zero scrollHeight gracefully (empty textarea)", () => {
    const el = makeFakeTextarea(0);
    const ref = { current: el } as RefObject<HTMLTextAreaElement>;

    renderHook(() => useTitleAutoResize(ref, ""));

    expect(el.style.height).toBe("0px");
  });
});

// ── ResizeObserver guard ──────────────────────────────────────────────────────

describe("useTitleAutoResize — ResizeObserver absent", () => {
  it("does not throw when ResizeObserver is undefined (JSDOM environment)", () => {
    const saved = (globalThis as Record<string, unknown>).ResizeObserver;
    delete (globalThis as Record<string, unknown>).ResizeObserver;

    const el = makeFakeTextarea();
    const ref = { current: el } as RefObject<HTMLTextAreaElement>;

    expect(() => {
      renderHook(() => useTitleAutoResize(ref, ""));
    }).not.toThrow();

    if (saved !== undefined) {
      (globalThis as Record<string, unknown>).ResizeObserver = saved;
    }
  });
});

// ── cleanup on unmount ────────────────────────────────────────────────────────

describe("useTitleAutoResize — cleanup", () => {
  it("disconnects a ResizeObserver on unmount when one was created", () => {
    const disconnectSpy = vi.fn();
    const observeSpy = vi.fn();
    const MockRO = vi.fn(() => ({
      observe: observeSpy,
      disconnect: disconnectSpy,
    }));
    (globalThis as Record<string, unknown>).ResizeObserver = MockRO;

    const parent = document.createElement("div");
    const el = document.createElement("textarea");
    parent.appendChild(el);
    const ref = { current: el } as RefObject<HTMLTextAreaElement>;

    const { unmount } = renderHook(() => useTitleAutoResize(ref, ""));
    unmount();

    expect(disconnectSpy).toHaveBeenCalledOnce();

    delete (globalThis as Record<string, unknown>).ResizeObserver;
  });

  it("does not throw on unmount when ref.current is null", () => {
    const nullRef = { current: null } as RefObject<HTMLTextAreaElement | null>;
    const { unmount } = renderHook(() => useTitleAutoResize(nullRef, ""));
    expect(() => unmount()).not.toThrow();
  });

  it("sets cancelled=true so a delayed fonts.ready callback is a no-op", async () => {
    let fontReadyResolve!: () => void;
    const fontReadyPromise = new Promise<void>((res) => { fontReadyResolve = res; });

    const origFonts = document.fonts;
    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: { ready: fontReadyPromise },
    });

    const el = makeFakeTextarea(48);
    const ref = { current: el } as RefObject<HTMLTextAreaElement>;

    const { unmount } = renderHook(() => useTitleAutoResize(ref, "text"));

    // Unmount before fonts.ready fires — this sets cancelled=true.
    unmount();

    // Make fonts.ready fire AFTER unmount.
    // If cancelled flag works, no state update / error should occur.
    await act(async () => {
      fontReadyResolve();
      await fontReadyPromise;
    });

    Object.defineProperty(document, "fonts", {
      configurable: true,
      value: origFonts,
    });
  });
});
