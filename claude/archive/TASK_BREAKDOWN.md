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

### 1.3: Shared UI Components ✅ COMPLETED
**Status:** Done. 12 components, 2 hooks, 1 utility module, 49 tests passing.
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

## Phase 5 — Advanced Gallery Modes & Smart Linking

### 5.1: Advanced Gallery Viewing Modes & UI
**Depends on:** 2.6 (Gallery Viewer UI)
**Creates:** Long Strip (Webtoon) continuous scroll mode, Infinite Slider with thumbnail scrubber, and assistive reading tools.

**Sub-tasks:**

#### 5.1a: Long Strip / Webtoon Mode (Continuous Vertical Scroll)
- Implement a seamless continuous vertical scroll reader mode for uninterrupted reading
- All gallery pages rendered in a single virtualized vertical column (using `@tanstack/react-virtual`)
- Preload 2-3 pages above/below viewport for smooth scrolling
- Auto-track reading progress as user scrolls (update `lastReadPage` based on viewport center)
- Keyboard: `Space` scrolls down one viewport height, `Shift+Space` scrolls up
- Support fit-to-width by default in this mode (images stretch to content width)

**Files:**
- `src/features/gallery-viewer/ui/LongStripReader.tsx` — Continuous vertical scroll container with virtual list
- `src/features/gallery-viewer/ui/LongStripPage.tsx` — Individual page wrapper (lazy load, intersection tracking)
- `src/features/gallery-viewer/model/useGalleryReaderStore.ts` — Add `longStrip` reading mode state + scroll position tracking
- **Tests:** Scroll position → page tracking, virtualized render with 1000+ items, preload buffer behavior

#### 5.1b: Infinite Slider (Scrubbable Thumbnail Scrollbar)
- Add a side-panel or bottom-panel slider that displays real-time thumbnail previews as the user scrubs
- Dragging the slider handle shows a floating thumbnail preview of the target page
- Clicking anywhere on the slider jumps to that page instantly
- Slider position syncs bidirectionally with current page (scrolling updates slider, slider updates page)
- Works across all reading modes (single, double, vertical scroll, long strip)

**Files:**
- `src/features/gallery-viewer/ui/InfiniteSlider.tsx` — Scrubbable scrollbar with thumbnail preview popup
- `src/features/gallery-viewer/ui/SliderThumbnailPreview.tsx` — Floating thumbnail preview shown on hover/drag
- `src/features/gallery-viewer/model/useGalleryReaderStore.ts` — Add slider position sync state
- **Tests:** Slider position ↔ page index sync, thumbnail preview render on hover, boundary clamping

#### 5.1c: Assistive Reading Tools
- **Fit modes:** Toggle between fit-to-width, fit-to-height, and original size
- **Reading direction:** Switch between LTR (left-to-right), RTL (right-to-left, for manga), and Vertical (top-to-bottom)
- **Auto-scroll:** Configurable auto-scroll with adjustable speed (pixels/second), pause on hover, resume on mouse leave
- Reading direction affects page turn behavior: RTL swaps left/right click zones and arrow key bindings
- Persist per-gallery reading direction preference in Zustand store

**Files:**
- `src/features/gallery-viewer/ui/ReadingToolbar.tsx` — Toolbar with fit mode, direction, and auto-scroll controls
- `src/features/gallery-viewer/ui/AutoScrollController.tsx` — Auto-scroll logic with speed slider and pause/resume
- `src/features/gallery-viewer/model/useReadingToolsStore.ts` — Fit mode, direction, auto-scroll speed state
- `src/shared/types/media.ts` — Add `ReadingDirection`, `FitMode`, `AutoScrollConfig` types
- **Tests:** RTL direction reverses navigation, auto-scroll speed calculation, fit mode CSS class application

---

### 5.2: Smart Collection Linking (Fuzzy Matching)
**Depends on:** 2.1 (Rust Scanner)
**Creates:** Intelligent grouping system that detects high-similarity folder names and links them into unified "Smart Groups."

**Algorithm:**
1. For each artist's gallery list, extract normalized names: strip separators (`-`, `_`, ` `), lowercase
2. Apply regex pattern matching to detect common naming conventions (e.g., `justin-1`, `justin_1`, `justin1` → base name `justin`)
3. Compute Levenshtein distance between normalized names; threshold ≤ 2 (configurable) = same group
4. Combine regex hits and fuzzy matches into Smart Groups, each with a canonical display name
5. Store Smart Group associations in SQLite for fast retrieval

**Files:**
- `src-tauri/src/services/smart_grouping.rs` — Core fuzzy matching engine:
  - `normalize_name(name: &str) -> String` — Strip separators, lowercase, remove trailing numbers
  - `extract_base_name(name: &str) -> (String, Option<u32>)` — Regex: split into base name + optional sequence number
  - `levenshtein_distance(a: &str, b: &str) -> usize` — Standard edit distance
  - `compute_smart_groups(galleries: &[Gallery]) -> Vec<SmartGroup>` — Main grouping algorithm
