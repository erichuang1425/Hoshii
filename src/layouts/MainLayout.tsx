import { useCallback, useEffect } from 'react';
import { ClassicShell } from './shells/ClassicShell';
import { CompactShell } from './shells/CompactShell';
import { TopShell } from './shells/TopShell';
import { FocusShell } from './shells/FocusShell';
import { useLayoutStore } from './useLayoutStore';
import { useGalleryUpdateListener } from '@/shared/hooks';
import { useBrowseRootsStore } from '@/features/browse-roots/model/useBrowseRootsStore';
import { logger } from '@/shared/lib/logger';

/**
 * Top-level layout dispatcher. Reads the persisted `layoutMode` and renders
 * the matching shell. Also wires the shared cross-layout side-effects
 * (initial root fetch + live gallery-update listener).
 */
export function MainLayout() {
  const layoutMode = useLayoutStore((s) => s.layoutMode);
  const fetchRoots = useBrowseRootsStore((s) => s.fetchRoots);

  // Mirror the active layout onto <html> so CSS can target `[data-layout="..."]`
  // if a future tweak needs per-mode styling.
  useEffect(() => {
    document.documentElement.setAttribute('data-layout', layoutMode);
  }, [layoutMode]);

  const handleGalleryUpdate = useCallback(
    (payload: { rootPath: string; changedPaths: string[] }) => {
      logger.info('Gallery update detected, refreshing roots', {
        rootPath: payload.rootPath,
        changedCount: payload.changedPaths.length,
      });
      fetchRoots();
    },
    [fetchRoots],
  );

  useGalleryUpdateListener(handleGalleryUpdate);

  switch (layoutMode) {
    case 'compact':
      return <CompactShell />;
    case 'top':
      return <TopShell />;
    case 'focus':
      return <FocusShell />;
    case 'classic':
    default:
      return <ClassicShell />;
  }
}
