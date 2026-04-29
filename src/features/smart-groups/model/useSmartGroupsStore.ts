import { create } from 'zustand';
import type { SmartGroup } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/smartGroupsApi';

interface SmartGroupsState {
  groups: SmartGroup[];
  artistId: number | null;
  loading: boolean;
  error: string | null;

  fetchForArtist: (artistId: number, threshold?: number) => Promise<void>;
  clear: () => void;
}

export const useSmartGroupsStore = create<SmartGroupsState>((set) => ({
  groups: [],
  artistId: null,
  loading: false,
  error: null,

  fetchForArtist: async (artistId, threshold) => {
    set({ loading: true, error: null, artistId });
    try {
      const groups = await api.getSmartGroups(artistId, threshold);
      set({ groups, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch smart groups', { artistId, error: message });
      set({ error: message, loading: false });
    }
  },

  clear: () => set({ groups: [], artistId: null, error: null }),
}));
