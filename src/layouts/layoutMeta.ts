import type { LayoutMode } from './useLayoutStore';
import {
  ClassicLayoutGlyph,
  CompactLayoutGlyph,
  TopLayoutGlyph,
  FocusLayoutGlyph,
} from './icons';

export interface LayoutModeMeta {
  id: LayoutMode;
  labelKey: string;
  descriptionKey: string;
  Glyph: (props: { className?: string }) => JSX.Element;
}

export const LAYOUT_META: readonly LayoutModeMeta[] = [
  {
    id: 'classic',
    labelKey: 'layout.classic',
    descriptionKey: 'layout.classicDesc',
    Glyph: ClassicLayoutGlyph,
  },
  {
    id: 'compact',
    labelKey: 'layout.compact',
    descriptionKey: 'layout.compactDesc',
    Glyph: CompactLayoutGlyph,
  },
  {
    id: 'top',
    labelKey: 'layout.top',
    descriptionKey: 'layout.topDesc',
    Glyph: TopLayoutGlyph,
  },
  {
    id: 'focus',
    labelKey: 'layout.focus',
    descriptionKey: 'layout.focusDesc',
    Glyph: FocusLayoutGlyph,
  },
] as const;

export function getLayoutMeta(mode: LayoutMode): LayoutModeMeta {
  return LAYOUT_META.find((m) => m.id === mode) ?? LAYOUT_META[0];
}
