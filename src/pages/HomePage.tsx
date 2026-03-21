import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Spinner, ProgressBar } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { RootFolderGrid } from '@/features/browse-roots/ui/RootFolderGrid';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { useReadingProgressStore } from '@/features/reading-progress/model/useReadingProgressStore';

export function HomePage() {
  const navigate = useNavigate();
  const roots = useBrowseRootsStore((s) => s.roots);
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const loading = useBrowseRootsStore((s) => s.loading);
  const error = useBrowseRootsStore((s) => s.error);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);
  const fetchVolumes = useBrowseRootsStore((s) => s.fetchVolumes);

  const recentGalleries = useReadingProgressStore((s) => s.recentGalleries);
  const loadingRecent = useReadingProgressStore((s) => s.loadingRecent);
  const fetchRecentGalleries = useReadingProgressStore((s) => s.fetchRecentGalleries);

  useEffect(() => {
    fetchRoots();
    fetchVolumes();
    fetchRecentGalleries(6);
  }, [fetchRoots, fetchVolumes, fetchRecentGalleries]);

  return (
    <div>
      {/* Continue Reading section */}
      {recentGalleries.length > 0 && (
        <div className="mb-6">
          <h2
            className="mb-3 text-base font-semibold"
            style={{ color: 'var(--text-primary)' }}
          >
            {t('shared.continueReading')}
          </h2>
          {loadingRecent ? (
            <Spinner size="sm" />
          ) : (
            <div className="grid grid-cols-[repeat(auto-fill,minmax(160px,1fr))] gap-3">
              {recentGalleries.map((gallery) => (
                <button
                  key={gallery.id}
                  onClick={() => navigate(`/gallery/${gallery.id}`)}
                  className="group flex flex-col overflow-hidden rounded-[var(--card-radius)] border border-[var(--border)] bg-[var(--bg-secondary)] text-left transition-all hover:border-[var(--border-hover)]"
                >
                  <div className="relative overflow-hidden bg-[var(--bg-elevated)]" style={{ aspectRatio: 'var(--thumb-ratio)' }}>
                    {gallery.coverPath ? (
                      <img
                        src={toAssetUrl(gallery.coverPath)}
                        alt={gallery.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center">
                        <svg className="h-8 w-8 text-[var(--text-muted)] opacity-30" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
                          <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
                        </svg>
                      </div>
                    )}
                  </div>
                  <div className="p-2">
                    <span className="block truncate text-xs font-medium text-[var(--text-primary)]" title={gallery.name}>
                      {gallery.name}
                    </span>
                    <span className="text-xs text-[var(--text-muted)]">
                      {gallery.lastReadPage}/{gallery.pageCount}
                    </span>
                  </div>
                  <ProgressBar value={gallery.pageCount > 0 ? gallery.lastReadPage / gallery.pageCount : 0} />
                </button>
              ))}
            </div>
          )}
        </div>
      )}

      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('browseRoots.title')}
      </h1>

      {loading && (
        <div className="flex items-center justify-center py-12">
          <Spinner size="lg" />
        </div>
      )}

      {error && (
        <p className="text-sm text-[var(--error)]">{error}</p>
      )}

      {!loading && <RootFolderGrid roots={roots} volumes={volumes} />}
    </div>
  );
}
