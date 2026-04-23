import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { DriveStatusDot } from '@/shared/ui';
import { FolderIcon, HomeIcon, HeartIcon, FileStackIcon, ArchiveIcon } from './icons';

function NavPill({
  label,
  path,
  icon,
  dim,
}: {
  label: string;
  path: string;
  icon?: React.ReactNode;
  dim?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <button
      onClick={() => navigate(path)}
      className={clsx(
        'flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        isActive
          ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        dim && 'opacity-60',
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="truncate max-w-[140px]">{label}</span>
    </button>
  );
}

/**
 * Horizontal navigation bar — primary destinations rendered as pills.
 * Used underneath the Header in the top-nav layout.
 */
export function TopNav() {
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const roots = useBrowseRootsStore((s) => s.roots);
  const fetchVolumes = useBrowseRootsStore((s) => s.fetchVolumes);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);

  useEffect(() => {
    fetchVolumes();
    fetchRoots();
  }, [fetchVolumes, fetchRoots]);

  const onlineRoots = roots.map((r) => {
    const vol = volumes.find((v) => v.id === r.volumeId);
    return { root: r, online: vol ? vol.isOnline : true };
  });

  return (
    <nav
      className="flex flex-shrink-0 items-center gap-4 overflow-x-auto border-b px-4 py-2"
      style={{ backgroundColor: 'var(--bg-secondary)', borderColor: 'var(--border)' }}
      aria-label="Primary"
    >
      <div className="flex items-center gap-1.5">
        <NavPill
          label={t('sidebar.home') ?? 'Home'}
          path="/"
          icon={<HomeIcon className="h-4 w-4" />}
        />
      </div>

      <div
        className="h-5 w-px flex-shrink-0"
        style={{ backgroundColor: 'var(--border)' }}
        aria-hidden
      />

      <div className="flex items-center gap-1.5">
        {roots.length === 0 ? (
          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
            {t('sidebar.noRoots')}
          </span>
        ) : (
          onlineRoots.map(({ root, online }) => (
            <NavPill
              key={root.id}
              label={root.label ?? root.path.split('/').pop() ?? root.path}
              path={`/roots/${root.id}/artists`}
              icon={
                <span className="flex items-center gap-1">
                  <FolderIcon className="h-4 w-4" />
                  <DriveStatusDot online={online} />
                </span>
              }
              dim={!online}
            />
          ))
        )}
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-1.5">
        <NavPill
          label={t('sidebar.favorites')}
          path="/favorites"
          icon={<HeartIcon className="h-4 w-4" />}
        />
        <NavPill
          label={t('sidebar.fileManager')}
          path="/file-manager"
          icon={<FileStackIcon className="h-4 w-4" />}
        />
        <NavPill
          label={t('zipRecovery.title')}
          path="/zip-recovery"
          icon={<ArchiveIcon className="h-4 w-4" />}
        />
      </div>
    </nav>
  );
}
