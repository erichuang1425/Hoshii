import { useMemo } from 'react';
import clsx from 'clsx';
import type { TimelineEntry } from '@/shared/types';
import { t } from '@/shared/i18n';

interface TimelineViewProps {
  timeline: TimelineEntry[];
  currentPage: number;
  onSeek: (page: number) => void;
}

interface DateGroup {
  date: string;
  label: string;
  indices: number[];
  firstIndex: number;
}

function formatDateLabel(date: string): string {
  if (!date) return '';
  // YYYY-MM-DD → "Jan 15, 2024"
  if (date.length === 10) {
    const [year, month, day] = date.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[month - 1]} ${day}, ${year}`;
  }
  // YYYY-MM → "Jan 2024"
  if (date.length === 7) {
    const [year, month] = date.split('-').map(Number);
    const months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
    return `${months[month - 1]} ${year}`;
  }
  // YYYY → "2024"
  return date;
}

export function TimelineView({ timeline, currentPage, onSeek }: TimelineViewProps) {
  // Group by date
  const dateGroups = useMemo<DateGroup[]>(() => {
    const groups = new Map<string, DateGroup>();
    const undatedIndices: number[] = [];

    for (const entry of timeline) {
      if (!entry.date) {
        undatedIndices.push(entry.index);
        continue;
      }
      if (!groups.has(entry.date)) {
        groups.set(entry.date, {
          date: entry.date,
          label: formatDateLabel(entry.date),
          indices: [],
          firstIndex: entry.index,
        });
      }
      groups.get(entry.date)!.indices.push(entry.index);
    }

    const sorted = [...groups.values()].sort((a, b) => a.date.localeCompare(b.date));

    if (undatedIndices.length > 0) {
      sorted.push({
        date: '',
        label: t('timeline.undated'),
        indices: undatedIndices,
        firstIndex: undatedIndices[0],
      });
    }

    return sorted;
  }, [timeline]);

  // Find current date group
  const currentDateGroup = useMemo(() => {
    for (const group of dateGroups) {
      if (group.indices.includes(currentPage)) return group.date;
    }
    return null;
  }, [dateGroups, currentPage]);

  if (dateGroups.length <= 1) return null;

  return (
    <div className="border-t border-[var(--border)] bg-[var(--bg-secondary)]">
      <div className="flex items-center gap-0.5 overflow-x-auto px-3 py-1.5" style={{ scrollbarWidth: 'none' }}>
        <span className="mr-2 text-xs text-[var(--text-muted)] shrink-0">
          {t('timeline.label')}
        </span>
        {dateGroups.map((group) => {
          const isActive = group.date === currentDateGroup;
          const percentage = timeline.length > 0
            ? Math.round((group.indices.length / timeline.length) * 100)
            : 0;

          return (
            <button
              key={group.date || 'undated'}
              onClick={() => onSeek(group.firstIndex)}
              title={`${group.label} (${group.indices.length} ${t('timeline.pages')})`}
              className={clsx(
                'shrink-0 rounded px-2 py-0.5 text-xs transition-colors',
                isActive
                  ? 'bg-[var(--accent)] text-white'
                  : 'text-[var(--text-secondary)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)]',
              )}
              style={{ minWidth: `${Math.max(percentage, 4)}%` }}
            >
              {group.label}
            </button>
          );
        })}
      </div>
    </div>
  );
}
