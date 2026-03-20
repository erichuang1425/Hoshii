import { useRef, useCallback } from 'react';
import clsx from 'clsx';

interface VolumeSliderProps {
  volume: number;
  muted: boolean;
  onVolumeChange: (volume: number) => void;
  onToggleMute: () => void;
}

export function VolumeSlider({ volume, muted, onVolumeChange, onToggleMute }: VolumeSliderProps) {
  const barRef = useRef<HTMLDivElement>(null);

  const effectiveVolume = muted ? 0 : volume;

  const getVolumeFromEvent = useCallback((e: React.MouseEvent | MouseEvent) => {
    const bar = barRef.current;
    if (!bar) return 0;
    const rect = bar.getBoundingClientRect();
    return Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
  }, []);

  function handleMouseDown(e: React.MouseEvent) {
    onVolumeChange(getVolumeFromEvent(e));

    function handleMouseMove(ev: MouseEvent) {
      onVolumeChange(getVolumeFromEvent(ev));
    }
    function handleMouseUp() {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  return (
    <div className="flex items-center gap-1.5">
      <button
        onClick={onToggleMute}
        className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        aria-label={muted ? 'Unmute' : 'Mute'}
      >
        {effectiveVolume === 0 ? (
          <VolumeOffIcon />
        ) : effectiveVolume < 0.5 ? (
          <VolumeLowIcon />
        ) : (
          <VolumeHighIcon />
        )}
      </button>
      <div
        ref={barRef}
        className="relative h-1 w-16 cursor-pointer rounded-full bg-[var(--bg-hover)]"
        onMouseDown={handleMouseDown}
      >
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--text-secondary)]"
          style={{ width: `${effectiveVolume * 100}%` }}
        />
      </div>
    </div>
  );
}

function VolumeHighIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.114 5.636a9 9 0 010 12.728M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  );
}

function VolumeLowIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M16.463 8.288a5.25 5.25 0 010 7.424M6.75 8.25l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  );
}

function VolumeOffIcon() {
  return (
    <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M17.25 9.75L19.5 12m0 0l2.25 2.25M19.5 12l2.25-2.25M19.5 12l-2.25 2.25m-10.5-6l4.72-4.72a.75.75 0 011.28.53v15.88a.75.75 0 01-1.28.53l-4.72-4.72H4.51c-.88 0-1.704-.507-1.938-1.354A9.01 9.01 0 012.25 12c0-.83.112-1.633.322-2.396C2.806 8.756 3.63 8.25 4.51 8.25H6.75z" />
    </svg>
  );
}
