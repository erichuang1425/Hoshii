import { describe, it, expect } from 'vitest';
import {
  isVideoType,
  isAnimatedType,
  isStaticImageType,
  needsRemux,
  getMediaBadgeLabel,
  formatDuration,
} from '../mediaUtils';

describe('mediaUtils', () => {
  describe('isVideoType', () => {
    it('returns true for video', () => {
      expect(isVideoType('video')).toBe(true);
    });
    it('returns false for image', () => {
      expect(isVideoType('image')).toBe(false);
    });
  });

  describe('isAnimatedType', () => {
    it('returns true for animated_image', () => {
      expect(isAnimatedType('animated_image')).toBe(true);
    });
    it('returns true for avif_animated', () => {
      expect(isAnimatedType('avif_animated')).toBe(true);
    });
    it('returns false for image', () => {
      expect(isAnimatedType('image')).toBe(false);
    });
  });

  describe('isStaticImageType', () => {
    it('returns true for image', () => {
      expect(isStaticImageType('image')).toBe(true);
    });
    it('returns true for avif_static', () => {
      expect(isStaticImageType('avif_static')).toBe(true);
    });
    it('returns false for video', () => {
      expect(isStaticImageType('video')).toBe(false);
    });
  });

  describe('needsRemux', () => {
    it.each(['file.mkv', 'file.avi', 'file.mov', 'file.wmv', 'file.flv'])(
      'returns true for %s',
      (filename) => {
        expect(needsRemux(filename)).toBe(true);
      },
    );
    it.each(['file.mp4', 'file.webm', 'file.jpg'])(
      'returns false for %s',
      (filename) => {
        expect(needsRemux(filename)).toBe(false);
      },
    );
  });

  describe('getMediaBadgeLabel', () => {
    it('returns GIF for animated_image', () => {
      expect(getMediaBadgeLabel('animated_image')).toBe('GIF');
    });
    it('returns AVIF for avif_animated', () => {
      expect(getMediaBadgeLabel('avif_animated')).toBe('AVIF');
    });
    it('returns VIDEO for video', () => {
      expect(getMediaBadgeLabel('video')).toBe('VIDEO');
    });
    it('returns null for image', () => {
      expect(getMediaBadgeLabel('image')).toBeNull();
    });
  });

  describe('formatDuration', () => {
    it('formats 0ms as 0:00', () => {
      expect(formatDuration(0)).toBe('0:00');
    });
    it('formats 90000ms as 1:30', () => {
      expect(formatDuration(90000)).toBe('1:30');
    });
    it('formats 5000ms as 0:05', () => {
      expect(formatDuration(5000)).toBe('0:05');
    });
    it('formats 3723000ms as 62:03', () => {
      expect(formatDuration(3723000)).toBe('62:03');
    });
  });
});
