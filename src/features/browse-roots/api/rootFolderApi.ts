import { invoke } from '@/shared/api/invoke';
import type { RootFolder, Volume } from '@/shared/types';
import type { ScanResult } from '@/shared/types/media';

export async function getRootFolders(): Promise<RootFolder[]> {
  return invoke<RootFolder[]>('get_root_folders');
}

export async function addRootFolder(path: string, label?: string): Promise<RootFolder> {
  return invoke<RootFolder>('add_root_folder', { path, label });
}

export async function removeRootFolder(id: number): Promise<void> {
  return invoke<void>('remove_root_folder', { id });
}

export async function scanRootFolder(id: number, full?: boolean): Promise<ScanResult> {
  return invoke<ScanResult>('scan_root_folder', { id, full });
}

export async function getVolumes(): Promise<Volume[]> {
  return invoke<Volume[]>('get_volumes');
}
