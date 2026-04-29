import { invoke } from '@/shared/api/invoke';
import type { Artist, Gallery, GallerySortOrder } from '@/shared/types';

export async function getArtists(rootId: number): Promise<Artist[]> {
  return invoke<Artist[]>('get_artists', { rootId });
}

export async function getGalleries(artistId: number, sort?: GallerySortOrder): Promise<Gallery[]> {
  return invoke<Gallery[]>('get_galleries', { artistId, sort });
}
