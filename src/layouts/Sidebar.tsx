import { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import clsx from 'clsx';
import { DriveStatusDot } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { invoke } from '@/shared/api/invoke';
import { logger } from '@/shared/lib/logger';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { useLayoutStore } from './useLayoutStore';
import type { Gallery } from '@/shared/types';
import type { Tag } from '@/shared/types/media';

// ─── Chevron icon ─────────────────────────────────────────────────────────────

function ChevronIcon({ collapsed }: { collapsed: boolean }) {
  return (
    <svg
      className={clsx(
        'h-3.5 w-3.5 transition-transform duration-[var(--duration-fast)]',
        collapsed ? '-rotate-90' : 'rotate-0',
      )}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="6 9 12 15 18 9" />
    </svg>
  );
}

// ─── Collapsible section ──────────────────────────────────────────────────────

function SidebarSection({
  sectionKey,
  label,
  children,
}: {
  sectionKey: string;
  label: string;
  children: React.ReactNode;
}) {
  const isCollapsed = useLayoutStore((s) => s.isSectionCollapsed(sectionKey));
  const toggleSection = useLayoutStore((s) => s.toggleSection);

  return (
    <div className="mb-2">
      <button
        onClick={() => toggleSection(sectionKey)}
        className={clsx(
          'flex w-full items-center gap-1.5 rounded px-2 py-1',
          'text-xs font-semibold uppercase tracking-wider',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--bg-hover)]',
        )}
        style={{ color: 'var(--text-muted)' }}
      >
        <ChevronIcon collapsed={isCollapsed} />
        {label}
      </button>
      {!isCollapsed && <div className="mt-0.5">{children}</div>}
    </div>
  );
}

// ─── Nav item ─────────────────────────────────────────────────────────────────

function NavItem({
  label,
  path,
  icon,
  isOffline,
}: {
  label: string;
  path: string;
  icon?: React.ReactNode;
  isOffline?: boolean;
}) {
  const navigate = useNavigate();
  const location = useLocation();
  const isActive = location.pathname === path || location.pathname.startsWith(path + '/');

  return (
    <button
      onClick={() => navigate(path)}
      className={clsx(
        'flex w-full items-center gap-2 rounded px-3 py-1.5 text-sm',
        'transition-colors duration-[var(--duration-fast)]',
        isActive
          ? 'bg-[var(--accent-muted)] font-medium text-[var(--accent)]'
          : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
        isOffline && 'opacity-50',
      )}
    >
      {icon && <span className="flex-shrink-0">{icon}</span>}
      <span className="flex-1 truncate text-left">{label}</span>
      {isOffline && (
        <span className="text-xs" style={{ color: 'var(--offline)' }}>
          {t('sidebar.offlineDrive')}
        </span>
      )}
    </button>
  );
}

// ─── Folder icon ──────────────────────────────────────────────────────────────

function FolderIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v8.25"
      />
    </svg>
  );
}

function GalleryIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 15.75l5.159-5.159a2.25 2.25 0 013.182 0l5.159 5.159m-1.5-1.5l1.409-1.409a2.25 2.25 0 013.182 0l2.909 2.909M3.75 21h16.5A2.25 2.25 0 0022.5 18.75V5.25A2.25 2.25 0 0020.25 3H3.75A2.25 2.25 0 001.5 5.25v13.5A2.25 2.25 0 003.75 21z" />
    </svg>
  );
}

function HeartIcon({ filled }: { filled?: boolean }) {
  return (
    <svg
      className="h-4 w-4"
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function TagIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M6 6h.008v.008H6V6z" />
    </svg>
  );
}

function FileIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  );
}

function SettingsIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

// ─── Main Sidebar component ────────────────────────────────────────────────────

