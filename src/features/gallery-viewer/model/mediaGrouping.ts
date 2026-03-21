import type { MediaEntry, MediaGroup } from '@/shared/types';

export function extractGroups(media: MediaEntry[]): MediaGroup[] {
  if (media.length === 0) return [];

  const groupMap = new Map<string, { startIndex: number; count: number }>();

  for (let i = 0; i < media.length; i++) {
    const name = media[i].groupName;
    const existing = groupMap.get(name);
    if (existing) {
      existing.count++;
    } else {
      groupMap.set(name, { startIndex: i, count: 1 });
    }
  }

  const groups: MediaGroup[] = [];
  for (const [name, { startIndex, count }] of groupMap) {
    groups.push({ name, startIndex, count });
  }

  return groups;
}

export function getGroupForIndex(groups: MediaGroup[], index: number): string | null {
  for (const group of groups) {
    if (index >= group.startIndex && index < group.startIndex + group.count) {
      return group.name;
    }
  }
  return null;
}
