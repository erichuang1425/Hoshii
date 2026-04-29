# Development Status

**All 6 phases are complete.** 158 frontend tests + 117+ Rust tests = 275+ total tests passing. Phase 6 hardening is fully done — all bugs fixed, all features implemented.

---

## Completed Tasks

| Phase | Task | Description |
|-------|------|-------------|
| 1 | 1.1 | Project Scaffold (Tauri v2 + React 18 + TS, all feature stubs) |
| 1 | 1.2 | Rust Core (SQLite WAL, volume tracker, all model structs, 8 tests) |
| 1 | 1.3 | Shared UI Components (12 components, 2 hooks, mediaUtils, 49 tests) |
| 2 | 2.1 | Rust Scanner — full + incremental (natural sort, media detection, mtime diff) |
| 2 | 2.2 | Rust Thumbnail Generator (Lanczos3 resize, WebP output, LRU eviction) |
| 2 | 2.3 | Rust Media Probe + Video Processing (ffmpeg detection, remux, AVIF→WebP) |
| 2 | 2.4 | Browse Roots UI (grid, cards, native folder picker, offline section) |
| 2 | 2.5 | Browse Artists UI (virtualized grid, gallery cards with progress/favorites) |
| 2 | 2.6 | Gallery Viewer UI (reader, all modes, keyboard shortcuts, click zones) |
| 2 | 2.7 | Video Player (custom controls, seek, volume, speed, loop, PiP) |
| 3 | 3.1 | Sidebar Navigation (drives, roots, recent, tags, fixed bottom nav) |
| 3 | 3.2 | Header Bar (hamburger, search, shortcuts) |
| 3 | 3.3 | Status Bar (drive count, gallery count, last scan time) |
| 4 | 4.1 | Settings Page (theme, reading, thumbnails, video, gallery, advanced) |
| 4 | 4.2 | Favorites System (optimistic toggle, grid page) |
| 4 | 4.3 | Tag System (add/remove modal, multi-select filter) |
| 4 | 4.4 | Search (300ms debounce, recent queries, URL sync) |
| 4 | 4.5 | File Manager (selection, bulk move, create gallery) |
| 4 | 4.6 | Zip Recovery (integrity verification, per-row restore) |
| 5 | 5.1a | Webtoon Mode (continuous vertical scroll, virtualized) |
| 5 | 5.1b | Infinite Slider (scrubbable thumbnail scrollbar) |
| 5 | 5.1c | Reading Toolbar + Auto-Scroll (fit modes, direction, speed control) |
| 5 | 5.2 | Smart Collection Linking (Levenshtein + regex, union-find grouping) |
| 5 | 5.3 | Chronological Smart Linking (date parsing, prev/next chain) |
| 5 | 5.4 | Timeline Navigation (per-image date plotting, zoom levels) |

---

## Phase 6: Hardening & Integration — ✅ COMPLETE

### 6.1: Fix Known Bugs — ✅ COMPLETE

All bugs have been fixed:

| Bug | File | Status |
|-----|------|--------|
| `thumbnail_grid` mode uses raw `entry.path` instead of `toAssetUrl()` | `GalleryReader.tsx` | ✅ Fixed — line 173 uses `toAssetUrl(entry.path)` |
| `getFavoriteGalleries` fetches ALL galleries and filters client-side | `favoritesApi.ts` | ✅ Fixed — calls `get_favorite_galleries` Rust command directly |
| 12 TypeScript compilation errors (showToast API mismatch, unused imports, read-only ref, missing ReadingMode variant) | Multiple | ✅ Fixed |
| 2 Rust compilation errors (`SimpleFileOptions` → `FileOptions` for zip 0.6) | `zip_ops.rs` | ✅ Fixed |
| `normalize_name` didn't strip `vol.`/`ch.` suffixes (with dots) | `smart_grouping.rs` | ✅ Fixed — keywords now include dot variants |
| `try_ym_separated` incorrectly skipped `YYYY_MM_text` patterns | `chrono_linking.rs` | ✅ Fixed — now checks if chars after separator are digits before skipping |
| `ReadingMode` type missing `'long_strip'` variant | `media.ts` | ✅ Fixed |
| Unused `rusqlite::params` imports causing warnings | `favorites.rs`, `tags.rs` | ✅ Fixed |

---

### 6.2: Implement Missing Rust Commands — ✅ COMPLETE (18 of 18 commands)

All Rust commands implemented and registered in `main.rs`. Total: 42 registered commands.

**Commands (18):**

