import { invoke } from '@/shared/api/invoke';
import type { MediaEntry, MediaGroup, FfmpegStatus } from '@/shared/types';

export async function getGalleryMedia(galleryId: number): Promise<MediaEntry[]> {
  return invoke<MediaEntry[]>('get_gallery_media', { galleryId });
}

export async function getMediaGroups(galleryId: number): Promise<MediaGroup[]> {
  return invoke<MediaGroup[]>('get_media_groups', { galleryId });
}

export async function generateThumbnail(path: string, width: number): Promise<string> {
  return invoke<string>('generate_thumbnail', { path, width });
}

export async function checkFfmpeg(): Promise<FfmpegStatus> {
  return invoke<FfmpegStatus>('check_ffmpeg');
}

export async function remuxVideo(path: string): Promise<string> {
  return invoke<string>('remux_video', { path });
}
