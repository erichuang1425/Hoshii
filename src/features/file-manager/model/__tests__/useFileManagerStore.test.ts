import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useFileManagerStore } from '../useFileManagerStore';

vi.mock('../../api/fileManagerApi', () => ({
  getUnorganizedFiles: vi.fn(),
  moveFilesToGallery: vi.fn(),
  createGalleryFolder: vi.fn(),
}));

import * as api from '../../api/fileManagerApi';

const mockFiles = [
  { id: 1, artistId: 1, filename: 'a.jpg', path: '/a.jpg', mediaType: 'image' as const, fileSize: 100 },
  { id: 2, artistId: 1, filename: 'b.png', path: '/b.png', mediaType: 'image' as const, fileSize: 200 },
  { id: 3, artistId: 1, filename: 'c.gif', path: '/c.gif', mediaType: 'animated_image' as const, fileSize: 300 },
];

describe('useFileManagerStore', () => {
  beforeEach(() => {
    useFileManagerStore.setState({
      unorganizedFiles: [],
      selectedFiles: new Set(),
      loading: false,
      moving: false,
      error: null,
      currentArtistId: null,
    });
    vi.clearAllMocks();
  });

  it('fetchUnorganizedFiles loads files from API', async () => {
    vi.mocked(api.getUnorganizedFiles).mockResolvedValue(mockFiles);

    await useFileManagerStore.getState().fetchUnorganizedFiles(1);

    const state = useFileManagerStore.getState();
    expect(state.unorganizedFiles).toHaveLength(3);
    expect(state.loading).toBe(false);
    expect(state.currentArtistId).toBe(1);
  });

  it('fetchUnorganizedFiles sets error on failure', async () => {
    vi.mocked(api.getUnorganizedFiles).mockRejectedValue(new Error('DB error'));

    await useFileManagerStore.getState().fetchUnorganizedFiles(1);

    const state = useFileManagerStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.loading).toBe(false);
  });

  it('toggleFileSelection adds and removes files', () => {
    useFileManagerStore.getState().toggleFileSelection('/a.jpg');
    expect(useFileManagerStore.getState().selectedFiles.has('/a.jpg')).toBe(true);

    useFileManagerStore.getState().toggleFileSelection('/a.jpg');
    expect(useFileManagerStore.getState().selectedFiles.has('/a.jpg')).toBe(false);
  });

  it('selectAll selects all unorganized files', () => {
    useFileManagerStore.setState({ unorganizedFiles: mockFiles });

    useFileManagerStore.getState().selectAll();
    expect(useFileManagerStore.getState().selectedFiles.size).toBe(3);
  });

  it('deselectAll clears selection', () => {
    useFileManagerStore.setState({ selectedFiles: new Set(['/a.jpg', '/b.png']) });

    useFileManagerStore.getState().deselectAll();
    expect(useFileManagerStore.getState().selectedFiles.size).toBe(0);
  });

  it('moveSelectedToGallery moves files and removes from list', async () => {
    vi.mocked(api.moveFilesToGallery).mockResolvedValue(undefined);
    useFileManagerStore.setState({
      unorganizedFiles: mockFiles,
      selectedFiles: new Set(['/a.jpg', '/b.png']),
    });

    await useFileManagerStore.getState().moveSelectedToGallery('/gallery');

    const state = useFileManagerStore.getState();
    expect(state.unorganizedFiles).toHaveLength(1);
    expect(state.unorganizedFiles[0].filename).toBe('c.gif');
    expect(state.selectedFiles.size).toBe(0);
    expect(state.moving).toBe(false);
  });

  it('moveSelectedToGallery does nothing with empty selection', async () => {
    useFileManagerStore.setState({ selectedFiles: new Set() });

    await useFileManagerStore.getState().moveSelectedToGallery('/gallery');
    expect(api.moveFilesToGallery).not.toHaveBeenCalled();
  });

  it('createAndMoveToGallery creates gallery and moves files', async () => {
    const mockGallery = {
      id: 10, artistId: 1, name: 'New', path: '/new',
      pageCount: 0, totalSize: 0, coverPath: null,
      hasBackupZip: false, zipStatus: 'unknown' as const,
      lastReadPage: 0, lastReadAt: null, favorited: false,
    };
    vi.mocked(api.createGalleryFolder).mockResolvedValue(mockGallery);
    vi.mocked(api.moveFilesToGallery).mockResolvedValue(undefined);
    useFileManagerStore.setState({
      unorganizedFiles: mockFiles,
      selectedFiles: new Set(['/a.jpg']),
    });

    const result = await useFileManagerStore.getState().createAndMoveToGallery('/artist', 'New');

    expect(result.id).toBe(10);
    expect(api.createGalleryFolder).toHaveBeenCalledWith('/artist', 'New');
    expect(api.moveFilesToGallery).toHaveBeenCalledWith(['/a.jpg'], '/new');
  });

  it('clearError clears the error state', () => {
    useFileManagerStore.setState({ error: 'some error' });
    useFileManagerStore.getState().clearError();
    expect(useFileManagerStore.getState().error).toBeNull();
  });
});