| Command | File | Status |
|---------|------|--------|
| `get_settings` | `commands/settings.rs` | ✅ |
| `update_settings` | `commands/settings.rs` | ✅ |
| `get_root_folders` | `commands/root_folders.rs` | ✅ |
| `add_root_folder` | `commands/root_folders.rs` | ✅ |
| `remove_root_folder` | `commands/root_folders.rs` | ✅ |
| `toggle_favorite` | `commands/gallery_ops.rs` | ✅ |
| `update_reading_progress` | `commands/gallery_ops.rs` | ✅ |
| `get_recent_galleries` | `commands/gallery_ops.rs` | ✅ |
| `search_galleries` | `commands/gallery_ops.rs` | ✅ |
| `get_gallery_tags` | `commands/tag_ops.rs` | ✅ |
| `add_tag` | `commands/tag_ops.rs` | ✅ |
| `remove_tag` | `commands/tag_ops.rs` | ✅ |
| `search_by_tags` | `commands/tag_ops.rs` | ✅ |
| `get_unorganized_files` | `commands/file_ops.rs` | ✅ |
| `move_files_to_gallery` | `commands/file_ops.rs` | ✅ |
| `create_gallery_folder` | `commands/file_ops.rs` | ✅ |
| `verify_zip_integrity` | `commands/zip_ops.rs` | ✅ |
| `restore_from_zip` | `commands/zip_ops.rs` | ✅ |
| `export_metadata` | `commands/metadata_io.rs` | ✅ |
| `import_metadata` | `commands/metadata_io.rs` | ✅ |

---

### 6.3: Add Error Boundary — ✅ COMPLETE

- Created `src/shared/ui/ErrorBoundary.tsx` — class component with `componentDidCatch`, recovery UI with "Try Again" button
- Wrapped `RouterProvider` in `App.tsx` with `ErrorBoundary`
- Added 5 tests covering: normal render, error catch, custom fallback, onError callback, retry recovery
- Exported from `src/shared/ui/index.ts`

---

### 6.4: Implement Reading Progress Feature — ✅ COMPLETE

- Created `readingProgressApi.ts` with `updateReadingProgress()` and `getRecentGalleries()`
- Created `useReadingProgressStore.ts` with `saveProgress()` and `fetchRecentGalleries()`
- Integrated into `GalleryReader.tsx`: 3s debounced save on page change + save on unmount
- Added "Continue Reading" section to `HomePage.tsx` with cover images and progress bars
- Added 5 tests for the store
- Added i18n keys `shared.continueReading` (en + zh-TW)

---

### 6.5: Wire Up SmartGroupsPanel into ArtistPage — ✅ COMPLETE

SmartGroupsPanel was already imported in ArtistPage. Added:
- Collapse/expand toggle with chevron icon and smooth rotation
- Collapsed state hides group list, preserves panel header
- SmartGroupsPanel now visible even when galleries are filtered to empty (panel stays in sidebar)

---

### 6.6: Integrate Tag System into Gallery Browsing — ✅ COMPLETE

- Added tag pills to `GalleryCard.tsx` (first 3 tags shown, "+N" overflow)
- Added hover tag button on gallery cards to open TagModal for quick tagging
- Added tag filter bar in `ArtistPage.tsx` (toggle tag pills, clear filter button)
- Tags batch-loaded per artist via `useTagStore.fetchBatchGalleryTags()` instead of per-card fetching
- GalleryCard skips fetch if tags already cached

---

### 6.7: Integrate File Watcher Service — ✅ COMPLETE

- Created `src-tauri/src/services/file_watcher.rs` with debounced watch (100ms)
- `FileWatcherService` manages per-root watchers with `watch_root()`, `unwatch_root()`, `unwatch_all()`
- Registered in `main.rs`: auto-watches existing root folders on startup
- Emits `gallery_updated` Tauri event with `rootPath` and `changedPaths`
- Created `useGalleryUpdateListener` hook for frontend event listening
- Exported from `src/shared/hooks/index.ts`
- Wired into `MainLayout.tsx` to auto-refresh roots on file system changes

---

### 6.8: Add Missing Test Coverage — ✅ COMPLETE

Added 28 new frontend tests (130 → 158):

| Suite | Tests Added |
|-------|------------|
| ErrorBoundary | 5 (render, catch, custom fallback, onError, retry) |
| File Manager store | 9 (fetch, select, move, create, clear) |
| Zip Recovery store | 9 (verify, restore, counts, clear) |
| Reading Progress store | 5 (save, fetch, defaults, error handling) |

---

### 6.9: Implement Light Mode Theme — ✅ COMPLETE

- Light mode CSS variables already defined in `global.css` under `[data-theme="light"]`
- All components verified to use CSS variables — no hardcoded hex colors in TSX files
- Theme toggle wired in `App.tsx` via `document.documentElement.setAttribute('data-theme', theme)`
- Settings panel has dark/light selector

---

### 6.10: ArtistCard Thumbnail — ✅ COMPLETE

