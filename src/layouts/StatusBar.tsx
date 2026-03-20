import { t } from '@/shared/i18n';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';

function formatRelativeTime(isoDate: string | null): string {
  if (!isoDate) return t('statusBar.never');

  const date = new Date(isoDate);
  if (isNaN(date.getTime())) return t('statusBar.never');

  const diffMs = Date.now() - date.getTime();
  const diffMins = Math.floor(diffMs / 60_000);

  if (diffMins < 1) return t('statusBar.justNow');
  if (diffMins < 60) return t('statusBar.minutesAgo').replace('{n}', String(diffMins));
  const diffHours = Math.floor(diffMins / 60);
  if (diffHours < 24) return t('statusBar.hoursAgo').replace('{n}', String(diffHours));
  const diffDays = Math.floor(diffHours / 24);
  return t('statusBar.daysAgo').replace('{n}', String(diffDays));
}

function Separator() {
  return (
    <span className="select-none" style={{ color: 'var(--text-muted)' }}>
      │
    </span>
  );
}

export function StatusBar() {
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const roots = useBrowseRootsStore((s) => s.roots);
  const scanning = useBrowseRootsStore((s) => s.scanning);

  const isScanning = Object.keys(scanning).length > 0;
  const totalDrives = volumes.length;
  const offlineDrives = volumes.filter((v) => !v.isOnline).length;

  // Most recent scan time across all roots
  const lastScanDate = roots
    .map((r) => r.lastScan)
    .filter((d): d is string => d !== null)
    .sort()
    .at(-1) ?? null;

  return (
    <footer
      className="flex flex-shrink-0 items-center gap-3 border-t px-4 text-xs select-none"
      style={{
        height: '28px',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
        color: 'var(--text-muted)',
      }}
    >
      {isScanning ? (
        <span style={{ color: 'var(--warning)' }}>{t('statusBar.scanning')}</span>
      ) : (
        <>
          {/* Drive count */}
          <span>
            {totalDrives} {t('statusBar.drives')}
            {offlineDrives > 0 && (
              <span style={{ color: 'var(--error)' }}>
                {' '}({offlineDrives} {t('statusBar.offline')})
              </span>
            )}
          </span>

          <Separator />

          {/* Root folders count */}
          <span>
            {roots.length} {t('statusBar.rootFolders')}
          </span>

          <Separator />

          {/* Last scan */}
          <span>
            {t('statusBar.lastScan')}: {formatRelativeTime(lastScanDate)}
          </span>
        </>
      )}
    </footer>
  );
}
