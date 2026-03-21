import { t } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { GalleryCard } from '@/features/browse-artists/ui/GalleryCard';
import { useSearchStore } from '../model/useSearchStore';

export function SearchResults() {
  const query = useSearchStore((s) => s.query);
  const results = useSearchStore((s) => s.results);
  const loading = useSearchStore((s) => s.loading);
  const error = useSearchStore((s) => s.error);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Spinner size="lg" />
        <span className="ml-3 text-sm" style={{ color: 'var(--text-muted)' }}>
          {t('search.searching')}
        </span>
      </div>
    );
  }

  if (error) {
    return <p className="py-4 text-sm text-[var(--error)]">{error}</p>;
  }

  if (!query) return null;

  if (results.length === 0) {
    return (
      <div className="py-16 text-center">
        <p className="text-base" style={{ color: 'var(--text-secondary)' }}>
          {t('search.noResults')} &ldquo;{query}&rdquo;
        </p>
      </div>
    );
  }

  return (
    <div>
      <p className="mb-4 text-sm" style={{ color: 'var(--text-muted)' }}>
        {results.length} {t('search.results')} &ldquo;{query}&rdquo;
      </p>
      <div className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {results.map((gallery) => (
          <GalleryCard key={gallery.id} gallery={gallery} />
        ))}
      </div>
    </div>
  );
}
