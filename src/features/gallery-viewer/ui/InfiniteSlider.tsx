import { useRef, useState, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import type { MediaEntry } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { isVideoType } from '@/shared/lib/mediaUtils';

interface InfiniteSliderProps {
  media: MediaEntry[];
  currentPage: number;
  onSeek: (page: number) => void;
}

const SLIDER_WIDTH = 12; // px, width of the draggable track
const PREVIEW_WIDTH = 120;
const PREVIEW_HEIGHT = 160;

export function InfiniteSlider({ media, currentPage, onSeek }: InfiniteSliderProps) {
  const trackRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [hoverPage, setHoverPage] = useState<number | null>(null);
  const [hoverY, setHoverY] = useState(0);

  const getPageFromY = useCallback((clientY: number): number => {
    if (!trackRef.current || media.length === 0) return 0;
    const rect = trackRef.current.getBoundingClientRect();
    const ratio = Math.max(0, Math.min(1, (clientY - rect.top) / rect.height));
    return Math.round(ratio * (media.length - 1));
  }, [media.length]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    const page = getPageFromY(e.clientY);
    setHoverPage(page);
    setHoverY(e.clientY);
    if (isDragging) {
      onSeek(page);
    }
  }, [getPageFromY, isDragging, onSeek]);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault();
    setIsDragging(true);
    const page = getPageFromY(e.clientY);
    onSeek(page);
  }, [getPageFromY, onSeek]);

  const handleMouseLeave = useCallback(() => {
    if (!isDragging) setHoverPage(null);
  }, [isDragging]);

  // Global mouse up to end drag
  useEffect(() => {
    if (!isDragging) return;
    const handleUp = () => {
      setIsDragging(false);
      setHoverPage(null);
    };
    const handleMove = (e: MouseEvent) => {
      const page = getPageFromY(e.clientY);
      setHoverPage(page);
      setHoverY(e.clientY);
      onSeek(page);
    };
    window.addEventListener('mouseup', handleUp);
    window.addEventListener('mousemove', handleMove);
    return () => {
      window.removeEventListener('mouseup', handleUp);
      window.removeEventListener('mousemove', handleMove);
    };
  }, [isDragging, getPageFromY, onSeek]);

  if (media.length === 0) return null;

  const thumbPercent = media.length > 1 ? (currentPage / (media.length - 1)) * 100 : 0;
  const previewEntry = hoverPage !== null ? media[hoverPage] : null;

  return (
    <div
      className="absolute right-0 top-0 bottom-0 flex items-stretch"
      style={{ width: SLIDER_WIDTH + 8 }}
    >
      {/* Track */}
      <div
        ref={trackRef}
        className="relative flex-1 cursor-pointer select-none"
        style={{ width: SLIDER_WIDTH }}
        onMouseMove={handleMouseMove}
        onMouseDown={handleMouseDown}
        onMouseLeave={handleMouseLeave}
      >
        {/* Background track */}
        <div
          className="absolute inset-x-0 top-2 bottom-2 rounded-full bg-[var(--bg-secondary)]/60"
          style={{ left: '50%', transform: 'translateX(-50%)', width: 4 }}
        />

        {/* Progress fill */}
        <div
          className="absolute rounded-full bg-[var(--accent)]/60"
          style={{
            left: '50%',
            transform: 'translateX(-50%)',
            width: 4,
            top: '8px',
            height: `calc(${thumbPercent}% - 8px)`,
          }}
        />

        {/* Thumb */}
        <div
          className={clsx(
            'absolute rounded-full border-2 transition-transform duration-[var(--duration-fast)]',
            'border-[var(--accent)] bg-[var(--bg-primary)]',
            isDragging ? 'scale-150' : 'scale-100',
          )}
          style={{
            left: '50%',
            top: `calc(${thumbPercent}% - 8px + 8px)`,
            width: 12,
            height: 12,
            transform: `translateX(-50%)`,
            pointerEvents: 'none',
          }}
        />

        {/* Hover indicator */}
        {hoverPage !== null && !isDragging && (
          <div
            className="absolute rounded-full bg-white/40"
            style={{
              left: '50%',
              width: 8,
              height: 8,
              top: `calc(${(hoverPage / (media.length - 1)) * 100}% - 4px + 8px)`,
              transform: 'translateX(-50%)',
              pointerEvents: 'none',
            }}
          />
        )}
      </div>

      {/* Thumbnail preview */}
      {previewEntry && hoverPage !== null && (
        <div
          className="pointer-events-none fixed z-50 flex flex-col overflow-hidden rounded border border-[var(--border)] bg-[var(--bg-primary)] shadow-lg"
          style={{
            width: PREVIEW_WIDTH,
            right: SLIDER_WIDTH + 16,
            top: Math.max(0, hoverY - PREVIEW_HEIGHT / 2),
          }}
        >
          {isVideoType(previewEntry.mediaType) ? (
            <div className="flex h-full items-center justify-center bg-[var(--bg-secondary)] text-xs text-[var(--text-muted)]">
              VIDEO
            </div>
          ) : (
            <img
              src={toAssetUrl(previewEntry.path)}
              alt={previewEntry.filename}
              className="w-full object-cover"
              style={{ height: PREVIEW_HEIGHT }}
              loading="lazy"
            />
          )}
          <div className="px-2 py-1 text-center text-xs text-[var(--text-secondary)]">
            {hoverPage + 1} / {media.length}
          </div>
        </div>
      )}
    </div>
  );
}
