import { invoke as tauriInvoke } from '@tauri-apps/api/core';
import { logger } from '@/shared/lib/logger';

export async function invoke<T>(command: string, args?: Record<string, unknown>): Promise<T> {
  try {
    const result = await tauriInvoke<T>(command, args);
    return result;
  } catch (error) {
    const message = String(error);
    logger.error(`Tauri command failed: ${command}`, { args, error: message });
    throw new Error(message);
  }
}
