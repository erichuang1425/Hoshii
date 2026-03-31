# Task Breakdown v2 — Parallel Development Guide

## How To Use

Each task is self-contained. Read `ARCHITECTURE.md`, `INSTRUCTIONS.md`, `TYPES_REFERENCE.md` before starting.

When starting a task: (1) state which task, (2) list files you'll create/modify, (3) implement with error handling + logging, (4) note new dependencies, (5) add unit tests for the core logic.

---

## Phase 1 — Foundation (sequential, must complete first)

### 1.1: Project Scaffold ✅ COMPLETED
**Status:** Done. All files created and verified.
**Creates:** Project skeleton, configs, empty feature stubs.
**Files:**
- `package.json`, `tsconfig.json`, `vite.config.ts` (with `@/` alias), `tailwind.config.ts`
- `src-tauri/Cargo.toml`, `src-tauri/tauri.conf.json` (with asset protocol, CSP, window config)
- `src-tauri/capabilities/default.json` (fs permissions, dialog, shell for ffmpeg sidecar)
- `src/app/App.tsx`, `src/app/routes.tsx`, `src/app/providers.tsx`, `src/app/global.css` (theme tokens)
- All `features/*/index.ts` barrel stubs (empty re-exports)
- `src/shared/types/*.ts` (copy from TYPES_REFERENCE.md)
- `src/shared/lib/logger.ts`, `src/shared/lib/assetUrl.ts` (toAssetUrl helper)
- `src/shared/api/invoke.ts` (typed Tauri invoke wrapper with error normalization)
- `src/layouts/MainLayout.tsx` (shell with sidebar/header/content/statusbar slots)
- `src/shared/hooks/useKeyboard.ts`
- `src/shared/i18n/translations.ts`
- All page stubs: `HomePage`, `ArtistListPage`, `ArtistPage`, `GalleryPage`, `SettingsPage`
- Feature barrel stubs for all 10 feature slices (ui/, model/, api/ subdirs)

### 1.2: Rust Core — SQLite + Volume Tracker + Base Models ✅ COMPLETED
**Status:** Done. All tests pass (`cargo test` — 8 tests including WAL mode, schema creation, volume commands, UUID extraction).
**Creates:** Database with WAL mode, volume detection, all Rust model structs.
**Files:**
- `src-tauri/src/main.rs` (builder with plugins + volume command registration)
- `src-tauri/src/db/mod.rs` (init_db with WAL mode, foreign_keys, busy_timeout + AppDatabase struct with Mutex)
- `src-tauri/src/db/schema.sql` (all tables from ARCHITECTURE.md §7 — volumes, root_folders, artists, galleries, gallery_media, tags, gallery_tags, unorganized_files + indexes)
- `src-tauri/src/models/volume.rs` (Volume struct with serde serialization)
- `src-tauri/src/models/gallery.rs` (RootFolder, Artist, Gallery structs)
- `src-tauri/src/models/media.rs` (MediaEntry, ConvertedMedia, MediaGroup structs)
- `src-tauri/src/models/scan.rs` (ScanResult, ScanError, FfmpegStatus, AppSettings structs)
- `src-tauri/src/services/volume_tracker.rs` (platform-specific UUID detection: Linux blkid/by-uuid, macOS diskutil, Windows wmic)
- `src-tauri/src/commands/volumes.rs` (detect_volumes, get_volumes, refresh_volume_status — all registered in main.rs)
- `src-tauri/src/commands/mod.rs`
- **Tests passed:** volume UUID extraction on Linux, SQLite schema creation, WAL mode verify, CRUD operations, volume online/offline tracking

### 1.3: Shared UI Components
**Creates:** Reusable dumb components used by all features.
**Files:**
- `src/shared/ui/Button.tsx`, `Modal.tsx`, `Spinner.tsx`, `Badge.tsx`, `Skeleton.tsx`, `SearchInput.tsx`
- `src/shared/ui/Toast.tsx` + `ToastProvider.tsx`
- `src/shared/ui/OfflineOverlay.tsx` (grey overlay + "Offline" badge for disconnected galleries)
- `src/shared/ui/DriveStatusDot.tsx` (green/red dot indicator)
- `src/shared/ui/MediaBadge.tsx` (GIF/VIDEO/AVIF type badges for thumbnails)
- `src/shared/ui/ProgressBar.tsx` (thin accent bar for reading progress)
- `src/shared/ui/index.ts`
- `src/shared/hooks/useKeyboard.ts`, `useIntersectionObserver.ts`, `useDriveStatus.ts`

