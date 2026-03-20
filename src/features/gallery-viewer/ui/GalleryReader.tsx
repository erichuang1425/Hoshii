import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Spinner } from '@/shared/ui';
import { useKeyboard } from '@/shared/hooks/useKeyboard';
import { t } from '@/shared/i18n';
import { useGalleryReaderStore } from '../model/useGalleryReaderStore';
import { PageView } from './PageView';
import { ThumbnailStrip } from './ThumbnailStrip';
import { SubheadingNav } from './SubheadingNav';

interface GalleryReaderProps {
  galleryId: number;
}

export function GalleryReader({ galleryId }: GalleryReaderProps) {
  const navigate = useNavigate();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const media = useGalleryReaderStore((s) => s.media);
  const groups = useGalleryReaderStore((s) => s.groups);
  const currentPage = useGalleryReaderStore((s) => s.currentPage);
  const totalPages = useGalleryReaderStore((s) => s.totalPages);
  const readingMode = useGalleryReaderStore((s) => s.readingMode);
  const zoomLevel = useGalleryReaderStore((s) => s.zoomLevel);
  const currentGroup = useGalleryReaderStore((s) => s.currentGroup);
  const loading = useGalleryReaderStore((s) => s.loading);
  const error = useGalleryReaderStore((s) => s.error);
  const headerVisible = useGalleryReaderStore((s) => s.headerVisible);
  const loadGallery = useGalleryReaderStore((s) => s.loadGallery);
  const nextPage = useGalleryReaderStore((s) => s.nextPage);
  const prevPage = useGalleryReaderStore((s) => s.prevPage);
  const goToFirst = useGalleryReaderStore((s) => s.goToFirst);
  const goToLast = useGalleryReaderStore((s) => s.goToLast);
  const setCurrentPage = useGalleryReaderStore((s) => s.setCurrentPage);
  const setReadingMode = useGalleryReaderStore((s) => s.setReadingMode);
  const jumpToGroup = useGalleryReaderStore((s) => s.jumpToGroup);
  const setHeaderVisible = useGalleryReaderStore((s) => s.setHeaderVisible);

  useEffect(() => {
    loadGallery(galleryId);
  }, [galleryId, loadGallery]);

  // Auto-hide header after 2s
  const resetHideTimer = useCallback(() => {
    setHeaderVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => setHeaderVisible(false), 2000);
  }, [setHeaderVisible]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  useKeyboard([
    { key: 'Escape', action: () => navigate(-1) },
    { key: 'ArrowRight', action: nextPage },
    { key: 'ArrowLeft', action: prevPage },
    { key: 'd', action: nextPage },
    { key: 'a', action: prevPage },
    { key: ' ', action: nextPage },
    { key: 'Home', action: goToFirst },
    { key: 'End', action: goToLast },
    { key: 'g', action: () => setReadingMode('thumbnail_grid') },
    { key: 'v', action: () => setReadingMode('vertical_scroll') },
    { key: '1', action: () => setReadingMode('single') },
    { key: '2', action: () => setReadingMode('double_page') },
  ]);

  const currentMedia = media[currentPage];

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;

    if (x < 0.2) {
      prevPage();
    } else if (x > 0.8) {
      nextPage();
    }
    resetHideTimer();
  }

  if (loading) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--reader-bg)]">
        <Spinner size="lg" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--reader-bg)]">
        <p className="text-sm text-[var(--error)]">{error}</p>
        <button
          onClick={() => navigate(-1)}
          className="text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
        >
          {t('shared.retry')}
        </button>
      </div>
    );
  }

  if (readingMode === 'thumbnail_grid') {
    return (
      <div className="flex h-full w-full flex-col bg-[var(--reader-bg)]">
        <ReaderHeader
          visible={true}
          currentPage={currentPage}
          totalPages={totalPages}
          onBack={() => navigate(-1)}
        />
        <div className="flex-1 overflow-y-auto p-4">
          <div className="grid grid-cols-[repeat(auto-fill,minmax(150px,1fr))] gap-3">
            {media.map((entry, i) => (
              <button
                key={entry.id}
                onClick={() => { setCurrentPage(i); setReadingMode('single'); }}
                className={clsx(
                  'overflow-hidden rounded border-2 transition-colors',
                  i === currentPage ? 'border-[var(--accent)]' : 'border-transparent hover:border-[var(--border-hover)]',
                )}
              >
                <img
                  src={`${entry.path}`}
                  alt={entry.filename}
                  className="aspect-[3/4] w-full object-cover"
                  loading="lazy"
                />
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="flex h-full w-full flex-col bg-[var(--reader-bg)]"
      onMouseMove={resetHideTimer}
    >
      {/* Header */}
      <ReaderHeader
        visible={headerVisible}
        currentPage={currentPage}
        totalPages={totalPages}
        onBack={() => navigate(-1)}
      />

      {/* Main content */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={handleContentClick}
      >
        {currentMedia && <PageView media={currentMedia} zoomLevel={zoomLevel} />}
      </div>

      {/* Subheading nav */}
      <SubheadingNav
        groups={groups}
        currentGroup={currentGroup}
        totalCount={totalPages}
        onJump={jumpToGroup}
        onShowAll={goToFirst}
      />

      {/* Thumbnail strip */}
      <ThumbnailStrip
        media={media}
        currentIndex={currentPage}
        onSelect={setCurrentPage}
      />
    </div>
  );
}

interface ReaderHeaderProps {
  visible: boolean;
  currentPage: number;
  totalPages: number;
  onBack: () => void;
}

function ReaderHeader({ visible, currentPage, totalPages, onBack }: ReaderHeaderProps) {
  return (
    <div
      className={clsx(
        'flex items-center justify-between px-4 py-2',
        'bg-[var(--bg-primary)]/80 backdrop-blur-sm',
        'transition-opacity duration-[var(--duration-normal)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      <button
        onClick={onBack}
        className="flex items-center gap-1 text-sm text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
      >
        <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
        </svg>
        {t('galleryViewer.back')}
      </button>
      <span className="text-sm text-[var(--text-secondary)]">
        {currentPage + 1} / {totalPages}
      </span>
    </div>
  );
}
