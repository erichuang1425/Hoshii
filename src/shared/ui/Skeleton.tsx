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
        'skeleton-shimmer rounded',
        className,
      )}
      style={{ width, height }}
      aria-hidden="true"
    />
  );
}
