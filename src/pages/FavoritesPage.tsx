import { useEffect } from 'react';
import { t } from '@/shared/i18n';
import { FavoritesGrid } from '@/features/favorites/ui/FavoritesGrid';
import { useFavoritesStore } from '@/features/favorites/model/useFavoritesStore';

export function FavoritesPage() {
  const fetchFavorites = useFavoritesStore((s) => s.fetchFavorites);
  const favorites = useFavoritesStore((s) => s.favorites);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  return (
    <div>
      <h1
        className="mb-6 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('favorites.title')}
        {favorites.length > 0 && (
          <span className="ml-2 text-sm font-normal" style={{ color: 'var(--text-muted)' }}>
            ({favorites.length})
          </span>
        )}
      </h1>
      <FavoritesGrid />
    </div>
  );
}
