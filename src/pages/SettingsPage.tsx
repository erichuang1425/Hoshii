import { useEffect } from 'react';
import { t } from '@/shared/i18n';
import { SettingsPanel } from '@/features/settings/ui/SettingsPanel';
import { useSettingsStore } from '@/features/settings/model/useSettingsStore';

export function SettingsPage() {
  const fetchSettings = useSettingsStore((s) => s.fetchSettings);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  return (
    <div>
      <h1
        className="mb-6 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('settings.title')}
      </h1>
      <SettingsPanel />
    </div>
  );
}
