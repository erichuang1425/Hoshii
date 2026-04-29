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
- `services/volume_tracker.rs`: Platform-specific volume UUID detection (Linux: blkid + /dev/disk/by-uuid, macOS: diskutil, Windows: wmic)
- `commands/volumes.rs`: 3 Tauri commands — `detect_volumes`, `get_volumes`, `refresh_volume_status`

### Task 1.3: Shared UI Components ✅
- **Core:** `Button`, `Modal`, `Spinner`, `Badge`, `Skeleton`, `SearchInput`
- **Toast system:** `Toast.tsx` + `ToastProvider.tsx` with `useToast()` hook
- **Domain:** `OfflineOverlay`, `DriveStatusDot`, `MediaBadge`, `ProgressBar`
- **Hooks:** `useIntersectionObserver.ts`, `useDriveStatus.ts` (5s polling)
- **Utilities:** `mediaUtils.ts` (isVideoType, isAnimatedType, needsRemux, formatDuration, etc.)
- `ToastProvider` integrated into `src/app/providers.tsx`

### Task 2.1: Rust Scanner — Full + Incremental ✅
- `services/natural_sort.rs`: Case-insensitive natural sort using **first**-digit-sequence extraction. Group extraction for subheading navigation.
- `services/media_detector.rs`: Extension-based MediaType for all 18 supported extensions
- `services/scanner.rs`: Full directory walk + incremental scan via mtime-based change detection
- Commands: `scan_root_folder`, `scan_gallery`, `get_gallery_media`, `get_media_groups`, `get_artists`, `get_galleries`, `incremental_scan`
- `commands/db_ops.rs`: Batch DB ops — upsert_artist, upsert_gallery, replace_gallery_media, etc.

### Task 2.2: Rust Thumbnail Generator ✅
- `services/thumbnail.rs`: Static images via `image` crate (Lanczos3), GIF first-frame, video via ffmpeg. WebP output. Mtime-based cache invalidation. LRU eviction (default 2GB).
- Commands: `generate_thumbnail`, `evict_thumbnail_cache`, `get_thumbnail_cache_size`
- Cache: `{app_local_data}/hoshii/thumbs/`

### Task 2.3: Rust Media Probe + Video Processing ✅
- `services/video_processor.rs`: ffmpeg/ffprobe detection, media probing, MKV/AVI/MOV→MP4 remux, animated AVIF→WebP conversion, WebP/AVIF animation binary-header detection
- Commands: `probe_media`, `remux_video`, `convert_animated_avif`, `check_ffmpeg`
- Caches: `{app_local_data}/hoshii/remuxed/`, `{app_local_data}/hoshii/avif-converted/`

### Task 2.4: Browse Roots UI ✅
- `rootFolderApi.ts`, `useBrowseRootsStore.ts` (roots + volumes state, CRUD)
- Components: `RootFolderGrid`, `RootFolderCard`, `AddRootButton` (native folder picker via `@tauri-apps/plugin-dialog`), `OfflineDrivesSection`
- Page: `HomePage.tsx`

### Task 2.5: Browse Artists UI ✅
- `artistApi.ts`, `useBrowseArtistsStore.ts` (search filter, multi-field sort)
- Components: `ArtistGrid` (virtualized via `@tanstack/react-virtual`), `ArtistCard`, `GalleryCard` (cover via `toAssetUrl()`, progress bar, favorite heart)
- Pages: `ArtistListPage`, `ArtistPage`

### Task 2.6: Gallery Viewer UI ✅
- `galleryApi.ts`, `mediaGrouping.ts` (extractGroups, getGroupForIndex)
- `useGalleryReaderStore.ts`: media, groups, page nav, reading modes, zoom (0.5–3×), per-gallery localStorage prefs, fit mode, reading direction, auto-scroll
- Components: `GalleryReader` (keyboard shortcuts, click zones, direction-aware nav), `PageView` (routes to ImageView/AnimatedImageView/VideoPlayer), `ImageView`, `AnimatedImageView`, `ThumbnailStrip` (virtualized), `SubheadingNav`
- Phase 5 additions: `WebtoonView`, `InfiniteSlider`, `ReadingToolbar`, `AutoScrollController`, `TimelineView`
- Page: `GalleryPage.tsx` (full-screen, outside MainLayout, accepts `?artistId=` param)

