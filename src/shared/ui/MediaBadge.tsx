import type { MediaType } from '@/shared/types';
import { Badge } from './Badge';

interface MediaBadgeProps {
  mediaType: MediaType;
  className?: string;
}

function getBadgeInfo(type: MediaType): { label: string; variant: 'accent' | 'warning' | 'default' } | null {
  switch (type) {
    case 'video':
      return { label: 'VIDEO', variant: 'accent' };
    case 'animated_image':
      return { label: 'GIF', variant: 'warning' };
    case 'avif_animated':
      return { label: 'AVIF', variant: 'warning' };
    default:
      return null;
  }
}

export function MediaBadge({ mediaType, className }: MediaBadgeProps) {
  const info = getBadgeInfo(mediaType);
  if (!info) return null;

  return (
    <Badge variant={info.variant} className={className}>
      {info.label}
    </Badge>
  );
}
