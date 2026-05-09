import { create } from 'zustand';
import type { Gallery } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/favoritesApi';

interface FavoritesState {
  favorites: Gallery[];
  loading: boolean;
  error: string | null;
  // Track which gallery IDs are currently being toggled
  toggling: Set<number>;

  fetchFavorites: () => Promise<void>;
  toggleFavorite: (gallery: Gallery) => Promise<boolean>;
  isFavorited: (galleryId: number) => boolean;
}

export const useFavoritesStore = create<FavoritesState>((set, get) => ({
  favorites: [],
  loading: false,
  error: null,
  toggling: new Set(),

  fetchFavorites: async () => {
    set({ loading: true, error: null });
    try {
      const favorites = await api.getFavoriteGalleries();
      set({ favorites, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch favorites', { error: message });
      set({ error: message, loading: false });
    }
  },

  toggleFavorite: async (gallery: Gallery) => {
    const { toggling } = get();
    if (toggling.has(gallery.id)) return gallery.favorited;

    // Optimistic update
    const newFavorited = !gallery.favorited;
    set((s) => {
      const newToggling = new Set(s.toggling);
      newToggling.add(gallery.id);
      const newFavorites = newFavorited
        ? [...s.favorites, { ...gallery, favorited: true }]
        : s.favorites.filter((f) => f.id !== gallery.id);
      return { toggling: newToggling, favorites: newFavorites };
    });

    try {
      const result = await api.toggleFavorite(gallery.id);
      set((s) => {
        const newToggling = new Set(s.toggling);
        newToggling.delete(gallery.id);
        return { toggling: newToggling, error: null };
      });
      return result;
    } catch (err) {
      logger.error('Failed to toggle favorite', { galleryId: gallery.id, error: String(err) });
      // Revert optimistic update
      set((s) => {
        const newToggling = new Set(s.toggling);
        newToggling.delete(gallery.id);
        const revertedFavorites = gallery.favorited
          ? [...s.favorites, gallery]
          : s.favorites.filter((f) => f.id !== gallery.id);
        return { toggling: newToggling, favorites: revertedFavorites };
      });
      return gallery.favorited;
    }
  },

  isFavorited: (galleryId) => {
    return get().favorites.some((f) => f.id === galleryId);
  },
}));