### Task 2.7: Video Player ✅
- `useVideoPlayerStore.ts`: playing, volume (clamped), playbackRate, auto-loop for clips < 30s
- Components: `VideoPlayer` (source resolution + remux), `VideoControls`, `SeekBar` (hover tooltip), `VolumeSlider`

### Task 3.1: Sidebar Navigation ✅
- `src/layouts/useLayoutStore.ts`: Zustand store for sidebar open/collapsed + per-section collapse state
- `src/layouts/Sidebar.tsx`: Drives section (DriveStatusDot per volume), Roots section (nav to `/roots/:id/artists`, greyed if offline), Recent (via `get_recent_galleries`), Tags (via `get_all_tags` — silently ignored if command missing), fixed bottom nav (Favorites, File Manager, Settings). Active route via `useLocation`.

### Task 3.2: Header Bar ✅
- `src/layouts/Header.tsx`: Hamburger toggle, "Hoshii" title, search input (Enter → `/search?q=...`, Escape clears), Favorites + Settings icons

### Task 3.3: Status Bar ✅
- `src/layouts/StatusBar.tsx`: Drive count + offline indicator, root folder count, last scan relative time ("just now", "5m ago", "2h ago", "3d ago"), yellow "Scanning..." indicator
- `src/layouts/MainLayout.tsx`: Animated sidebar collapse (`transition-[width]`)

### Task 4.1: Settings Page ✅
- `settingsApi.ts`: `getSettings()`, `updateSettings()`
- `useSettingsStore.ts`: Optimistic updates, revert on error, calls `setLanguage()` on change
- `SettingsPanel.tsx`: Theme/Language, Reading (mode/direction/fit/autoplay/autoscroll), Thumbnails, Video, Gallery, Advanced (smart grouping/chrono linking) sections
- `SettingsPage.tsx`: Updated to use SettingsPanel

### Task 4.2: Favorites System ✅
- `favoritesApi.ts`: `toggleFavorite()`, `getFavoriteGalleries()` (uses `search_galleries('')` + client-side filter — see debt)
- `useFavoritesStore.ts`: Optimistic toggle, revert on error, per-gallery toggling deduplication
- `FavoritesGrid.tsx`, `FavoritesPage.tsx`
- `GalleryCard.tsx`: Heart button calls `useFavoritesStore.toggleFavorite`, local state for instant feedback

### Task 4.3: Tag System ✅
- `tagApi.ts`: `getGalleryTags`, `addTag`, `removeTag`, `searchByTags`
- `useTagStore.ts`: Per-gallery tag cache, active filter, optimistic removeTag with revert
- `TagModal.tsx`: Add/remove tags; loads on `open` via `useEffect`
- `TagFilter.tsx`: Multi-select tag pill filter

### Task 4.4: Search ✅
- `searchApi.ts`: `searchGalleries(query, rootId?)`
- `useSearchStore.ts`: 300ms debounce (module-level timer), recent queries (max 10, deduplicated)
- `SearchResults.tsx`, `SearchPage.tsx` (URL sync via `?q=...`, recent query pills)

### Task 4.5: File Manager ✅
- `fileManagerApi.ts`: `getUnorganizedFiles`, `moveFilesToGallery`, `createGalleryFolder`
- `useFileManagerStore.ts`: Selection (`Set<string>`), bulk move, create+move
- `FileManagerView.tsx`: Grid with checkbox-style selection, Move + Create modals
- `FileManagerPage.tsx`: Root → Artist cascade selector

### Task 4.6: Zip Recovery ✅
- `zipApi.ts`: `verifyZipIntegrity`, `restoreFromZip`
- `useZipStore.ts`: Results cache, derived counts (orphaned/missing/mismatched)
- `ZipRecoveryView.tsx`: Table with status badges, per-row Restore button
- `ZipRecoveryPage.tsx`: Root → Artist cascade selector

### Routes (Tasks 3–4) ✅
`/favorites`, `/search`, `/file-manager`, `/zip-recovery` added to `src/app/routes.tsx`

### Task 5.1a: Webtoon Mode ✅
- `WebtoonView.tsx`: `@tanstack/react-virtual` vertical scroll, scroll-tracked `currentPage`, fit mode applied to images, videos inline. Active when `readingMode === 'vertical_scroll'`.