- `src-tauri/src/models/smart_group.rs` — `SmartGroup` struct (group name, member gallery IDs, confidence score)
- `src-tauri/src/commands/smart_groups.rs` — Tauri commands: `get_smart_groups`, `merge_smart_group`, `unlink_smart_group`
- `src-tauri/src/db/schema.sql` — New `smart_groups` + `smart_group_members` tables
- `src/features/browse-artists/ui/SmartGroupBadge.tsx` — Visual indicator showing linked galleries
- `src/features/browse-artists/ui/SmartGroupPanel.tsx` — Side panel listing all members of a Smart Group
- `src/shared/types/gallery.ts` — Add `SmartGroup` TypeScript type
- **Tests:** `justin-1` + `justin_1` + `justin1` → same group; `alice` + `bob` → no match; Unicode names; single-gallery no-group; configurable threshold

---

### 5.3: Chronological Smart Linking
**Depends on:** 2.1 (Rust Scanner), 5.2 (Smart Collection Linking)
**Creates:** Date-parsing utility that detects date-named galleries/folders and enables "Next/Previous" chronological navigation between them.

**Date Formats Detected:**
- `YYYY-MM-DD` (ISO 8601): `2024-03-15`
- `YYYYMMDD`: `20240315`
- `YYYY.MM.DD`: `2024.03.15`
- `MM-DD-YYYY` / `DD-MM-YYYY`: `03-15-2024` (with heuristic disambiguation)
- `MonthName YYYY` / `YYYY MonthName`: `March 2024`, `2024 March`
- Mixed: `gallery_2024-03-15_photos`, `shoot-20240315`

**Files:**
- `src-tauri/src/services/date_parser.rs` — Date extraction from folder/gallery names:
  - `extract_date(name: &str) -> Option<NaiveDate>` — Try all supported formats via regex
  - `sort_by_date(galleries: &mut [Gallery])` — Sort galleries by extracted date
  - `build_chronological_chain(galleries: &[Gallery]) -> Vec<ChronologicalLink>` — Prev/next links
- `src-tauri/src/models/smart_group.rs` — Add `ChronologicalLink` struct (gallery ID, prev ID, next ID, parsed date)
- `src-tauri/src/commands/smart_groups.rs` — Add `get_chronological_neighbors` command
- `src/features/gallery-viewer/ui/ChronologicalNav.tsx` — "← Previous (Mar 14)" / "Next (Mar 16) →" buttons in reader header
- `src/features/browse-artists/ui/ChronologicalTimeline.tsx` — Visual timeline bar on artist page showing date-linked galleries
- `src/shared/types/gallery.ts` — Add `ChronologicalLink` TypeScript type
- **Tests:** ISO date extraction, mixed-format folder names, ambiguous MM/DD handling, prev/next chain integrity, galleries with no date → excluded from chain

---

### 5.4: Custom Timeline Navigation (Per-Image)
**Depends on:** 2.1 (Rust Scanner), 5.3 (Chronological Smart Linking)
**Creates:** Parse date formats from individual image filenames and render a visual "Timeline" navigation mode for browsing images along a chronological axis.

**Filename Date Patterns:**
- Camera-style: `IMG_20240315_001.jpg`, `DSC_20240315_001.jpg`
- EXIF-style: `20240315_143022.jpg` (date + time)
- Custom: `photo_2024-03-15.jpg`, `2024.03.15 vacation 001.jpg`
- Fallback: use file `mtime` if no date parseable from filename

**Files:**
- `src-tauri/src/services/date_parser.rs` — Extend with `extract_date_from_filename(filename: &str) -> Option<NaiveDateTime>`:
  - Camera naming patterns via regex
  - EXIF-style timestamp parsing
  - Fallback to `mtime` from filesystem stat
- `src-tauri/src/commands/timeline.rs` — Tauri commands:
  - `get_timeline_data({ galleryId: number }) -> TimelineEntry[]` — Returns date-bucketed media entries
  - `get_timeline_range({ galleryId: number, start: string, end: string }) -> MediaEntry[]` — Filter by date range
- `src-tauri/src/models/media.rs` — Add `TimelineEntry` struct (date, media entry IDs, thumbnail paths)
- `src/features/gallery-viewer/ui/TimelineView.tsx` — Horizontal timeline axis with date markers and image thumbnails plotted along it
- `src/features/gallery-viewer/ui/TimelineScrubber.tsx` — Draggable scrubber along the timeline axis, snaps to date clusters
- `src/features/gallery-viewer/ui/TimelineDateMarker.tsx` — Date label components on the timeline axis
- `src/features/gallery-viewer/model/useTimelineStore.ts` — Timeline zoom level, visible date range, selected entry
- `src/shared/types/media.ts` — Add `TimelineEntry`, `TimelineRange` TypeScript types
- **Tests:** Camera-style filename parsing, EXIF timestamp extraction, mtime fallback, timeline bucketing by day/week/month, scrubber position → date mapping

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
| G | 5.1a + 5.1b + 5.1c | All within gallery-viewer feature, but different files |
| H | 5.2 (Smart Grouping) + 5.1 (Gallery Modes) | Rust service vs frontend feature, no file overlap |
| I | 5.3 (Chrono Linking) + 5.1 (Gallery Modes) | Rust service vs frontend feature |
| J | 5.4 (Timeline Nav) | Depends on 5.3, must be sequential |

**Merge-sensitive files** (only need line appends, low conflict risk):
- `src/app/routes.tsx` — add route entry
- `src/app/providers.tsx` — add store/provider
- `src-tauri/src/main.rs` — register command
- `src-tauri/src/commands/mod.rs` — re-export module
