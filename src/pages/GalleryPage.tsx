import { useParams } from 'react-router-dom';
import { GalleryReader } from '@/features/gallery-viewer/ui/GalleryReader';

export function GalleryPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const numericId = Number(galleryId);

  if (isNaN(numericId)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--reader-bg)]">
        <p className="text-[var(--text-muted)]">Invalid gallery ID</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <GalleryReader galleryId={numericId} />
    </div>
  );
}
