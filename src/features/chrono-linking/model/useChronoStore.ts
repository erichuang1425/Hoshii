import { create } from 'zustand';
import type { ChronologicalGroup, TimelineEntry } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/chronoApi';

interface ChronoState {
  groups: ChronologicalGroup[];
  timeline: TimelineEntry[];
  artistId: number | null;
  galleryId: number | null;
  loading: boolean;
  timelineLoading: boolean;
  error: string | null;

  fetchGroups: (artistId: number) => Promise<void>;
  fetchTimeline: (galleryId: number) => Promise<void>;
  getPrevGallery: (currentGalleryId: number) => ChronologicalGroup | null;
  getNextGallery: (currentGalleryId: number) => ChronologicalGroup | null;
  clear: () => void;
}

export const useChronoStore = create<ChronoState>((set, get) => ({
  groups: [],
  timeline: [],
  artistId: null,
  galleryId: null,
  loading: false,
  timelineLoading: false,
  error: null,

  fetchGroups: async (artistId) => {
    set({ loading: true, error: null, artistId });
    try {
      const groups = await api.getChronologicalGroups(artistId);
      set({ groups, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch chronological groups', { artistId, error: message });
      set({ error: message, loading: false, groups: [] });
    }
  },

  fetchTimeline: async (galleryId) => {
    set({ timelineLoading: true, galleryId });
    try {
      const timeline = await api.getGalleryTimeline(galleryId);
      set({ timeline, timelineLoading: false });
    } catch (err) {
      logger.error('Failed to fetch gallery timeline', { galleryId, error: String(err) });
      set({ timeline: [], timelineLoading: false });
    }
  },

  getPrevGallery: (currentGalleryId) => {
    const { groups } = get();
    const idx = groups.findIndex((g) => g.galleryId === currentGalleryId);
    return idx > 0 ? groups[idx - 1] : null;
  },

  getNextGallery: (currentGalleryId) => {
    const { groups } = get();
    const idx = groups.findIndex((g) => g.galleryId === currentGalleryId);
    return idx >= 0 && idx < groups.length - 1 ? groups[idx + 1] : null;
  },

  clear: () => set({ groups: [], timeline: [], artistId: null, galleryId: null, error: null }),
}));
