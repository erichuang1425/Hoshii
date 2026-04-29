import { describe, it, expect, vi, beforeEach } from 'vitest';
import { useSettingsStore } from '../useSettingsStore';

vi.mock('../../api/settingsApi', () => ({
  getSettings: vi.fn(),
  updateSettings: vi.fn(),
}));

vi.mock('@/shared/i18n', () => ({
  setLanguage: vi.fn(),
  getLanguage: vi.fn(() => 'en'),
  t: (k: string) => k,
}));

import * as api from '../../api/settingsApi';

describe('useSettingsStore', () => {
  beforeEach(() => {
    useSettingsStore.setState({
      settings: {
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
      },
      loading: false,
      saving: false,
      error: null,
    });
    vi.clearAllMocks();
  });

  it('fetchSettings loads and stores settings', async () => {
    const mockSettings = {
      theme: 'light' as const,
      language: 'zh-TW',
      defaultReadingMode: 'vertical_scroll' as const,
      autoPlayAnimated: false,
      autoPlayLoopThreshold: 30,
      thumbnailSize: 'large' as const,
      showMediaBadges: true,
      videoPlayerVolume: 0.5,
      gallerySortOrder: 'date_desc' as const,
      thumbnailCacheMaxMb: 1024,
      autoExportMetadata: true,
      defaultReadingDirection: 'rtl' as const,
      defaultFitMode: 'fit_width' as const,
      autoScrollSpeed: 100,
      smartGroupingThreshold: 3,
      enableSmartGrouping: false,
      enableChronologicalLinking: true,
    };
    vi.mocked(api.getSettings).mockResolvedValue(mockSettings);

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.settings.theme).toBe('light');
    expect(state.settings.language).toBe('zh-TW');
    expect(state.loading).toBe(false);
  });

  it('fetchSettings uses defaults on error (does not throw)', async () => {
    vi.mocked(api.getSettings).mockRejectedValue(new Error('Backend unavailable'));

    await useSettingsStore.getState().fetchSettings();

    const state = useSettingsStore.getState();
    expect(state.loading).toBe(false);
    // Default values preserved
    expect(state.settings.theme).toBe('dark');
  });

  it('updateSetting applies optimistic update and saves', async () => {
    const updated = { ...useSettingsStore.getState().settings, thumbnailSize: 'large' as const };
    vi.mocked(api.updateSettings).mockResolvedValue(updated);

    await useSettingsStore.getState().updateSetting('thumbnailSize', 'large');

    expect(useSettingsStore.getState().settings.thumbnailSize).toBe('large');
    expect(api.updateSettings).toHaveBeenCalledWith({ thumbnailSize: 'large' });
  });

  it('updateSetting reverts on error', async () => {
    vi.mocked(api.updateSettings).mockRejectedValue(new Error('Save failed'));

    const prevSize = useSettingsStore.getState().settings.thumbnailSize;
    try {
      await useSettingsStore.getState().updateSetting('thumbnailSize', 'large');
    } catch {
      // expected
    }

    expect(useSettingsStore.getState().settings.thumbnailSize).toBe(prevSize);
  });

  it('updateSettings applies batch update', async () => {
    const patch = { theme: 'light' as const, language: 'zh-TW' };
    const updated = { ...useSettingsStore.getState().settings, ...patch };
    vi.mocked(api.updateSettings).mockResolvedValue(updated);

    await useSettingsStore.getState().updateSettings(patch);

    expect(useSettingsStore.getState().settings.theme).toBe('light');
    expect(useSettingsStore.getState().settings.language).toBe('zh-TW');
  });
});
