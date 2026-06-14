// api/client.ts
//
// Typed fetch wrappers for the backend data endpoints (search + food detail).
// PDF generation is fully client-side now (see components/label/LabelPdfDoc),
// so there is no label-generation request here.
// All functions throw ApiError on non-2xx responses, preserving the HTTP
// status code so callers can handle 429 vs 4xx vs 5xx distinctly.

import type { FoodDetail, FoodSearchResult } from "../types";

const BASE = "/api";

export class ApiError extends Error {
  constructor(
    message: string,
    public readonly status: number,
    public readonly retryAfter?: number,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

async function parseErrorDetail(res: Response): Promise<string> {
  try {
    const body = await res.json();
    return body?.detail ?? res.statusText;
  } catch {
    return res.statusText;
  }
}

/** Search foods by name. Returns [] if query is less than 2 characters. */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new ApiError(`Search failed: ${detail}`, res.status);
  }
  return res.json();
}

/** Fetch full macro data and portion sizes for one food. */
export async function getFoodDetail(fdc_id: number): Promise<FoodDetail> {
  const res = await fetch(`${BASE}/food/${fdc_id}`);
  if (!res.ok) {
    const detail = await parseErrorDetail(res);
    throw new ApiError(detail, res.status);
  }
  return res.json();
}

/** Trigger a browser download from a Blob. */
export function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
