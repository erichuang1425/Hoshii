import { useEffect } from 'react';
import clsx from 'clsx';

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastData {
  id: string;
  type: ToastType;
  message: string;
  durationMs?: number;
}

interface ToastProps {
  toast: ToastData;
  onDismiss: (id: string) => void;
}

const typeStyles: Record<ToastType, string> = {
  info: 'border-l-[var(--accent)]',
  success: 'border-l-[var(--success)]',
  warning: 'border-l-[var(--warning)]',
  error: 'border-l-[var(--error)]',
};

export function Toast({ toast, onDismiss }: ToastProps) {
  useEffect(() => {
    const timeout = toast.durationMs ?? 4000;
    if (timeout <= 0) return;
    const timer = setTimeout(() => onDismiss(toast.id), timeout);
    return () => clearTimeout(timer);
  }, [toast.id, toast.durationMs, onDismiss]);

  return (
    <div
      role="alert"
      className={clsx(
        'pointer-events-auto flex items-start gap-2 rounded border-l-4 bg-[var(--bg-elevated)] px-4 py-3',
        'shadow-lg text-sm text-[var(--text-primary)]',
        'animate-[slideInRight_300ms_var(--ease-smooth)]',
        typeStyles[toast.type],
      )}
    >
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => onDismiss(toast.id)}
        className="text-[var(--text-muted)] hover:text-[var(--text-primary)] shrink-0"
        aria-label="Dismiss"
      >
        &times;
      </button>
    </div>
  );
}
