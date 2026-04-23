import { useEffect, useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { useLayoutStore } from './useLayoutStore';
import { LAYOUT_META, getLayoutMeta } from './layoutMeta';

/**
 * Pill-shaped dropdown that lets the user swap between the four layout shells.
 * Lives in the top chrome of every layout so the mode is always discoverable.
 */
export function LayoutSwitcher({ compact = false }: { compact?: boolean }) {
  const layoutMode = useLayoutStore((s) => s.layoutMode);
  const setLayoutMode = useLayoutStore((s) => s.setLayoutMode);
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointer(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') setOpen(false);
    }
    document.addEventListener('mousedown', onPointer);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onPointer);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const onPick = useCallback(
    (mode: typeof layoutMode) => {
      setLayoutMode(mode);
      setOpen(false);
    },
    [setLayoutMode],
  );

  const currentMeta = getLayoutMeta(layoutMode);
  const { Glyph } = currentMeta;

  return (
    <div ref={rootRef} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={t('layout.switcherLabel')}
        aria-haspopup="menu"
        aria-expanded={open}
        className={clsx(
          'flex h-8 items-center gap-1.5 rounded-full border px-2.5',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--bg-hover)]',
        )}
        style={{
          borderColor: 'var(--border)',
          color: 'var(--text-secondary)',
          backgroundColor: open ? 'var(--bg-hover)' : 'transparent',
        }}
      >
        <Glyph className="h-4 w-4" />
        {!compact && (
          <span className="text-xs font-medium">{t(currentMeta.labelKey)}</span>
        )}
        <svg
          className="h-3 w-3 opacity-70"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth={2}
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {open && (
        <div
          role="menu"
          className="absolute right-0 z-50 mt-2 w-72 overflow-hidden rounded-lg border shadow-lg"
          style={{
            backgroundColor: 'var(--bg-secondary)',
            borderColor: 'var(--border)',
            boxShadow: 'var(--floating-shadow)',
            animation: 'slideDown var(--duration-fast) var(--ease-smooth)',
          }}
        >
          <div
            className="px-3 py-2 text-[11px] font-semibold uppercase tracking-wider"
            style={{ color: 'var(--text-muted)' }}
          >
            {t('layout.sectionTitle')}
          </div>
          {LAYOUT_META.map((meta) => {
            const MetaGlyph = meta.Glyph;
            const active = meta.id === layoutMode;
            return (
              <button
                key={meta.id}
                role="menuitemradio"
                aria-checked={active}
                onClick={() => onPick(meta.id)}
                className={clsx(
                  'flex w-full items-start gap-3 px-3 py-2.5 text-left',
                  'transition-colors duration-[var(--duration-fast)]',
                  'hover:bg-[var(--bg-hover)]',
                )}
                style={{
                  backgroundColor: active ? 'var(--accent-muted)' : 'transparent',
                }}
              >
                <span
                  className="mt-0.5 flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-md border"
                  style={{
                    borderColor: active ? 'var(--accent)' : 'var(--border)',
                    color: active ? 'var(--accent)' : 'var(--text-secondary)',
                  }}
                >
                  <MetaGlyph className="h-5 w-5" />
                </span>
                <span className="flex-1 min-w-0">
                  <span
                    className="block text-sm font-medium"
                    style={{ color: active ? 'var(--accent)' : 'var(--text-primary)' }}
                  >
                    {t(meta.labelKey)}
                  </span>
                  <span
                    className="block text-xs leading-snug"
                    style={{ color: 'var(--text-muted)' }}
                  >
                    {t(meta.descriptionKey)}
                  </span>
                </span>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
