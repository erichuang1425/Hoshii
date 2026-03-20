import clsx from 'clsx';
import { t } from '@/shared/i18n';
import { Spinner } from '@/shared/ui';
import { useToast } from '@/shared/ui/ToastProvider';
import { useSettingsStore } from '../model/useSettingsStore';
import type { AppSettings } from '@/shared/types/media';
import type { ReadingMode, ReadingDirection, FitMode } from '@/shared/types/media';

// ─── Section header ───────────────────────────────────────────────────────────

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2
        className="mb-4 border-b pb-2 text-sm font-semibold uppercase tracking-wider"
        style={{ color: 'var(--text-muted)', borderColor: 'var(--border)' }}
      >
        {title}
      </h2>
      <div className="space-y-4">{children}</div>
    </section>
  );
}

// ─── Setting row ──────────────────────────────────────────────────────────────

function SettingRow({
  label,
  description,
  children,
}: {
  label: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex items-start justify-between gap-8">
      <div className="flex-1">
        <p className="text-sm font-medium" style={{ color: 'var(--text-primary)' }}>
          {label}
        </p>
        {description && (
          <p className="mt-0.5 text-xs" style={{ color: 'var(--text-muted)' }}>
            {description}
          </p>
        )}
      </div>
      <div className="flex-shrink-0">{children}</div>
    </div>
  );
}

// ─── Toggle ────────────────────────────────────────────────────────────────────

function Toggle({
  value,
  onChange,
}: {
  value: boolean;
  onChange: (v: boolean) => void;
}) {
  return (
    <button
      role="switch"
      aria-checked={value}
      onClick={() => onChange(!value)}
      className={clsx(
        'relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent',
        'transition-colors duration-[var(--duration-fast)]',
        value ? 'bg-[var(--accent)]' : 'bg-[var(--bg-active)]',
      )}
    >
      <span
        className={clsx(
          'inline-block h-5 w-5 transform rounded-full bg-white shadow',
          'transition-transform duration-[var(--duration-fast)]',
          value ? 'translate-x-5' : 'translate-x-0',
        )}
      />
    </button>
  );
}

// ─── Select ────────────────────────────────────────────────────────────────────

function Select<T extends string>({
  value,
  options,
  onChange,
}: {
  value: T;
  options: { value: T; label: string }[];
  onChange: (v: T) => void;
}) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value as T)}
      className={clsx(
        'rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm',
        'text-[var(--text-primary)]',
        'focus:border-[var(--accent)] focus:outline-none',
      )}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  );
}

// ─── Number input ──────────────────────────────────────────────────────────────

function NumberInput({
  value,
  min,
  max,
  step,
  onChange,
}: {
  value: number;
  min?: number;
  max?: number;
  step?: number;
  onChange: (v: number) => void;
}) {
  return (
    <input
      type="number"
      value={value}
      min={min}
      max={max}
      step={step ?? 1}
      onChange={(e) => {
        const n = Number(e.target.value);
        if (!isNaN(n)) onChange(n);
      }}
      className={clsx(
        'w-24 rounded-md border border-[var(--border)] bg-[var(--bg-secondary)] px-3 py-1.5 text-sm',
        'text-[var(--text-primary)]',
        'focus:border-[var(--accent)] focus:outline-none',
      )}
    />
  );
}

// ─── Main component ────────────────────────────────────────────────────────────

