import { create } from 'zustand';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/zipApi';
import type { ZipStatusEntry } from '../api/zipApi';

interface ZipState {
  results: ZipStatusEntry[];
  verifying: boolean;
  restoring: boolean;
  error: string | null;
  lastVerifiedPath: string | null;

  verifyArtistPath: (artistPath: string) => Promise<void>;
  restoreFromZip: (zipPath: string, targetDir: string) => Promise<void>;
  clearResults: () => void;
  clearError: () => void;

  // Derived counts
  getOrphanedCount: () => number;
  getMissingCount: () => number;
  getMismatchedCount: () => number;
}

export const useZipStore = create<ZipState>((set, get) => ({
  results: [],
  verifying: false,
  restoring: false,
  error: null,
  lastVerifiedPath: null,

  verifyArtistPath: async (artistPath) => {
    set({ verifying: true, error: null });
    try {
      const results = await api.verifyZipIntegrity(artistPath);
      set({ results, verifying: false, lastVerifiedPath: artistPath });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to verify zip integrity', { artistPath, error: message });
      set({ error: message, verifying: false });
    }
  },

  restoreFromZip: async (zipPath, targetDir) => {
    set({ restoring: true, error: null });
    try {
      await api.restoreFromZip(zipPath, targetDir);
      set({ restoring: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to restore from zip', { zipPath, targetDir, error: message });
      set({ error: message, restoring: false });
      throw err;
    }
  },

  clearResults: () => set({ results: [], lastVerifiedPath: null }),

  clearError: () => set({ error: null }),

  getOrphanedCount: () => get().results.filter((r) => r.status === 'orphaned_zip').length,

  getMissingCount: () => get().results.filter((r) => r.status === 'missing_zip').length,

  getMismatchedCount: () => get().results.filter((r) => r.status === 'mismatched').length,
}));
