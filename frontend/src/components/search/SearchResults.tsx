// search/SearchResults.tsx
//
// Renders a scrollable list of food search results.
// Each row has the food name and a star toggle for favorites.

import { Star } from "lucide-react";
import { Spinner } from "../ui/Spinner";
import { usePreferencesStore } from "../../store/preferencesStore";
import type { FoodSearchResult } from "../../types";

interface SearchResultsProps {
  results: FoodSearchResult[];
  isLoading: boolean;
  query: string;
  onSelect: (food: FoodSearchResult) => void;
}

export function SearchResults({ results, isLoading, query, onSelect }: SearchResultsProps) {
  const { isFavorite, toggleFavorite } = usePreferencesStore();

  if (isLoading) {
    return (
      <div className="flex justify-center py-6">
        <Spinner />
      </div>
    );
  }

  if (query.length >= 2 && results.length === 0) {
    return (
      <div className="flex flex-col items-center py-8 gap-2 text-text-tertiary">
        <span className="text-sm">No results for "{query}"</span>
      </div>
    );
  }

  if (results.length === 0) return null;

  return (
    <ul
      className="overflow-y-auto max-h-[300px] scrollbar-thin"
      style={{ animationDuration: "100ms" }}
    >
      {results.map((food) => {
        const fav = isFavorite(food.fdc_id);
        return (
          <li
            key={food.fdc_id}
            className="flex items-center px-3 py-2 border-b border-border-subtle hover:bg-bg-overlay cursor-pointer transition-colors duration-100"
          >
            {/* Food name — clicking opens the add form */}
            <span
              className="flex-1 text-sm text-text-primary truncate"
              onClick={() => onSelect(food)}
            >
              {food.name}
            </span>

            {/* Star toggle */}
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleFavorite({ fdc_id: food.fdc_id, name: food.name });
              }}
              className="ml-2 p-1 text-text-tertiary hover:text-accent transition-colors duration-100"
              aria-label={fav ? "Remove from favorites" : "Add to favorites"}
            >
              <Star
                size={14}
                style={{ fill: fav ? "currentColor" : "none" }}
                className={fav ? "text-accent" : ""}
              />
            </button>
          </li>
        );
      })}
    </ul>
  );
}