- Added `coverPath: Option<String>` to Rust `Artist` model
- Updated `get_artists` SQL query to include first gallery's `cover_path` via subquery
- Added `coverPath: string | null` to TypeScript `Artist` interface
- `ArtistCard` now renders cover image via `toAssetUrl()` with placeholder fallback

**Files modified:**
- `src-tauri/src/models/gallery.rs` — added `cover_path` field to `Artist`
- `src-tauri/src/commands/db_ops.rs` — updated `get_artists` query with cover subquery
- `src/shared/types/gallery.ts` — added `coverPath` to `Artist` interface
- `src/features/browse-artists/ui/ArtistCard.tsx` — render cover image or placeholder

---

### 6.11: Replace Drive Polling with Tauri Events — ✅ COMPLETE

- `useDriveStatus.ts` now listens for `volume_status_changed` Tauri events via `listen()` API
- Polling reduced to 30s fallback (from 5s) for resilience
- `refresh_volume_status` Rust command now emits `volume_status_changed` events when volume online status changes
- Event payload: `{ volumeId: number, isOnline: boolean }`

**Files modified:**
- `src/shared/hooks/useDriveStatus.ts` — event-driven + 30s fallback polling
- `src-tauri/src/commands/volumes.rs` — emit events on status change

---

### 6.12: Add Database Migration System — ✅ COMPLETE

- Added `schema_version` table to track applied migrations
- Created `src-tauri/src/db/migrations/` with numbered SQL files
- Migration runner in `db/mod.rs` applies unapplied migrations in order on startup
- Migrations are idempotent — re-running skips already-applied versions
- Added 2 new tests for migration tracking and idempotency

**Files:**
- `src-tauri/src/db/mod.rs` — migration runner with `MIGRATIONS` constant
- `src-tauri/src/db/migrations/001_initial_schema.sql` — original schema
- `src-tauri/src/db/migrations/002_add_schema_version.sql` — schema_version table

---

### Additional Bug Fixes (Phase 6 Hardening)

| Bug | Fix | Files |
|-----|-----|-------|
| ArtistPage tag filter global scope | Tag filter already intersects `filteredGalleries` with artist's `galleries` (correct scoping) | `ArtistPage.tsx` |
| `useGalleryUpdateListener` not consumed | Wired into `MainLayout.tsx` to refresh roots on file changes | `MainLayout.tsx` |
| GalleryCard N+1 tag fetching | Added `fetchBatchGalleryTags()` to tag store; ArtistPage batch-loads; GalleryCard skips if cached | `useTagStore.ts`, `ArtistPage.tsx`, `GalleryCard.tsx` |
| ArtistPage unused imports | Removed unused `useState` import and `activeTagFilter` local state | `ArtistPage.tsx` |
| SmartGroupsPanel disappears on empty filter | Panel now renders even when `displayedGalleries` is empty | `ArtistPage.tsx` |
| `reading-progress/ui/index.ts` empty stub | Removed empty file and directory; removed re-export from barrel | `reading-progress/index.ts` |
| Metadata export/import unimplemented | Added `export_metadata` and `import_metadata` Rust commands with `.hoshii-meta.json` sidecar | `commands/metadata_io.rs`, `main.rs` |
| `reading-progress/index.ts` re-exports empty `./ui` | Removed `./ui` re-export | `reading-progress/index.ts` |

---

## Test Coverage

| Suite | Tests |
|-------|-------|
| Rust (all services + migrations) | 117+ |
| Shared UI (incl. ErrorBoundary) | 54 |
| Browse Roots store | 5 |
| Browse Artists store | 6 |
| Gallery Reader store | 12 |
| Media Grouping | 8 |
| Video Player store | 10 |
| PageView routing | 5 |
| Settings store | 5 |
| Favorites store | 5 |
| Search store | 7 |
| Tag store | 6 |
| Smart Groups store | 4 |
| Chrono store | 7 |
| File Manager store | 9 |
| Zip Recovery store | 9 |
| Reading Progress store | 5 |
| **Frontend total** | **158** |
| **Grand total** | **275+** |

**Note:** Rust tests require `libgtk-3-dev` and other Tauri system dependencies. Frontend tests run cleanly with `npx vitest run`. Run `npm install` before frontend tests.

---

## i18n Coverage (en + zh-TW)

Browse Roots (12), Browse Artists (14), Gallery Viewer (3), Video Player (6), Sidebar (11), Header (4), Status Bar (9), Settings (40+), Favorites (5), Tags (11), Search (7), File Manager (12), Zip Recovery (15), Shared (16), Reader Toolbar (13), Smart Groups (2), Timeline (3).

---

## Known Technical Debt

