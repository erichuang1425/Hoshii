import { useEffect, useRef, useState } from 'react';
import { t } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { FileManagerView } from '@/features/file-manager/ui/FileManagerView';
import { useFileManagerStore } from '@/features/file-manager/model/useFileManagerStore';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { invoke } from '@/shared/api/invoke';
import { logger } from '@/shared/lib/logger';
import type { Artist, Gallery } from '@/shared/types';

export function FileManagerPage() {
  const roots = useBrowseRootsStore((s) => s.roots);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);
  const fetchUnorganizedFiles = useFileManagerStore((s) => s.fetchUnorganizedFiles);

  const [artists, setArtists] = useState<Artist[]>([]);
  const [galleries, setGalleries] = useState<Gallery[]>([]);
  const [selectedArtistId, setSelectedArtistId] = useState<number | null>(null);
  const [selectedRootId, setSelectedRootId] = useState<number | null>(null);
  const [artistsLoading, setArtistsLoading] = useState(false);
  const artistRequestRef = useRef(0);

  useEffect(() => {
    fetchRoots();
  }, [fetchRoots]);

  async function handleRootChange(rootId: number) {
    setSelectedRootId(rootId);
    setSelectedArtistId(null);
    setArtists([]);
    setGalleries([]);
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

  async function handleArtistChange(artistId: number) {
    const requestId = ++artistRequestRef.current;
    setSelectedArtistId(artistId);
    setGalleries([]);
    fetchUnorganizedFiles(artistId);
    try {
      const galleryList = await invoke<Gallery[]>('get_galleries', { artistId });
      if (artistRequestRef.current === requestId) {
        setGalleries(galleryList);
      }
    } catch (err) {
      logger.error('Failed to load galleries', { artistId, error: String(err) });
    }
  }

  const selectedArtist = artists.find((a) => a.id === selectedArtistId);

  return (
    <div>
      <h1
        className="mb-6 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('fileManager.title')}
      </h1>

      {/* Selectors */}
      <div className="mb-6 flex flex-wrap gap-4">
        {/* Root selector */}
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
            <option value="">{t('fileManager.selectRoot')}</option>
            {roots.map((r) => (
              <option key={r.id} value={r.id}>
                {r.label ?? r.path.split('/').pop() ?? r.path}
              </option>
            ))}
          </select>
        </div>

        {/* Artist selector */}
        {selectedRootId !== null && (
          <div>
            <label className="mb-1 block text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('browseArtists.title')}
            </label>
            {artistsLoading ? (
              <Spinner size="sm" />
            ) : (
              <select
                value={selectedArtistId ?? ''}
                onChange={(e) => {
                  const v = Number(e.target.value);
                  if (!isNaN(v) && v > 0) handleArtistChange(v);
                }}
                className="rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm text-[var(--text-primary)] focus:border-[var(--accent)] focus:outline-none"
              >
                <option value="">{t('fileManager.noArtist')}</option>
                {artists.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.name}
                  </option>
                ))}
              </select>
            )}
          </div>
        )}
      </div>

      {/* File manager view */}
      {selectedArtistId !== null && selectedArtist ? (
        <>
          <h2 className="mb-4 text-base font-medium" style={{ color: 'var(--text-primary)' }}>
            {t('fileManager.unorganized')} — {selectedArtist.name}
          </h2>
          <FileManagerView artistPath={selectedArtist.path} galleries={galleries} />
        </>
      ) : (
        <p className="py-8 text-center text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('fileManager.selectRoot')}
        </p>
      )}
    </div>
  );
}
