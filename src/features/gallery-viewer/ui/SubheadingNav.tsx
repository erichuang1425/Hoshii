import clsx from 'clsx';
import type { MediaGroup } from '@/shared/types';
import { t } from '@/shared/i18n';

interface SubheadingNavProps {
  groups: MediaGroup[];
  currentGroup: string | null;
  totalCount: number;
  onJump: (groupName: string) => void;
  onShowAll: () => void;
}

export function SubheadingNav({ groups, currentGroup, totalCount, onJump, onShowAll }: SubheadingNavProps) {
  if (groups.length < 2) return null;

  return (
    <div className="flex items-center gap-1.5 overflow-x-auto border-t border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5">
      <button
        onClick={onShowAll}
        className={clsx(
          'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
          currentGroup === null
            ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
            : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
        )}
      >
        {t('galleryViewer.all')} {totalCount}
      </button>
      {groups.map((group) => (
        <button
          key={group.name}
          onClick={() => onJump(group.name)}
          className={clsx(
            'shrink-0 rounded-full px-2.5 py-0.5 text-xs font-medium transition-colors',
            currentGroup === group.name
              ? 'bg-[var(--accent-muted)] text-[var(--accent)]'
              : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
          )}
        >
          {group.name || t('galleryViewer.ungrouped')} <span className="text-[var(--text-muted)]">{group.count}</span>
        </button>
      ))}
    </div>
  );
}