| Item | File | Category |
|------|------|----------|
| `Mutex<Connection>` — needs connection pool | `db/mod.rs` | PERF |
| ~~Polls drives every 5s instead of Tauri events~~ | `useDriveStatus.ts` | ~~UX~~ ✅ Fixed (6.11) |
| ~~Light mode CSS not implemented~~ | `global.css` | ~~UI~~ ✅ Fixed (6.9) |
| ~~`ArtistCard` uses placeholder, not first gallery cover~~ | `ArtistCard.tsx` | ~~UI~~ ✅ Fixed (6.10) |
| ~~`thumbnail_grid` mode uses raw `entry.path`, not `toAssetUrl()`~~ | `GalleryReader.tsx` | ~~Bug~~ ✅ Fixed |
| ~~`getFavoriteGalleries` filters all galleries client-side~~ | `favoritesApi.ts` | ~~PERF~~ ✅ Fixed |
| ~~15 frontend `invoke()` calls reference unimplemented Rust commands~~ | Backend | ~~Critical~~ ✅ Fixed |
| ~~`SmartGroupsPanel` not wired into `ArtistPage`~~ | `SmartGroupsPanel.tsx` | ~~Missing~~ ✅ Fixed (6.5) |
| EXIF date extraction not implemented (filename-based only) | `chrono_linking.rs` | Feature gap |
| ~~No Error Boundary~~ | `App.tsx` | ~~Robustness~~ ✅ Fixed (6.3) |
| ~~`reading-progress` feature is an empty stub~~ | `features/reading-progress/` | ~~Missing~~ ✅ Fixed (6.4) |
| ~~File watcher (`notify`) imported but not integrated~~ | `services/file_watcher.rs` | ~~Missing~~ ✅ Fixed (6.7) |
| ~~Settings commands (`get_settings`/`update_settings`) not implemented~~ | Backend | ~~Missing~~ ✅ Fixed |
| ~~Metadata export/import commands not implemented~~ | Backend | ~~Missing~~ ✅ Fixed |
| ~~No database migration system~~ | `db/mod.rs` | ~~Tech debt~~ ✅ Fixed (6.12) |
| ~~File Manager + Zip Recovery have no frontend tests~~ | Frontend | ~~Test gap~~ ✅ Fixed (6.8) |
| ~~Tag filtering in ArtistPage doesn't scope to current artist~~ | `ArtistPage.tsx` | ~~UX~~ ✅ Verified correct |
| ~~`useGalleryUpdateListener` hook created but not yet consumed by stores~~ | Frontend | ~~Integration gap~~ ✅ Fixed |

Find all in-code debt markers:
```bash
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

---

## Session Insights

### Tauri v2 capabilities require explicit fs permission entries
No `fs:allow-all` exists. Each permission must be listed individually in `src-tauri/capabilities/default.json`.

### Linux volume detection needs fallback chain
`blkid` requires root on some distros. Fallback: `/dev/disk/by-uuid/` symlink resolution. File: `services/volume_tracker.rs`.

### Natural sort uses FIRST digit sequence
Must extract the **first** digit sequence (not last) to correctly group `pic2_final.jpg` as group "pic", number 2. File: `services/natural_sort.rs`.

### jsdom must be an explicit devDependency
Vitest `environment: 'jsdom'` does not bundle jsdom. Requires `npm install --save-dev jsdom`.

### Zustand store tests work without React rendering
All store tests use `vi.mock()` for API modules and `getState()`/`setState()` directly.

### Modal.tsx has no `onOpen` callback
Use `useEffect(() => { if (open) doThing(); }, [open])` instead of an `onOpen` prop.

### npm install with optional deps can break rollup
Use `npm install --prefer-offline --no-optional` then `npm install --ignore-scripts` if rollup errors appear.

### Batch tag fetching prevents N+1 API calls
When loading artist galleries, call `fetchBatchGalleryTags(galleryIds)` once from ArtistPage instead of per-card fetching. GalleryCard checks cache before individual fetch.

### DB migration system uses embedded SQL
Migrations are `include_str!()` compiled into the binary. No runtime file resolution needed. Migration runner bootstraps `schema_version` table before checking versions.

---

## Remaining Work (Post-Phase 6)

All planned phases and hardening tasks are complete. Remaining items for future consideration:

| Item | Priority | Description |
|------|----------|-------------|
| EXIF date extraction | LOW | Currently only parses dates from filenames; could extract EXIF data for more accurate chronological linking |
| Connection pooling | LOW | Replace `Mutex<Connection>` with a connection pool (`r2d2-sqlite`) for better concurrency |
| E2E tests | LOW | Add Playwright or Cypress integration tests for full user flows |
| Accessibility audit | LOW | Screen reader testing, keyboard-only navigation, ARIA labels |
| Performance profiling | LOW | Profile large collections (10k+ galleries) for bottlenecks |
