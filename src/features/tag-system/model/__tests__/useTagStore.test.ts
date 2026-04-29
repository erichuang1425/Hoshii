import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useTagStore } from '../useTagStore';
import type { Tag } from '@/shared/types';

vi.mock('../../api/tagApi', () => ({
  getGalleryTags: vi.fn(),
  addTag: vi.fn(),
  removeTag: vi.fn(),
  searchByTags: vi.fn(),
}));

import * as api from '../../api/tagApi';

const makeTag = (id: number, name: string): Tag => ({ id, name });

describe('useTagStore', () => {
  beforeEach(() => {
    useTagStore.setState({
      galleryTags: {},
      activeTagFilter: [],
      filteredGalleries: [],
      filtering: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('fetchGalleryTags stores tags per galleryId', async () => {
    const tags = [makeTag(1, 'action'), makeTag(2, 'comedy')];
    vi.mocked(api.getGalleryTags).mockResolvedValue(tags);

    await useTagStore.getState().fetchGalleryTags(42);

    const state = useTagStore.getState();
    expect(state.galleryTags[42]).toHaveLength(2);
    expect(state.galleryTags[42][0].name).toBe('action');
  });

  it('addTag appends new tag to gallery cache', async () => {
    const initialTags = [makeTag(1, 'existing')];
    useTagStore.setState({ galleryTags: { 5: initialTags } });

    const newTag = makeTag(2, 'new-tag');
    vi.mocked(api.addTag).mockResolvedValue(newTag);

    await useTagStore.getState().addTag(5, 'new-tag');

    const state = useTagStore.getState();
    expect(state.galleryTags[5]).toHaveLength(2);
    expect(state.galleryTags[5][1].name).toBe('new-tag');
  });

  it('removeTag removes tag from gallery cache optimistically', async () => {
    const tags = [makeTag(1, 'to-remove'), makeTag(2, 'keep')];
    useTagStore.setState({ galleryTags: { 7: tags } });
    vi.mocked(api.removeTag).mockResolvedValue(undefined);
    vi.mocked(api.getGalleryTags).mockResolvedValue([makeTag(2, 'keep')]);

    await useTagStore.getState().removeTag(7, 1);

    const state = useTagStore.getState();
    expect(state.galleryTags[7]).toHaveLength(1);
    expect(state.galleryTags[7][0].id).toBe(2);
  });

  it('getGalleryTags returns empty array for unknown galleryId', () => {
    const tags = useTagStore.getState().getGalleryTags(999);
    expect(tags).toEqual([]);
  });

  it('filterByTags stores results and active filter', async () => {
    const mockGalleries = [{ id: 1 } as never];
    vi.mocked(api.searchByTags).mockResolvedValue(mockGalleries);

    await useTagStore.getState().filterByTags(['action']);

    const state = useTagStore.getState();
    expect(state.activeTagFilter).toEqual(['action']);
    expect(state.filteredGalleries).toHaveLength(1);
    expect(state.filtering).toBe(false);
  });

  it('clearTagFilter resets filter', async () => {
    useTagStore.setState({ activeTagFilter: ['action'], filteredGalleries: [{ id: 1 } as never] });

    useTagStore.getState().clearTagFilter();

    const state = useTagStore.getState();
    expect(state.activeTagFilter).toHaveLength(0);
    expect(state.filteredGalleries).toHaveLength(0);
  });
});
