import { describe, it, expect, beforeEach } from 'vitest';
import { useVideoPlayerStore } from '../useVideoPlayerStore';

describe('useVideoPlayerStore', () => {
  beforeEach(() => {
    useVideoPlayerStore.getState().reset();
  });

  it('starts with default state', () => {
    const state = useVideoPlayerStore.getState();
    expect(state.playing).toBe(false);
    expect(state.volume).toBe(0.8);
    expect(state.playbackRate).toBe(1);
    expect(state.looping).toBe(false);
  });

  it('toggles play/pause', () => {
    const store = useVideoPlayerStore.getState();
    store.togglePlay();
    expect(useVideoPlayerStore.getState().playing).toBe(true);
    store.togglePlay();
    expect(useVideoPlayerStore.getState().playing).toBe(false);
  });

  it('sets volume clamped to 0-1', () => {
    const store = useVideoPlayerStore.getState();
    store.setVolume(0.5);
    expect(useVideoPlayerStore.getState().volume).toBe(0.5);
    store.setVolume(1.5);
    expect(useVideoPlayerStore.getState().volume).toBe(1);
    store.setVolume(-0.5);
    expect(useVideoPlayerStore.getState().volume).toBe(0);
  });

  it('toggles mute', () => {
    const store = useVideoPlayerStore.getState();
    store.toggleMute();
    expect(useVideoPlayerStore.getState().muted).toBe(true);
    store.toggleMute();
    expect(useVideoPlayerStore.getState().muted).toBe(false);
  });

  it('unmutes when setting volume', () => {
    const store = useVideoPlayerStore.getState();
    store.toggleMute();
    expect(useVideoPlayerStore.getState().muted).toBe(true);
    store.setVolume(0.7);
    expect(useVideoPlayerStore.getState().muted).toBe(false);
  });

  it('changes playback rate', () => {
    const store = useVideoPlayerStore.getState();
    store.setPlaybackRate(2);
    expect(useVideoPlayerStore.getState().playbackRate).toBe(2);
  });

  it('auto-enables loop for short videos (< 30s)', () => {
    const store = useVideoPlayerStore.getState();
    store.setDuration(15); // 15 seconds
    expect(useVideoPlayerStore.getState().looping).toBe(true);
  });

  it('does not auto-enable loop for long videos (>= 30s)', () => {
    const store = useVideoPlayerStore.getState();
    store.setDuration(60); // 60 seconds
    expect(useVideoPlayerStore.getState().looping).toBe(false);
  });

  it('toggles loop manually', () => {
    const store = useVideoPlayerStore.getState();
    store.toggleLoop();
    expect(useVideoPlayerStore.getState().looping).toBe(true);
    store.toggleLoop();
    expect(useVideoPlayerStore.getState().looping).toBe(false);
  });

  it('resets state', () => {
    const store = useVideoPlayerStore.getState();
    store.setPlaying(true);
    store.setCurrentTime(30);
    store.setDuration(60);
    store.setPlaybackRate(2);
    store.reset();

    const state = useVideoPlayerStore.getState();
    expect(state.playing).toBe(false);
    expect(state.currentTime).toBe(0);
    expect(state.duration).toBe(0);
    expect(state.playbackRate).toBe(1);
  });
});
