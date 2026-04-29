import { invoke } from '@/shared/api/invoke';
import type { Gallery } from '@/shared/types';
import type { UnorganizedFile } from '@/shared/types/media';

export async function getUnorganizedFiles(artistId: number): Promise<UnorganizedFile[]> {
  return invoke<UnorganizedFile[]>('get_unorganized_files', { artistId });
}

export async function moveFilesToGallery(files: string[], galleryPath: string): Promise<void> {
  return invoke<void>('move_files_to_gallery', { files, galleryPath });
}

export async function createGalleryFolder(artistPath: string, name: string): Promise<Gallery> {
  return invoke<Gallery>('create_gallery_folder', { artistPath, name });
}
