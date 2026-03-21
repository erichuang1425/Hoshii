import clsx from 'clsx';

interface SkeletonProps {
  className?: string;
  width?: string | number;
  height?: string | number;
}

export function Skeleton({ className, width, height }: SkeletonProps) {
  return (
    <div
      className={clsx(
        'animate-pulse rounded bg-[var(--bg-hover)]',
        className,
      )}
      style={{ width, height }}
    />
  );
}
