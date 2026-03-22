import { useEffect, useState, useCallback } from 'react';
import { t } from '@/shared/i18n';
import { GalleryCard, TagModal } from '@/shared/ui';
import type { Gallery } from '@/shared/types';
import { FavoritesGrid } from '@/features/favorites/ui/FavoritesGrid';
import { useFavoritesStore } from '@/features/favorites/model/useFavoritesStore';
import { useTagStore } from '@/features/tag-system/model/useTagStore';

export function FavoritesPage() {
  const fetchFavorites = useFavoritesStore((s) => s.fetchFavorites);
  const favorites = useFavoritesStore((s) => s.favorites);
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  const getGalleryTags = useTagStore((s) => s.getGalleryTags);
  const fetchGalleryTags = useTagStore((s) => s.fetchGalleryTags);
  const fetchBatchGalleryTags = useTagStore((s) => s.fetchBatchGalleryTags);
  const addTag = useTagStore((s) => s.addTag);
  const removeTag = useTagStore((s) => s.removeTag);

  const [tagModalGalleryId, setTagModalGalleryId] = useState<number | null>(null);
  const tagModalGallery = favorites.find((g) => g.id === tagModalGalleryId);

  const handleCloseTagModal = useCallback(() => setTagModalGalleryId(null), []);

  useEffect(() => {
    fetchFavorites();
  }, [fetchFavorites]);

  useEffect(() => {
    if (favorites.length > 0) {
      fetchBatchGalleryTags(favorites.map((g) => g.id));
    }
  }, [favorites, fetchBatchGalleryTags]);

  function renderCard(gallery: Gallery) {
    return (
      <GalleryCard
        gallery={gallery}
        tags={getGalleryTags(gallery.id)}
        onToggleFavorite={toggleFavorite}
        onOpenTagModal={setTagModalGalleryId}
      />
    );
  }

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
      <FavoritesGrid renderCard={renderCard} />

      {tagModalGallery && (
        <TagModal
          galleryId={tagModalGallery.id}
          galleryName={tagModalGallery.name}
          open={tagModalGalleryId !== null}
          onClose={handleCloseTagModal}
          tags={getGalleryTags(tagModalGallery.id)}
          onFetchTags={fetchGalleryTags}
          onAddTag={addTag}
          onRemoveTag={removeTag}
        />
      )}
    </div>
  );
}
