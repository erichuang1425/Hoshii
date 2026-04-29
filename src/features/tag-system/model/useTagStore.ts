import { create } from 'zustand';
import type { Tag, Gallery } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/tagApi';

interface TagState {
  // Per-gallery tag cache: galleryId → Tag[]
  galleryTags: Record<number, Tag[]>;
  // Tag filter for gallery browsing
  activeTagFilter: string[];
  filteredGalleries: Gallery[];
  filtering: boolean;
  error: string | null;

  fetchGalleryTags: (galleryId: number) => Promise<void>;
  fetchBatchGalleryTags: (galleryIds: number[]) => Promise<void>;
  addTag: (galleryId: number, tagName: string) => Promise<void>;
  removeTag: (galleryId: number, tagId: number) => Promise<void>;
  filterByTags: (tags: string[]) => Promise<void>;
  clearTagFilter: () => void;
  getGalleryTags: (galleryId: number) => Tag[];
}

export const useTagStore = create<TagState>((set, get) => ({
  galleryTags: {},
  activeTagFilter: [],
  filteredGalleries: [],
  filtering: false,
  error: null,

  fetchGalleryTags: async (galleryId) => {
    try {
      const tags = await api.getGalleryTags(galleryId);
      set((s) => ({
        galleryTags: { ...s.galleryTags, [galleryId]: tags },
      }));
    } catch (err) {
      logger.error('Failed to fetch gallery tags', { galleryId, error: String(err) });
    }
  },

  fetchBatchGalleryTags: async (galleryIds) => {
    const uncached = galleryIds.filter((id) => !(id in get().galleryTags));
    if (uncached.length === 0) return;
    const results = await Promise.allSettled(
      uncached.map((id) => api.getGalleryTags(id).then((tags) => ({ id, tags }))),
    );
    const batch: Record<number, Tag[]> = {};
    for (const result of results) {
      if (result.status === 'fulfilled') {
        batch[result.value.id] = result.value.tags;
      }
    }
    set((s) => ({
      galleryTags: { ...s.galleryTags, ...batch },
    }));
  },

  addTag: async (galleryId, tagName) => {
    try {
      const tag = await api.addTag(galleryId, tagName);
      set((s) => ({
        galleryTags: {
          ...s.galleryTags,
          [galleryId]: [...(s.galleryTags[galleryId] ?? []), tag],
        },
      }));
    } catch (err) {
      const message = String(err);
      logger.error('Failed to add tag', { galleryId, tagName, error: message });
      set({ error: message });
      throw err;
    }
  },

  removeTag: async (galleryId, tagId) => {
    // Optimistic removal
    set((s) => ({
      galleryTags: {
        ...s.galleryTags,
        [galleryId]: (s.galleryTags[galleryId] ?? []).filter((t) => t.id !== tagId),
      },
    }));
    try {
      await api.removeTag(galleryId, tagId);
    } catch (err) {
      const message = String(err);
      logger.error('Failed to remove tag', { galleryId, tagId, error: message });
      // Revert: re-fetch
      set({ error: message });
      await get().fetchGalleryTags(galleryId);
      throw err;
    }
  },

  filterByTags: async (tags) => {
    if (tags.length === 0) {
      set({ activeTagFilter: [], filteredGalleries: [], filtering: false });
      return;
    }
    set({ activeTagFilter: tags, filtering: true, error: null });
    try {
      const galleries = await api.searchByTags(tags);
      set({ filteredGalleries: galleries, filtering: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to filter by tags', { tags, error: message });
      set({ error: message, filtering: false });
    }
  },

  clearTagFilter: () => {
    set({ activeTagFilter: [], filteredGalleries: [] });
  },

  getGalleryTags: (galleryId) => {
    return get().galleryTags[galleryId] ?? [];
  },
}));
