import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useReadingProgressStore } from '../useReadingProgressStore';

vi.mock('../../api/readingProgressApi', () => ({
  updateReadingProgress: vi.fn(),
  getRecentGalleries: vi.fn(),
}));

import * as api from '../../api/readingProgressApi';

const makeGallery = (id: number) => ({
  id,
  artistId: 1,
  name: `Gallery ${id}`,
  path: `/gallery/${id}`,
  pageCount: 20,
  totalSize: 1000,
  coverPath: null,
  hasBackupZip: false,
  zipStatus: 'unknown' as const,
  lastReadPage: 5,
  lastReadAt: '2026-03-21',
  favorited: false,
});

describe('useReadingProgressStore', () => {
  beforeEach(() => {
    useReadingProgressStore.setState({
      recentGalleries: [],
      loadingRecent: false,
      savingProgress: false,
    });
    vi.clearAllMocks();
  });

  it('saveProgress calls API with correct args', async () => {
    vi.mocked(api.updateReadingProgress).mockResolvedValue(undefined);

    await useReadingProgressStore.getState().saveProgress(1, 5, 20);

    expect(api.updateReadingProgress).toHaveBeenCalledWith(1, 5, 20);
    expect(useReadingProgressStore.getState().savingProgress).toBe(false);
  });

  it('saveProgress handles API errors gracefully', async () => {
    vi.mocked(api.updateReadingProgress).mockRejectedValue(new Error('DB error'));

    await useReadingProgressStore.getState().saveProgress(1, 5, 20);

    expect(useReadingProgressStore.getState().savingProgress).toBe(false);
  });

  it('fetchRecentGalleries loads galleries from API', async () => {
    const mockGalleries = [makeGallery(1), makeGallery(2)];
    vi.mocked(api.getRecentGalleries).mockResolvedValue(mockGalleries);

    await useReadingProgressStore.getState().fetchRecentGalleries(10);

    const state = useReadingProgressStore.getState();
    expect(state.recentGalleries).toHaveLength(2);
    expect(state.loadingRecent).toBe(false);
    expect(api.getRecentGalleries).toHaveBeenCalledWith(10);
  });

  it('fetchRecentGalleries defaults to limit of 10', async () => {
    vi.mocked(api.getRecentGalleries).mockResolvedValue([]);

    await useReadingProgressStore.getState().fetchRecentGalleries();

    expect(api.getRecentGalleries).toHaveBeenCalledWith(10);
  });

  it('fetchRecentGalleries handles errors gracefully', async () => {
    vi.mocked(api.getRecentGalleries).mockRejectedValue(new Error('Network error'));

    await useReadingProgressStore.getState().fetchRecentGalleries();

    expect(useReadingProgressStore.getState().loadingRecent).toBe(false);
  });
});
