import { useParams } from 'react-router-dom';

/**
 * Artist list page — grid of artists within a root folder.
 * Implemented in Task 2.5 (Browse Artists Feature).
 */
export function ArtistListPage() {
  const { rootId } = useParams<{ rootId: string }>();

  return (
    <div>
      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Artists
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Root folder #{rootId} — artist grid placeholder.
      </p>
    </div>
  );
}
