import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { Gallery } from '@/shared/types';
import { Badge, ProgressBar } from '@/shared/ui';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { t } from '@/shared/i18n';
import { useFavoritesStore } from '@/features/favorites/model/useFavoritesStore';

interface GalleryCardProps {
  gallery: Gallery;
}

export function GalleryCard({ gallery }: GalleryCardProps) {
  const navigate = useNavigate();
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const [localFavorited, setLocalFavorited] = useState(gallery.favorited);
  const progress = gallery.pageCount > 0 ? gallery.lastReadPage / gallery.pageCount : 0;
  const isUnread = !gallery.lastReadAt;

  async function handleFavoriteClick(e: React.MouseEvent) {
    e.stopPropagation();
    setLocalFavorited((prev) => !prev);
    await toggleFavorite({ ...gallery, favorited: localFavorited });
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={() => navigate(`/gallery/${gallery.id}`)}
      onKeyDown={(e) => e.key === 'Enter' && navigate(`/gallery/${gallery.id}`)}
      className={clsx(
        'group relative flex flex-col overflow-hidden',
        'rounded-[var(--card-radius)] border border-[var(--border)]',
        'bg-[var(--bg-secondary)] shadow-[var(--card-shadow)]',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth)]',
        'cursor-pointer hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]',
      )}
    >
      {/* Cover image */}
      <div
        className="relative overflow-hidden bg-[var(--bg-elevated)]"
        style={{ aspectRatio: 'var(--thumb-ratio)' }}
      >
        {gallery.coverPath ? (
          <img
            src={toAssetUrl(gallery.coverPath)}
            alt={gallery.name}
            className="h-full w-full object-cover"
            loading="lazy"
          />
        ) : (
          <div className="flex h-full w-full items-center justify-center">
            <svg
              className="h-12 w-12 text-[var(--text-muted)] opacity-30"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1}
            >
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
            </svg>
          </div>
        )}

        {/* Page count badge bottom-left */}
        <Badge variant="default" className="absolute bottom-2 left-2">
          {gallery.pageCount} {t('browseArtists.pages')}
        </Badge>

        {/* Unread dot top-left */}
        {isUnread && (
          <span className="absolute top-2 left-2 h-2 w-2 rounded-full bg-[var(--accent)]" />
        )}

        {/* Favorite heart - shown on hover, always visible if favorited */}
        <button
          onClick={handleFavoriteClick}
          className={clsx(
            'absolute top-2 right-2',
            'transition-all duration-[var(--duration-fast)]',
            localFavorited
              ? 'text-[var(--accent)] opacity-100'
              : 'text-white opacity-0 group-hover:opacity-100',
          )}
          aria-label={localFavorited ? t('browseArtists.unfavorite') : t('browseArtists.favorite')}
        >
          <svg
            className="h-5 w-5 drop-shadow"
            viewBox="0 0 24 24"
            fill={localFavorited ? 'currentColor' : 'none'}
            stroke="currentColor"
            strokeWidth={2}
          >
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
          </svg>
        </button>
      </div>

      {/* Gallery info */}
      <div className="flex flex-col gap-1 p-3">
        <span
          className="truncate text-sm font-medium text-[var(--text-primary)]"
          title={gallery.name}
        >
          {gallery.name}
        </span>
      </div>

      {/* Reading progress */}
      <ProgressBar value={progress} />
    </div>
  );
}
