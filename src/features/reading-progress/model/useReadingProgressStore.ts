import { create } from 'zustand';
import type { Gallery } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/readingProgressApi';

interface ReadingProgressState {
  recentGalleries: Gallery[];
  loadingRecent: boolean;
  savingProgress: boolean;
  saveError: string | null;
  fetchError: string | null;

  saveProgress: (galleryId: number, currentPage: number, totalPages: number) => Promise<void>;
  fetchRecentGalleries: (limit?: number) => Promise<void>;
}

export const useReadingProgressStore = create<ReadingProgressState>((set) => ({
  recentGalleries: [],
  loadingRecent: false,
  savingProgress: false,
  saveError: null,
  fetchError: null,

  saveProgress: async (galleryId, currentPage, totalPages) => {
    set({ savingProgress: true, saveError: null });
    try {
      await api.updateReadingProgress(galleryId, currentPage, totalPages);
      set({ savingProgress: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to save reading progress', { galleryId, currentPage, error: message });
      set({ savingProgress: false, saveError: message });
    }
  },

  fetchRecentGalleries: async (limit = 10) => {
    set({ loadingRecent: true, fetchError: null });
    try {
      const galleries = await api.getRecentGalleries(limit);
      set({ recentGalleries: galleries, loadingRecent: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch recent galleries', { error: message });
      set({ loadingRecent: false, fetchError: message });
    }
  },
}));
