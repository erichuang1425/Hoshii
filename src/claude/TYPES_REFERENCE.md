# Shared Types Reference v2

All types live in `src/shared/types/`. These map 1:1 to Rust structs and SQLite schema.

## Common Wrappers (shared/types/common.ts)

```typescript
// Async operation state — use for ALL data fetching
export type AsyncState<T> =
  | { status: 'idle' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; error: string };

// Paginated results for large lists
export interface PaginatedResult<T> {
  items: T[];
  total: number;
  offset: number;
  limit: number;
  hasMore: boolean;
}

// Generic operation result from Rust commands
export interface OperationResult {
  success: boolean;
  message?: string;
}
```

## Volume (shared/types/volume.ts)

```typescript
export interface Volume {
  id: number;
  uuid: string;              // filesystem UUID (stable across reconnects)
  label: string | null;      // user-friendly name
  mountPath: string | null;  // current mount point (null if offline)
  isOnline: boolean;
  isRemovable: boolean;
  totalBytes: number | null;
  lastSeen: string | null;   // ISO datetime
}
```

## Gallery Types (shared/types/gallery.ts)

```typescript
export interface RootFolder {
  id: number;
  volumeId: number;
  path: string;               // absolute current path
  relativePath: string;       // relative to volume mount (stable)
  label: string | null;
  lastScan: string | null;
  scanVersion: number;
}

export interface Artist {
  id: number;
  rootId: number;
  name: string;
  path: string;
  galleryCount: number;
}

export interface Gallery {
  id: number;
  artistId: number;
  name: string;
  path: string;
  pageCount: number;
  totalSize: number;           // bytes
  coverPath: string | null;    // filesystem path — NOT asset:// URL
  hasBackupZip: boolean;
  zipStatus: ZipStatus;
  lastReadPage: number;
  lastReadAt: string | null;
  favorited: boolean;
}

export type ZipStatus = 'unknown' | 'matched' | 'orphaned_zip' | 'missing_zip' | 'mismatched';

export type GallerySortOrder =
  | 'name_asc' | 'name_desc'
  | 'date_asc' | 'date_desc'
  | 'size_asc' | 'size_desc'
  | 'pages_desc' | 'last_read';
```

## Media Types (shared/types/media.ts)

```typescript
export type MediaType = 'image' | 'animated_image' | 'video' | 'avif_static' | 'avif_animated';

export interface MediaEntry {
  id: number;
  galleryId: number;
  filename: string;
  path: string;               // absolute filesystem path
  relativePath: string;       // relative to gallery folder (stable for sidecar export)
  sortOrder: number;
  groupName: string;          // prefix group ("lucy", "eva", "" for ungrouped)
  mediaType: MediaType;
  width: number | null;
  height: number | null;
  fileSize: number;
  durationMs: number | null;  // video/animated duration (null for static)
  isAnimated: boolean;
  mtime: number;              // file modification timestamp (for incremental scan)
  // NOTE: NO assetUrl field — compute at render time via toAssetUrl(path)
}

// For animated AVIF that has been converted to WebP
export interface ConvertedMedia {
  originalPath: string;
  convertedPath: string;      // path to converted .webp file
  mediaType: 'animated_webp';
}

export interface MediaGroup {
  name: string;               // group prefix
  startIndex: number;         // index in sorted media array
  count: number;
}

export type ReadingMode = 'single' | 'vertical_scroll' | 'double_page' | 'thumbnail_grid';

export interface ReadingState {
  galleryId: number;
  currentPage: number;
  totalPages: number;
  currentGroup: string | null;
  readingMode: ReadingMode;
  zoomLevel: number;
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
```

## Other Types

```typescript
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
  changedFiles: number;       // files that were new/modified (incremental scan)
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
  language: string;            // extensible, not hardcoded enum
  defaultReadingMode: ReadingMode;
  autoPlayAnimated: boolean;
  autoPlayLoopThreshold: number;
  thumbnailSize: 'small' | 'medium' | 'large';
  showMediaBadges: boolean;
  videoPlayerVolume: number;
  gallerySortOrder: GallerySortOrder;
  thumbnailCacheMaxMb: number; // default 2048 (2GB)
  autoExportMetadata: boolean; // write .hoshii-meta.json on close
}
```

## Tauri Command Signatures

```typescript
// ═══════════ VOLUMES ═══════════
'detect_volumes'         → ()                                  → Volume[]
'get_volumes'            → ()                                  → Volume[]
'refresh_volume_status'  → ()                                  → Volume[]  // re-check online/offline

// ═══════════ ROOT FOLDERS ═══════════
'add_root_folder'        → ({ path: string, label?: string })  → RootFolder  // also registers asset scope
'remove_root_folder'     → ({ id: number })                    → void
'get_root_folders'       → ()                                  → RootFolder[]
'scan_root_folder'       → ({ id: number, full?: boolean })    → ScanResult  // full=false → incremental

// ═══════════ BROWSE ═══════════
'get_artists'            → ({ rootId: number })                → Artist[]
'get_galleries'          → ({ artistId: number, sort?: GallerySortOrder }) → Gallery[]
'get_gallery_media'      → ({ galleryId: number })             → MediaEntry[]
'get_media_groups'       → ({ galleryId: number })             → MediaGroup[]

// ═══════════ MEDIA ═══════════
'generate_thumbnail'     → ({ path: string, width: number })   → string     // returns filesystem path
'probe_media'            → ({ path: string })                  → { width, height, durationMs, isAnimated, mediaType }
'check_ffmpeg'           → ()                                  → FfmpegStatus
'remux_video'            → ({ path: string })                  → string     // returns remuxed path
'convert_animated_avif'  → ({ path: string })                  → string     // returns converted webp path

// ═══════════ ZIP ═══════════
'verify_zip_integrity'   → ({ artistPath: string })            → { gallery: string, status: ZipStatus }[]
'restore_from_zip'       → ({ zipPath: string, targetDir: string }) → void

// ═══════════ FILE MANAGEMENT ═══════════
'move_files_to_gallery'  → ({ files: string[], galleryPath: string }) → void
'create_gallery_folder'  → ({ artistPath: string, name: string })     → Gallery

// ═══════════ SEARCH + METADATA ═══════════
'search_galleries'       → ({ query: string, rootId?: number })       → Gallery[]
'toggle_favorite'        → ({ galleryId: number })                     → boolean
'update_reading_progress'→ ({ galleryId: number, page: number })      → void
'get_recent_galleries'   → ({ limit: number })                         → Gallery[]
'add_tag'                → ({ galleryId: number, tag: string })       → Tag
'remove_tag'             → ({ galleryId: number, tagId: number })     → void
'get_gallery_tags'       → ({ galleryId: number })                     → Tag[]
'search_by_tags'         → ({ tags: string[] })                        → Gallery[]

// ═══════════ METADATA EXPORT ═══════════
'export_metadata'        → ({ rootId: number })                        → string  // path to exported JSON
'import_metadata'        → ({ rootId: number, filePath: string })      → { imported: number, skipped: number }

// ═══════════ SETTINGS ═══════════
'get_settings'           → ()                                          → AppSettings
'update_settings'        → ({ settings: Partial<AppSettings> })        → AppSettings
```

## Utility: Asset URL Helper

```typescript
// src/shared/lib/assetUrl.ts
import { convertFileSrc } from '@tauri-apps/api/core';

export function toAssetUrl(filePath: string): string {
  return convertFileSrc(filePath);
}

// Usage in components:
// <img src={toAssetUrl(media.path)} />
// <video src={toAssetUrl(media.path)} />
```

This is the ONLY place `convertFileSrc` should be called. Never store the result.
