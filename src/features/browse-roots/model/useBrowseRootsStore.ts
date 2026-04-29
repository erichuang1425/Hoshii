import { create } from 'zustand';
import type { RootFolder, Volume } from '@/shared/types';
import type { ScanResult } from '@/shared/types/media';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/rootFolderApi';

interface BrowseRootsState {
  roots: RootFolder[];
  volumes: Volume[];
  loading: boolean;
  scanning: Record<number, boolean>;
  error: string | null;

  fetchRoots: () => Promise<void>;
  fetchVolumes: () => Promise<void>;
  addRoot: (path: string, label?: string) => Promise<RootFolder>;
  removeRoot: (id: number) => Promise<void>;
  scanRoot: (id: number, full?: boolean) => Promise<ScanResult>;
}

export const useBrowseRootsStore = create<BrowseRootsState>((set, get) => ({
  roots: [],
  volumes: [],
  loading: false,
  scanning: {},
  error: null,

  fetchRoots: async () => {
    set({ loading: true, error: null });
    try {
      const roots = await api.getRootFolders();
      set({ roots, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch root folders', { error: message });
      set({ error: message, loading: false });
    }
  },

  fetchVolumes: async () => {
    try {
      const volumes = await api.getVolumes();
      set({ volumes });
    } catch (err) {
      logger.error('Failed to fetch volumes', { error: String(err) });
    }
  },

  addRoot: async (path, label) => {
    const root = await api.addRootFolder(path, label);
    set((s) => ({ roots: [...s.roots, root] }));
    return root;
  },

  removeRoot: async (id) => {
    await api.removeRootFolder(id);
    set((s) => ({ roots: s.roots.filter((r) => r.id !== id) }));
  },

  scanRoot: async (id, full) => {
    set((s) => ({ scanning: { ...s.scanning, [id]: true } }));
    try {
      const result = await api.scanRootFolder(id, full);
      await get().fetchRoots();
      return result;
    } finally {
      set((s) => {
        const scanning = { ...s.scanning };
        delete scanning[id];
        return { scanning };
      });
    }
  },
}));
