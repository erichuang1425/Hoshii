import clsx from 'clsx';
import { open } from '@tauri-apps/plugin-dialog';
import { useToast } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { logger } from '@/shared/lib/logger';
import { useBrowseRootsStore } from '../model/useBrowseRootsStore';

export function AddRootButton() {
  const addRoot = useBrowseRootsStore((s) => s.addRoot);
  const toast = useToast();

  async function handleClick() {
    try {
      const selected = await open({ directory: true, multiple: false, title: t('browseRoots.selectFolder') });
      if (!selected) return;

      await addRoot(selected);
      toast.success(t('browseRoots.rootAdded'));
    } catch (err) {
      const message = String(err);
      logger.error('Failed to add root folder', { error: message });
      toast.error(t('shared.error'));
    }
  }

  return (
    <button
      onClick={handleClick}
      className={clsx(
        'flex min-h-[120px] flex-col items-center justify-center gap-2',
        'rounded-[var(--card-radius)] border-2 border-dashed border-[var(--border)]',
        'bg-transparent text-[var(--text-muted)]',
        'transition-all duration-[var(--duration-fast)] ease-[var(--ease-smooth)]',
        'hover:border-[var(--accent)] hover:text-[var(--accent)]',
        'cursor-pointer',
      )}
    >
      <svg className="h-8 w-8" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4.5v15m7.5-7.5h-15" />
      </svg>
      <span className="text-sm font-medium">{t('browseRoots.addRoot')}</span>
    </button>
  );
}
