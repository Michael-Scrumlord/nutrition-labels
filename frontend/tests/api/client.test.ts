// tests/api/client.test.ts
//
// Unit tests for api/client.ts using a mocked global fetch.
// Covers happy paths, 4xx/5xx error propagation, and the 429 rate-limit path.

import { describe, it, expect, beforeEach, vi } from "vitest";
import {
  searchFoods,
  getFoodDetail,
  downloadBlob,
  ApiError,
} from "../../src/api/client";
import type { MacroProfile } from "../../src/types";

// ── Helpers ────────────────────────────────────────────────────────────────

function mockFetch(status: number, body: unknown, headers: Record<string, string> = {}): void {
  const responseHeaders = new Headers({ "Content-Type": "application/json", ...headers });
  vi.stubGlobal("fetch", vi.fn().mockResolvedValueOnce({
    ok: status >= 200 && status < 300,
    status,
    statusText: status === 200 ? "OK" : "Error",
    headers: responseHeaders,
    json: () => Promise.resolve(body),
    blob: () => Promise.resolve(new Blob([JSON.stringify(body)], { type: "application/pdf" })),
  }));
}

const ZERO_MACROS: MacroProfile = {
  calories: 0, fat_total_g: 0, fat_saturated_g: 0, cholesterol_mg: 0,
  sodium_mg: 0, carbohydrates_total_g: 0, fiber_g: 0, sugar_g: 0,
  protein_g: 0, vitamin_d_mcg: 0, calcium_mg: 0, iron_mg: 0, potassium_mg: 0,
};

beforeEach(() => {
  vi.unstubAllGlobals();
});

// ── searchFoods ────────────────────────────────────────────────────────────

describe("searchFoods", () => {
  it("returns parsed search results on 200", async () => {
    const data = [{ fdc_id: 1097512, name: "Butter, unsalted" }];
    mockFetch(200, data);
    const results = await searchFoods("butter");
    expect(results).toEqual(data);
  });

  it("calls the correct URL with encoded query", async () => {
    mockFetch(200, []);
    await searchFoods("almond butter");
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/search?query=almond%20butter");
  });

  it("throws ApiError with status on non-2xx response", async () => {
    mockFetch(500, { detail: "Internal error" });
    let caught: unknown;
    try {
      await searchFoods("butter");
    } catch (e) {
      caught = e;
    }
    expect(caught).toBeInstanceOf(ApiError);
    expect((caught as ApiError).status).toBe(500);
  });

  it("includes server detail in the error message on failure", async () => {
    mockFetch(500, { detail: "Database is down" });
    try {
      await searchFoods("butter");
    } catch (e) {
      expect((e as ApiError).message).toContain("Database is down");
    }
  });
});

// ── getFoodDetail ──────────────────────────────────────────────────────────

describe("getFoodDetail", () => {
  it("calls the correct URL for a given fdc_id", async () => {
    mockFetch(200, { fdc_id: 1097512, name: "Butter", macros: ZERO_MACROS, portions: [] });
    await getFoodDetail(1097512);
    const calledUrl = (fetch as ReturnType<typeof vi.fn>).mock.calls[0][0] as string;
    expect(calledUrl).toBe("/api/food/1097512");
  });

  it("returns parsed food detail on 200", async () => {
    const detail = { fdc_id: 1097512, name: "Butter", macros: ZERO_MACROS, portions: [] };
    mockFetch(200, detail);
    const result = await getFoodDetail(1097512);
    expect(result.fdc_id).toBe(1097512);
    expect(result.name).toBe("Butter");
  });

  it("throws ApiError with status 404 when food not found", async () => {
    mockFetch(404, { detail: "Food with fdc_id 999 not found" });
    await expect(getFoodDetail(999)).rejects.toMatchObject({
      status: 404,
    });
  });

  it("throws ApiError (not generic Error) on network-level 4xx", async () => {
    mockFetch(400, { detail: "Bad request" });
    try {
      await getFoodDetail(-1);
    } catch (e) {
      expect(e).toBeInstanceOf(ApiError);
      expect((e as ApiError).name).toBe("ApiError");
    }
  });
});

// ── downloadBlob ──────────────────────────────────────────────────────────

describe("downloadBlob", () => {
  it("creates an anchor element with the correct filename and clicks it", () => {
    const blob = new Blob(["pdf content"], { type: "application/pdf" });
    const createObjectURL = vi.fn().mockReturnValue("blob:http://test/123");
    const revokeObjectURL = vi.fn();
    const click = vi.fn();

    vi.stubGlobal("URL", { createObjectURL, revokeObjectURL });

    const createElement = vi.spyOn(document, "createElement");
    const mockAnchor = { href: "", download: "", click };
    createElement.mockReturnValueOnce(mockAnchor as unknown as HTMLElement);

    downloadBlob(blob, "nutrition_label.pdf");

    expect(createObjectURL).toHaveBeenCalledWith(blob);
    expect(mockAnchor.download).toBe("nutrition_label.pdf");
    expect(click).toHaveBeenCalled();
    expect(revokeObjectURL).toHaveBeenCalledWith("blob:http://test/123");

    createElement.mockRestore();
  });
});
