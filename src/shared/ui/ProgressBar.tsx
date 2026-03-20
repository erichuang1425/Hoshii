import clsx from 'clsx';

interface ProgressBarProps {
  /** Progress from 0 to 1 */
  value: number;
  className?: string;
}

export function ProgressBar({ value, className }: ProgressBarProps) {
  const clamped = Math.max(0, Math.min(1, value));

  if (clamped === 0) return null;

  return (
    <div
      className={clsx('h-0.5 w-full overflow-hidden bg-[var(--bg-hover)]', className)}
      role="progressbar"
      aria-valuenow={Math.round(clamped * 100)}
      aria-valuemin={0}
      aria-valuemax={100}
    >
      <div
        className="h-full bg-[var(--accent)] transition-[width] duration-[var(--duration-normal)] ease-[var(--ease-smooth)]"
        style={{ width: `${clamped * 100}%` }}
      />
    </div>
  );
}
