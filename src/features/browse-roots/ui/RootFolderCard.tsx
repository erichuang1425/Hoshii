import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import type { RootFolder, Volume } from '@/shared/types';
import { DriveStatusDot, Badge, Spinner } from '@/shared/ui';
import { useDriveStatus } from '@/shared/hooks/useDriveStatus';
import { OfflineOverlay } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useBrowseRootsStore } from '../model/useBrowseRootsStore';

interface RootFolderCardProps {
  root: RootFolder;
  volume: Volume | undefined;
}

export function RootFolderCard({ root, volume }: RootFolderCardProps) {
  const navigate = useNavigate();
  const online = useDriveStatus(root.volumeId);
  const scanning = useBrowseRootsStore((s) => s.scanning[root.id] ?? false);
  const scanRoot = useBrowseRootsStore((s) => s.scanRoot);
  const [scanResult, setScanResult] = useState<{ artists: number; galleries: number } | null>(null);

  const folderName = root.label ?? root.path.split(/[\\/]/).filter(Boolean).pop() ?? root.path;
  const lastScanLabel = root.lastScan
    ? new Date(root.lastScan).toLocaleDateString()
    : t('browseRoots.neverScanned');

  async function handleScan(e: React.MouseEvent) {
    e.stopPropagation();
    try {
      const result = await scanRoot(root.id);
      setScanResult({ artists: result.artistsFound, galleries: result.galleriesFound });
    } catch {
      // Error handled in store
    }
  }

  function handleClick() {
    if (!online) return;
    navigate(`/roots/${root.id}/artists`);
  }

  return (
    <div
      role="button"
      tabIndex={0}
      onClick={handleClick}
      onKeyDown={(e) => e.key === 'Enter' && handleClick()}
      className={clsx(
        'relative flex flex-col gap-2 rounded-[var(--card-radius)] border border-[var(--border)] p-4',
        'bg-[var(--bg-secondary)] shadow-[var(--card-shadow)]',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth)]',
        online && 'cursor-pointer hover:border-[var(--border-hover)] hover:bg-[var(--bg-hover)]',
        !online && 'opacity-70 cursor-default',
      )}
    >
      {!online && <OfflineOverlay driveLabel={volume?.label} />}

      <div className="flex items-center gap-2">
        <DriveStatusDot online={online} />
        <span className="truncate text-sm font-medium text-[var(--text-primary)]">
          {folderName}
        </span>
      </div>

      <p className="truncate text-xs text-[var(--text-muted)]" title={root.path}>
        {root.path}
      </p>

      <div className="flex items-center gap-2 text-xs text-[var(--text-secondary)]">
        <span>{t('browseRoots.lastScan')}: {lastScanLabel}</span>
        {scanResult && (
          <>
            <Badge variant="default">{scanResult.artists} {t('browseRoots.artists')}</Badge>
            <Badge variant="default">{scanResult.galleries} {t('browseRoots.galleries')}</Badge>
          </>
        )}
      </div>

      <div className="mt-auto flex items-center gap-2 pt-1">
        <button
          onClick={handleScan}
          disabled={scanning || !online}
          className={clsx(
            'inline-flex items-center gap-1 rounded px-2 py-1 text-xs font-medium',
            'bg-[var(--bg-elevated)] text-[var(--text-secondary)]',
            'hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'disabled:opacity-50 disabled:pointer-events-none',
          )}
        >
          {scanning ? <Spinner size="sm" /> : null}
          {scanning ? t('browseRoots.scanning') : t('browseRoots.scan')}
        </button>
      </div>
    </div>
  );
}
