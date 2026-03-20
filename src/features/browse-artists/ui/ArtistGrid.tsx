import { useRef } from 'react';
import { useVirtualizer } from '@tanstack/react-virtual';
import type { Artist } from '@/shared/types';
import { t } from '@/shared/i18n';
import { ArtistCard } from './ArtistCard';

interface ArtistGridProps {
  artists: Artist[];
}

const COLUMN_MIN_WIDTH = 200;
const ROW_HEIGHT = 300;
const GAP = 16;

export function ArtistGrid({ artists }: ArtistGridProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  const columnCount = useGridColumns(containerRef, COLUMN_MIN_WIDTH, GAP);
  const rowCount = Math.ceil(artists.length / columnCount);

  const virtualizer = useVirtualizer({
    count: rowCount,
    getScrollElement: () => containerRef.current,
    estimateSize: () => ROW_HEIGHT + GAP,
    overscan: 3,
  });

  if (artists.length === 0) {
    return (
      <p className="py-8 text-center text-sm text-[var(--text-muted)]">
        {t('shared.noResults')}
      </p>
    );
  }

  return (
    <div ref={containerRef} className="h-full overflow-y-auto">
      <div
        className="relative w-full"
        style={{ height: virtualizer.getTotalSize() }}
      >
        {virtualizer.getVirtualItems().map((virtualRow) => {
          const startIndex = virtualRow.index * columnCount;
          const rowArtists = artists.slice(startIndex, startIndex + columnCount);

          return (
            <div
              key={virtualRow.key}
              className="absolute left-0 right-0 grid gap-4"
              style={{
                top: virtualRow.start,
                height: virtualRow.size,
                gridTemplateColumns: `repeat(${columnCount}, 1fr)`,
              }}
            >
              {rowArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function useGridColumns(
  containerRef: React.RefObject<HTMLDivElement | null>,
  minWidth: number,
  gap: number,
): number {
  const width = containerRef.current?.clientWidth ?? 1200;
  return Math.max(2, Math.floor((width + gap) / (minWidth + gap)));
}
