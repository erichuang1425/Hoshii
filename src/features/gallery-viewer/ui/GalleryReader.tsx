import { useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import clsx from 'clsx';
import { Spinner } from '@/shared/ui';
import { useKeyboard } from '@/shared/hooks/useKeyboard';
import { t } from '@/shared/i18n';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { useGalleryReaderStore } from '../model/useGalleryReaderStore';
import { useChronoStore } from '@/features/chrono-linking';
import { useReadingProgressStore } from '@/features/reading-progress/model/useReadingProgressStore';
import { PageView } from './PageView';
import { ThumbnailStrip } from './ThumbnailStrip';
import { SubheadingNav } from './SubheadingNav';
import { WebtoonView } from './WebtoonView';
import { InfiniteSlider } from './InfiniteSlider';
import { ReadingToolbar } from './ReadingToolbar';
import { AutoScrollController } from './AutoScrollController';
import { TimelineView } from './TimelineView';

interface GalleryReaderProps {
  galleryId: number;
  artistId?: number;
}

export function GalleryReader({ galleryId, artistId }: GalleryReaderProps) {
  const navigate = useNavigate();
  const hideTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const webtoonScrollRef = useRef<HTMLDivElement>(null);

  const media = useGalleryReaderStore((s) => s.media);
  const groups = useGalleryReaderStore((s) => s.groups);
  const currentPage = useGalleryReaderStore((s) => s.currentPage);
  const totalPages = useGalleryReaderStore((s) => s.totalPages);
  const readingMode = useGalleryReaderStore((s) => s.readingMode);
  const fitMode = useGalleryReaderStore((s) => s.fitMode);
  const readingDirection = useGalleryReaderStore((s) => s.readingDirection);
  const zoomLevel = useGalleryReaderStore((s) => s.zoomLevel);
  const currentGroup = useGalleryReaderStore((s) => s.currentGroup);
  const loading = useGalleryReaderStore((s) => s.loading);
  const error = useGalleryReaderStore((s) => s.error);
  const headerVisible = useGalleryReaderStore((s) => s.headerVisible);
  const autoScroll = useGalleryReaderStore((s) => s.autoScroll);
  const autoScrollSpeed = useGalleryReaderStore((s) => s.autoScrollSpeed);

  const loadGallery = useGalleryReaderStore((s) => s.loadGallery);
  const nextPage = useGalleryReaderStore((s) => s.nextPage);
  const prevPage = useGalleryReaderStore((s) => s.prevPage);
  const goToFirst = useGalleryReaderStore((s) => s.goToFirst);
  const goToLast = useGalleryReaderStore((s) => s.goToLast);
  const setCurrentPage = useGalleryReaderStore((s) => s.setCurrentPage);
  const setReadingMode = useGalleryReaderStore((s) => s.setReadingMode);
  const setFitMode = useGalleryReaderStore((s) => s.setFitMode);
  const setReadingDirection = useGalleryReaderStore((s) => s.setReadingDirection);
  const jumpToGroup = useGalleryReaderStore((s) => s.jumpToGroup);
  const setHeaderVisible = useGalleryReaderStore((s) => s.setHeaderVisible);
  const setAutoScroll = useGalleryReaderStore((s) => s.setAutoScroll);
  const setAutoScrollSpeed = useGalleryReaderStore((s) => s.setAutoScrollSpeed);

  const { timeline, fetchTimeline, fetchGroups, getPrevGallery, getNextGallery } = useChronoStore();

  const saveProgress = useReadingProgressStore((s) => s.saveProgress);
  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSavedPageRef = useRef<number>(-1);

  // Debounced save: 3s after page change
  useEffect(() => {
    if (totalPages === 0 || currentPage === lastSavedPageRef.current) return;

    if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      saveProgress(galleryId, currentPage, totalPages);
      lastSavedPageRef.current = currentPage;
    }, 3000);

    return () => {
      if (saveTimerRef.current) clearTimeout(saveTimerRef.current);
    };
  }, [currentPage, totalPages, galleryId, saveProgress]);

  // Save on unmount
  useEffect(() => {
    return () => {
      const state = useGalleryReaderStore.getState();
      if (state.totalPages > 0) {
        saveProgress(galleryId, state.currentPage, state.totalPages);
      }
    };
  }, [galleryId, saveProgress]);

  useEffect(() => {
    loadGallery(galleryId);
    fetchTimeline(galleryId);
  }, [galleryId, loadGallery, fetchTimeline]);

  useEffect(() => {
    if (artistId !== undefined) {
      fetchGroups(artistId);
    }
  }, [artistId, fetchGroups]);

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

  // Navigate direction-aware
  const pageForward = useCallback(() => {
    if (readingDirection === 'rtl') prevPage();
    else nextPage();
  }, [readingDirection, nextPage, prevPage]);

  const pageBack = useCallback(() => {
    if (readingDirection === 'rtl') nextPage();
    else prevPage();
  }, [readingDirection, nextPage, prevPage]);

  useKeyboard([
    { key: 'Escape', action: () => navigate(-1) },
    { key: 'ArrowRight', action: pageForward },
    { key: 'ArrowLeft', action: pageBack },
    { key: 'd', action: pageForward },
    { key: 'a', action: pageBack },
    { key: ' ', action: nextPage },
    { key: 'Home', action: goToFirst },
    { key: 'End', action: goToLast },
    { key: 'g', action: () => setReadingMode('thumbnail_grid') },
    { key: 'v', action: () => setReadingMode('vertical_scroll') },
    { key: '1', action: () => setReadingMode('single') },
    { key: '2', action: () => setReadingMode('double_page') },
  ]);

  const prevGallery = galleryId ? getPrevGallery(galleryId) : null;
  const nextGallery = galleryId ? getNextGallery(galleryId) : null;

  const currentMedia = media[currentPage];

  function handleContentClick(e: React.MouseEvent<HTMLDivElement>) {
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width;

    if (readingDirection === 'rtl') {
      if (x > 0.8) pageBack();
      else if (x < 0.2) pageForward();
    } else {
      if (x < 0.2) pageBack();
      else if (x > 0.8) pageForward();
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
                  src={toAssetUrl(entry.path)}
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

  if (readingMode === 'vertical_scroll') {
    return (
      <div className="relative flex h-full w-full flex-col bg-[var(--reader-bg)]" onMouseMove={resetHideTimer}>
        <ReaderHeader
          visible={headerVisible}
          currentPage={currentPage}
          totalPages={totalPages}
          onBack={() => navigate(-1)}
        />
        <ReadingToolbar
          readingMode={readingMode}
          fitMode={fitMode}
          readingDirection={readingDirection}
          autoScroll={autoScroll}
          autoScrollSpeed={autoScrollSpeed}
          onReadingModeChange={setReadingMode}
          onFitModeChange={setFitMode}
          onReadingDirectionChange={setReadingDirection}
          onAutoScrollChange={setAutoScroll}
          onAutoScrollSpeedChange={setAutoScrollSpeed}
          visible={headerVisible}
        />
        <div className="relative flex-1 overflow-hidden" ref={webtoonScrollRef as React.RefObject<HTMLDivElement>}>
          <WebtoonView
            media={media}
            currentPage={currentPage}
            fitMode={fitMode}
            onPageChange={setCurrentPage}
          />
          <InfiniteSlider
            media={media}
            currentPage={currentPage}
            onSeek={setCurrentPage}
          />
        </div>
        <AutoScrollController
          enabled={autoScroll}
          speed={autoScrollSpeed}
          scrollTargetRef={webtoonScrollRef}
          onReachEnd={() => setAutoScroll(false)}
        />
        <TimelineView
          timeline={timeline}
          currentPage={currentPage}
          onSeek={setCurrentPage}
        />
        <SubheadingNav
          groups={groups}
          currentGroup={currentGroup}
          totalCount={totalPages}
          onJump={jumpToGroup}
          onShowAll={goToFirst}
        />
        <ChronoNav prev={prevGallery} next={nextGallery} />
      </div>
    );
  }

  // Single / double page mode
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

      {/* Reading Toolbar */}
      <ReadingToolbar
        readingMode={readingMode}
        fitMode={fitMode}
        readingDirection={readingDirection}
        autoScroll={autoScroll}
        autoScrollSpeed={autoScrollSpeed}
        onReadingModeChange={setReadingMode}
        onFitModeChange={setFitMode}
        onReadingDirectionChange={setReadingDirection}
        onAutoScrollChange={setAutoScroll}
        onAutoScrollSpeedChange={setAutoScrollSpeed}
        visible={headerVisible}
      />

      {/* Main content */}
      <div
        className="relative flex-1 overflow-hidden"
        onClick={handleContentClick}
      >
        {currentMedia && <PageView media={currentMedia} zoomLevel={zoomLevel} />}
        <InfiniteSlider
          media={media}
          currentPage={currentPage}
          onSeek={setCurrentPage}
        />
      </div>

      {/* Timeline */}
      <TimelineView
        timeline={timeline}
        currentPage={currentPage}
        onSeek={setCurrentPage}
      />

      {/* Subheading nav */}
      <SubheadingNav
        groups={groups}
        currentGroup={currentGroup}
        totalCount={totalPages}
        onJump={jumpToGroup}
        onShowAll={goToFirst}
      />

      {/* Chronological prev/next */}
      <ChronoNav prev={prevGallery} next={nextGallery} />

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

interface ChronoNavProps {
  prev: { galleryId: number; galleryName: string; date: string } | null;
  next: { galleryId: number; galleryName: string; date: string } | null;
}

function ChronoNav({ prev, next }: ChronoNavProps) {
  const navigate = useNavigate();
  if (!prev && !next) return null;

  return (
    <div className="flex items-center justify-between border-t border-[var(--border)] bg-[var(--bg-secondary)] px-4 py-1.5">
      {prev ? (
        <button
          onClick={() => navigate(`/gallery/${prev.galleryId}`)}
          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title={prev.galleryName}
        >
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" />
          </svg>
          <span>{prev.date}</span>
        </button>
      ) : <div />}

      <span className="text-xs text-[var(--text-muted)]">{t('reader.chronoNav')}</span>

      {next ? (
        <button
          onClick={() => navigate(`/gallery/${next.galleryId}`)}
          className="flex items-center gap-1 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)]"
          title={next.galleryName}
        >
          <span>{next.date}</span>
          <svg className="h-3 w-3" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
          </svg>
        </button>
      ) : <div />}
    </div>
  );
}
