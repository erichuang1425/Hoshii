import { useRef, useEffect } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import clsx from 'clsx';
import type { MediaEntry } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { isVideoType } from '@/shared/lib/mediaUtils';

interface ThumbnailStripProps {
  media: MediaEntry[];
  currentIndex: number;
  onSelect: (index: number) => void;
}

const THUMB_WIDTH = 64;
const THUMB_GAP = 4;

export function ThumbnailStrip({ media, currentIndex, onSelect }: ThumbnailStripProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const virtualizer = useVirtualizer({
    count: media.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => THUMB_WIDTH + THUMB_GAP,
    horizontal: true,
    overscan: 5,
  });

  // Scroll to current thumbnail
  useEffect(() => {
    virtualizer.scrollToIndex(currentIndex, { align: 'center' });
  }, [currentIndex, virtualizer]);

  return (
    <div
      ref={containerRef}
      className="flex h-16 w-full overflow-x-auto border-t border-[var(--border)] bg-[var(--bg-secondary)]"
      style={{ scrollbarWidth: 'thin' }}
    >
      <div
        className="relative flex items-center"
        style={{ width: virtualizer.getTotalSize(), height: '100%' }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const entry = media[item.index];
          const isCurrent = item.index === currentIndex;
          const isVideo = isVideoType(entry.mediaType);

          return (
            <button
              key={item.key}
              onClick={() => onSelect(item.index)}
              className={clsx(
                'absolute top-1/2 -translate-y-1/2 overflow-hidden rounded',
                'border-2 transition-all duration-[var(--duration-fast)]',
                isCurrent ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-hover)]',
              )}
              style={{
                left: item.start,
                width: THUMB_WIDTH,
                height: THUMB_WIDTH * (4 / 3),
              }}
            >
              <img
                src={toAssetUrl(entry.path)}
                alt={entry.filename}
                className="h-full w-full object-cover"
                loading="lazy"
              />
              {isVideo && (
                <span className="absolute bottom-0 left-0 right-0 bg-black/60 text-center text-[9px] text-white">
                  VIDEO
                </span>
              )}
            </button>
          );
        })}
      </div>
    </div>
  );
}
