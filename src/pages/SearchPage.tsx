import { useEffect, useRef } from 'react';
import { useSearchParams } from 'react-router-dom';
import { t } from '@/shared/i18n';
import { SearchInput, Button } from '@/shared/ui';
import { SearchResults } from '@/features/search/ui/SearchResults';
import { useSearchStore } from '@/features/search/model/useSearchStore';

export function SearchPage() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = useSearchStore((s) => s.query);
  const setQuery = useSearchStore((s) => s.setQuery);
  const recentQueries = useSearchStore((s) => s.recentQueries);
  const clearRecentQueries = useSearchStore((s) => s.clearRecentQueries);
  const search = useSearchStore((s) => s.search);
  const inputRef = useRef<HTMLInputElement>(null);

  // Sync URL param → store on mount
  useEffect(() => {
    const q = searchParams.get('q') ?? '';
    if (q) {
      // Use search() directly which also sets the query in the store.
      // Calling setQuery() here would trigger a redundant debounced search.
      search(q);
    }
    inputRef.current?.focus();
    // Only run on mount — stable refs from Zustand
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const q = e.target.value;
    setQuery(q);
    setSearchParams(q ? { q } : {}, { replace: true });
  }

  function handleClear() {
    setQuery('');
    setSearchParams({}, { replace: true });
    inputRef.current?.focus();
  }

  return (
    <div>
      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('search.title')}
      </h1>

      {/* Search input */}
      <SearchInput
        ref={inputRef}
        className="mb-6 max-w-xl"
        placeholder={t('search.placeholder')}
        value={query}
        onChange={handleChange}
        onClear={handleClear}
        autoFocus
      />

      {/* Recent queries (shown when input is empty) */}
      {!query && recentQueries.length > 0 && (
        <div className="mb-6">
          <div className="mb-2 flex items-center justify-between">
            <span className="text-xs font-medium uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
              {t('search.recentSearches')}
            </span>
            <Button variant="ghost" size="sm" onClick={clearRecentQueries}>
              {t('search.clearRecent')}
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            {recentQueries.map((q) => (
              <button
                key={q}
                onClick={() => {
                  setQuery(q);
                  search(q);
                  setSearchParams({ q }, { replace: true });
                }}
                className="rounded-full bg-[var(--bg-active)] px-3 py-1 text-sm text-[var(--text-secondary)] transition-colors hover:bg-[var(--bg-hover)]"
              >
                {q}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Results */}
      <SearchResults />
    </div>
  );
}
