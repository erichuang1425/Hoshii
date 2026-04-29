import { useRef, useEffect, useCallback } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { MediaEntry, FitMode } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { isVideoType } from '@/shared/lib/mediaUtils';
import { VideoPlayer } from './VideoPlayer';

interface WebtoonViewProps {
  media: MediaEntry[];
  currentPage: number;
  fitMode: FitMode;
  onPageChange: (page: number) => void;
}

// Estimated heights by aspect ratio: most manga/webtoon pages are taller than wide
const ESTIMATED_PAGE_HEIGHT = 900;

export function WebtoonView({ media, currentPage, fitMode, onPageChange }: WebtoonViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const isScrollingProgrammatically = useRef(false);

  const virtualizer = useVirtualizer({
    count: media.length,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ESTIMATED_PAGE_HEIGHT,
    overscan: 2,
  });

  // Scroll to current page when it changes externally
  useEffect(() => {
    if (!isScrollingProgrammatically.current) {
      virtualizer.scrollToIndex(currentPage, { align: 'start', behavior: 'smooth' });
    }
  }, [currentPage, virtualizer]);

  // Track scroll to update current page
  const handleScroll = useCallback(() => {
    if (!containerRef.current) return;
    const container = containerRef.current;
    const scrollTop = container.scrollTop;
    const containerHeight = container.clientHeight;
    const midpoint = scrollTop + containerHeight / 2;

    const items = virtualizer.getVirtualItems();
    for (const item of items) {
      if (midpoint >= item.start && midpoint < item.start + item.size) {
        if (item.index !== currentPage) {
          isScrollingProgrammatically.current = false;
          onPageChange(item.index);
        }
        break;
      }
    }
  }, [virtualizer, currentPage, onPageChange]);

  const getImageStyle = (fitMode: FitMode): React.CSSProperties => {
    switch (fitMode) {
      case 'fit_width':
        return { width: '100%', height: 'auto', display: 'block' };
      case 'fit_height':
        return { maxHeight: '100vh', width: 'auto', margin: '0 auto', display: 'block' };
      case 'original':
        return { display: 'block' };
      case 'fit_best':
      default:
        return { width: '100%', maxWidth: '800px', height: 'auto', margin: '0 auto', display: 'block' };
    }
  };

  return (
    <div
      ref={containerRef}
      className="h-full w-full overflow-y-auto bg-[var(--reader-bg)]"
      onScroll={handleScroll}
      style={{ scrollbarWidth: 'thin', scrollbarColor: 'var(--border) transparent' }}
    >
      <div
        style={{
          height: virtualizer.getTotalSize(),
          width: '100%',
          position: 'relative',
        }}
      >
        {virtualizer.getVirtualItems().map((item) => {
          const entry = media[item.index];
          const isVideo = isVideoType(entry.mediaType);

          return (
            <div
              key={item.key}
              data-index={item.index}
              ref={virtualizer.measureElement}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                transform: `translateY(${item.start}px)`,
              }}
              className="flex items-center justify-center py-1"
            >
              {isVideo ? (
                <div style={{ width: '100%', maxWidth: '800px', margin: '0 auto' }}>
                  <VideoPlayer media={entry} />
                </div>
              ) : (
                <img
                  src={toAssetUrl(entry.path)}
                  alt={entry.filename}
                  loading="lazy"
                  style={getImageStyle(fitMode)}
                />
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
