import { invoke } from '@/shared/api/invoke';
import type { Gallery } from '@/shared/types';

export async function updateReadingProgress(
  galleryId: number,
  currentPage: number,
  totalPages: number,
): Promise<void> {
  return invoke<void>('update_reading_progress', { galleryId, currentPage, totalPages });
}

export async function getRecentGalleries(limit: number): Promise<Gallery[]> {
  return invoke<Gallery[]>('get_recent_galleries', { limit });
}
