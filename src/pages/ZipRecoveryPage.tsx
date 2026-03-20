import { useEffect, useState } from 'react';
import { t } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { ZipRecoveryView } from '@/features/zip-recovery/ui/ZipRecoveryView';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { invoke } from '@/shared/api/invoke';
import { logger } from '@/shared/lib/logger';
import type { Artist } from '@/shared/types';

export function ZipRecoveryPage() {
  const roots = useBrowseRootsStore((s) => s.roots);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [selectedArtistPath, setSelectedArtistPath] = useState<string | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);

  useEffect(() => {
    fetchRoots();
  }, [fetchRoots]);

  async function handleRootChange(rootId: number) {
    setSelectedRootId(rootId);
    setSelectedArtistPath(null);
    setArtistsLoading(true);
    try {
      const artistList = await invoke<Artist[]>('get_artists', { rootId });
      setArtists(artistList);
    } catch (err) {
      logger.error('Failed to load artists', { rootId, error: String(err) });
    } finally {
      setArtistsLoading(false);
    }
  }

  return (
    <div>
      <h1
        className="mb-2 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('zipRecovery.title')}
      </h1>
      <p className="mb-6 text-sm" style={{ color: 'var(--text-muted)' }}>
        {t('zipRecovery.subtitle')}
      </p>

      {/* Selectors */}
      <div className="mb-6 flex flex-wrap gap-4">
        <div>
          <label className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
            {t('browseRoots.title')}
          </label>
          <select
            value={selectedRootId ?? ''}
            onChange={(e) => {
              const v = Number(e.target.value);
              if (!isNaN(v) && v > 0) handleRootChange(v);
            }}
            className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
          >
            <option value="">{t('zipRecovery.selectRoot')}</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.path.split('/').pop() ?? r.path}
              </option>
            ))}
          </select>
        </div>

        {selectedRootId !== null && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('browseArtists.title')}
            </label>
            {artistsLoading ? (
              <Spinner size="sm" />
            ) : (
              <select
                value={selectedArtistPath ?? ''}
                onChange={(e) => setSelectedArtistPath(e.target.value || null)}
                className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">{t('shared.select')}</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.path}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* Main view */}
      {selectedArtistPath ? (
        <ZipRecoveryView artistPath={selectedArtistPath} />
      ) : (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('zipRecovery.verifyHint')}
        </p>
      )}
    </div>
  );
}
