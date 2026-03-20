import { invoke } from '@/shared/api/invoke';
import type { ChronologicalGroup, TimelineEntry } from '@/shared/types';

export async function getChronologicalGroups(artistId: number): Promise<ChronologicalGroup[]> {
  return invoke<ChronologicalGroup[]>('get_chronological_groups', { artistId });
}

export async function getGalleryTimeline(galleryId: number): Promise<TimelineEntry[]> {
  return invoke<TimelineEntry[]>('get_gallery_timeline', { galleryId });
}
