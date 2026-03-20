import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, SearchInput } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { ArtistGrid } from '@/features/browse-artists/ui/ArtistGrid';
import { useBrowseArtistsStore } from '@/features/browse-artists/model/useBrowseArtistsStore';

export function ArtistListPage() {
  const { rootId } = useParams<{ rootId: string }>();
  const navigate = useNavigate();
  const loading = useBrowseArtistsStore((s) => s.loading);
  const error = useBrowseArtistsStore((s) => s.error);
  const searchQuery = useBrowseArtistsStore((s) => s.searchQuery);
  const fetchArtists = useBrowseArtistsStore((s) => s.fetchArtists);
  const setSearchQuery = useBrowseArtistsStore((s) => s.setSearchQuery);
  const getSortedArtists = useBrowseArtistsStore((s) => s.getSortedArtists);
  const artistSort = useBrowseArtistsStore((s) => s.artistSort);
  const setArtistSort = useBrowseArtistsStore((s) => s.setArtistSort);

  const numericRootId = Number(rootId);

  useEffect(() => {
    if (!isNaN(numericRootId)) {
      fetchArtists(numericRootId);
    }
  }, [numericRootId, fetchArtists]);

  const artists = getSortedArtists();

  return (
    <div className="flex h-full flex-col">
      {/* Breadcrumb */}
      <div className="mb-4 flex items-center gap-2 text-sm text-[var(--text-secondary)]">
        <button onClick={() => navigate('/')} className="hover:text-[var(--text-primary)] transition-colors">
          {t('browseRoots.title')}
        </button>
        <span className="text-[var(--text-muted)]">/</span>
        <span className="text-[var(--text-primary)]">{t('browseArtists.title')}</span>
      </div>

      {/* Search & Sort */}
      <div className="mb-4 flex items-center gap-3">
        <SearchInput
          className="max-w-xs"
          placeholder={t('shared.search')}
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          onClear={() => setSearchQuery('')}
        />
        <select
          value={artistSort}
          onChange={(e) => setArtistSort(e.target.value as 'name' | 'gallery_count' | 'recent')}
          className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
        >
          <option value="name">{t('browseArtists.sortName')}</option>
          <option value="gallery_count">{t('browseArtists.sortCount')}</option>
          <option value="recent">{t('browseArtists.sortRecent')}</option>
        </select>
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}

      {!loading && <ArtistGrid artists={artists} />}
    </div>
  );
}
