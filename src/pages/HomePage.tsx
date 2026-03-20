import { useEffect } from 'react';
import { Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { RootFolderGrid } from '@/features/browse-roots/ui/RootFolderGrid';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';

export function HomePage() {
  const roots = useBrowseRootsStore((s) => s.roots);
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const loading = useBrowseRootsStore((s) => s.loading);
  const error = useBrowseRootsStore((s) => s.error);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);
  const fetchVolumes = useBrowseRootsStore((s) => s.fetchVolumes);

  useEffect(() => {
    fetchRoots();
    fetchVolumes();
  }, [fetchRoots, fetchVolumes]);

  return (
    <div>
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
