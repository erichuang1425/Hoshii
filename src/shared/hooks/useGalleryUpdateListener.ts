import { useEffect } from 'react';
import { listen } from '@tauri-apps/api/event';
import { logger } from '@/shared/lib/logger';

interface GalleryUpdatePayload {
  rootPath: string;
  changedPaths: string[];
}

/**
 * Listens for `gallery_updated` Tauri events emitted by the file watcher.
 * Calls `onUpdate` when files change in watched root folders.
 */
export function useGalleryUpdateListener(onUpdate: (payload: GalleryUpdatePayload) => void) {
  useEffect(() => {
    let unlisten: (() => void) | undefined;

    listen<GalleryUpdatePayload>('gallery_updated', (event) => {
      logger.info('Gallery update event received', {
        rootPath: event.payload.rootPath,
        count: event.payload.changedPaths.length,
      });
      onUpdate(event.payload);
    })
      .then((fn) => {
        unlisten = fn;
      })
      .catch((err) => {
        logger.error('Failed to listen for gallery_updated events', { error: String(err) });
      });

    return () => {
      unlisten?.();
    };
  }, [onUpdate]);
}
