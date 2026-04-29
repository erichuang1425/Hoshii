import { invoke } from '@/shared/api/invoke';
import type { Tag, Gallery } from '@/shared/types';

export async function getGalleryTags(galleryId: number): Promise<Tag[]> {
  return invoke<Tag[]>('get_gallery_tags', { galleryId });
}

export async function addTag(galleryId: number, tag: string): Promise<Tag> {
  return invoke<Tag>('add_tag', { galleryId, tag });
}

export async function removeTag(galleryId: number, tagId: number): Promise<void> {
  return invoke<void>('remove_tag', { galleryId, tagId });
}

export async function searchByTags(tags: string[]): Promise<Gallery[]> {
  return invoke<Gallery[]>('search_by_tags', { tags });
}
