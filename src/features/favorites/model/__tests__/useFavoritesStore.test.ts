import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFavoritesStore } from '../useFavoritesStore';
import type { Gallery } from '@/shared/types';

vi.mock('../../api/favoritesApi', () => ({
  toggleFavorite: vi.fn(),
  getFavoriteGalleries: vi.fn(),
}));

import * as api from '../../api/favoritesApi';

const makeGallery = (overrides: Partial<Gallery> = {}): Gallery => ({
  id: 1,
  artistId: 1,
  name: 'Test Gallery',
  path: '/test/gallery',
  pageCount: 10,
  totalSize: 1000,
  coverPath: null,
  hasBackupZip: false,
  zipStatus: 'unknown',
  lastReadPage: 0,
  lastReadAt: null,
  favorited: false,
  ...overrides,
});

describe('useFavoritesStore', () => {
  beforeEach(() => {
    useFavoritesStore.setState({
      favorites: [],
      loading: false,
      error: null,
      toggling: new Set(),
    });
    vi.clearAllMocks();
  });

  it('fetchFavorites loads favorites from API', async () => {
    const mockFavorites = [makeGallery({ id: 1, favorited: true })];
    vi.mocked(api.getFavoriteGalleries).mockResolvedValue(mockFavorites);

    await useFavoritesStore.getState().fetchFavorites();

    const state = useFavoritesStore.getState();
    expect(state.favorites).toHaveLength(1);
    expect(state.loading).toBe(false);
  });

  it('fetchFavorites sets error on failure', async () => {
    vi.mocked(api.getFavoriteGalleries).mockRejectedValue(new Error('Network error'));

    await useFavoritesStore.getState().fetchFavorites();

    const state = useFavoritesStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
  });

  it('toggleFavorite adds gallery to favorites (optimistic)', async () => {
    const gallery = makeGallery({ id: 2, favorited: false });
    vi.mocked(api.toggleFavorite).mockResolvedValue(true);

    useFavoritesStore.getState().toggleFavorite(gallery);

    // Optimistic: should be in favorites immediately
    const state = useFavoritesStore.getState();
    expect(state.favorites.some((f) => f.id === 2)).toBe(true);
  });

  it('toggleFavorite removes gallery from favorites (optimistic)', async () => {
    const gallery = makeGallery({ id: 3, favorited: true });
    useFavoritesStore.setState({ favorites: [gallery] });
    vi.mocked(api.toggleFavorite).mockResolvedValue(false);

    await useFavoritesStore.getState().toggleFavorite(gallery);

    const state = useFavoritesStore.getState();
    expect(state.favorites.some((f) => f.id === 3)).toBe(false);
  });

  it('isFavorited returns true when gallery is in favorites', () => {
    const gallery = makeGallery({ id: 4, favorited: true });
    useFavoritesStore.setState({ favorites: [gallery] });

    expect(useFavoritesStore.getState().isFavorited(4)).toBe(true);
    expect(useFavoritesStore.getState().isFavorited(99)).toBe(false);
  });
});
