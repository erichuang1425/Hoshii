import { describe, it, expect } from 'vitest';
import { extractGroups, getGroupForIndex } from '../mediaGrouping';
import type { MediaEntry } from '@/shared/types';

function makeEntry(overrides: Partial<MediaEntry> = {}): MediaEntry {
  return {
    id: 1,
    galleryId: 1,
    filename: 'test.jpg',
    path: '/test.jpg',
    relativePath: 'test.jpg',
    sortOrder: 0,
    groupName: '',
    mediaType: 'image',
    width: null,
    height: null,
    fileSize: 1000,
    durationMs: null,
    isAnimated: false,
    mtime: 0,
    ...overrides,
  };
}

describe('mediaGrouping', () => {
  describe('extractGroups', () => {
    it('returns empty array for empty media', () => {
      expect(extractGroups([])).toEqual([]);
    });

    it('extracts single group', () => {
      const media = [
        makeEntry({ groupName: 'lucy', sortOrder: 0 }),
        makeEntry({ groupName: 'lucy', sortOrder: 1 }),
        makeEntry({ groupName: 'lucy', sortOrder: 2 }),
      ];
      const groups = extractGroups(media);
      expect(groups).toEqual([
        { name: 'lucy', startIndex: 0, count: 3 },
      ]);
    });

    it('extracts multiple groups', () => {
      const media = [
        makeEntry({ groupName: 'lucy', sortOrder: 0 }),
        makeEntry({ groupName: 'lucy', sortOrder: 1 }),
        makeEntry({ groupName: 'eva', sortOrder: 2 }),
        makeEntry({ groupName: 'eva', sortOrder: 3 }),
        makeEntry({ groupName: 'mia', sortOrder: 4 }),
      ];
      const groups = extractGroups(media);
      expect(groups).toEqual([
        { name: 'lucy', startIndex: 0, count: 2 },
        { name: 'eva', startIndex: 2, count: 2 },
        { name: 'mia', startIndex: 4, count: 1 },
      ]);
    });

    it('handles empty group names', () => {
      const media = [
        makeEntry({ groupName: '', sortOrder: 0 }),
        makeEntry({ groupName: '', sortOrder: 1 }),
      ];
      const groups = extractGroups(media);
      expect(groups).toEqual([
        { name: '', startIndex: 0, count: 2 },
      ]);
    });
  });

  describe('getGroupForIndex', () => {
    const groups = [
      { name: 'lucy', startIndex: 0, count: 3 },
      { name: 'eva', startIndex: 3, count: 2 },
    ];

    it('returns correct group for index within first group', () => {
      expect(getGroupForIndex(groups, 0)).toBe('lucy');
      expect(getGroupForIndex(groups, 2)).toBe('lucy');
    });

    it('returns correct group for index within second group', () => {
      expect(getGroupForIndex(groups, 3)).toBe('eva');
      expect(getGroupForIndex(groups, 4)).toBe('eva');
    });

    it('returns null for out-of-range index', () => {
      expect(getGroupForIndex(groups, 5)).toBeNull();
      expect(getGroupForIndex(groups, -1)).toBeNull();
    });

    it('returns null for empty groups', () => {
      expect(getGroupForIndex([], 0)).toBeNull();
    });
  });
});
