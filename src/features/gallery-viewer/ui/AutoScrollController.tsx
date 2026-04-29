import { useEffect, useRef } from 'react';

interface AutoScrollControllerProps {
  enabled: boolean;
  speed: number; // 1-200, pixels per second
  scrollTargetRef: React.RefObject<HTMLElement | null>;
  onReachEnd: () => void;
}

/**
 * AutoScrollController — renders nothing, drives automatic scrolling via rAF.
 * For single-page mode, advances pages automatically instead of scrolling.
 */
export function AutoScrollController({
  enabled,
  speed,
  scrollTargetRef,
  onReachEnd,
}: AutoScrollControllerProps) {
  const rafRef = useRef<number | null>(null);
  const lastTimeRef = useRef<number | null>(null);

  useEffect(() => {
    if (!enabled) {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
      return;
    }

    const tick = (timestamp: number) => {
      if (!scrollTargetRef.current) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      if (lastTimeRef.current === null) {
        lastTimeRef.current = timestamp;
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const delta = timestamp - lastTimeRef.current;
      lastTimeRef.current = timestamp;

      const el = scrollTargetRef.current;
      const pixelsToScroll = (speed / 1000) * delta;

      const atBottom = el.scrollTop + el.clientHeight >= el.scrollHeight - 2;
      if (atBottom) {
        onReachEnd();
      } else {
        el.scrollTop += pixelsToScroll;
      }

      rafRef.current = requestAnimationFrame(tick);
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
        lastTimeRef.current = null;
      }
    };
  }, [enabled, speed, scrollTargetRef, onReachEnd]);

  return null;
}
