import { describe, it, expect, beforeEach, vi } from 'vitest';
import { useGalleryReaderStore } from '../useGalleryReaderStore';

vi.mock('../../api/galleryApi', () => ({
  getGalleryMedia: vi.fn().mockResolvedValue([
    {
      id: 1, galleryId: 1, filename: '001.jpg', path: '/001.jpg', relativePath: '001.jpg',
      sortOrder: 0, groupName: 'lucy', mediaType: 'image', width: null, height: null,
      fileSize: 1000, durationMs: null, isAnimated: false, mtime: 0,
    },
    {
      id: 2, galleryId: 1, filename: '002.jpg', path: '/002.jpg', relativePath: '002.jpg',
      sortOrder: 1, groupName: 'lucy', mediaType: 'image', width: null, height: null,
      fileSize: 1000, durationMs: null, isAnimated: false, mtime: 0,
    },
    {
      id: 3, galleryId: 1, filename: '003.mp4', path: '/003.mp4', relativePath: '003.mp4',
      sortOrder: 2, groupName: 'eva', mediaType: 'video', width: null, height: null,
      fileSize: 5000, durationMs: 30000, isAnimated: false, mtime: 0,
    },
  ]),
}));

describe('useGalleryReaderStore', () => {
  beforeEach(() => {
    useGalleryReaderStore.setState({
      galleryId: null,
      media: [],
      groups: [],
      currentPage: 0,
      totalPages: 0,
      readingMode: 'single',
      fitMode: 'fit_best',
      readingDirection: 'ltr',
      zoomLevel: 1,
      currentGroup: null,
      loading: false,
      error: null,
      headerVisible: true,
      autoScroll: false,
      autoScrollSpeed: 50,
    });
  });

  it('loads gallery media and extracts groups', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);
    const state = useGalleryReaderStore.getState();

    expect(state.media).toHaveLength(3);
    expect(state.totalPages).toBe(3);
    expect(state.groups).toHaveLength(2);
    expect(state.groups[0].name).toBe('lucy');
    expect(state.groups[1].name).toBe('eva');
    expect(state.loading).toBe(false);
  });

  it('navigates pages', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);

    useGalleryReaderStore.getState().nextPage();
    expect(useGalleryReaderStore.getState().currentPage).toBe(1);

    useGalleryReaderStore.getState().nextPage();
    expect(useGalleryReaderStore.getState().currentPage).toBe(2);

    // Clamp at end
    useGalleryReaderStore.getState().nextPage();
    expect(useGalleryReaderStore.getState().currentPage).toBe(2);

    useGalleryReaderStore.getState().prevPage();
    expect(useGalleryReaderStore.getState().currentPage).toBe(1);
  });

  it('clamps page within bounds', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);

    useGalleryReaderStore.getState().setCurrentPage(-5);
    expect(useGalleryReaderStore.getState().currentPage).toBe(0);

    useGalleryReaderStore.getState().setCurrentPage(100);
    expect(useGalleryReaderStore.getState().currentPage).toBe(2);
  });

  it('updates current group when navigating', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);

    expect(useGalleryReaderStore.getState().currentGroup).toBe('lucy');

    useGalleryReaderStore.getState().setCurrentPage(2);
    expect(useGalleryReaderStore.getState().currentGroup).toBe('eva');
  });

  it('jumps to group', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);

    useGalleryReaderStore.getState().jumpToGroup('eva');
    expect(useGalleryReaderStore.getState().currentPage).toBe(2);
    expect(useGalleryReaderStore.getState().currentGroup).toBe('eva');
  });

  it('goToFirst and goToLast', async () => {
    await useGalleryReaderStore.getState().loadGallery(1);

    useGalleryReaderStore.getState().goToLast();
    expect(useGalleryReaderStore.getState().currentPage).toBe(2);

    useGalleryReaderStore.getState().goToFirst();
    expect(useGalleryReaderStore.getState().currentPage).toBe(0);
  });

  it('changes reading mode', () => {
    useGalleryReaderStore.getState().setReadingMode('vertical_scroll');
    expect(useGalleryReaderStore.getState().readingMode).toBe('vertical_scroll');
  });

  it('clamps zoom level', () => {
    useGalleryReaderStore.getState().setZoomLevel(5);
    expect(useGalleryReaderStore.getState().zoomLevel).toBe(3);

    useGalleryReaderStore.getState().setZoomLevel(0.1);
    expect(useGalleryReaderStore.getState().zoomLevel).toBe(0.5);
  });

  it('setFitMode updates fit mode', () => {
    useGalleryReaderStore.getState().setFitMode('fit_width');
    expect(useGalleryReaderStore.getState().fitMode).toBe('fit_width');

    useGalleryReaderStore.getState().setFitMode('original');
    expect(useGalleryReaderStore.getState().fitMode).toBe('original');
  });

  it('setReadingDirection updates direction', () => {
    useGalleryReaderStore.getState().setReadingDirection('rtl');
    expect(useGalleryReaderStore.getState().readingDirection).toBe('rtl');

    useGalleryReaderStore.getState().setReadingDirection('vertical');
    expect(useGalleryReaderStore.getState().readingDirection).toBe('vertical');
  });

  it('setAutoScroll toggles auto scroll', () => {
    useGalleryReaderStore.getState().setAutoScroll(true);
    expect(useGalleryReaderStore.getState().autoScroll).toBe(true);

    useGalleryReaderStore.getState().setAutoScroll(false);
    expect(useGalleryReaderStore.getState().autoScroll).toBe(false);
  });

  it('setAutoScrollSpeed clamps speed to valid range', () => {
    useGalleryReaderStore.getState().setAutoScrollSpeed(250);
    expect(useGalleryReaderStore.getState().autoScrollSpeed).toBe(200);

    useGalleryReaderStore.getState().setAutoScrollSpeed(0);
    expect(useGalleryReaderStore.getState().autoScrollSpeed).toBe(1);

    useGalleryReaderStore.getState().setAutoScrollSpeed(100);
    expect(useGalleryReaderStore.getState().autoScrollSpeed).toBe(100);
  });
});
