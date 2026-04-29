import { useEffect, useState } from 'react';
import { invoke } from '@/shared/api/invoke';
import { logger } from '@/shared/lib/logger';
import type { Volume } from '@/shared/types';

/**
 * Returns whether the volume with the given ID is currently online.
 * Polls on mount; listens for volume status events.
 */
export function useDriveStatus(volumeId: number | null): boolean {
  const [online, setOnline] = useState(true);

  useEffect(() => {
    if (volumeId === null) {
      setOnline(true);
      return;
    }

    let cancelled = false;

    async function check() {
      try {
        const volumes = await invoke<Volume[]>('get_volumes');
        if (cancelled) return;
        const vol = volumes.find((v) => v.id === volumeId);
        setOnline(vol?.isOnline ?? false);
      } catch (err) {
        logger.warn('Failed to check drive status', { volumeId, error: String(err) });
        if (!cancelled) setOnline(false);
      }
    }

    check();

    // TODO(debt): [UX] Listen to Tauri event `volume_status_changed` instead of polling — Task 1.3
    const interval = setInterval(check, 5000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, [volumeId]);

  return online;
}
