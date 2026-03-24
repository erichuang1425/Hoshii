import { useEffect, useRef, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { SearchInput, Button, GalleryCard, TagModal } from '@/shared/ui';
import type { Gallery } from '@/shared/types';
import { SearchResults } from '@/features/search/ui/SearchResults';
import { useSearchStore } from '@/features/search/model/useSearchStore';
import { useFavoritesStore } from '@/features/favorites/model/useFavoritesStore';
import { useTagStore } from '@/features/tag-system/model/useTagStore';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const recentQueries = useSearchStore((s) => s.recentQueries);
  const clearRecentQueries = useSearchStore((s) => s.clearRecentQueries);
  const search = useSearchStore((s) => s.search);
  const inputRef = useRef<HTMLInputElement>(null);

  const toggleFavorite = useFavoritesStore((s) => s.toggleFavorite);
  const getGalleryTags = useTagStore((s) => s.getGalleryTags);
  const fetchGalleryTags = useTagStore((s) => s.fetchGalleryTags);
  const addTag = useTagStore((s) => s.addTag);
  const removeTag = useTagStore((s) => s.removeTag);

  const [tagModalGalleryId, setTagModalGalleryId] = useState<number | null>(null);
  const results = useSearchStore((s) => s.results);
  const tagModalGallery = results.find((g) => g.id === tagModalGalleryId);

  const handleCloseTagModal = useCallback(() => setTagModalGalleryId(null), []);

  // Sync URL param → store on mount and when URL changes (e.g. browser back/forward)
  const urlQuery = searchParams.get('q') ?? '';
  useEffect(() => {
    if (urlQuery) {
      search(urlQuery);
    }
    inputRef.current?.focus();
  }, [urlQuery, search]);

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setSearchParams(q ? { q } : {}, { replace: true });
  }

  function handleClear() {
    setQuery('');
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  }

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
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('search.title')}
      </h1>

      {/* Search input */}
      <SearchInput
        ref={inputRef}
        className="mb-6 max-w-xl"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={handleChange}
        onClear={handleClear}
        autoFocus
      />

      {/* Recent queries (shown when input is empty) */}
      {!query && recentQueries.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('search.recentSearches')}
            </span>
            <Button variant="ghost" size="sm" onClick={clearRecentQueries}>
              {t('search.clearRecent')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  search(q);
                  setSearchParams({ q }, { replace: true });
                }}
                className="rounded-full bg-[var(--bg-active)] px-3 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <SearchResults renderCard={renderCard} />

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
