import { create } from 'zustand';
import type { MediaEntry, MediaGroup, ReadingMode, FitMode, ReadingDirection } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/galleryApi';
import { extractGroups } from './mediaGrouping';

const PREFS_KEY = 'hoshii:reader-prefs';

interface GalleryPrefs {
  readingMode: ReadingMode;
  fitMode: FitMode;
  readingDirection: ReadingDirection;
  zoomLevel: number;
  autoScroll: boolean;
  autoScrollSpeed: number;
}

function loadPrefs(galleryId: number): Partial<GalleryPrefs> {
  try {
    const raw = localStorage.getItem(`${PREFS_KEY}:${galleryId}`);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

function savePrefs(galleryId: number, prefs: Partial<GalleryPrefs>) {
  try {
    localStorage.setItem(`${PREFS_KEY}:${galleryId}`, JSON.stringify(prefs));
  } catch {
    // ignore storage errors
  }
}

interface GalleryReaderState {
  galleryId: number | null;
  media: MediaEntry[];
  groups: MediaGroup[];
  currentPage: number;
  totalPages: number;
  readingMode: ReadingMode;
  fitMode: FitMode;
  readingDirection: ReadingDirection;
  zoomLevel: number;
  currentGroup: string | null;
  loading: boolean;
  error: string | null;
  headerVisible: boolean;
  autoScroll: boolean;
  autoScrollSpeed: number;

  loadGallery: (galleryId: number) => Promise<void>;
  setCurrentPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  goToFirst: () => void;
  goToLast: () => void;
  setReadingMode: (mode: ReadingMode) => void;
  setFitMode: (mode: FitMode) => void;
  setReadingDirection: (dir: ReadingDirection) => void;
  setZoomLevel: (level: number) => void;
  jumpToGroup: (groupName: string) => void;
  setHeaderVisible: (visible: boolean) => void;
  setAutoScroll: (enabled: boolean) => void;
  setAutoScrollSpeed: (speed: number) => void;
  persistPrefs: () => void;
}

export const useGalleryReaderStore = create<GalleryReaderState>((set, get) => ({
  galleryId: null,
  media: [],
  groups: [],
  currentPage: 0,
  totalPages: 0,
  readingMode: 'single',
  fitMode: 'fit_best',
  readingDirection: 'ltr',
  zoomLevel: 1,
  currentGroup: null,
  loading: false,
  error: null,
  headerVisible: true,
  autoScroll: false,
  autoScrollSpeed: 50,

  loadGallery: async (galleryId) => {
    set({ loading: true, error: null, galleryId });
    try {
      const media = await api.getGalleryMedia(galleryId);
      const groups = extractGroups(media);

      // Restore per-gallery prefs
      const prefs = loadPrefs(galleryId);
      set({
        media,
        groups,
        totalPages: media.length,
        currentPage: 0,
        loading: false,
        currentGroup: groups.length > 0 ? groups[0].name : null,
        readingMode: prefs.readingMode ?? 'single',
        fitMode: prefs.fitMode ?? 'fit_best',
        readingDirection: prefs.readingDirection ?? 'ltr',
        zoomLevel: prefs.zoomLevel ?? 1,
        autoScroll: prefs.autoScroll ?? false,
        autoScrollSpeed: prefs.autoScrollSpeed ?? 50,
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

  setReadingMode: (mode) => {
    set({ readingMode: mode });
    get().persistPrefs();
  },

  setFitMode: (mode) => {
    set({ fitMode: mode });
    get().persistPrefs();
  },

  setReadingDirection: (dir) => {
    set({ readingDirection: dir });
    get().persistPrefs();
  },

  setZoomLevel: (level) => {
    set({ zoomLevel: Math.max(0.5, Math.min(3, level)) });
    get().persistPrefs();
  },

  jumpToGroup: (groupName) => {
    const group = get().groups.find((g) => g.name === groupName);
    if (group) {
      get().setCurrentPage(group.startIndex);
    }
  },

  setHeaderVisible: (visible) => set({ headerVisible: visible }),

  setAutoScroll: (enabled) => {
    set({ autoScroll: enabled });
    get().persistPrefs();
  },

  setAutoScrollSpeed: (speed) => {
    set({ autoScrollSpeed: Math.max(1, Math.min(200, speed)) });
    get().persistPrefs();
  },

  persistPrefs: () => {
    const { galleryId, readingMode, fitMode, readingDirection, zoomLevel, autoScroll, autoScrollSpeed } = get();
    if (galleryId !== null) {
      savePrefs(galleryId, { readingMode, fitMode, readingDirection, zoomLevel, autoScroll, autoScrollSpeed });
    }
  },
}));
