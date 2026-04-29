import { create } from 'zustand';
import type { AppSettings } from '@/shared/types/media';
import { logger } from '@/shared/lib/logger';
import { setLanguage } from '@/shared/i18n';
import * as api from '../api/settingsApi';

const DEFAULT_SETTINGS: AppSettings = {
  theme: 'dark',
  language: 'en',
  defaultReadingMode: 'single',
  autoPlayAnimated: true,
  autoPlayLoopThreshold: 30,
  thumbnailSize: 'medium',
  showMediaBadges: true,
  videoPlayerVolume: 0.8,
  gallerySortOrder: 'name_asc',
  thumbnailCacheMaxMb: 2048,
  autoExportMetadata: false,
  defaultReadingDirection: 'ltr',
  defaultFitMode: 'fit_best',
  autoScrollSpeed: 50,
  smartGroupingThreshold: 2,
  enableSmartGrouping: true,
  enableChronologicalLinking: true,
};

interface SettingsState {
  settings: AppSettings;
  loading: boolean;
  saving: boolean;
  error: string | null;

  fetchSettings: () => Promise<void>;
  updateSetting: <K extends keyof AppSettings>(key: K, value: AppSettings[K]) => Promise<void>;
  updateSettings: (patch: Partial<AppSettings>) => Promise<void>;
}

export const useSettingsStore = create<SettingsState>((set, get) => ({
  settings: DEFAULT_SETTINGS,
  loading: false,
  saving: false,
  error: null,

  fetchSettings: async () => {
    set({ loading: true, error: null });
    try {
      const settings = await api.getSettings();
      setLanguage(settings.language);
      set({ settings, loading: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to fetch settings', { error: message });
      // Use defaults on error — backend may not be available
      set({ loading: false });
    }
  },

  updateSetting: async (key, value) => {
    const prev = get().settings;
    const patch = { [key]: value } as Partial<AppSettings>;
    // Optimistic update
    set((s) => ({ settings: { ...s.settings, ...patch } }));
    try {
      set({ saving: true });
      const updated = await api.updateSettings(patch);
      if (key === 'language') setLanguage(value as string);
      set({ settings: updated, saving: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to update setting', { key, error: message });
      // Revert on error
      set({ settings: prev, saving: false, error: message });
    }
  },

  updateSettings: async (patch) => {
    const prev = get().settings;
    set((s) => ({ settings: { ...s.settings, ...patch }, saving: true }));
    try {
      const updated = await api.updateSettings(patch);
      if (patch.language) setLanguage(patch.language);
      set({ settings: updated, saving: false });
    } catch (err) {
      const message = String(err);
      logger.error('Failed to update settings', { error: message });
      set({ settings: prev, saving: false, error: message });
    }
  },
}));
