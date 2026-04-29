import { invoke } from '@/shared/api/invoke';
import type { AppSettings } from '@/shared/types/media';

export async function getSettings(): Promise<AppSettings> {
  return invoke<AppSettings>('get_settings');
}

export async function updateSettings(settings: Partial<AppSettings>): Promise<AppSettings> {
  return invoke<AppSettings>('update_settings', { settings });
}
