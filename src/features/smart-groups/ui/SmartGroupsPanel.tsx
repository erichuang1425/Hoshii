import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Badge, Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useSmartGroupsStore } from '../model/useSmartGroupsStore';

interface SmartGroupsPanelProps {
  artistId: number;
  currentGalleryId?: number;
}

export function SmartGroupsPanel({ artistId, currentGalleryId }: SmartGroupsPanelProps) {
  const navigate = useNavigate();
  const { groups, loading, fetchForArtist } = useSmartGroupsStore();
  const [collapsed, setCollapsed] = useState(false);

  useEffect(() => {
    fetchForArtist(artistId);
  }, [artistId, fetchForArtist]);

  if (loading) {
    return (
      <div className="flex items-center justify-center p-4">
        <Spinner size="sm" />
      </div>
    );
  }

  if (groups.length === 0) return null;

  return (
    <div className="border-t border-[var(--border)] pt-3">
      <button
        onClick={() => setCollapsed((c) => !c)}
        className="mb-2 flex w-full items-center justify-between px-1"
      >
        <h3 className="text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
          {t('smartGroups.title')}
        </h3>
        <svg
          className={clsx(
            'h-3 w-3 text-[var(--text-muted)] transition-transform',
            collapsed && '-rotate-90',
          )}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 8.25l-7.5 7.5-7.5-7.5" />
        </svg>
      </button>
      {!collapsed && (
        <div className="flex flex-col gap-2">
          {groups.map((group) => (
            <div key={group.name} className="rounded border border-[var(--border)] p-2">
              <div className="mb-1 flex items-center gap-2">
                <span className="text-xs font-medium text-[var(--text-primary)] truncate">
                  {group.name || t('smartGroups.unnamed')}
                </span>
                <Badge variant="muted">{group.galleryIds.length}</Badge>
              </div>
              <div className="flex flex-wrap gap-1">
                {group.galleryIds.map((id, i) => (
                  <button
                    key={id}
                    onClick={() => navigate(`/gallery/${id}`)}
                    className={clsx(
                      'text-xs px-2 py-0.5 rounded transition-colors',
                      id === currentGalleryId
                        ? 'bg-[var(--accent)] text-white'
                        : 'bg-[var(--bg-secondary)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
                    )}
                    title={group.galleryNames[i]}
                  >
                    {(i + 1).toString()}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
