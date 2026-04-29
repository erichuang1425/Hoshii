import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Artist } from '@/shared/types';
import { Badge } from '@/shared/ui';
import { t } from '@/shared/i18n';

interface ArtistCardProps {
  artist: Artist;
}

export function ArtistCard({ artist }: ArtistCardProps) {
  const navigate = useNavigate();

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/artists/${artist.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/artists/${artist.id}`)}
      className={clsx(
        'group relative flex flex-col overflow-hidden',
        'rounded-[var(--card-radius)] border border-[var(--border)]',
        'bg-[var(--bg-secondary)] shadow-[var(--card-shadow)]',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth)]',
        'cursor-pointer hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {/* Thumbnail placeholder */}
      <div
        className="flex items-center justify-center bg-[var(--bg-elevated)]"
        style={{ aspectRatio: 'var(--thumb-ratio)' }}
      >
        <svg
          className="h-12 w-12 text-[var(--text-muted)] opacity-40"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0A17.933 17.933 0 0112 21.75c-2.676 0-5.216-.584-7.499-1.632z" />
        </svg>
      </div>

      {/* Info area */}
      <div className="flex flex-col gap-1 p-3">
        <span
          className="truncate text-sm font-medium text-[var(--text-primary)]"
          title={artist.name}
        >
          {artist.name}
        </span>
        <Badge variant="default">
          {artist.galleryCount} {t('browseArtists.galleries')}
        </Badge>
      </div>
    </div>
  );
}
