import { useEffect, useRef, type ReactNode } from 'react';
import clsx from 'clsx';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  title?: string;
  children: ReactNode;
  className?: string;
}

export function Modal({ open, onClose, title, children, className }: ModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (open && !dialog.open) {
      dialog.showModal();
    } else if (!open && dialog.open) {
      dialog.close();
    }
  }, [open]);

  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape' && open) {
        e.preventDefault();
        onClose();
      }
    }
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  return (
    <dialog
      ref={dialogRef}
      aria-labelledby={title ? 'modal-title' : undefined}
      className={clsx(
        'fixed inset-0 m-auto max-h-[85vh] w-full max-w-lg overflow-y-auto',
        'rounded-lg bg-[var(--bg-elevated)] text-[var(--text-primary)] shadow-2xl',
        'border border-[var(--border)]',
        'backdrop:bg-black/60',
        className,
      )}
      style={{ zIndex: 'var(--z-modal)' }}
      onClick={(e) => {
        if (e.target === dialogRef.current) onClose();
      }}
    >
      {title && (
        <div className="flex items-center justify-between border-b border-[var(--border)] px-5 py-3">
          <h2 id="modal-title" className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            className="focus-ring flex h-6 w-6 items-center justify-center rounded text-[var(--text-muted)] hover:bg-[var(--bg-hover)] hover:text-[var(--text-primary)] transition-colors"
            aria-label="Close"
          >
            &times;
          </button>
        </div>
      )}
      <div className="p-5">{children}</div>
    </dialog>
  );
}
