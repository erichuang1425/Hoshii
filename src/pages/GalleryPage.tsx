import { useParams, useSearchParams } from 'react-router-dom';
import { GalleryReader } from '@/features/gallery-viewer/ui/GalleryReader';
import { useChronoStore } from '@/features/chrono-linking';
import { useReadingProgressStore } from '@/features/reading-progress/model/useReadingProgressStore';

export function GalleryPage() {
  const { galleryId } = useParams<{ galleryId: string }>();
  const [searchParams] = useSearchParams();
  const numericId = Number(galleryId);
  const artistId = searchParams.get('artistId') ? Number(searchParams.get('artistId')) : undefined;

  const timeline = useChronoStore((s) => s.timeline);
  const fetchTimeline = useChronoStore((s) => s.fetchTimeline);
  const fetchGroups = useChronoStore((s) => s.fetchGroups);
  const getPrevGallery = useChronoStore((s) => s.getPrevGallery);
  const getNextGallery = useChronoStore((s) => s.getNextGallery);

  const saveProgress = useReadingProgressStore((s) => s.saveProgress);

  const prevGallery = numericId ? getPrevGallery(numericId) : null;
  const nextGallery = numericId ? getNextGallery(numericId) : null;

  if (isNaN(numericId)) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-[var(--reader-bg)]">
        <p className="text-[var(--text-muted)]">Invalid gallery ID</p>
      </div>
    );
  }

  return (
    <div className="h-screen w-screen">
      <GalleryReader
        galleryId={numericId}
        artistId={artistId}
        timeline={timeline}
        prevGallery={prevGallery}
        nextGallery={nextGallery}
        onFetchTimeline={fetchTimeline}
        onFetchGroups={fetchGroups}
        onSaveProgress={saveProgress}
      />
    </div>
  );
}
