// api/client.ts
//
// Typed fetch wrappers for all three backend endpoints.
// All functions throw on non-2xx responses.

import type { FoodDetail, FoodSearchResult, IngredientItem, LabelDimensions } from "../types";

const BASE = "/api";

/** Search foods by name. Returns [] if query is less than 2 characters. */
export async function searchFoods(query: string): Promise<FoodSearchResult[]> {
  const res = await fetch(`${BASE}/search?query=${encodeURIComponent(query)}`);
  if (!res.ok) throw new Error(`Search failed: ${res.statusText}`);
  return res.json();
}

/** Fetch full macro data and portion sizes for one food. */
export async function getFoodDetail(fdc_id: number): Promise<FoodDetail> {
  const res = await fetch(`${BASE}/food/${fdc_id}`);
  if (!res.ok) throw new Error(`Food not found: ${fdc_id}`);
  return res.json();
}

/** Generate a PDF label and return it as a Blob for download. */
export async function generateLabel(
  ingredients: IngredientItem[],
  portionDivisor: number,
  labelName: string,
  dimensions: LabelDimensions,
): Promise<Blob> {
  const body = {
    portion_divisor: portionDivisor,
    label_name: labelName,
    width_inches: dimensions.widthInches,
    height_inches: dimensions.heightInches,
    ingredients: ingredients.map((ing) => ({
      fdc_id:  ing.fdc_id,
      name:    ing.name,
      amount:  ing.amount,
      unit:    ing.unit,
    })),
  };

  const res = await fetch(`${BASE}/generate_label`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new Error(err.detail ?? "PDF generation failed");
  }

  return res.blob();
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
