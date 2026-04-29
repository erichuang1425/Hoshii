import { invoke } from '@/shared/api/invoke';
import type { Gallery } from '@/shared/types';

export async function toggleFavorite(galleryId: number): Promise<boolean> {
  return invoke<boolean>('toggle_favorite', { galleryId });
}

export async function getFavoriteGalleries(): Promise<Gallery[]> {
  return invoke<Gallery[]>('get_favorite_galleries');
}
