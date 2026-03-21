import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useBrowseRootsStore } from '../useBrowseRootsStore';

vi.mock('../../api/rootFolderApi', () => ({
  getRootFolders: vi.fn().mockResolvedValue([
    { id: 1, volumeId: 1, path: '/mnt/drive/photos', relativePath: 'photos', label: null, lastScan: null, scanVersion: 0 },
    { id: 2, volumeId: 1, path: '/mnt/drive/art', relativePath: 'art', label: 'Art Collection', lastScan: '2025-01-01', scanVersion: 1 },
  ]),
  getVolumes: vi.fn().mockResolvedValue([
    { id: 1, uuid: 'abc', label: 'Main Drive', mountPath: '/mnt/drive', isOnline: true, isRemovable: false, totalBytes: null, lastSeen: null },
  ]),
  addRootFolder: vi.fn().mockResolvedValue(
    { id: 3, volumeId: 1, path: '/mnt/drive/new', relativePath: 'new', label: null, lastScan: null, scanVersion: 0 },
  ),
  removeRootFolder: vi.fn().mockResolvedValue(undefined),
  scanRootFolder: vi.fn().mockResolvedValue(
    { rootId: 1, artistsFound: 5, galleriesFound: 20, mediaFilesFound: 500, unorganizedFiles: 3, orphanedZips: 0, scanDurationMs: 1500, changedFiles: 10, errors: [] },
  ),
}));

describe('useBrowseRootsStore', () => {
  beforeEach(() => {
    useBrowseRootsStore.setState({
      roots: [],
      volumes: [],
      loading: false,
      scanning: {},
      error: null,
    });
  });

  it('fetches root folders', async () => {
    await useBrowseRootsStore.getState().fetchRoots();
    const state = useBrowseRootsStore.getState();
    expect(state.roots).toHaveLength(2);
    expect(state.loading).toBe(false);
    expect(state.error).toBeNull();
  });

  it('fetches volumes', async () => {
    await useBrowseRootsStore.getState().fetchVolumes();
    const state = useBrowseRootsStore.getState();
    expect(state.volumes).toHaveLength(1);
    expect(state.volumes[0].label).toBe('Main Drive');
  });

  it('adds a root folder', async () => {
    const root = await useBrowseRootsStore.getState().addRoot('/mnt/drive/new');
    expect(root.id).toBe(3);
    expect(useBrowseRootsStore.getState().roots).toHaveLength(1);
  });

  it('removes a root folder', async () => {
    await useBrowseRootsStore.getState().fetchRoots();
    expect(useBrowseRootsStore.getState().roots).toHaveLength(2);

    await useBrowseRootsStore.getState().removeRoot(1);
    expect(useBrowseRootsStore.getState().roots).toHaveLength(1);
    expect(useBrowseRootsStore.getState().roots[0].id).toBe(2);
  });

  it('scans a root folder', async () => {
    await useBrowseRootsStore.getState().fetchRoots();
    const result = await useBrowseRootsStore.getState().scanRoot(1);
    expect(result.artistsFound).toBe(5);
    expect(result.galleriesFound).toBe(20);
    expect(useBrowseRootsStore.getState().scanning[1]).toBeUndefined();
  });
});