export function SettingsPanel() {
  const settings = useSettingsStore((s) => s.settings);
  const saving = useSettingsStore((s) => s.saving);
  const updateSetting = useSettingsStore((s) => s.updateSetting);
  const { showToast } = useToast();

  async function handleUpdate<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    await updateSetting(key, value);
    showToast({ type: 'success', message: t('settings.saved') });
  }

  return (
    <div className="mx-auto max-w-2xl">
      {saving && (
        <div className="mb-4 flex items-center gap-2 text-sm" style={{ color: 'var(--text-muted)' }}>
          <Spinner size="sm" />
          <span>{t('shared.loading')}</span>
        </div>
      )}

      {/* Theme & Language */}
      <Section title={t('settings.theme')}>
        <SettingRow label={t('settings.theme')}>
          <Select<'dark' | 'light'>
            value={settings.theme}
            options={[
              { value: 'dark', label: t('settings.theme.dark') },
              { value: 'light', label: t('settings.theme.light') },
            ]}
            onChange={(v) => handleUpdate('theme', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.language')}>
          <Select<string>
            value={settings.language}
            options={[
              { value: 'en', label: t('settings.language.en') },
              { value: 'zh-TW', label: t('settings.language.zhTW') },
            ]}
            onChange={(v) => handleUpdate('language', v)}
          />
        </SettingRow>
      </Section>

      {/* Reading */}
      <Section title={t('settings.reading')}>
        <SettingRow label={t('settings.defaultReadingMode')}>
          <Select<ReadingMode>
            value={settings.defaultReadingMode}
            options={[
              { value: 'single', label: t('settings.readingMode.single') },
              { value: 'vertical_scroll', label: t('settings.readingMode.vertical') },
              { value: 'double_page', label: t('settings.readingMode.double') },
              { value: 'thumbnail_grid', label: t('settings.readingMode.thumbnail') },
              { value: 'long_strip', label: t('settings.readingMode.longStrip') },
            ]}
            onChange={(v) => handleUpdate('defaultReadingMode', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.defaultReadingDirection')}>
          <Select<ReadingDirection>
            value={settings.defaultReadingDirection}
            options={[
              { value: 'ltr', label: t('settings.readingDirection.ltr') },
              { value: 'rtl', label: t('settings.readingDirection.rtl') },
              { value: 'vertical', label: t('settings.readingDirection.vertical') },
            ]}
            onChange={(v) => handleUpdate('defaultReadingDirection', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.defaultFitMode')}>
          <Select<FitMode>
            value={settings.defaultFitMode}
            options={[
              { value: 'fit_best', label: t('settings.fitMode.fitBest') },
              { value: 'fit_width', label: t('settings.fitMode.fitWidth') },
              { value: 'fit_height', label: t('settings.fitMode.fitHeight') },
              { value: 'original', label: t('settings.fitMode.original') },
            ]}
            onChange={(v) => handleUpdate('defaultFitMode', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.autoPlayAnimated')}>
          <Toggle
            value={settings.autoPlayAnimated}
            onChange={(v) => handleUpdate('autoPlayAnimated', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.autoScrollSpeed')}>
          <NumberInput
            value={settings.autoScrollSpeed}
            min={10}
            max={500}
            step={10}
            onChange={(v) => handleUpdate('autoScrollSpeed', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.autoPlayLoopThreshold')}>
          <NumberInput
            value={settings.autoPlayLoopThreshold}
            min={5}
            max={300}
            step={5}
            onChange={(v) => handleUpdate('autoPlayLoopThreshold', v)}
          />
        </SettingRow>
      </Section>

      {/* Thumbnails */}
      <Section title={t('settings.thumbnails')}>
        <SettingRow label={t('settings.thumbnailSize')}>
          <Select<'small' | 'medium' | 'large'>
            value={settings.thumbnailSize}
            options={[
              { value: 'small', label: t('settings.thumbnailSize.small') },
              { value: 'medium', label: t('settings.thumbnailSize.medium') },
              { value: 'large', label: t('settings.thumbnailSize.large') },
            ]}
            onChange={(v) => handleUpdate('thumbnailSize', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.showMediaBadges')}>
          <Toggle
            value={settings.showMediaBadges}
            onChange={(v) => handleUpdate('showMediaBadges', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.thumbnailCacheMaxMb')}>
          <NumberInput
            value={settings.thumbnailCacheMaxMb}
            min={256}
            max={10240}
            step={256}
            onChange={(v) => handleUpdate('thumbnailCacheMaxMb', v)}
          />
        </SettingRow>
      </Section>

      {/* Video */}
      <Section title={t('settings.video')}>
        <SettingRow label={t('settings.videoPlayerVolume')}>
          <NumberInput
            value={Math.round(settings.videoPlayerVolume * 100)}
            min={0}
            max={100}
            step={5}
            onChange={(v) => handleUpdate('videoPlayerVolume', Math.min(1, v / 100))}
          />
        </SettingRow>
      </Section>

      {/* Gallery */}
      <Section title={t('settings.gallery')}>
        <SettingRow label={t('settings.gallerySortOrder')}>
          <Select<AppSettings['gallerySortOrder']>
            value={settings.gallerySortOrder}
            options={[
              { value: 'name_asc', label: t('browseArtists.sortNameAsc') },
              { value: 'name_desc', label: t('browseArtists.sortNameDesc') },
              { value: 'date_desc', label: t('browseArtists.sortDateDesc') },
              { value: 'date_asc', label: t('browseArtists.sortDateAsc') },
              { value: 'pages_desc', label: t('browseArtists.sortPages') },
              { value: 'last_read', label: t('browseArtists.sortLastRead') },
            ]}
            onChange={(v) => handleUpdate('gallerySortOrder', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.autoExportMetadata')}>
          <Toggle
            value={settings.autoExportMetadata}
            onChange={(v) => handleUpdate('autoExportMetadata', v)}
          />
        </SettingRow>
      </Section>

      {/* Advanced */}
      <Section title={t('settings.advanced')}>
        <SettingRow label={t('settings.enableSmartGrouping')}>
          <Toggle
            value={settings.enableSmartGrouping}
            onChange={(v) => handleUpdate('enableSmartGrouping', v)}
          />
        </SettingRow>
        <SettingRow
          label={t('settings.smartGroupingThreshold')}
          description="1 = strict, 3 = loose (Levenshtein distance)"
        >
          <NumberInput
            value={settings.smartGroupingThreshold}
            min={1}
            max={5}
            step={1}
            onChange={(v) => handleUpdate('smartGroupingThreshold', v)}
          />
        </SettingRow>
        <SettingRow label={t('settings.enableChronologicalLinking')}>
          <Toggle
            value={settings.enableChronologicalLinking}
            onChange={(v) => handleUpdate('enableChronologicalLinking', v)}
          />
        </SettingRow>
      </Section>
    </div>
  );
}
