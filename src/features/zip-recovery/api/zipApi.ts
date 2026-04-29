import { invoke } from '@/shared/api/invoke';
import type { ZipStatus } from '@/shared/types';

export interface ZipStatusEntry {
  gallery: string;
  status: ZipStatus;
}

export async function verifyZipIntegrity(artistPath: string): Promise<ZipStatusEntry[]> {
  return invoke<ZipStatusEntry[]>('verify_zip_integrity', { artistPath });
}

export async function restoreFromZip(zipPath: string, targetDir: string): Promise<void> {
  return invoke<void>('restore_from_zip', { zipPath, targetDir });
}