---

## Phase 2 — Core Features (parallelizable per group)

### 2.1: Rust Scanner — Full + Incremental
**Depends on:** 1.2
**Files:**
- `src-tauri/src/services/scanner.rs` (full walk: root → artists → galleries → media)
- `src-tauri/src/services/natural_sort.rs` (case-insensitive, all patterns from ARCHITECTURE.md §6)
- `src-tauri/src/services/media_detector.rs` (extension → MediaType, animated AVIF detection)
- `src-tauri/src/commands/scan_roots.rs`
- `src-tauri/src/commands/scan_gallery.rs`
- `src-tauri/src/commands/incremental_scan.rs` (mtime comparison, changed/new/deleted detection)
- `src-tauri/src/commands/db_ops.rs` (batch insert/update/soft-delete)
- **Tests:** natural sort with all edge cases table, incremental scan with temp fixtures (new/modified/deleted files), media type detection for all extensions

### 2.2: Rust Thumbnail Generator
**Depends on:** 1.2
**Files:**
- `src-tauri/src/services/thumbnail.rs` (resize via `image` crate, LRU disk cache with volume-aware paths)
- `src-tauri/src/commands/thumbnails.rs`
- Handles: static images → resize, GIF → first frame, video → ffmpeg frame extract (if available) or placeholder
- Cache in `{app_data}/hoshii/thumbs/{volume_uuid}/{gallery_hash}/`
- **Tests:** thumbnail generation for jpg/png/gif, cache hit/miss, LRU eviction logic

### 2.3: Rust Media Probe + Video + AVIF Conversion
**Depends on:** 1.2
**Files:**
- `src-tauri/src/services/video_processor.rs` (ffmpeg detection, frame extract, remux)
- `src-tauri/src/commands/media_probe.rs`
- `src-tauri/src/commands/video_remux.rs`
- `src-tauri/src/commands/check_ffmpeg.rs`
- Animated AVIF → WebP conversion in `media_detector.rs` or dedicated service
- **Tests:** ffmpeg availability check, media type probe for known test files

### 2.4: Browse Roots Feature (Frontend)
**Depends on:** 1.1, 1.3
**Files:**
- `src/features/browse-roots/ui/RootFolderGrid.tsx` (grid of root cards grouped by volume)
- `src/features/browse-roots/ui/RootFolderCard.tsx` (with drive status dot, artist/gallery counts)
- `src/features/browse-roots/ui/AddRootButton.tsx` (opens native folder dialog)
- `src/features/browse-roots/ui/OfflineDrivesSection.tsx` (collapsed section for disconnected drives)
- `src/features/browse-roots/model/useBrowseRootsStore.ts`
- `src/features/browse-roots/api/rootFolderApi.ts`
- `src/features/browse-roots/index.ts`
- `src/pages/HomePage.tsx`

### 2.5: Browse Artists Feature (Frontend)
**Depends on:** 1.1, 1.3
**Files:**
- `src/features/browse-artists/ui/ArtistGrid.tsx`
- `src/features/browse-artists/ui/ArtistCard.tsx`
- `src/features/browse-artists/model/useBrowseArtistsStore.ts`
- `src/features/browse-artists/api/artistApi.ts`
- `src/features/browse-artists/index.ts`
- `src/pages/ArtistListPage.tsx`, `src/pages/ArtistPage.tsx`

### 2.6: Gallery Viewer — Reader + Image + Thumbnail Strip
**Depends on:** 1.1, 1.3
**Files:**
- `src/features/gallery-viewer/ui/GalleryReader.tsx` (main reader container, mode switching)
- `src/features/gallery-viewer/ui/PageView.tsx` (media type → correct component router)
- `src/features/gallery-viewer/ui/ImageView.tsx` (static images, zoom, pan)
- `src/features/gallery-viewer/ui/AnimatedImageView.tsx` (GIF/WebP with play/pause)
- `src/features/gallery-viewer/ui/ThumbnailStrip.tsx` (horizontal virtual scroll)
- `src/features/gallery-viewer/ui/SubheadingNav.tsx` (group jump pills)
- `src/features/gallery-viewer/model/useGalleryReaderStore.ts`
- `src/features/gallery-viewer/model/mediaGrouping.ts`
- `src/features/gallery-viewer/api/galleryApi.ts`
- `src/features/gallery-viewer/index.ts`
- `src/pages/GalleryPage.tsx`
- **Tests:** PageView routes correct component per MediaType, mediaGrouping extracts correct groups

