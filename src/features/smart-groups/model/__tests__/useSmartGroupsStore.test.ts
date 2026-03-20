import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSmartGroupsStore } from '../useSmartGroupsStore';
import type { SmartGroup } from '@/shared/types';

vi.mock('../../api/smartGroupsApi', () => ({
  getSmartGroups: vi.fn(),
  getSmartGroupsForRoot: vi.fn(),
}));

import * as api from '../../api/smartGroupsApi';

const makeGroup = (name: string, ids: number[]): SmartGroup => ({
  name,
  galleryIds: ids,
  galleryNames: ids.map((id) => `Gallery ${id}`),
});

describe('useSmartGroupsStore', () => {
  beforeEach(() => {
    useSmartGroupsStore.setState({
      groups: [],
      artistId: null,
      loading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('fetchForArtist loads groups from API', async () => {
    const mockGroups = [makeGroup('Series A', [1, 2]), makeGroup('Series B', [3, 4])];
    vi.mocked(api.getSmartGroups).mockResolvedValue(mockGroups);

    await useSmartGroupsStore.getState().fetchForArtist(10);

    const state = useSmartGroupsStore.getState();
    expect(state.groups).toHaveLength(2);
    expect(state.artistId).toBe(10);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetchForArtist sets error on failure', async () => {
    vi.mocked(api.getSmartGroups).mockRejectedValue(new Error('DB error'));

    await useSmartGroupsStore.getState().fetchForArtist(10);

    const state = useSmartGroupsStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
  });

  it('fetchForArtist passes threshold option', async () => {
    vi.mocked(api.getSmartGroups).mockResolvedValue([]);

    await useSmartGroupsStore.getState().fetchForArtist(5, 3);

    expect(api.getSmartGroups).toHaveBeenCalledWith(5, 3);
  });

  it('clear resets state', () => {
    useSmartGroupsStore.setState({
      groups: [makeGroup('test', [1])],
      artistId: 5,
      error: 'some error',
    });

    useSmartGroupsStore.getState().clear();

    const state = useSmartGroupsStore.getState();
    expect(state.groups).toHaveLength(0);
    expect(state.artistId).toBeNull();
    expect(state.error).toBeNull();
  });
});
