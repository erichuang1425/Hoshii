import clsx from 'clsx';
import type { ReactNode } from 'react';

type BadgeVariant = 'default' | 'accent' | 'success' | 'warning' | 'error' | 'muted';

interface BadgeProps {
  variant?: BadgeVariant;
  children: ReactNode;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  default:
    'bg-[var(--bg-hover)] text-[var(--text-secondary)]',
  accent:
    'bg-[var(--accent-muted)] text-[var(--accent)]',
  success:
    'bg-[rgba(74,222,128,0.12)] text-[var(--success)]',
  warning:
    'bg-[rgba(251,191,36,0.12)] text-[var(--warning)]',
  error:
    'bg-[rgba(248,113,113,0.12)] text-[var(--error)]',
  muted:
    'bg-[var(--bg-active)] text-[var(--text-muted)]',
};

export function Badge({ variant = 'default', children, className }: BadgeProps) {
  return (
    <span
      className={clsx(
        'inline-flex items-center rounded px-1.5 py-0.5 text-[10px] font-semibold uppercase leading-none tracking-wide',
        variantStyles[variant],
        className,
      )}
    >
      {children}
    </span>
  );
}
