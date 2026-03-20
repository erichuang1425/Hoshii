import { useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { useLayoutStore } from './useLayoutStore';

function HamburgerIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  );
}

function SearchIcon() {
  return (
    <svg
      className="pointer-events-none absolute left-2.5 h-4 w-4"
      style={{ color: 'var(--text-muted)' }}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
    >
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
    </svg>
  );
}

function HeartIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12z" />
    </svg>
  );
}

function SettingsGearIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
    </svg>
  );
}

export function Header() {
  const navigate = useNavigate();
  const toggleSidebar = useLayoutStore((s) => s.toggleSidebar);
  const searchRef = useRef<HTMLInputElement>(null);

  const handleSearchKeyDown = useCallback(
    (e: React.KeyboardEvent<HTMLInputElement>) => {
      if (e.key === 'Enter') {
        const q = (e.currentTarget.value ?? '').trim();
        if (q) {
          navigate(`/search?q=${encodeURIComponent(q)}`);
          e.currentTarget.blur();
        }
      }
      if (e.key === 'Escape') {
        e.currentTarget.value = '';
        e.currentTarget.blur();
      }
    },
    [navigate],
  );

  return (
    <header
      className="flex flex-shrink-0 items-center gap-3 border-b px-3"
      style={{
        height: 'var(--header-height)',
        backgroundColor: 'var(--bg-secondary)',
        borderColor: 'var(--border)',
      }}
    >
      {/* Hamburger toggle */}
      <button
        onClick={toggleSidebar}
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--bg-hover)]',
        )}
        style={{ color: 'var(--text-secondary)' }}
        aria-label="Toggle sidebar"
      >
        <HamburgerIcon />
      </button>

      {/* App title */}
      <button
        onClick={() => navigate('/')}
        className="flex-shrink-0 text-base font-bold transition-colors duration-[var(--duration-fast)] hover:opacity-80"
        style={{ color: 'var(--accent)' }}
      >
        {t('header.title')}
      </button>

      {/* Spacer */}
      <div className="flex-1" />

      {/* Search input */}
      <div className="relative flex max-w-sm flex-1 items-center">
        <SearchIcon />
        <input
          ref={searchRef}
          type="search"
          placeholder={t('header.searchPlaceholder')}
          onKeyDown={handleSearchKeyDown}
          className={clsx(
            'w-full rounded-md border border-[var(--border)] bg-[var(--bg-elevated)] py-1.5 pl-8 pr-3',
            'text-sm placeholder:text-[var(--text-muted)] text-[var(--text-primary)]',
            'transition-colors duration-[var(--duration-fast)]',
            'focus:border-[var(--accent)] focus:outline-none',
          )}
        />
      </div>

      {/* Favorites shortcut */}
      <button
        onClick={() => navigate('/favorites')}
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--bg-hover)]',
        )}
        style={{ color: 'var(--text-secondary)' }}
        aria-label={t('header.openFavorites')}
      >
        <HeartIcon />
      </button>

      {/* Settings shortcut */}
      <button
        onClick={() => navigate('/settings')}
        className={clsx(
          'flex h-8 w-8 flex-shrink-0 items-center justify-center rounded',
          'transition-colors duration-[var(--duration-fast)]',
          'hover:bg-[var(--bg-hover)]',
        )}
        style={{ color: 'var(--text-secondary)' }}
        aria-label={t('header.openSettings')}
      >
        <SettingsGearIcon />
      </button>
    </header>
  );
}
