import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { Badge } from './Badge';

interface OfflineOverlayProps {
  driveLabel?: string | null;
  className?: string;
}

export function OfflineOverlay({ driveLabel, className }: OfflineOverlayProps) {
  return (
    <div
      className={clsx(
        'absolute inset-0 z-10 flex flex-col items-center justify-center',
        'bg-[var(--bg-offline)]/50 backdrop-blur-[2px] -webkit-backdrop-filter-blur-[2px]',
        'animate-[fadeIn_150ms_var(--ease-smooth)]',
        className,
      )}
    >
      <Badge variant="muted">{t('shared.offline')}</Badge>
      {driveLabel && (
        <span className="mt-1.5 text-xs text-[var(--text-muted)]">
          {t('shared.reconnectDrive').replace('{drive}', driveLabel)}
        </span>
      )}
    </div>
  );
}
