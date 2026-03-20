import { useRef, useState, useCallback } from 'react';
import clsx from 'clsx';
import { formatDuration } from '@/shared/lib/mediaUtils';

interface SeekBarProps {
  currentTime: number;
  duration: number;
  onSeek: (time: number) => void;
}

export function SeekBar({ currentTime, duration, onSeek }: SeekBarProps) {
  const barRef = useRef<HTMLDivElement>(null);
  const [hovering, setHovering] = useState(false);
  const [hoverPosition, setHoverPosition] = useState(0);
  const [dragging, setDragging] = useState(false);

  const progress = duration > 0 ? currentTime / duration : 0;

  const getTimeFromEvent = useCallback(
    (e: React.MouseEvent | MouseEvent) => {
      const bar = barRef.current;
      if (!bar || duration === 0) return 0;
      const rect = bar.getBoundingClientRect();
      const x = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width));
      return x * duration;
    },
    [duration],
  );

  function handleMouseDown(e: React.MouseEvent) {
    setDragging(true);
    onSeek(getTimeFromEvent(e));

    function handleMouseMove(ev: MouseEvent) {
      onSeek(getTimeFromEvent(ev));
    }

    function handleMouseUp() {
      setDragging(false);
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    }

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);
  }

  function handleMouseMove(e: React.MouseEvent) {
    if (!barRef.current) return;
    const rect = barRef.current.getBoundingClientRect();
    setHoverPosition((e.clientX - rect.left) / rect.width);
  }

  const hoverTimeMs = hoverPosition * duration * 1000;

  return (
    <div className="flex items-center gap-2">
      <span className="min-w-[40px] text-right text-xs text-[var(--text-muted)]">
        {formatDuration(currentTime * 1000)}
      </span>

      <div
        ref={barRef}
        className={clsx('relative h-1 flex-1 cursor-pointer rounded-full bg-[var(--bg-hover)]', (hovering || dragging) && 'h-1.5')}
        onMouseDown={handleMouseDown}
        onMouseEnter={() => setHovering(true)}
        onMouseLeave={() => setHovering(false)}
        onMouseMove={handleMouseMove}
      >
        {/* Progress fill */}
        <div
          className="absolute left-0 top-0 h-full rounded-full bg-[var(--accent)]"
          style={{ width: `${progress * 100}%` }}
        />

        {/* Thumb */}
        <div
          className={clsx(
            'absolute top-1/2 h-3 w-3 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[var(--accent)]',
            'transition-transform duration-[var(--duration-fast)]',
            (hovering || dragging) ? 'scale-100' : 'scale-0',
          )}
          style={{ left: `${progress * 100}%` }}
        />

        {/* Hover tooltip */}
        {hovering && !dragging && (
          <div
            className="absolute -top-7 -translate-x-1/2 rounded bg-[var(--bg-elevated)] px-1.5 py-0.5 text-[10px] text-[var(--text-primary)]"
            style={{ left: `${hoverPosition * 100}%` }}
          >
            {formatDuration(hoverTimeMs)}
          </div>
        )}
      </div>

      <span className="min-w-[40px] text-xs text-[var(--text-muted)]">
        {formatDuration(duration * 1000)}
      </span>
    </div>
  );
}
