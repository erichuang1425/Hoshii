import { useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import {
  HomeIcon,
  FolderIcon,
  HeartIcon,
  FileStackIcon,
  ArchiveIcon,
  SettingsIcon,
} from './icons';

function RailButton({
  label,
  path,
  icon,
  dim,
}: {
  label: string;
  path: string;
  icon: React.ReactNode;
  dim?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <div className="group relative flex items-center justify-center">
      <button
        onClick={() => navigate(path)}
        aria-label={label}
        className={clsx(
          'flex h-10 w-10 items-center justify-center rounded-lg',
          'transition-colors duration-[var(--duration-fast)]',
          isActive
            ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
          dim && 'opacity-50',
        )}
      >
        {icon}
      </button>
      {/* Active accent bar */}
      {isActive && (
        <span
          aria-hidden
          className="absolute left-0 h-5 w-[3px] rounded-r-full"
          style={{ backgroundColor: 'var(--accent)' }}
        />
      )}
      {/* Tooltip */}
      <span
        className={clsx(
          'pointer-events-none absolute left-full ml-3 whitespace-nowrap rounded px-2 py-1 text-xs',
          'opacity-0 transition-opacity duration-[var(--duration-fast)] group-hover:opacity-100',
          'z-50',
        )}
        style={{
          backgroundColor: 'var(--bg-elevated)',
          color: 'var(--text-primary)',
          boxShadow: 'var(--card-shadow)',
        }}
      >
        {label}
      </span>
    </div>
  );
}

/**
 * Vertical icon-only navigation rail. Used by the compact layout.
 */
export function IconRail() {
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const roots = useBrowseRootsStore((s) => s.roots);
  const fetchVolumes = useBrowseRootsStore((s) => s.fetchVolumes);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);

  useEffect(() => {
    fetchVolumes();
    fetchRoots();
  }, [fetchVolumes, fetchRoots]);

  return (
    <nav
      className="flex h-full flex-col items-center overflow-y-auto py-3"
      style={{ width: 'var(--rail-width)' }}
      aria-label="Primary"
    >
      <RailButton label={t('sidebar.home')} path="/" icon={<HomeIcon />} />

      <div
        className="my-3 h-px w-6 flex-shrink-0"
        style={{ backgroundColor: 'var(--border)' }}
        aria-hidden
      />

      {/* Root shortcuts */}
      <div className="flex flex-col items-center gap-1">
        {roots.map((root) => {
          const vol = volumes.find((v) => v.id === root.volumeId);
          const offline = vol ? !vol.isOnline : false;
          const label = root.label ?? root.path.split('/').pop() ?? root.path;
          return (
            <RailButton
              key={root.id}
              label={label}
              path={`/roots/${root.id}/artists`}
              icon={<FolderIcon />}
              dim={offline}
            />
          );
        })}
      </div>

      <div className="flex-1" />

      <div className="flex flex-col items-center gap-1">
        <RailButton label={t('sidebar.favorites')} path="/favorites" icon={<HeartIcon />} />
        <RailButton
          label={t('sidebar.fileManager')}
          path="/file-manager"
          icon={<FileStackIcon />}
        />
        <RailButton
          label={t('zipRecovery.title')}
          path="/zip-recovery"
          icon={<ArchiveIcon />}
        />
        <RailButton
          label={t('sidebar.settings')}
          path="/settings"
          icon={<SettingsIcon />}
        />
      </div>
    </nav>
  );
}
