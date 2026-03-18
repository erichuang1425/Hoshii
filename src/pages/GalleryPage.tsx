import { useParams, useNavigate } from 'react-router-dom';
import { useKeyboard } from '@/shared/hooks/useKeyboard';

/**
 * Gallery reader page — full-screen media viewer.
 * This renders OUTSIDE MainLayout (no sidebar/header).
 * Implemented in Task 2.6 (Gallery Viewer Feature).
 */
export function GalleryPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const navigate = useNavigate();

  useKeyboard([
    { key: 'Escape', action: () => navigate(-1) },
  ]);

  return (
    <div
      className="flex h-screen w-screen items-center justify-center"
      style={{ backgroundColor: 'var(--reader-bg)' }}
    >
      <p style={{ color: 'var(--text-muted)' }}>
        Gallery #{galleryId} — reader placeholder. Press Escape to exit.
      </p>
    </div>
  );
}