export function Sidebar() {
  const volumes = useBrowseRootsStore((s) => s.volumes);
  const roots = useBrowseRootsStore((s) => s.roots);
  const fetchVolumes = useBrowseRootsStore((s) => s.fetchVolumes);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);

  const [recentGalleries, setRecentGalleries] = useState<Gallery[]>([]);
  const [tags, setTags] = useState<Tag[]>([]);

  useEffect(() => {
    fetchVolumes();
    fetchRoots();
  }, [fetchVolumes, fetchRoots]);

  useEffect(() => {
    invoke<Gallery[]>('get_recent_galleries', { limit: 5 })
      .then(setRecentGalleries)
      .catch((err) => logger.warn('Failed to load recent galleries', { error: String(err) }));
  }, []);

  // Load all tags from the search index
  useEffect(() => {
    invoke<Tag[]>('get_all_tags')
      .then(setTags)
      .catch(() => {
        // Tags may not exist yet — silently ignore
      });
  }, []);

  return (
    <div className="flex h-full flex-col overflow-hidden">
      {/* Scrollable nav */}
      <nav className="flex-1 overflow-y-auto px-2 py-2">
        {/* DRIVES section */}
        <SidebarSection sectionKey="drives" label={t('sidebar.drives')}>
          {volumes.length === 0 ? (
            <p className="px-3 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              —
            </p>
          ) : (
            volumes.map((vol) => (
              <div
                key={vol.id}
                className="flex items-center gap-2 rounded px-3 py-1.5 text-sm"
                style={{ color: vol.isOnline ? 'var(--text-secondary)' : 'var(--offline)' }}
              >
                <DriveStatusDot online={vol.isOnline} />
                <span className="truncate">{vol.label ?? vol.uuid.slice(0, 8)}</span>
              </div>
            ))
          )}
        </SidebarSection>

        {/* ROOTS section */}
        <SidebarSection sectionKey="roots" label={t('sidebar.roots')}>
          {roots.length === 0 ? (
            <p className="px-3 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('sidebar.noRoots')}
            </p>
          ) : (
            roots.map((root) => {
              const vol = volumes.find((v) => v.id === root.volumeId);
              const isOffline = vol ? !vol.isOnline : false;
              return (
                <NavItem
                  key={root.id}
                  label={root.label ?? root.path.split('/').pop() ?? root.path}
                  path={`/roots/${root.id}/artists`}
                  icon={<FolderIcon />}
                  isOffline={isOffline}
                />
              );
            })
          )}
        </SidebarSection>

        {/* RECENT section */}
        <SidebarSection sectionKey="recent" label={t('sidebar.recent')}>
          {recentGalleries.length === 0 ? (
            <p className="px-3 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('sidebar.noRecent')}
            </p>
          ) : (
            recentGalleries.map((g) => (
              <NavItem
                key={g.id}
                label={g.name}
                path={`/gallery/${g.id}`}
                icon={<GalleryIcon />}
              />
            ))
          )}
        </SidebarSection>

        {/* TAGS section */}
        <SidebarSection sectionKey="tags" label={t('sidebar.tags')}>
          {tags.length === 0 ? (
            <p className="px-3 py-1 text-xs" style={{ color: 'var(--text-muted)' }}>
              {t('sidebar.noTags')}
            </p>
          ) : (
            tags.map((tag) => (
              <NavItem
                key={tag.id}
                label={tag.name}
                path={`/search?tag=${encodeURIComponent(tag.name)}`}
                icon={<TagIcon />}
              />
            ))
          )}
        </SidebarSection>
      </nav>

      {/* Bottom fixed items */}
      <div className="border-t px-2 py-2" style={{ borderColor: 'var(--border)' }}>
        <NavItem
          label={t('sidebar.favorites')}
          path="/favorites"
          icon={<HeartIcon />}
        />
        <NavItem
          label={t('sidebar.fileManager')}
          path="/file-manager"
          icon={<FileIcon />}
        />
        <NavItem
          label={t('sidebar.settings')}
          path="/settings"
          icon={<SettingsIcon />}
        />
      </div>
    </div>
  );
}
