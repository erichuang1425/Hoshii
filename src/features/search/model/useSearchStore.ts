import { create } from 'zustand';
import type { Gallery } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/searchApi';

interface SearchState {
  query: string;
  results: Gallery[];
  loading: boolean;
  error: string | null;
  recentQueries: string[];

  setQuery: (q: string) => void;
  search: (query: string, rootId?: number) => Promise<void>;
  clearResults: () => void;
  clearRecentQueries: () => void;
}

// Debounce timer handle (module-level to persist across renders)
let debounceTimer: ReturnType<typeof setTimeout> | null = null;

export const useSearchStore = create<SearchState>((set, get) => ({
  query: '',
  results: [],
  loading: false,
  error: null,
  recentQueries: [],

  setQuery: (q) => {
    set({ query: q });

    // Debounce: cancel previous timer
    if (debounceTimer) clearTimeout(debounceTimer);

    if (!q.trim()) {
      set({ results: [], loading: false });
      return;
    }

    set({ loading: true });
    debounceTimer = setTimeout(() => {
      get().search(q);
    }, 300);
  },

  search: async (query, rootId) => {
    if (!query.trim()) {
      set({ results: [], loading: false });
      return;
    }

    set({ loading: true, error: null, query });

    try {
      const results = await api.searchGalleries(query, rootId);
      set({ results, loading: false });

      // Track recent queries (deduplicated, max 10)
      set((s) => {
        const filtered = s.recentQueries.filter((q) => q !== query);
        return { recentQueries: [query, ...filtered].slice(0, 10) };
      });
    } catch (err) {
      const message = String(err);
      logger.error('Search failed', { query, error: message });
      set({ error: message, loading: false });
    }
  },

  clearResults: () => {
    set({ results: [], query: '', loading: false });
  },

  clearRecentQueries: () => {
    set({ recentQueries: [] });
  },
}));
