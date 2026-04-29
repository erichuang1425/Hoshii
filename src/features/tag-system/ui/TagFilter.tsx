import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { Button } from '@/shared/ui';
import { useTagStore } from '../model/useTagStore';

interface TagFilterProps {
  availableTags: string[];
}

export function TagFilter({ availableTags }: TagFilterProps) {
  const activeTagFilter = useTagStore((s) => s.activeTagFilter);
  const filterByTags = useTagStore((s) => s.filterByTags);
  const clearTagFilter = useTagStore((s) => s.clearTagFilter);

  function handleToggleTag(tagName: string) {
    const newFilter = activeTagFilter.includes(tagName)
      ? activeTagFilter.filter((t) => t !== tagName)
      : [...activeTagFilter, tagName];
    filterByTags(newFilter);
  }

  if (availableTags.length === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
        {t('tags.filterByTag')}:
      </span>
      {availableTags.map((tagName) => (
        <button
          key={tagName}
          onClick={() => handleToggleTag(tagName)}
          className={clsx(
            'rounded-full px-3 py-1 text-xs transition-colors duration-[var(--duration-fast)]',
            activeTagFilter.includes(tagName)
              ? 'bg-[var(--accent)] text-white'
              : 'bg-[var(--bg-active)] text-[var(--text-secondary)] hover:bg-[var(--bg-hover)]',
          )}
        >
          {tagName}
        </button>
      ))}
      {activeTagFilter.length > 0 && (
        <Button variant="ghost" size="sm" onClick={clearTagFilter}>
          {t('tags.clearFilter')}
        </Button>
      )}
    </div>
  );
}
