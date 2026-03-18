import { t } from '@/shared/i18n';

/**
 * Settings page — app configuration, ffmpeg status, cache management.
 * Implemented in Task 3.8 (Settings Feature).
 */
export function SettingsPage() {
  return (
    <div>
      <h1
        className="mb-4 text-lg font-semibold"
        style={{ color: 'var(--text-primary)' }}
      >
        {t('settings.title')}
      </h1>
      <p style={{ color: 'var(--text-muted)' }}>
        Settings placeholder.
      </p>
    </div>
  );
}
