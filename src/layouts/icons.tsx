import clsx from 'clsx';

type IconProps = { className?: string };

export function HomeIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1Z" />
    </svg>
  );
}

export function FolderIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 6.75A1.75 1.75 0 0 1 4.75 5h4.38a1.75 1.75 0 0 1 1.23.5l1.5 1.5h7.39A1.75 1.75 0 0 1 21 8.75v9.5A1.75 1.75 0 0 1 19.25 20H4.75A1.75 1.75 0 0 1 3 18.25Z" />
    </svg>
  );
}

export function HeartIcon({ className, filled }: IconProps & { filled?: boolean }) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M21 8.25c0-2.485-2.099-4.5-4.688-4.5-1.935 0-3.597 1.126-4.312 2.733-.715-1.607-2.377-2.733-4.313-2.733C5.1 3.75 3 5.765 3 8.25c0 7.22 9 12 9 12s9-4.78 9-12Z" />
    </svg>
  );
}

export function FileStackIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M7 3h7l5 5v10a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2Z" />
      <path d="M13 3v6h6" />
    </svg>
  );
}

export function ArchiveIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M3 7h18v3H3z" />
      <path d="M5 10v9a1 1 0 0 0 1 1h12a1 1 0 0 0 1-1v-9" />
      <path d="M10 14h4" />
    </svg>
  );
}

export function SettingsIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M9.59 3.94c.09-.54.56-.94 1.11-.94h2.6c.55 0 1.02.4 1.11.94l.21 1.28c.06.37.31.68.65.87.07.04.14.08.22.12.32.2.72.26 1.07.13l1.22-.46a1.13 1.13 0 0 1 1.37.5l1.3 2.24c.27.48.16 1.08-.26 1.44l-1 .82c-.3.24-.44.61-.44.99v.26c0 .38.14.75.43.99l1 .83c.43.35.54.95.27 1.43l-1.3 2.25c-.27.47-.85.68-1.37.49l-1.22-.46c-.35-.13-.75-.07-1.07.13l-.22.12c-.34.19-.59.5-.65.87l-.21 1.28c-.1.55-.57.94-1.12.94h-2.59c-.55 0-1.02-.4-1.11-.94l-.22-1.28a1.41 1.41 0 0 0-.64-.87 6.3 6.3 0 0 1-.22-.13 1.27 1.27 0 0 0-1.08-.12l-1.21.46a1.13 1.13 0 0 1-1.37-.49l-1.3-2.25a1.13 1.13 0 0 1 .26-1.43l1-.83c.3-.24.44-.61.44-.99a6.9 6.9 0 0 1 0-.26c.01-.38-.14-.75-.43-.99l-1-.82a1.13 1.13 0 0 1-.27-1.44l1.3-2.24a1.13 1.13 0 0 1 1.37-.5l1.22.46c.35.13.75.07 1.07-.13l.22-.12c.34-.19.59-.5.65-.87Z" />
      <circle cx={12} cy={12} r={3} />
    </svg>
  );
}

export function SearchIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-4 w-4', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <circle cx={11} cy={11} r={8} />
      <line x1={21} y1={21} x2={16.65} y2={16.65} />
    </svg>
  );
}

export function MenuIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <line x1={3} y1={6} x2={21} y2={6} />
      <line x1={3} y1={12} x2={21} y2={12} />
      <line x1={3} y1={18} x2={21} y2={18} />
    </svg>
  );
}

export function SparkleIcon({ className }: IconProps) {
  return (
    <svg
      className={clsx('h-5 w-5', className)}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 3 13.5 9 19 10.5 13.5 12 12 18 10.5 12 5 10.5 10.5 9Z" />
      <path d="M18 3v3" />
      <path d="M19.5 4.5h-3" />
    </svg>
  );
}

// ─── Layout-mode glyphs (used in LayoutSwitcher + Settings previews) ──────────

export function ClassicLayoutGlyph({ className }: IconProps) {
  return (
    <svg className={clsx('h-5 w-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <line x1={9} y1={4} x2={9} y2={20} />
    </svg>
  );
}

export function CompactLayoutGlyph({ className }: IconProps) {
  return (
    <svg className={clsx('h-5 w-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <line x1={6.5} y1={4} x2={6.5} y2={20} />
      <circle cx={4.75} cy={8} r={0.8} fill="currentColor" stroke="none" />
      <circle cx={4.75} cy={12} r={0.8} fill="currentColor" stroke="none" />
      <circle cx={4.75} cy={16} r={0.8} fill="currentColor" stroke="none" />
    </svg>
  );
}

export function TopLayoutGlyph({ className }: IconProps) {
  return (
    <svg className={clsx('h-5 w-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <line x1={3} y1={9} x2={21} y2={9} />
    </svg>
  );
}

export function FocusLayoutGlyph({ className }: IconProps) {
  return (
    <svg className={clsx('h-5 w-5', className)} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5}>
      <rect x={3} y={4} width={18} height={16} rx={2} />
      <rect x={7} y={7} width={10} height={2.5} rx={1.25} />
    </svg>
  );
}
