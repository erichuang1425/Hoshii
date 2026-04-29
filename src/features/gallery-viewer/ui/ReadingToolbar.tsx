import clsx from 'clsx';
import type { FitMode, ReadingDirection, ReadingMode } from '@/shared/types';
import { t } from '@/shared/i18n';

interface ReadingToolbarProps {
  readingMode: ReadingMode;
  fitMode: FitMode;
  readingDirection: ReadingDirection;
  autoScroll: boolean;
  autoScrollSpeed: number;
  onReadingModeChange: (mode: ReadingMode) => void;
  onFitModeChange: (mode: FitMode) => void;
  onReadingDirectionChange: (dir: ReadingDirection) => void;
  onAutoScrollChange: (enabled: boolean) => void;
  onAutoScrollSpeedChange: (speed: number) => void;
  visible: boolean;
}

const FIT_MODES: { value: FitMode; label: string }[] = [
  { value: 'fit_best', label: 'Best' },
  { value: 'fit_width', label: 'Width' },
  { value: 'fit_height', label: 'Height' },
  { value: 'original', label: '1:1' },
];

const READING_MODES: { value: ReadingMode; label: string; icon: string }[] = [
  { value: 'single', label: t('reader.modeSingle'), icon: '□' },
  { value: 'double_page', label: t('reader.modeDouble'), icon: '◫' },
  { value: 'vertical_scroll', label: t('reader.modeWebtoon'), icon: '≡' },
  { value: 'thumbnail_grid', label: t('reader.modeGrid'), icon: '⊞' },
];

const DIRECTIONS: { value: ReadingDirection; label: string; icon: string }[] = [
  { value: 'ltr', label: t('reader.dirLTR'), icon: '→' },
  { value: 'rtl', label: t('reader.dirRTL'), icon: '←' },
  { value: 'vertical', label: t('reader.dirVertical'), icon: '↓' },
];

export function ReadingToolbar({
  readingMode,
  fitMode,
  readingDirection,
  autoScroll,
  autoScrollSpeed,
  onReadingModeChange,
  onFitModeChange,
  onReadingDirectionChange,
  onAutoScrollChange,
  onAutoScrollSpeedChange,
  visible,
}: ReadingToolbarProps) {
  return (
    <div
      className={clsx(
        'flex items-center gap-3 px-4 py-2',
        'bg-[var(--bg-primary)]/90 backdrop-blur-sm border-b border-[var(--border)]',
        'transition-opacity duration-[var(--duration-normal)]',
        visible ? 'opacity-100' : 'opacity-0 pointer-events-none',
      )}
    >
      {/* Reading Mode */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-1">{t('reader.mode')}</span>
        {READING_MODES.map((m) => (
          <button
            key={m.value}
            title={m.label}
            onClick={() => onReadingModeChange(m.value)}
            className={clsx(
              'px-2 py-0.5 text-sm rounded transition-colors',
              readingMode === m.value
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            {m.icon}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[var(--border)]" />

      {/* Fit Mode */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-1">{t('reader.fit')}</span>
        {FIT_MODES.map((fm) => (
          <button
            key={fm.value}
            title={fm.label}
            onClick={() => onFitModeChange(fm.value)}
            className={clsx(
              'px-2 py-0.5 text-xs rounded transition-colors',
              fitMode === fm.value
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            {fm.label}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[var(--border)]" />

      {/* Reading Direction */}
      <div className="flex items-center gap-1">
        <span className="text-xs text-[var(--text-muted)] mr-1">{t('reader.direction')}</span>
        {DIRECTIONS.map((d) => (
          <button
            key={d.value}
            title={d.label}
            onClick={() => onReadingDirectionChange(d.value)}
            className={clsx(
              'px-2 py-0.5 text-sm rounded transition-colors',
              readingDirection === d.value
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
            )}
          >
            {d.icon}
          </button>
        ))}
      </div>

      <div className="h-4 w-px bg-[var(--border)]" />

      {/* Auto-scroll */}
      <div className="flex items-center gap-2">
        <button
          title={t('reader.autoScroll')}
          onClick={() => onAutoScrollChange(!autoScroll)}
          className={clsx(
            'px-2 py-0.5 text-xs rounded transition-colors',
            autoScroll
              ? 'bg-[var(--accent)] text-white'
              : 'text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--bg-hover)]',
          )}
        >
          {t('reader.autoScroll')}
        </button>
        {autoScroll && (
          <input
            type="range"
            min={5}
            max={200}
            value={autoScrollSpeed}
            onChange={(e) => onAutoScrollSpeedChange(Number(e.target.value))}
            className="w-20 accent-[var(--accent)]"
            title={`${t('reader.speed')}: ${autoScrollSpeed}`}
          />
        )}
      </div>
    </div>
  );
}
