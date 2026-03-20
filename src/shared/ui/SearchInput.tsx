import { forwardRef, type InputHTMLAttributes } from 'react';
import clsx from 'clsx';

interface SearchInputProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  onClear?: () => void;
}

export const SearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  function SearchInput({ className, value, onClear, ...rest }, ref) {
    return (
      <div className={clsx('relative flex items-center', className)}>
        <svg
          className="pointer-events-none absolute left-2.5 h-4 w-4 text-[var(--text-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <circle cx={11} cy={11} r={8} />
          <line x1={21} y1={21} x2={16.65} y2={16.65} />
        </svg>
        <input
          ref={ref}
          type="search"
          className={clsx(
            'w-full rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] py-1.5 pl-8 pr-8',
            'text-sm text-[var(--text-primary)] placeholder:text-[var(--text-muted)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus:border-[var(--accent)] focus:outline-none',
          )}
          value={value}
          {...rest}
        />
        {value && onClear && (
          <button
            type="button"
            onClick={onClear}
            className="absolute right-2 text-[var(--text-muted)] hover:text-[var(--text-primary)]"
            aria-label="Clear search"
          >
            &times;
          </button>
        )}
      </div>
    );
  },
);
