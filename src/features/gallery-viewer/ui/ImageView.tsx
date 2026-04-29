import { useState, useCallback } from 'react';
import clsx from 'clsx';
import type { MediaEntry } from '@/shared/types';
import { toAssetUrl } from '@/shared/lib/assetUrl';
import { Spinner } from '@/shared/ui';

interface ImageViewProps {
  media: MediaEntry;
  fitMode?: 'contain' | 'cover' | 'width';
  zoomLevel?: number;
}

export function ImageView({ media, fitMode = 'contain', zoomLevel = 1 }: ImageViewProps) {
  const [loaded, setLoaded] = useState(false);
  const [error, setError] = useState(false);

  const handleLoad = useCallback(() => setLoaded(true), []);
  const handleError = useCallback(() => {
    setError(true);
    setLoaded(true);
  }, []);

  const objectFit = fitMode === 'width' ? 'contain' : fitMode;

  return (
    <div className="relative flex h-full w-full items-center justify-center">
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <Spinner size="lg" />
        </div>
      )}
      {error ? (
        <div className="flex flex-col items-center gap-2 text-[var(--text-muted)]">
          <svg className="h-12 w-12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m9-.75a9 9 0 11-18 0 9 9 0 0118 0zm-9 3.75h.008v.008H12v-.008z" />
          </svg>
          <span className="text-sm">{media.filename}</span>
        </div>
      ) : (
        <img
          src={toAssetUrl(media.path)}
          alt={media.filename}
          onLoad={handleLoad}
          onError={handleError}
          className={clsx(
            'max-h-full transition-opacity duration-[var(--duration-fast)]',
            loaded ? 'opacity-100' : 'opacity-0',
            fitMode === 'width' && 'w-full',
          )}
          style={{
            objectFit,
            transform: zoomLevel !== 1 ? `scale(${zoomLevel})` : undefined,
          }}
          draggable={false}
        />
      )}
    </div>
  );
}
