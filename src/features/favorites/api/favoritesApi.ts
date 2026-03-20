import { invoke } from '@/shared/api/invoke';
import type { Gallery } from '@/shared/types';

export async function toggleFavorite(galleryId: number): Promise<boolean> {
  return invoke<boolean>('toggle_favorite', { galleryId });
}

export async function getFavoriteGalleries(): Promise<Gallery[]> {
  // search_galleries with empty query returns all galleries; filter client-side
  const all = await invoke<Gallery[]>('search_galleries', { query: '' });
  return all.filter((g) => g.favorited);
}
