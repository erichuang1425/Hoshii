import { useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Spinner, SearchInput } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { GalleryCard } from '@/features/browse-artists/ui/GalleryCard';
import { useBrowseArtistsStore } from '@/features/browse-artists/model/useBrowseArtistsStore';
import { SmartGroupsPanel } from '@/features/smart-groups/ui/SmartGroupsPanel';
import { useSettingsStore } from '@/features/settings/model/useSettingsStore';
import type { GallerySortOrder } from '@/shared/types';

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

  useEffect(() => {
    if (!isNaN(numericArtistId)) {
      fetchGalleries(numericArtistId);
    }
  }, [numericArtistId, fetchGalleries]);

  // Re-fetch when sort changes
  useEffect(() => {
    if (!isNaN(numericArtistId)) {
      fetchGalleries(numericArtistId);
    }
  }, [gallerySort, numericArtistId, fetchGalleries]);

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

      {/* Sort */}
      <div className="mb-4 flex items-center gap-3">
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
      </div>

      {loading && (
        <div className="flex flex-1 items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}

      {error && <p className="text-sm text-[var(--error)]">{error}</p>}

      {!loading && galleries.length === 0 && (
        <p className="py-8 text-center text-sm text-[var(--text-muted)]">
          {t('shared.noResults')}
        </p>
      )}

      {!loading && galleries.length > 0 && (
        <div className="flex gap-4">
          <div className="flex-1 grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4 content-start">
            {galleries.map((gallery) => (
              <GalleryCard key={gallery.id} gallery={gallery} />
            ))}
          </div>
          {enableSmartGrouping && !isNaN(numericArtistId) && (
            <div className="w-56 flex-shrink-0">
              <SmartGroupsPanel artistId={numericArtistId} />
            </div>
          )}
        </div>
      )}
    </div>
  );
}
