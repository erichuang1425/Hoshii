import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useZipStore } from '../useZipStore';

vi.mock('../../api/zipApi', () => ({
  verifyZipIntegrity: vi.fn(),
  restoreFromZip: vi.fn(),
}));

import * as api from '../../api/zipApi';

const mockResults = [
  { gallery: 'Gallery A', status: 'orphaned_zip' as const },
  { gallery: 'Gallery B', status: 'missing_zip' as const },
  { gallery: 'Gallery C', status: 'mismatched' as const },
  { gallery: 'Gallery D', status: 'orphaned_zip' as const },
];

describe('useZipStore', () => {
  beforeEach(() => {
    useZipStore.setState({
      results: [],
      verifying: false,
      restoring: false,
      error: null,
      lastVerifiedPath: null,
    });
    vi.clearAllMocks();
  });

  it('verifyArtistPath loads results from API', async () => {
    vi.mocked(api.verifyZipIntegrity).mockResolvedValue(mockResults);

    await useZipStore.getState().verifyArtistPath('/artist');

    const state = useZipStore.getState();
    expect(state.results).toHaveLength(4);
    expect(state.verifying).toBe(false);
    expect(state.lastVerifiedPath).toBe('/artist');
  });

  it('verifyArtistPath sets error on failure', async () => {
    vi.mocked(api.verifyZipIntegrity).mockRejectedValue(new Error('IO error'));

    await useZipStore.getState().verifyArtistPath('/artist');

    const state = useZipStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.verifying).toBe(false);
  });

  it('restoreFromZip calls API', async () => {
    vi.mocked(api.restoreFromZip).mockResolvedValue(undefined);

    await useZipStore.getState().restoreFromZip('/backup.zip', '/target');

    expect(api.restoreFromZip).toHaveBeenCalledWith('/backup.zip', '/target');
    expect(useZipStore.getState().restoring).toBe(false);
  });

  it('restoreFromZip sets error and rethrows on failure', async () => {
    vi.mocked(api.restoreFromZip).mockRejectedValue(new Error('Restore failed'));

    await expect(
      useZipStore.getState().restoreFromZip('/backup.zip', '/target'),
    ).rejects.toThrow('Restore failed');

    expect(useZipStore.getState().error).toBeTruthy();
    expect(useZipStore.getState().restoring).toBe(false);
  });

  it('getOrphanedCount returns correct count', () => {
    useZipStore.setState({ results: mockResults });
    expect(useZipStore.getState().getOrphanedCount()).toBe(2);
  });

  it('getMissingCount returns correct count', () => {
    useZipStore.setState({ results: mockResults });
    expect(useZipStore.getState().getMissingCount()).toBe(1);
  });

  it('getMismatchedCount returns correct count', () => {
    useZipStore.setState({ results: mockResults });
    expect(useZipStore.getState().getMismatchedCount()).toBe(1);
  });

  it('clearResults resets results and lastVerifiedPath', () => {
    useZipStore.setState({ results: mockResults, lastVerifiedPath: '/artist' });
    useZipStore.getState().clearResults();

    const state = useZipStore.getState();
    expect(state.results).toHaveLength(0);
    expect(state.lastVerifiedPath).toBeNull();
  });

  it('clearError resets error', () => {
    useZipStore.setState({ error: 'some error' });
    useZipStore.getState().clearError();
    expect(useZipStore.getState().error).toBeNull();
  });
});
