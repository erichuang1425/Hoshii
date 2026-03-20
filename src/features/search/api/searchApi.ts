import { invoke } from '@/shared/api/invoke';
import type { Gallery } from '@/shared/types';

export async function searchGalleries(query: string, rootId?: number): Promise<Gallery[]> {
  return invoke<Gallery[]>('search_galleries', { query, rootId });
}
