import { invoke } from '@/shared/api/invoke';
import type { SmartGroup } from '@/shared/types';

export async function getSmartGroups(artistId: number, threshold?: number): Promise<SmartGroup[]> {
  return invoke<SmartGroup[]>('get_smart_groups', { artistId, threshold });
}

export async function getSmartGroupsForRoot(rootId: number, threshold?: number): Promise<SmartGroup[]> {
  return invoke<SmartGroup[]>('get_smart_groups_for_root', { rootId, threshold });
}
