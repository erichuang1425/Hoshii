import { t } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { GalleryCard } from '@/features/browse-artists/ui/GalleryCard';
import { useFavoritesStore } from '../model/useFavoritesStore';

export function FavoritesGrid() {
  const favorites = useFavoritesStore((s) => s.favorites);
  const loading = useFavoritesStore((s) => s.loading);
  const error = useFavoritesStore((s) => s.error);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--error)]">{error}</p>;
  }

  if (favorites.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <svg
          className="mb-4 h-16 w-16 opacity-20"
          style={{ color: 'var(--text-muted)' }}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={1}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
        </svg>
        <p className="text-base font-medium" style={{ color: 'var(--text-secondary)' }}>
          {t('favorites.empty')}
        </p>
        <p className="mt-1 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('favorites.emptyHint')}
        </p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
      {favorites.map((gallery) => (
        <GalleryCard key={gallery.id} gallery={gallery} />
      ))}
    </div>
  );
}
