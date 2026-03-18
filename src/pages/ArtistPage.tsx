import { useParams } from 'react-router-dom';

/**
 * Artist page — gallery grid for a specific artist.
 * Implemented in Task 2.5 (Browse Artists Feature).
 */
export function ArtistPage() {
  const { artistId } = useParams<{ artistId: string }>();

  return (
    <div>
      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Galleries
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Artist #{artistId} — gallery grid placeholder.
      </p>
    </div>
  );
}
