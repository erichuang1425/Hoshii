/**
 * Home page — displays root folders grouped by volume.
 * Implemented in Task 2.4 (Browse Roots Feature).
 */
export function HomePage() {
  return (
    <div>
      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        Root Folders
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Add a root folder to get started.
      </p>
    </div>
  );
}
