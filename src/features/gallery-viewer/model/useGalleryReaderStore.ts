import { create } from 'zustand';
import type { MediaEntry, MediaGroup, ReadingMode } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/galleryApi';
import { extractGroups } from './mediaGrouping';

interface GalleryReaderState {
  galleryId: number | null;
  media: MediaEntry[];
  groups: MediaGroup[];
  currentPage: number;
  totalPages: number;
  readingMode: ReadingMode;
  zoomLevel: number;
  currentGroup: string | null;
  loading: boolean;
  error: string | null;
  headerVisible: boolean;

  loadGallery: (galleryId: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setZoomLevel: (level: number) => void;
  jumpToGroup: (groupName: string) => void;
  setHeaderVisible: (visible: boolean) => void;
}

export const useGalleryReaderStore = create<GalleryReaderState>((set, get) => ({
  galleryId: null,
  media: [],
  groups: [],
  currentPage: 0,
  totalPages: 0,
  readingMode: 'single',
  zoomLevel: 1,
  currentGroup: null,
  loading: false,
  error: null,
  headerVisible: true,

  loadGallery: async (galleryId) => {
    set({ loading: true, error: null, galleryId });
    try {
      const media = await api.getGalleryMedia(galleryId);
      const groups = extractGroups(media);
      set({
        media,
        groups,
        totalPages: media.length,
        currentPage: 0,
        loading: false,
        currentGroup: groups.length > 0 ? groups[0].name : null,
      });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to load gallery media', { galleryId, error: message });
      set({ error: message, loading: false });
    }
  },

  setCurrentPage: (page) => {
    const { totalPages, groups } = get();
    const clamped = Math.max(0, Math.min(page, totalPages - 1));
    const group = groups.find(
      (g) => clamped >= g.startIndex && clamped < g.startIndex + g.count,
    );
    set({ currentPage: clamped, currentGroup: group?.name ?? null });
  },

  nextPage: () => {
    const { currentPage, totalPages } = get();
    if (currentPage < totalPages - 1) {
      get().setCurrentPage(currentPage + 1);
    }
  },

  prevPage: () => {
    const { currentPage } = get();
    if (currentPage > 0) {
      get().setCurrentPage(currentPage - 1);
    }
  },

  goToFirst: () => get().setCurrentPage(0),
  goToLast: () => get().setCurrentPage(get().totalPages - 1),

  setReadingMode: (mode) => set({ readingMode: mode }),
  setZoomLevel: (level) => set({ zoomLevel: Math.max(0.5, Math.min(3, level)) }),

  jumpToGroup: (groupName) => {
    const group = get().groups.find((g) => g.name === groupName);
    if (group) {
      get().setCurrentPage(group.startIndex);
    }
  },

  setHeaderVisible: (visible) => set({ headerVisible: visible }),
}));
