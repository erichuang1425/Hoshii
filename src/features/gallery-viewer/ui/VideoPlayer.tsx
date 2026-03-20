import { useRef, useEffect, useCallback, useState } from 'react';
import clsx from 'clsx';
import type { MediaEntry } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { needsRemux } from '@/shared/lib/mediaUtils';
import { logger } from '@/shared/lib/logger';
import { Spinner } from '@/shared/ui';
import { t } from '@/shared/i18n';
import { useVideoPlayerStore } from '../model/useVideoPlayerStore';
import { VideoControls } from './VideoControls';
import * as api from '../api/galleryApi';

interface VideoPlayerProps {
  media: MediaEntry;
}

export function VideoPlayer({ media }: VideoPlayerProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const hideTimerRef = useRef<ReturnType<typeof setTimeout>>(null);

  const [controlsVisible, setControlsVisible] = useState(true);
  const [videoSrc, setVideoSrc] = useState<string | null>(null);
  const [remuxing, setRemuxing] = useState(false);
  const [ffmpegMissing, setFfmpegMissing] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);

  const store = useVideoPlayerStore();

  // Determine video source
  useEffect(() => {
    let cancelled = false;

    async function resolveSource() {
      if (!needsRemux(media.filename)) {
        setVideoSrc(toAssetUrl(media.path));
        return;
      }

      // Needs remux — check ffmpeg first
      try {
        const ffmpeg = await api.checkFfmpeg();
        if (cancelled) return;

        if (!ffmpeg.available) {
          setFfmpegMissing(true);
          return;
        }

        setRemuxing(true);
        const remuxedPath = await api.remuxVideo(media.path);
        if (cancelled) return;
        setVideoSrc(toAssetUrl(remuxedPath));
      } catch (err) {
        if (!cancelled) {
          logger.error('Video remux failed', { path: media.path, error: String(err) });
          setLoadError(String(err));
        }
      } finally {
        if (!cancelled) setRemuxing(false);
      }
    }

    store.reset();
    setVideoSrc(null);
    setRemuxing(false);
    setFfmpegMissing(false);
    setLoadError(null);
    resolveSource();

    return () => { cancelled = true; };
  }, [media.path, media.filename, store]);

  // Sync store → video element
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (store.playing) {
      video.play().catch(() => store.setPlaying(false));
    } else {
      video.pause();
    }
  }, [store.playing, store]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.volume = store.muted ? 0 : store.volume;
  }, [store.volume, store.muted]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.playbackRate = store.playbackRate;
  }, [store.playbackRate]);

  useEffect(() => {
    const video = videoRef.current;
    if (video) video.loop = store.looping;
  }, [store.looping]);

  // Auto-hide controls
  const resetHideTimer = useCallback(() => {
    setControlsVisible(true);
    if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    hideTimerRef.current = setTimeout(() => {
      if (store.playing) setControlsVisible(false);
    }, 2000);
  }, [store.playing]);

  useEffect(() => {
    resetHideTimer();
    return () => {
      if (hideTimerRef.current) clearTimeout(hideTimerRef.current);
    };
  }, [resetHideTimer]);

  function handleTimeUpdate() {
    const video = videoRef.current;
    if (video) store.setCurrentTime(video.currentTime);
  }

  function handleLoadedMetadata() {
    const video = videoRef.current;
    if (video) store.setDuration(video.duration);
  }

  function handleSeek(time: number) {
    const video = videoRef.current;
    if (video) {
      video.currentTime = time;
      store.setCurrentTime(time);
    }
  }

  function handleTogglePip() {
    const video = videoRef.current;
    if (!video) return;
    if (document.pictureInPictureElement) {
      document.exitPictureInPicture().catch(() => {});
    } else {
      video.requestPictureInPicture().catch(() => {});
    }
  }

  function handleToggleFullscreen() {
    const el = containerRef.current;
    if (!el) return;
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
      store.setFullscreen(false);
    } else {
      el.requestFullscreen().catch(() => {});
      store.setFullscreen(true);
    }
  }

  // Loading / error states
  if (ffmpegMissing) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--reader-bg)]">
        <svg className="h-12 w-12 text-[var(--warning)]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <p className="text-sm text-[var(--text-primary)]">{t('videoPlayer.ffmpegRequired')}</p>
        <p className="text-xs text-[var(--text-muted)]">{t('videoPlayer.installFfmpeg')}</p>
      </div>
    );
  }

  if (remuxing) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-3 bg-[var(--reader-bg)]">
        <Spinner size="lg" />
        <p className="text-sm text-[var(--text-secondary)]">{t('videoPlayer.remuxing')}</p>
      </div>
    );
  }

  if (loadError) {
    return (
      <div className="flex h-full w-full flex-col items-center justify-center gap-2 bg-[var(--reader-bg)]">
        <p className="text-sm text-[var(--error)]">{loadError}</p>
      </div>
    );
  }

  if (!videoSrc) {
    return (
      <div className="flex h-full w-full items-center justify-center bg-[var(--reader-bg)]">
        <Spinner size="lg" />
      </div>
    );
  }

  return (
    <div
      ref={containerRef}
      className="relative flex h-full w-full items-center justify-center bg-[var(--reader-bg)]"
      onMouseMove={resetHideTimer}
    >
      <video
        ref={videoRef}
        src={videoSrc}
        className="max-h-full max-w-full"
        onClick={() => store.togglePlay()}
        onTimeUpdate={handleTimeUpdate}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={() => store.setPlaying(false)}
        playsInline
      />

      <VideoControls
        playing={store.playing}
        currentTime={store.currentTime}
        duration={store.duration}
        volume={store.volume}
        muted={store.muted}
        playbackRate={store.playbackRate}
        looping={store.looping}
        visible={controlsVisible}
        onTogglePlay={() => store.togglePlay()}
        onSeek={handleSeek}
        onVolumeChange={(v) => store.setVolume(v)}
        onToggleMute={() => store.toggleMute()}
        onPlaybackRateChange={(r) => store.setPlaybackRate(r)}
        onToggleLoop={() => store.toggleLoop()}
        onTogglePip={handleTogglePip}
        onToggleFullscreen={handleToggleFullscreen}
      />
    </div>
  );
}