### Task 5.1b: Infinite Slider ✅
- `InfiniteSlider.tsx`: Right-edge vertical scrubbable track. Drag-to-seek (global mouseup), floating thumbnail preview on hover with page number. Accent thumb scales up on drag.

### Task 5.1c: Assistive Reading Tools ✅
- `ReadingToolbar.tsx`: Segmented controls for mode / fit / direction / auto-scroll. Shows/hides with header.
- `AutoScrollController.tsx`: Headless rAF scroller (`px/s`, 1–200). Calls `onReachEnd` at bottom.
- `useGalleryReaderStore.ts` extended: `fitMode` (`fit_best|fit_width|fit_height|original`), `readingDirection` (`ltr|rtl|vertical`), `autoScroll`, `autoScrollSpeed`. Per-gallery prefs persisted to `localStorage` key `hoshii:reader-prefs:{galleryId}`. RTL swaps forward/back direction.

### Task 5.2: Smart Collection Linking ✅
- `services/smart_grouping.rs`: `normalize_name()` (lowercase, remove brackets/vol/ch/ep suffixes/trailing digits), `levenshtein()` (2-row DP), `compute_smart_groups()` (union-find, threshold ≤ 2, ≥2 galleries per group)
- Commands: `get_smart_groups(artist_id, threshold?)`, `get_smart_groups_for_root(root_id, threshold?)`
- Frontend: `useSmartGroupsStore`, `SmartGroupsPanel` (clickable volume number buttons → `/gallery/:id`)

### Task 5.3: Chronological Smart Linking ✅
- `services/chrono_linking.rs`: `parse_date_from_name()` handles YYYY-MM-DD, YYYYMMDD, YYYY-MM, month names (Jan/January), year-only. `parse_date_from_filename()` strips extension first. `build_chronological_groups()` sorts by ISO date string.
- Commands: `get_chronological_groups(artist_id)`, `get_gallery_timeline(gallery_id)` (per-file date for timeline UI)
- Frontend: `useChronoStore` (`fetchGroups`, `fetchTimeline`, `getPrevGallery`, `getNextGallery`)
- `ChronoNav` bar in `GalleryReader` when `artistId` prop provided

### Task 5.4: Timeline Navigation ✅
- `TimelineView.tsx`: Groups `TimelineEntry[]` by date → proportional-width buttons. Active group highlighted. "Undated" bucket for undated files. Hidden when ≤ 1 group. Click jumps to first image of that date.
- `GalleryPage.tsx` passes `?artistId=` to `GalleryReader` for chrono linking.

---

## Current Test Status

| Suite | Tests | Notes |
|-------|-------|-------|
| Rust (all services) | 79 | Verified in Phase 3-4 session; GTK dev libs needed to rerun (`libgtk-3-dev` not in current container) |
| Shared UI | 49 | Button, Badge, Spinner, Toast, MediaBadge, ProgressBar, DriveStatusDot, mediaUtils |
| Browse Roots store | 5 | |
| Browse Artists store | 6 | |
| Gallery Reader store | 12 | Includes 4 new Phase 5 tests (fitMode, direction, autoScroll, speed clamp) |
| Media Grouping | 8 | |
| Video Player store | 10 | |
| PageView routing | 5 | |
| Settings store | 5 | |
| Favorites store | 5 | |
| Search store | 7 | |
| Tag store | 6 | |
| Smart Groups store | 4 | |
| Chrono store | 7 | |
| **Frontend total** | **130** | `npx vitest run` — all passing |
| **Grand total** | **209** | 79 Rust + 130 frontend |

---

## i18n Keys (en + zh-TW, all keys)

- Browse Roots: 12 keys
- Browse Artists: 14 keys
- Gallery Viewer: 3 keys
- Video Player: 6 keys
- Sidebar: 11 keys
- Header: 4 keys
- Status Bar: 9 keys
- Settings: 40+ keys
- Favorites: 5 keys
- Tags: 11 keys
- Search: 7 keys
- File Manager: 12 keys
- Zip Recovery: 15 keys
- Shared: 15 keys (offline, loading, search, noResults, error, retry, cancel, save, close, confirm, delete, edit, create, select, reconnectDrive)
- Reader toolbar: 13 keys (Phase 5)
- Smart Groups: 2 keys (Phase 5)
- Timeline: 3 keys (Phase 5)

---

## Known Technical Debt

