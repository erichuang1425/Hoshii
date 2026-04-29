import { create } from 'zustand';

interface VideoPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  looping: boolean;
  fullscreen: boolean;

  setPlaying: (playing: boolean) => void;
  togglePlay: () => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setVolume: (volume: number) => void;
  toggleMute: () => void;
  setPlaybackRate: (rate: number) => void;
  toggleLoop: () => void;
  setFullscreen: (fullscreen: boolean) => void;
  reset: () => void;
}

const AUTO_LOOP_THRESHOLD_MS = 30000;

export const useVideoPlayerStore = create<VideoPlayerState>((set, get) => ({
  playing: false,
  currentTime: 0,
  duration: 0,
  volume: 0.8,
  muted: false,
  playbackRate: 1,
  looping: false,
  fullscreen: false,

  setPlaying: (playing) => set({ playing }),
  togglePlay: () => set((s) => ({ playing: !s.playing })),

  setCurrentTime: (currentTime) => set({ currentTime }),

  setDuration: (duration) => {
    const looping = duration > 0 && duration * 1000 < AUTO_LOOP_THRESHOLD_MS;
    set({ duration, looping });
  },

  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)), muted: false }),
  toggleMute: () => set((s) => ({ muted: !s.muted })),

  setPlaybackRate: (playbackRate) => set({ playbackRate }),
  toggleLoop: () => set((s) => ({ looping: !s.looping })),
  setFullscreen: (fullscreen) => set({ fullscreen }),

  reset: () =>
    set({
      playing: false,
      currentTime: 0,
      duration: 0,
      playbackRate: 1,
      looping: false,
      fullscreen: false,
    }),
}));
