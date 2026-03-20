import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSearchStore } from '../useSearchStore';
import type { Gallery } from '@/shared/types';

vi.mock('../../api/searchApi', () => ({
  searchGalleries: vi.fn(),
}));

import * as api from '../../api/searchApi';

const makeGallery = (id: number): Gallery => ({
  id,
  artistId: 1,
  name: `Gallery ${id}`,
  path: `/test/gallery-${id}`,
  pageCount: 5,
  totalSize: 500,
  coverPath: null,
  hasBackupZip: false,
  zipStatus: 'unknown',
  lastReadPage: 0,
  lastReadAt: null,
  favorited: false,
});

describe('useSearchStore', () => {
  beforeEach(() => {
    useSearchStore.setState({
      query: '',
      results: [],
      loading: false,
      error: null,
      recentQueries: [],
    });
    vi.clearAllMocks();
  });

  it('search returns results for a query', async () => {
    const mockResults = [makeGallery(1), makeGallery(2)];
    vi.mocked(api.searchGalleries).mockResolvedValue(mockResults);

    await useSearchStore.getState().search('test');

    const state = useSearchStore.getState();
    expect(state.results).toHaveLength(2);
    expect(state.loading).toBe(false);
    expect(state.query).toBe('test');
  });

  it('search returns empty for blank query', async () => {
    await useSearchStore.getState().search('');

    expect(api.searchGalleries).not.toHaveBeenCalled();
    expect(useSearchStore.getState().results).toHaveLength(0);
  });

  it('search records recent queries', async () => {
    vi.mocked(api.searchGalleries).mockResolvedValue([]);
    await useSearchStore.getState().search('query1');
    await useSearchStore.getState().search('query2');

    const state = useSearchStore.getState();
    expect(state.recentQueries[0]).toBe('query2');
    expect(state.recentQueries[1]).toBe('query1');
  });

  it('search deduplicates recent queries', async () => {
    vi.mocked(api.searchGalleries).mockResolvedValue([]);
    await useSearchStore.getState().search('repeated');
    await useSearchStore.getState().search('other');
    await useSearchStore.getState().search('repeated');

    const state = useSearchStore.getState();
    expect(state.recentQueries.filter((q) => q === 'repeated')).toHaveLength(1);
    expect(state.recentQueries[0]).toBe('repeated');
  });

  it('clearResults resets state', async () => {
    useSearchStore.setState({ query: 'test', results: [makeGallery(1)] });

    useSearchStore.getState().clearResults();

    const state = useSearchStore.getState();
    expect(state.query).toBe('');
    expect(state.results).toHaveLength(0);
  });

  it('clearRecentQueries empties recent list', async () => {
    useSearchStore.setState({ recentQueries: ['a', 'b', 'c'] });

    useSearchStore.getState().clearRecentQueries();

    expect(useSearchStore.getState().recentQueries).toHaveLength(0);
  });

  it('search sets error on failure', async () => {
    vi.mocked(api.searchGalleries).mockRejectedValue(new Error('Search failed'));

    await useSearchStore.getState().search('failing query');

    const state = useSearchStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
  });
});
