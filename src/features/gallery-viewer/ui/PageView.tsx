import type { MediaEntry } from '@/shared/types';
import { isVideoType, isAnimatedType } from '@/shared/lib/mediaUtils';
import { ImageView } from './ImageView';
import { AnimatedImageView } from './AnimatedImageView';
import { VideoPlayer } from './VideoPlayer';

interface PageViewProps {
  media: MediaEntry;
  zoomLevel?: number;
}

export function PageView({ media, zoomLevel }: PageViewProps) {
  if (isVideoType(media.mediaType)) {
    return <VideoPlayer media={media} />;
  }

  if (isAnimatedType(media.mediaType)) {
    return <AnimatedImageView media={media} />;
  }

  return <ImageView media={media} zoomLevel={zoomLevel} />;
}
