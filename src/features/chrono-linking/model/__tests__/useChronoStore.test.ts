import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useChronoStore } from '../useChronoStore';
import type { ChronologicalGroup, TimelineEntry } from '@/shared/types';

vi.mock('../../api/chronoApi', () => ({
  getChronologicalGroups: vi.fn(),
  getGalleryTimeline: vi.fn(),
}));

import * as api from '../../api/chronoApi';

const makeGroup = (date: string, id: number): ChronologicalGroup => ({
  date,
  galleryId: id,
  galleryName: `Gallery ${id}`,
});

const makeTimelineEntry = (index: number, date: string | null): TimelineEntry => ({
  index,
  filename: `img_${index}.jpg`,
  date,
});

describe('useChronoStore', () => {
  beforeEach(() => {
    useChronoStore.setState({
      groups: [],
      timeline: [],
      artistId: null,
      galleryId: null,
      loading: false,
      timelineLoading: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('fetchGroups loads chronological groups', async () => {
    const mockGroups = [
      makeGroup('2023-12', 1),
      makeGroup('2024-01', 2),
      makeGroup('2024-03', 3),
    ];
    vi.mocked(api.getChronologicalGroups).mockResolvedValue(mockGroups);

    await useChronoStore.getState().fetchGroups(10);

    const state = useChronoStore.getState();
    expect(state.groups).toHaveLength(3);
    expect(state.artistId).toBe(10);
    expect(state.loading).toBe(false);
  });

  it('fetchGroups sets error on failure', async () => {
    vi.mocked(api.getChronologicalGroups).mockRejectedValue(new Error('Network error'));

    await useChronoStore.getState().fetchGroups(10);

    const state = useChronoStore.getState();
    expect(state.error).toBeTruthy();
    expect(state.groups).toHaveLength(0);
  });

  it('fetchTimeline loads timeline entries', async () => {
    const mockTimeline = [
      makeTimelineEntry(0, '2024-01-15'),
      makeTimelineEntry(1, '2024-01-16'),
      makeTimelineEntry(2, null),
    ];
    vi.mocked(api.getGalleryTimeline).mockResolvedValue(mockTimeline);

    await useChronoStore.getState().fetchTimeline(5);

    const state = useChronoStore.getState();
    expect(state.timeline).toHaveLength(3);
    expect(state.galleryId).toBe(5);
  });

  it('getPrevGallery returns previous chronological gallery', async () => {
    const mockGroups = [
      makeGroup('2023-12', 1),
      makeGroup('2024-01', 2),
      makeGroup('2024-03', 3),
    ];
    vi.mocked(api.getChronologicalGroups).mockResolvedValue(mockGroups);
    await useChronoStore.getState().fetchGroups(10);

    const prev = useChronoStore.getState().getPrevGallery(2);
    expect(prev?.galleryId).toBe(1);
    expect(prev?.date).toBe('2023-12');
  });

  it('getPrevGallery returns null for first gallery', async () => {
    const mockGroups = [makeGroup('2023-12', 1), makeGroup('2024-01', 2)];
    vi.mocked(api.getChronologicalGroups).mockResolvedValue(mockGroups);
    await useChronoStore.getState().fetchGroups(10);

    const prev = useChronoStore.getState().getPrevGallery(1);
    expect(prev).toBeNull();
  });

  it('getNextGallery returns next chronological gallery', async () => {
    const mockGroups = [
      makeGroup('2023-12', 1),
      makeGroup('2024-01', 2),
      makeGroup('2024-03', 3),
    ];
    vi.mocked(api.getChronologicalGroups).mockResolvedValue(mockGroups);
    await useChronoStore.getState().fetchGroups(10);

    const next = useChronoStore.getState().getNextGallery(2);
    expect(next?.galleryId).toBe(3);
  });

  it('getNextGallery returns null for last gallery', async () => {
    const mockGroups = [makeGroup('2023-12', 1), makeGroup('2024-01', 2)];
    vi.mocked(api.getChronologicalGroups).mockResolvedValue(mockGroups);
    await useChronoStore.getState().fetchGroups(10);

    const next = useChronoStore.getState().getNextGallery(2);
    expect(next).toBeNull();
  });

  it('clear resets all state', () => {
    useChronoStore.setState({
      groups: [makeGroup('2024-01', 1)],
      timeline: [makeTimelineEntry(0, '2024-01-01')],
      artistId: 5,
      error: 'some error',
    });

    useChronoStore.getState().clear();

    const state = useChronoStore.getState();
    expect(state.groups).toHaveLength(0);
    expect(state.timeline).toHaveLength(0);
    expect(state.artistId).toBeNull();
    expect(state.error).toBeNull();
  });
});