### 2.7: Video Player Component
**Depends on:** 1.1, 1.3
**Files:**
- `src/features/gallery-viewer/ui/VideoPlayer.tsx`
- `src/features/gallery-viewer/ui/VideoControls.tsx` (play, seek, volume, speed, loop, pip, fullscreen)
- `src/features/gallery-viewer/ui/SeekBar.tsx` (with hover preview)
- `src/features/gallery-viewer/ui/VolumeSlider.tsx`
- `src/features/gallery-viewer/model/useVideoPlayerStore.ts`
- **Tests:** play/pause toggle, speed change, loop threshold logic

---

## Phase 3 — Secondary Features (all parallelizable with each other)

### 3.1: Layouts — Sidebar + Header + StatusBar
**Files:** `src/layouts/Sidebar.tsx`, `Header.tsx`, `StatusBar.tsx`
- Sidebar: drive list, root list, recent, favorites, tags sections (all collapsible)
- Header: hamburger toggle, app title, search bar, settings + favorites shortcut
- StatusBar: drive count, gallery count, file count, last scan time

### 3.2: Search Feature
**Files:** `src/features/search/*`

### 3.3: File Manager Feature
**Files:** `src/features/file-manager/*`, `src/pages/FileManagerPage.tsx`

### 3.4: Zip Recovery Feature
**Files:** `src/features/zip-recovery/*`, `src-tauri/src/services/zip_handler.rs`, `src-tauri/src/commands/zip_ops.rs`

### 3.5: Favorites Feature
**Files:** `src/features/favorites/*`

### 3.6: Reading Progress Feature
**Files:** `src/features/reading-progress/*`

### 3.7: Tag System Feature
**Files:** `src/features/tag-system/*`

### 3.8: Settings + ffmpeg Status
**Files:** `src/features/settings/*`, `src/pages/SettingsPage.tsx`
- Includes ffmpeg detection status, install instructions per platform
- Thumbnail cache size display + clear cache button
- Metadata export/import controls

### 3.9: Metadata Export/Import
**Files:** `src-tauri/src/commands/metadata_export.rs`, frontend UI in settings
- Export `.hoshii-meta.json` sidecar to root folder
- Import on root folder scan if sidecar detected

### 3.10: File Watcher (Live Updates)
**Files:** `src-tauri/src/services/file_watcher.rs`, integration with scanner
- Watch active root folders for changes
- Debounce events, incremental SQLite update, emit frontend event

---

## Phase 4 — Polish

### 4.1: Keyboard Navigation System (full implementation)
### 4.2: i18n — English + Traditional Chinese + Japanese
### 4.3: Performance Tuning — virtual scroll buffer sizes, thumbnail preloading, lazy feature code-split
### 4.4: Error Boundaries + Empty States (no galleries, no artists, first-run)
### 4.5: Onboarding — first-run welcome, add-your-first-root-folder flow
### 4.6: Cross-Platform CSS QA — WebKit prefixes, scrollbar styling, font rendering

---

## Parallel Safety Matrix

Tasks on the same row can be developed simultaneously with zero file conflicts:

| Group | Tasks | Notes |
|-------|-------|-------|
| A | 2.1 (Rust scanner) + 2.4 (Browse roots UI) + 2.6 (Gallery reader UI) | Rust vs frontend, different feature folders |
| B | 2.2 (Rust thumbnails) + 2.5 (Browse artists UI) + 2.7 (Video player UI) | Rust vs frontend, different feature folders |
| C | 2.3 (Rust media probe) + 1.3 (Shared UI) | Independent Rust service + shared components |
| D | 3.1 + 3.3 + 3.4 + 3.5 | All different folders |
| E | 3.2 + 3.6 + 3.7 + 3.8 | All different folders |
| F | 3.9 + 3.10 | Different Rust services + commands |

**Merge-sensitive files** (only need line appends, low conflict risk):
- `src/app/routes.tsx` — add route entry
- `src/app/providers.tsx` — add store/provider
- `src-tauri/src/main.rs` — register command
- `src-tauri/src/commands/mod.rs` — re-export module
