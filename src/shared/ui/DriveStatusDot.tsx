import clsx from 'clsx';

interface DriveStatusDotProps {
  online: boolean;
  className?: string;
}

export function DriveStatusDot({ online, className }: DriveStatusDotProps) {
  return (
    <span
      role="status"
      aria-label={online ? 'Online' : 'Offline'}
      className={clsx(
        'inline-block h-2 w-2 shrink-0 rounded-full transition-colors duration-[var(--duration-normal)]',
        online ? 'bg-[var(--success)]' : 'bg-[var(--offline)]',
        className,
      )}
    />
  );
}
