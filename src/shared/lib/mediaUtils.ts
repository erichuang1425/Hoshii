import type { MediaType, MediaEntry } from '@/shared/types';

export function isVideoType(type: MediaType): boolean {
  return type === 'video';
}

export function isAnimatedType(type: MediaType): boolean {
  return type === 'animated_image' || type === 'avif_animated';
}

export function isStaticImageType(type: MediaType): boolean {
  return type === 'image' || type === 'avif_static';
}

export function needsRemux(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['mkv', 'avi', 'mov', 'wmv', 'flv'].includes(ext);
}

export function getMediaBadgeLabel(type: MediaType): string | null {
  switch (type) {
    case 'animated_image': return 'GIF';
    case 'avif_animated': return 'AVIF';
    case 'video': return 'VIDEO';
    default: return null;
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

export function getGalleryMediaTypes(media: MediaEntry[]): MediaType[] {
  return [...new Set(media.map((m) => m.mediaType))];
}
