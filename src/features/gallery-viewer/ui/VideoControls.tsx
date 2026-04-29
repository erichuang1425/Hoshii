import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { SeekBar } from './SeekBar';
import { VolumeSlider } from './VolumeSlider';

interface VideoControlsProps {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  looping: boolean;
  visible: boolean;
  onTogglePlay: () => void;
  onSeek: (time: number) => void;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
  onPlaybackRateChange: (rate: number) => void;
  onToggleLoop: () => void;
  onTogglePip: () => void;
  onToggleFullscreen: () => void;
}

const PLAYBACK_RATES = [0.5, 1, 1.5, 2];

export function VideoControls({
  playing,
  currentTime,
  duration,
  volume,
  muted,
  playbackRate,
  looping,
  visible,
  onTogglePlay,
  onSeek,
  onVolumeChange,
  onToggleMute,
  onPlaybackRateChange,
  onToggleLoop,
  onTogglePip,
  onToggleFullscreen,
}: VideoControlsProps) {
  return (
    <div
      className={clsx(
        'absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent px-3 pb-3 pt-8',
        'transition-opacity duration-[var(--duration-normal)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {/* Seek bar */}
      <SeekBar currentTime={currentTime} duration={duration} onSeek={onSeek} />

      {/* Control buttons */}
      <div className="mt-1.5 flex items-center gap-3">
        {/* Play/Pause */}
        <button
          onClick={onTogglePlay}
          className="text-white hover:text-[var(--accent)] transition-colors"
          aria-label={playing ? 'Pause' : 'Play'}
        >
          {playing ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Volume */}
        <VolumeSlider
          volume={volume}
          muted={muted}
          onVolumeChange={onVolumeChange}
          onToggleMute={onToggleMute}
        />

        <div className="flex-1" />

        {/* Speed */}
        <select
          value={playbackRate}
          onChange={(e) => onPlaybackRateChange(Number(e.target.value))}
          className="rounded bg-transparent px-1 text-xs text-[var(--text-secondary)] hover:text-white focus:outline-none cursor-pointer"
        >
          {PLAYBACK_RATES.map((rate) => (
            <option key={rate} value={rate} className="bg-[var(--bg-elevated)]">
              {rate}x
            </option>
          ))}
        </select>

        {/* Loop */}
        <button
          onClick={onToggleLoop}
          className={clsx(
            'transition-colors',
            looping ? 'text-[var(--accent)]' : 'text-[var(--text-secondary)] hover:text-white',
          )}
          aria-label={t('videoPlayer.loop')}
        >
          <LoopIcon />
        </button>

        {/* PiP */}
        <button
          onClick={onTogglePip}
          className="text-[var(--text-secondary)] hover:text-white transition-colors"
          aria-label={t('videoPlayer.pip')}
        >
          <PipIcon />
        </button>

        {/* Fullscreen */}
        <button
          onClick={onToggleFullscreen}
          className="text-[var(--text-secondary)] hover:text-white transition-colors"
          aria-label={t('videoPlayer.fullscreen')}
        >
          <FullscreenIcon />
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M8 5v14l11-7z" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg className="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
      <path d="M6 4h4v16H6zM14 4h4v16h-4z" />
    </svg>
  );
}

function LoopIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
    </svg>
  );
}

function PipIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <rect x="2" y="3" width="20" height="14" rx="2" />
      <rect x="12" y="9" width="8" height="6" rx="1" fill="currentColor" opacity="0.3" />
    </svg>
  );
}

function FullscreenIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 3.75v4.5m0-4.5h4.5m-4.5 0L9 9M3.75 20.25v-4.5m0 4.5h4.5m-4.5 0L9 15M20.25 3.75h-4.5m4.5 0v4.5m0-4.5L15 9m5.25 11.25h-4.5m4.5 0v-4.5m0 4.5L15 15" />
    </svg>
  );
}