```bash
# Find all TODO(debt) items:
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

| Item | File | Category |
|------|------|----------|
| `Mutex<Connection>` — needs connection pool | `db/mod.rs` | PERF |
| Polls drives every 5s instead of Tauri events | `useDriveStatus.ts` | UX |
| Light mode CSS not implemented | `global.css` | UI |
| `ArtistCard` uses placeholder, not first gallery cover | `ArtistCard.tsx` | UI |
| `thumbnail_grid` mode uses raw `entry.path`, not `toAssetUrl()` | `GalleryReader.tsx` | Bug |
| `get_all_tags` command missing from Rust backend (sidebar silently ignores) | `Sidebar.tsx` | Missing |
| `getFavoriteGalleries` filters all galleries client-side (no dedicated command) | `favoritesApi.ts` | PERF |
| `SmartGroupsPanel` not wired into `ArtistPage`/`GalleryPage` sidebar | `SmartGroupsPanel.tsx` | Missing |
| EXIF date extraction not implemented (filename-based only) | `chrono_linking.rs` | Feature gap |

---

## Session Insights

### Tauri v2 capabilities require explicit fs permission entries
- No `fs:allow-all` exists. Each permission (`fs:allow-read`, `fs:allow-write`, etc.) must be listed individually in `src-tauri/capabilities/default.json`.

### Linux volume detection needs fallback chain
- `blkid` requires root on some distros. Fallback: `/dev/disk/by-uuid/` symlink resolution.
- File: `src-tauri/src/services/volume_tracker.rs`

### Natural sort uses FIRST digit sequence
- Must extract the **first** digit sequence (not last) to correctly group `pic2_final.jpg` as group "pic", number 2.
- File: `src-tauri/src/services/natural_sort.rs`

### jsdom must be an explicit devDependency
- Vitest `environment: 'jsdom'` does not bundle jsdom. Run `npm install --save-dev jsdom`.

### Container apt proxy requires authentication in new sessions
- Previous sessions set `/etc/apt/apt.conf.d/99proxy` with `http://21.0.0.75:15004`, but that proxy now returns 407. GTK dev libs (`libgtk-3-dev`) cannot be installed via apt in new container sessions, blocking `cargo test`.
- **Workaround**: Run `cargo test` locally or in a container where GTK dev libs are pre-installed. Frontend tests (`npx vitest run`) are unaffected.

### npm install with optional deps can break rollup
- Use `npm install --prefer-offline --no-optional` then `npm install --ignore-scripts` if rollup errors appear.

### Zustand store tests work without React rendering
- All store tests use `vi.mock()` for API modules and `getState()`/`setState()` directly. No React render needed.

### Modal.tsx has no `onOpen` callback
- Use `useEffect(() => { if (open) doThing(); }, [open])` instead of an `onOpen` prop.

---

## Task Completion Table

| Task | Description | Status |
|------|-------------|--------|
| 1.1 | Project Scaffold | ✅ |
| 1.2 | Rust Core (SQLite, Volume Tracker) | ✅ |
| 1.3 | Shared UI Components | ✅ |
| 2.1 | Rust Scanner (Full + Incremental) | ✅ |
| 2.2 | Rust Thumbnail Generator | ✅ |
| 2.3 | Rust Media Probe + Video Processing | ✅ |
| 2.4 | Browse Roots UI | ✅ |
| 2.5 | Browse Artists UI | ✅ |
| 2.6 | Gallery Viewer UI | ✅ |
| 2.7 | Video Player | ✅ |
| 3.1 | Sidebar Navigation | ✅ |
| 3.2 | Header Bar | ✅ |
| 3.3 | Status Bar | ✅ |
| 4.1 | Settings Page | ✅ |
| 4.2 | Favorites System | ✅ |
| 4.3 | Tag System | ✅ |
| 4.4 | Search | ✅ |
| 4.5 | File Manager | ✅ |
| 4.6 | Zip Recovery | ✅ |
| 5.1a | Webtoon Mode | ✅ |
| 5.1b | Infinite Slider | ✅ |
| 5.1c | Reading Toolbar + Auto-Scroll | ✅ |
| 5.2 | Smart Collection Linking (Rust) | ✅ |
| 5.3 | Chronological Smart Linking (Rust) | ✅ |
| 5.4 | Timeline Navigation | ✅ |

**All planned phases complete.**
