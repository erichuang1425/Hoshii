import { useEffect, useState } from 'react';
import { listen } from '@tauri-apps/api/event';
import { invoke } from '@/shared/api/invoke';
import { logger } from '@/shared/lib/logger';
import type { Volume } from '@/shared/types';

interface VolumeStatusPayload {
  volumeId: number;
  isOnline: boolean;
}

/**
 * Returns whether the volume with the given ID is currently online.
 * Listens for `volume_status_changed` Tauri events with a polling fallback.
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

    // Initial check
    check();

    // Listen for volume status events from Rust
    let unlisten: (() => void) | undefined;
    listen<VolumeStatusPayload>('volume_status_changed', (event) => {
      if (event.payload.volumeId === volumeId) {
        setOnline(event.payload.isOnline);
      }
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        logger.warn('Failed to listen for volume events, falling back to polling', {
          error: String(err),
        });
      });

    // Fallback polling at a slower rate (30s) in case events are missed
    const interval = setInterval(check, 30000);

    return () => {
      cancelled = true;
      clearInterval(interval);
      unlisten?.();
    };
  }, [volumeId]);

  return online;
}
