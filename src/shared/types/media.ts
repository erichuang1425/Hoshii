import type { GallerySortOrder } from './gallery';

export type MediaType = 'image' | 'animated_image' | 'video' | 'avif_static' | 'avif_animated';

export interface MediaEntry {
  id: number;
  galleryId: number;
  filename: string;
  path: string;
  relativePath: string;
  sortOrder: number;
  groupName: string;
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  fileSize: number;
  durationMs: number | null;
  isAnimated: boolean;
  mtime: number;
}

export interface ConvertedMedia {
  originalPath: string;
  convertedPath: string;
  mediaType: 'animated_webp';
}

export interface MediaGroup {
  name: string;
  startIndex: number;
  count: number;
}

export type ReadingMode = 'single' | 'vertical_scroll' | 'double_page' | 'thumbnail_grid' | 'long_strip';
export type FitMode = 'fit_best' | 'fit_width' | 'fit_height' | 'original';
export type ReadingDirection = 'ltr' | 'rtl' | 'vertical';

export interface ReadingState {
  galleryId: number;
  currentPage: number;
  totalPages: number;
  currentGroup: string | null;
  readingMode: ReadingMode;
  zoomLevel: number;
  fitMode: FitMode;
  readingDirection: ReadingDirection;
}

export interface SmartGroup {
  name: string;
  galleryIds: number[];
  galleryNames: string[];
}

export interface ChronologicalGroup {
  date: string;
  galleryId: number;
  galleryName: string;
}

export interface TimelineEntry {
  index: number;
  filename: string;
  date: string | null;
}

export interface VideoPlayerState {
  playing: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  muted: boolean;
  playbackRate: number;
  looping: boolean;
  fullscreen: boolean;
}

export interface Tag {
  id: number;
  name: string;
  galleryCount?: number;
}

export interface UnorganizedFile {
  id: number;
  artistId: number;
  filename: string;
  path: string;
  mediaType: MediaType | null;
  fileSize: number;
}

export interface ScanResult {
  rootId: number;
  artistsFound: number;
  galleriesFound: number;
  mediaFilesFound: number;
  unorganizedFiles: number;
  orphanedZips: number;
  scanDurationMs: number;
  changedFiles: number;
  errors: ScanError[];
}

export interface ScanError {
  path: string;
  message: string;
  severity: 'warning' | 'error';
}

export interface FfmpegStatus {
  available: boolean;
  version: string | null;
  path: string | null;
}

export interface AppSettings {
  theme: 'dark' | 'light';
  language: string;
  defaultReadingMode: ReadingMode;
  autoPlayAnimated: boolean;
  autoPlayLoopThreshold: number;
  thumbnailSize: 'small' | 'medium' | 'large';
  showMediaBadges: boolean;
  videoPlayerVolume: number;
  gallerySortOrder: GallerySortOrder;
  thumbnailCacheMaxMb: number;
  autoExportMetadata: boolean;
  defaultReadingDirection: ReadingDirection;
  defaultFitMode: FitMode;
  autoScrollSpeed: number;
  smartGroupingThreshold: number;
  enableSmartGrouping: boolean;
  enableChronologicalLinking: boolean;
}
