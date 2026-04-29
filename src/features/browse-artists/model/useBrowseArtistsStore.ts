import { create } from 'zustand';
import type { Artist, Gallery, GallerySortOrder } from '@/shared/types';
import { logger } from '@/shared/lib/logger';
import * as api from '../api/artistApi';

type ArtistSortOrder = 'name' | 'gallery_count' | 'recent';

interface BrowseArtistsState {
  artists: Artist[];
  galleries: Gallery[];
  loading: boolean;
  galleriesLoading: boolean;
  error: string | null;
  searchQuery: string;
  artistSort: ArtistSortOrder;
  gallerySort: GallerySortOrder;

  fetchArtists: (rootId: number) => Promise<void>;
  fetchGalleries: (artistId: number) => Promise<void>;
  setSearchQuery: (query: string) => void;
  setArtistSort: (sort: ArtistSortOrder) => void;
  setGallerySort: (sort: GallerySortOrder) => void;
  getFilteredArtists: () => Artist[];
  getSortedArtists: () => Artist[];
}

export type { ArtistSortOrder };

export const useBrowseArtistsStore = create<BrowseArtistsState>((set, get) => ({
  artists: [],
  galleries: [],
  loading: false,
  galleriesLoading: false,
  error: null,
  searchQuery: '',
  artistSort: 'name',
  gallerySort: 'name_asc',

  fetchArtists: async (rootId) => {
    set({ loading: true, error: null, artists: [] });
    try {
      const artists = await api.getArtists(rootId);
      set({ artists, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch artists', { rootId, error: message });
      set({ error: message, loading: false });
    }
  },

  fetchGalleries: async (artistId) => {
    set({ galleriesLoading: true, error: null, galleries: [] });
    try {
      const galleries = await api.getGalleries(artistId, get().gallerySort);
      set({ galleries, galleriesLoading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch galleries', { artistId, error: message });
      set({ error: message, galleriesLoading: false });
    }
  },

  setSearchQuery: (query) => set({ searchQuery: query }),

  setArtistSort: (sort) => set({ artistSort: sort }),

  setGallerySort: (sort) => {
    set({ gallerySort: sort });
  },

  getFilteredArtists: () => {
    const { artists, searchQuery } = get();
    if (!searchQuery.trim()) return artists;
    const q = searchQuery.toLowerCase();
    return artists.filter((a) => a.name.toLowerCase().includes(q));
  },

  getSortedArtists: () => {
    const filtered = get().getFilteredArtists();
    const sort = get().artistSort;
    const sorted = [...filtered];
    switch (sort) {
      case 'name':
        sorted.sort((a, b) => a.name.localeCompare(b.name));
        break;
      case 'gallery_count':
        sorted.sort((a, b) => b.galleryCount - a.galleryCount);
        break;
      case 'recent':
        // Keep backend order (most recently updated first)
        break;
    }
    return sorted;
  },
}));
