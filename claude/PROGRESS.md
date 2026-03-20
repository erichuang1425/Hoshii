# Hoshii — Implementation Progress

## Completed Tasks

### Task 1.1: Project Scaffold ✅
- Tauri v2 + React 18 + TypeScript project created
- Vite config with `@/` alias, Tailwind CSS v4 (via `@tailwindcss/vite` plugin)
- All 10 feature slices scaffolded with `ui/`, `model/`, `api/` subdirs and barrel exports
- Shared types in `src/shared/types/` matching TYPES_REFERENCE.md exactly
- Shared utilities: `logger.ts`, `assetUrl.ts`, `invoke.ts` (typed Tauri wrapper)
- Shared hooks: `useKeyboard.ts`
- i18n skeleton with en + zh-TW
- Layout: `MainLayout.tsx` with sidebar/header/content/statusbar slots
- Page stubs: `HomePage`, `ArtistListPage`, `ArtistPage`, `GalleryPage`, `SettingsPage`
- Routes configured in `src/app/routes.tsx`
- `src/app/global.css` with all theme tokens from UI_REFERENCE.md
- Tauri config: asset protocol enabled, CSP set, window 1280x800

### Task 1.2: Rust Core — SQLite + Volume Tracker + Base Models ✅
- `db/mod.rs`: `init_db()` with WAL mode, foreign_keys, busy_timeout, `AppDatabase` struct with `Mutex<Connection>`
- `db/schema.sql`: All 8 tables (volumes, root_folders, artists, galleries, gallery_media, tags, gallery_tags, unorganized_files) + 10 indexes
- `models/volume.rs`: `Volume` struct with serde Serialize/Deserialize
- `models/gallery.rs`: `RootFolder`, `Artist`, `Gallery` structs
- `models/media.rs`: `MediaEntry`, `ConvertedMedia`, `MediaGroup` structs
- `models/scan.rs`: `ScanResult`, `ScanError`, `FfmpegStatus`, `AppSettings` structs
- `services/volume_tracker.rs`: Platform-specific volume UUID detection (Linux: blkid + /dev/disk/by-uuid, macOS: diskutil, Windows: wmic), `VolumeInfo` struct, `detect_volumes()` function
- `commands/volumes.rs`: 3 Tauri commands — `detect_volumes`, `get_volumes`, `refresh_volume_status`
- `main.rs`: Tauri builder with dialog/fs/shell plugins, DB init in setup, volume commands registered
- **8 tests passing**: schema creation, WAL mode verification, volume UUID extraction, volume CRUD, online/offline status tracking

### Task 1.3: Shared UI Components ✅
- **Core components:** `Button.tsx` (primary/secondary/ghost/danger variants, sm/md/lg sizes, loading state), `Modal.tsx` (dialog-based with backdrop click + Escape close), `Spinner.tsx` (sm/md/lg animated spinner), `Badge.tsx` (default/accent/success/warning/error/muted variants), `Skeleton.tsx` (shimmer loading placeholder), `SearchInput.tsx` (with search icon, clear button)
- **Toast system:** `Toast.tsx` (info/success/warning/error types with auto-dismiss) + `ToastProvider.tsx` (React context provider with `useToast()` hook)
- **Domain-specific:** `OfflineOverlay.tsx` (grey blur overlay with i18n "Offline" badge + drive label), `DriveStatusDot.tsx` (green/grey online/offline indicator), `MediaBadge.tsx` (VIDEO/GIF/AVIF badges for media type), `ProgressBar.tsx` (thin accent reading progress bar, 0-1 range)
- **Hooks:** `useIntersectionObserver.ts` (generic ref-based viewport detection), `useDriveStatus.ts` (volume online check with 5s polling)
- **Utilities:** `mediaUtils.ts` (isVideoType, isAnimatedType, isStaticImageType, needsRemux, getMediaBadgeLabel, formatDuration, getGalleryMediaTypes)
- **Barrel export:** `src/shared/ui/index.ts` exporting all 12 components + types
- **Hooks barrel:** Updated `src/shared/hooks/index.ts` with new hooks
- **Providers:** `ToastProvider` integrated into `src/app/providers.tsx`
- **i18n:** Added `shared.offline`, `shared.reconnectDrive`, `shared.loading`, `shared.search`, `shared.noResults`, `shared.error`, `shared.retry` (en + zh-TW)
- **Animations:** Added `slideInRight` and `fadeIn` keyframes to `global.css`
- **New dev dependency:** `jsdom` (required for Vitest jsdom environment)
- **49 tests passing** across 8 test files: Button (6), Badge (3), DriveStatusDot (2), MediaBadge (5), ProgressBar (4), Spinner (2), Toast (3), mediaUtils (24)

## What's NOT Done Yet

