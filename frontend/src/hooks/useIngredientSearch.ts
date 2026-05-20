// hooks/useIngredientSearch.ts
//
// TanStack Query wrapper for the search endpoint.
// Debounces the query by 300ms before hitting the API.

import { useQuery } from "@tanstack/react-query";
import { searchFoods } from "../api/client";
import { useDebounce } from "./useDebounce";
import type { FoodSearchResult } from "../types";

export function useIngredientSearch(query: string): {
  results: FoodSearchResult[];
  isLoading: boolean;
  isError: boolean;
} {
  const debouncedQuery = useDebounce(query, 300);

  const enabled = debouncedQuery.length >= 2;

  const { data, isLoading, isError } = useQuery({
    queryKey: ["search", debouncedQuery],
    queryFn: () => searchFoods(debouncedQuery),
    enabled,
    staleTime: 30_000, // Cache results for 30s — food names don't change
  });

  return {
    results: data ?? [],
    isLoading: enabled && isLoading,
    isError,
  };
}
