import { create } from 'zustand';
import type { Gallery } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/readingProgressApi';

interface ReadingProgressState {
  recentGalleries: Gallery[];
  loadingRecent: boolean;
  savingProgress: boolean;

  saveProgress: (galleryId: number, currentPage: number, totalPages: number) => Promise<void>;
  fetchRecentGalleries: (limit?: number) => Promise<void>;
}

export const useReadingProgressStore = create<ReadingProgressState>((set) => ({
  recentGalleries: [],
  loadingRecent: false,
  savingProgress: false,

  saveProgress: async (galleryId, currentPage, totalPages) => {
    set({ savingProgress: true });
    try {
      await api.updateReadingProgress(galleryId, currentPage, totalPages);
      set({ savingProgress: false });
    } catch (err) {
      logger.error('Failed to save reading progress', { galleryId, currentPage, error: String(err) });
      set({ savingProgress: false });
    }
  },

  fetchRecentGalleries: async (limit = 10) => {
    set({ loadingRecent: true });
    try {
      const galleries = await api.getRecentGalleries(limit);
      set({ recentGalleries: galleries, loadingRecent: false });
    } catch (err) {
      logger.error('Failed to fetch recent galleries', { error: String(err) });
      set({ loadingRecent: false });
    }
  },
}));