### Phase 2 (all depend on 1.2 ✅ and/or 1.3 ✅):
- **Task 2.1: Rust Scanner** — `scanner.rs`, `natural_sort.rs`, `media_detector.rs`, scan commands, incremental scan (depends on 1.2 ✅)
- **Task 2.2: Rust Thumbnail Generator** — `thumbnail.rs`, LRU disk cache (depends on 1.2 ✅)
- **Task 2.3: Rust Media Probe + Video** — `video_processor.rs`, ffmpeg detection (depends on 1.2 ✅)
- **Task 2.4: Browse Roots UI** — RootFolderGrid, AddRootButton, OfflineDrivesSection (depends on 1.3 ✅)
- **Task 2.5: Browse Artists UI** — ArtistGrid, ArtistCard (depends on 1.3 ✅)
- **Task 2.6: Gallery Viewer UI** — GalleryReader, PageView, ImageView, ThumbnailStrip (depends on 1.3 ✅)
- **Task 2.7: Video Player** — VideoPlayer, VideoControls, SeekBar (depends on 1.3 ✅)

### Phase 3 & 4: All pending (layouts, search, file manager, zip recovery, favorites, tags, settings, i18n, polish)

### Phase 5 — Advanced Gallery Modes & Smart Linking:
- **Task 5.1a: Long Strip / Webtoon Mode** — Continuous vertical scroll reader with virtualized rendering (depends on 2.6)
- **Task 5.1b: Infinite Slider** — Scrubbable scrollbar with floating thumbnail previews for fast navigation (depends on 2.6)
- **Task 5.1c: Assistive Reading Tools** — Fit modes (width/height/original/best), reading direction (LTR/RTL/Vertical), auto-scroll with adjustable speed (depends on 2.6)
- **Task 5.2: Smart Collection Linking** — Fuzzy matching engine (regex + Levenshtein distance) to auto-group similar gallery names into Smart Groups (depends on 2.1)
- **Task 5.3: Chronological Smart Linking** — Date-parsing utility for folder names, prev/next gallery navigation by chronological order (depends on 2.1, 5.2)
- **Task 5.4: Custom Timeline Navigation** — Parse dates from image filenames, render visual timeline axis for per-image chronological browsing (depends on 2.1, 5.3)

## Known Technical Debt

```bash
# Run this to find all TODO(debt) items in the codebase:
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

Current known items:
- `db/mod.rs`: Uses `Mutex<Connection>` — should be connection pool for concurrent access (TODO(debt): [PERF])
- `useDriveStatus.ts`: Polls every 5s instead of listening to Tauri events (TODO(debt): [UX])
- Feature slice barrel stubs are empty `.gitkeep` placeholders — will be replaced as features are implemented
- `global.css` has theme tokens but light mode is not yet implemented
- `src-tauri/gen/` is gitignored (auto-generated by Tauri build)

## Session Insights

### Insight: Tauri v2 capabilities require explicit fs permission entries
**Task:** 1.1 — Project Scaffold
**Category:** Gotcha
**Discovery:** Tauri v2 capabilities require individual `fs:allow-*` permission entries (read, write, stat, exists, readdir, rename, copy-file, remove, mkdir) — there is no single `fs:allow-all`.
**Impact:** File operations fail silently if specific permission not listed.
**Resolution:** Added all required `fs:allow-*` entries to `capabilities/default.json`.
**Files Affected:** `src-tauri/capabilities/default.json`

### Insight: Linux volume detection needs fallback chain
**Task:** 1.2 — Rust Core
**Category:** Compatibility
**Discovery:** `blkid` requires root on some Linux distros. `/dev/disk/by-uuid/` symlinks provide a non-root fallback but only work for some filesystem types.
**Impact:** Volume UUID detection fails for non-root users on restrictive Linux distros.
**Resolution:** Implemented fallback chain: try `blkid` first, fall back to `/dev/disk/by-uuid/` symlink resolution.
**Files Affected:** `src-tauri/src/services/volume_tracker.rs`

### Insight: jsdom needed as explicit dev dependency for Vitest
**Task:** 1.3 — Shared UI Components
**Category:** Gotcha
**Discovery:** Vitest `environment: 'jsdom'` config in `vite.config.ts` requires `jsdom` as an explicit dev dependency — it is not bundled with Vitest.
**Impact:** All frontend tests fail with `Cannot find package 'jsdom'` error.
**Resolution:** Added `jsdom` to devDependencies: `npm install --save-dev jsdom`.
**Files Affected:** `package.json`

## Parallel Development Readiness

All Phase 1 tasks are now complete. The following Phase 2 tasks can be started **now**:

| Task | Dependencies Met? | Can Start Now? |
|------|-------------------|----------------|
| 2.1 (Rust Scanner) | 1.2 ✅ | Yes |
| 2.2 (Rust Thumbnails) | 1.2 ✅ | Yes |
| 2.3 (Rust Media Probe) | 1.2 ✅ | Yes |
| 2.4 (Browse Roots UI) | 1.1 ✅, 1.3 ✅ | Yes |
| 2.5 (Browse Artists UI) | 1.1 ✅, 1.3 ✅ | Yes |
| 2.6 (Gallery Viewer UI) | 1.1 ✅, 1.3 ✅ | Yes |
| 2.7 (Video Player UI) | 1.1 ✅, 1.3 ✅ | Yes |

**Recommended parallel groups for next session:**
- **Group A:** Task 2.1 (Rust Scanner) — largest and most complex Rust task
- **Group B:** Task 2.4 (Browse Roots UI) + 2.5 (Browse Artists UI) — can run in parallel with Rust work
- **Group C:** Task 2.2 (Rust Thumbnails) + 2.3 (Rust Media Probe) — independent Rust tasks
