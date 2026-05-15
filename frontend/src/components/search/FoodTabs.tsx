// search/FoodTabs.tsx
//
// Four tabs: Search, Common, Recent, Favorites.
// All tabs render food rows the same way: name + star button.

import { useState } from "react";
import { Star } from "lucide-react";
import { usePreferencesStore } from "../../store/preferencesStore";
import { useIngredientSearch } from "../../hooks/useIngredientSearch";
import { SearchResults } from "./SearchResults";
import { AddIngredientForm } from "./AddIngredientForm";
import { Input } from "../ui/Input";
import type { FoodSearchResult, SavedFood } from "../../types";

type TabId = "search" | "common" | "recent" | "favorites";

// Hardcoded common foods — fdc_ids must exist in nutrition.db.
const COMMON_FOODS: SavedFood[] = [
  { fdc_id: 1097512, name: "Butter, unsalted" },
  { fdc_id: 1097517, name: "Eggs, whole, raw" },
  { fdc_id: 1104330, name: "Sugar, granulated white" },
  { fdc_id: 1100209, name: "All-purpose flour, white" },
  { fdc_id: 1097516, name: "Whole milk" },
  { fdc_id: 1097514, name: "Cream cheese" },
  { fdc_id: 1104332, name: "Honey" },
  { fdc_id: 1102201, name: "Baking powder" },
  { fdc_id: 1102203, name: "Salt, table" },
  { fdc_id: 1102204, name: "Vanilla extract" },
  { fdc_id: 1103301, name: "Olive oil" },
  { fdc_id: 1105001, name: "Chicken breast, raw" },
  { fdc_id: 1105002, name: "Ground beef, 80% lean, raw" },
  { fdc_id: 1100216, name: "Cocoa powder, unsweetened" },
  { fdc_id: 1108001, name: "Chocolate chips, semi-sweet" },
];

interface FoodRowProps {
  food: SavedFood;
  onSelect: (food: FoodSearchResult) => void;
}

function FoodRow({ food, onSelect }: FoodRowProps) {
  const { isFavorite, toggleFavorite } = usePreferencesStore();
  const fav = isFavorite(food.fdc_id);

  return (
    <li className="flex items-center px-3 py-2 border-b border-border-subtle hover:bg-bg-overlay cursor-pointer transition-colors duration-100">
      <span
        className="flex-1 text-sm text-text-primary truncate"
        onClick={() => onSelect(food)}
      >
        {food.name}
      </span>
      <button
        onClick={(e) => {
          e.stopPropagation();
          toggleFavorite(food);
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
}

function EmptyState({ message }: { message: string }) {
  return (
    <div className="flex flex-col items-center py-8 gap-2 text-text-tertiary">
      <span className="text-sm text-center">{message}</span>
    </div>
  );
}

export function FoodTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("search");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedFood, setSelectedFood] = useState<FoodSearchResult | null>(null);

  const recents   = usePreferencesStore((s) => s.recents);
  const favorites = usePreferencesStore((s) => s.favorites);

  const { results, isLoading } = useIngredientSearch(searchQuery);

  const TABS: { id: TabId; label: string }[] = [
    { id: "search",    label: "Search"    },
    { id: "common",    label: "Common"    },
    { id: "recent",    label: "Recent"    },
    { id: "favorites", label: "Favorites" },
  ];

  function handleSelect(food: FoodSearchResult) {
    setSelectedFood(food);
  }

  function handleClose() {
    setSelectedFood(null);
  }

  return (
    <div className="flex flex-col">
      {/* Tab bar */}
      <div className="flex border-b border-border-std">
        {TABS.map((tab) => (
          <button
            key={tab.id}
            onClick={() => {
              setActiveTab(tab.id);
              setSelectedFood(null);
            }}
            className={[
              "px-4 py-2 text-sm font-medium transition-colors duration-150",
              "border-b-2 -mb-px",
              activeTab === tab.id
                ? "text-accent-text border-accent"
                : "text-text-tertiary border-transparent hover:text-text-secondary",
            ].join(" ")}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Tab content */}
      <div className="mt-3">
        {activeTab === "search" && (
          <>
            <Input
              placeholder="Search foods…"
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setSelectedFood(null);
              }}
              className="mb-2"
            />
            <SearchResults
              results={results}
              isLoading={isLoading}
              query={searchQuery}
              onSelect={handleSelect}
            />
          </>
        )}

        {activeTab === "common" && (
          <ul className="overflow-y-auto max-h-[300px]">
            {COMMON_FOODS.map((food) => (
              <FoodRow key={food.fdc_id} food={food} onSelect={handleSelect} />
            ))}
          </ul>
        )}

        {activeTab === "recent" && (
          recents.length === 0 ? (
            <EmptyState message="No recent foods yet. Add ingredients to see them here." />
          ) : (
            <ul className="overflow-y-auto max-h-[300px]">
              {recents.map((food) => (
                <FoodRow key={food.fdc_id} food={food} onSelect={handleSelect} />
              ))}
            </ul>
          )
        )}

        {activeTab === "favorites" && (
          favorites.length === 0 ? (
            <EmptyState message="No favorites yet. Star foods to save them here." />
          ) : (
            <ul className="overflow-y-auto max-h-[300px]">
              {favorites.map((food) => (
                <FoodRow key={food.fdc_id} food={food} onSelect={handleSelect} />
              ))}
            </ul>
          )
        )}

        {/* Add ingredient form appears below the list when a food is selected */}
        {selectedFood && (
          <AddIngredientForm food={selectedFood} onClose={handleClose} />
        )}
      </div>
    </div>
  );
}
