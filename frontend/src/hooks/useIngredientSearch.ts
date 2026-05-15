// hooks/useIngredientSearch.ts
//
// TanStack Query wrapper for the search endpoint.
// Debounces the query by 300ms before hitting the API.

import { useQuery } from "@tanstack/react-query";
import { useState, useEffect } from "react";
import { searchFoods } from "../api/client";
import type { FoodSearchResult } from "../types";

export function useIngredientSearch(query: string): {
  results: FoodSearchResult[];
  isLoading: boolean;
  isError: boolean;
} {
  const [debouncedQuery, setDebouncedQuery] = useState(query);

  useEffect(() => {
    const timer = setTimeout(() => setDebouncedQuery(query), 300);
    return () => clearTimeout(timer);
  }, [query]);

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
