import { useEffect, useMemo, useState, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, GalleryCard, TagModal } from '@/shared/ui';
import { t } from '@/shared/i18n';
import type { Gallery, GallerySortOrder } from '@/shared/types';
import { useBrowseArtistsStore } from '@/features/browse-artists/model/useBrowseArtistsStore';
import { SmartGroupsPanel } from '@/features/smart-groups/ui/SmartGroupsPanel';
import { useSettingsStore } from '@/features/settings/model/useSettingsStore';
import { useTagStore } from '@/features/tag-system/model/useTagStore';
import { useFavoritesStore } from '@/features/favorites/model/useFavoritesStore';

export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();
  const navigate = useNavigate();
  const galleries = useBrowseArtistsStore((s) => s.galleries);
  const loading = useBrowseArtistsStore((s) => s.galleriesLoading);
  const error = useBrowseArtistsStore((s) => s.error);
  const gallerySort = useBrowseArtistsStore((s) => s.gallerySort);
  const fetchGalleries = useBrowseArtistsStore((s) => s.fetchGalleries);
  const setGallerySort = useBrowseArtistsStore((s) => s.setGallerySort);

  const enableSmartGrouping = useSettingsStore((s) => s.settings.enableSmartGrouping);
  const numericArtistId = Number(artistId);

  // Favorites
  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);

  // Tag filtering
  const activeTagFilterState = useTagStore((s) => s.activeTagFilter);
  const filteredGalleries = useTagStore((s) => s.filteredGalleries);
  const filterByTags = useTagStore((s) => s.filterByTags);
  const clearTagFilter = useTagStore((s) => s.clearTagFilter);
  const fetchBatchGalleryTags = useTagStore((s) => s.fetchBatchGalleryTags);
  const getGalleryTags = useTagStore((s) => s.getGalleryTags);
  const fetchGalleryTags = useTagStore((s) => s.fetchGalleryTags);
  const addTag = useTagStore((s) => s.addTag);
  const removeTag = useTagStore((s) => s.removeTag);

  // Tag modal state
  const [tagModalGalleryId, setTagModalGalleryId] = useState<number | null>(null);
  const tagModalGallery = galleries.find((g) => g.id === tagModalGalleryId);

  const handleCloseTagModal = useCallback(() => setTagModalGalleryId(null), []);

  // Batch-load tags for all galleries when they change
  useEffect(() => {
    if (galleries.length > 0) {
      fetchBatchGalleryTags(galleries.map((g) => g.id));
    }
  }, [galleries, fetchBatchGalleryTags]);

  // Collect unique tag names from galleries
  const galleryTags = useTagStore((s) => s.galleryTags);
  const allTagNames = useMemo(() => {
    const names = new Set<string>();
    for (const gal of galleries) {
      const tags = galleryTags[gal.id];
      if (tags) {
        for (const tag of tags) {
          names.add(tag.name);
        }
      }
    }
    return Array.from(names).sort();
  }, [galleries, galleryTags]);

  // Determine displayed galleries (filtered or all)
  const displayedGalleries = activeTagFilterState.length > 0
    ? galleries.filter((g) => filteredGalleries.some((fg) => fg.id === g.id))
    : galleries;

  // Fetch galleries on mount and when sort or artist changes
  useEffect(() => {
    if (!isNaN(numericArtistId)) {
      fetchGalleries(numericArtistId);
    }
  }, [gallerySort, numericArtistId, fetchGalleries]);

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
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <button onClick={() => navigate('/')} className="hover:text-[var(--text-primary)] transition-colors">
          {t('browseRoots.title')}
        </button>
        <span className="text-[var(--text-muted)]">/</span>
        <button onClick={() => navigate(-1)} className="hover:text-[var(--text-primary)] transition-colors">
          {t('browseArtists.title')}
        </button>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)]">{t('browseArtists.galleriesOf')}</span>
      </div>

      {/* Sort + Tag Filter */}
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <select
          value={gallerySort}
          onChange={(e) => setGallerySort(e.target.value as GallerySortOrder)}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="name_asc">{t('browseArtists.sortNameAsc')}</option>
          <option value="name_desc">{t('browseArtists.sortNameDesc')}</option>
          <option value="date_desc">{t('browseArtists.sortDateDesc')}</option>
          <option value="date_asc">{t('browseArtists.sortDateAsc')}</option>
          <option value="pages_desc">{t('browseArtists.sortPages')}</option>
          <option value="last_read">{t('browseArtists.sortLastRead')}</option>
        </select>
        {allTagNames.length > 0 && (
          <div className="flex flex-wrap items-center gap-1.5">
            <span className="text-xs text-[var(--text-muted)]">{t('tags.filterByTag')}:</span>
            {allTagNames.map((tagName) => (
              <button
                key={tagName}
                onClick={() => {
                  const next = activeTagFilterState.includes(tagName)
                    ? activeTagFilterState.filter((n) => n !== tagName)
                    : [...activeTagFilterState, tagName];
                  if (next.length === 0) clearTagFilter();
                  else filterByTags(next);
                }}
                className={`rounded-full px-2 py-0.5 text-xs transition-colors ${
                  activeTagFilterState.includes(tagName)
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--bg-active)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]'
                }`}
              >
                {tagName}
              </button>
            ))}
            {activeTagFilterState.length > 0 && (
              <button
                onClick={clearTagFilter}
                className="text-xs text-[var(--text-muted)] hover:text-[var(--text-primary)]"
              >
                {t('tags.clearFilter')}
              </button>
            )}
          </div>
        )}
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {!loading && displayedGalleries.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          {t('shared.noResults')}
        </p>
      )}

      {!loading && (
        <div className="flex gap-4">
          <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 content-start">
            {displayedGalleries.map((gallery) => (
              <div key={gallery.id}>{renderCard(gallery)}</div>
            ))}
          </div>
          {enableSmartGrouping && !isNaN(numericArtistId) && (
            <div className="w-56 flex-shrink-0">
              <SmartGroupsPanel artistId={numericArtistId} />
            </div>
          )}
        </div>
      )}

      {/* Shared tag modal for all gallery cards */}
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
