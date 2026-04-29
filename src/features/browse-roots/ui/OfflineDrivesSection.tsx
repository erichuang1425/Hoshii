import { useState } from 'react';
import clsx from 'clsx';
import type { RootFolder, Volume } from '@/shared/types';
import { t } from '@/shared/i18n';
import { RootFolderCard } from './RootFolderCard';

interface OfflineDrivesSectionProps {
  roots: RootFolder[];
  volumes: Volume[];
}

export function OfflineDrivesSection({ roots, volumes }: OfflineDrivesSectionProps) {
  const [expanded, setExpanded] = useState(false);

  if (roots.length === 0) return null;

  return (
    <div className="mt-6">
      <button
        onClick={() => setExpanded(!expanded)}
        className={clsx(
          'flex items-center gap-2 text-sm font-medium text-[var(--text-secondary)]',
          'hover:text-[var(--text-primary)] transition-colors duration-[var(--duration-fast)]',
        )}
      >
        <svg
          className={clsx('h-4 w-4 transition-transform duration-[var(--duration-fast)]', expanded && 'rotate-90')}
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
        </svg>
        {t('browseRoots.offlineDrives')} ({roots.length})
      </button>

      {expanded && (
        <div className="mt-3 grid grid-cols-[repeat(auto-fill,minmax(280px,1fr))] gap-4">
          {roots.map((root) => (
            <RootFolderCard
              key={root.id}
              root={root}
              volume={volumes.find((v) => v.id === root.volumeId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
