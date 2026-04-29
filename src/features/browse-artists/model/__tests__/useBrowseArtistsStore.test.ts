import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBrowseArtistsStore } from '../useBrowseArtistsStore';

vi.mock('../../api/artistApi', () => ({
  getArtists: vi.fn().mockResolvedValue([
    { id: 1, rootId: 1, name: 'Alice', path: '/alice', galleryCount: 5 },
    { id: 2, rootId: 1, name: 'Bob', path: '/bob', galleryCount: 12 },
    { id: 3, rootId: 1, name: 'Charlie', path: '/charlie', galleryCount: 3 },
  ]),
  getGalleries: vi.fn().mockResolvedValue([
    { id: 1, artistId: 1, name: 'Gallery A', path: '/a', pageCount: 10, totalSize: 1000, coverPath: null, hasBackupZip: false, zipStatus: 'unknown', lastReadPage: 0, lastReadAt: null, favorited: false },
    { id: 2, artistId: 1, name: 'Gallery B', path: '/b', pageCount: 20, totalSize: 2000, coverPath: null, hasBackupZip: false, zipStatus: 'unknown', lastReadPage: 5, lastReadAt: '2025-01-01', favorited: true },
  ]),
}));

describe('useBrowseArtistsStore', () => {
  beforeEach(() => {
    useBrowseArtistsStore.setState({
      artists: [],
      galleries: [],
      loading: false,
      galleriesLoading: false,
      error: null,
      searchQuery: '',
      artistSort: 'name',
      gallerySort: 'name_asc',
    });
  });

  it('fetches artists', async () => {
    await useBrowseArtistsStore.getState().fetchArtists(1);
    const state = useBrowseArtistsStore.getState();
    expect(state.artists).toHaveLength(3);
    expect(state.loading).toBe(false);
  });

  it('fetches galleries for an artist', async () => {
    await useBrowseArtistsStore.getState().fetchGalleries(1);
    const state = useBrowseArtistsStore.getState();
    expect(state.galleries).toHaveLength(2);
    expect(state.galleriesLoading).toBe(false);
  });

  it('filters artists by search query', async () => {
    await useBrowseArtistsStore.getState().fetchArtists(1);
    useBrowseArtistsStore.getState().setSearchQuery('ali');
    const filtered = useBrowseArtistsStore.getState().getFilteredArtists();
    expect(filtered).toHaveLength(1);
    expect(filtered[0].name).toBe('Alice');
  });

  it('returns all artists when search is empty', async () => {
    await useBrowseArtistsStore.getState().fetchArtists(1);
    useBrowseArtistsStore.getState().setSearchQuery('');
    const filtered = useBrowseArtistsStore.getState().getFilteredArtists();
    expect(filtered).toHaveLength(3);
  });

  it('sorts artists alphabetically', async () => {
    await useBrowseArtistsStore.getState().fetchArtists(1);
    useBrowseArtistsStore.getState().setArtistSort('name');
    const sorted = useBrowseArtistsStore.getState().getSortedArtists();
    expect(sorted.map((a) => a.name)).toEqual(['Alice', 'Bob', 'Charlie']);
  });

  it('sorts artists by gallery count', async () => {
    await useBrowseArtistsStore.getState().fetchArtists(1);
    useBrowseArtistsStore.getState().setArtistSort('gallery_count');
    const sorted = useBrowseArtistsStore.getState().getSortedArtists();
    expect(sorted.map((a) => a.name)).toEqual(['Bob', 'Alice', 'Charlie']);
  });
});
