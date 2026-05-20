// store/preferencesStore.ts
//
// Zustand store for user preferences that persist across sessions.
// Recents and favorites are kept in localStorage.
// The current recipe is NOT stored here — see recipeStore.ts.

import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { SavedFood } from "../types";

const MAX_RECENTS = 15;
const RECENTS_KEY  = "nl_recents";
const FAVORITES_KEY = "nl_favorites";
const METHOD_EXPANDED_KEY = "nl_methodExpanded";

interface PreferencesState {
  recents: SavedFood[];
  favorites: SavedFood[];
  isMethodExpanded: boolean;

  addRecent: (food: SavedFood) => void;
  toggleFavorite: (food: SavedFood) => void;
  isFavorite: (fdc_id: number) => boolean;
  toggleMethodExpanded: () => void;
}

export const usePreferencesStore = create<PreferencesState>()(
  persist(
    (set, get) => ({
      recents: [],
      favorites: [],
      isMethodExpanded: true,

      addRecent: (food) =>
        set((state) => {
          // Remove duplicates, then prepend the new one, then trim to max
          const without = state.recents.filter((r) => r.fdc_id !== food.fdc_id);
          return { recents: [food, ...without].slice(0, MAX_RECENTS) };
        }),

      toggleFavorite: (food) =>
        set((state) => {
          const isFav = state.favorites.some((f) => f.fdc_id === food.fdc_id);
          return {
            favorites: isFav
              ? state.favorites.filter((f) => f.fdc_id !== food.fdc_id)
              : [...state.favorites, food],
          };
        }),

      isFavorite: (fdc_id) =>
        get().favorites.some((f) => f.fdc_id === fdc_id),

      toggleMethodExpanded: () =>
        set((state) => ({ isMethodExpanded: !state.isMethodExpanded })),
    }),
    {
      name: "nl_preferences",
      // Store each preference under its own key for clarity
      partialize: (state) => ({
        [RECENTS_KEY]:         state.recents,
        [FAVORITES_KEY]:       state.favorites,
        [METHOD_EXPANDED_KEY]: state.isMethodExpanded,
      }),
      // Re-map the stored keys back to state shape on hydration
      merge: (persisted, current) => {
        const stored = persisted as Record<string, unknown>;
        return {
          ...current,
          recents:          (stored[RECENTS_KEY]   as SavedFood[] | undefined) ?? [],
          favorites:        (stored[FAVORITES_KEY] as SavedFood[] | undefined) ?? [],
          isMethodExpanded: (stored[METHOD_EXPANDED_KEY] as boolean | undefined) ?? true,
        };
      },
    },
  ),
);
