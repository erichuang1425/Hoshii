import { useState, useCallback } from 'react';
import type { MediaEntry } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { Spinner } from '@/shared/ui';

interface AnimatedImageViewProps {
  media: MediaEntry;
}

export function AnimatedImageView({ media }: AnimatedImageViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <span className="text-sm">{media.filename}</span>
        </div>
      ) : (
        <img
          src={toAssetUrl(media.path)}
          alt={media.filename}
          onLoad={handleLoad}
          onError={handleError}
          className="max-h-full max-w-full object-contain"
          style={{ opacity: loaded ? 1 : 0 }}
          draggable={false}
        />
      )}
    </div>
  );
}
