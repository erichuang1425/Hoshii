# Development Status

**All 5 planned phases are complete. Phase 6 (Hardening) nearly complete.** 158 frontend tests + 117 Rust tests = 275 total tests passing.

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

## Next Steps — Phase 6: Hardening & Integration

All core features are built. This phase focuses on fixing bugs, wiring up unconnected pieces, adding missing backend commands, improving robustness, and closing test gaps. Each task is independent and can be done in any order.

---

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

### 6.2: Implement Missing Rust Commands — ✅ COMPLETE (16 of 18 commands)

All frontend-referenced Rust commands have been implemented and registered in `main.rs`. The `app_settings` key-value table was added to the schema. The `AppSettings` Rust model was updated to include all 17 fields matching the frontend type.

**Implemented commands (16):**

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

**Remaining (2, lower priority):**

| Command | Purpose | Status |
|---------|---------|--------|
| `export_metadata` | Export `.hoshii-meta.json` sidecar | Pending |
| `import_metadata` | Import sidecar metadata | Pending |

**Files created:**
- `src-tauri/src/commands/settings.rs`
- `src-tauri/src/commands/root_folders.rs`
- `src-tauri/src/commands/gallery_ops.rs`
- `src-tauri/src/commands/tag_ops.rs`
- `src-tauri/src/commands/file_ops.rs`
- `src-tauri/src/commands/zip_ops.rs`

**Files modified:**
- `src-tauri/src/commands/mod.rs` — added 6 new modules
- `src-tauri/src/main.rs` — registered 18 new commands (40 total)
- `src-tauri/src/db/schema.sql` — added `app_settings` table
- `src-tauri/src/models/scan.rs` — added 6 missing fields to `AppSettings`

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

---

### 6.6: Integrate Tag System into Gallery Browsing — ✅ COMPLETE

- Added tag pills to `GalleryCard.tsx` (first 3 tags shown, "+N" overflow)
- Added hover tag button on gallery cards to open TagModal for quick tagging
- Added tag filter bar in `ArtistPage.tsx` (toggle tag pills, clear filter button)
- Tags auto-load per gallery card via `useTagStore.fetchGalleryTags()`

---

### 6.7: Integrate File Watcher Service — ✅ COMPLETE

- Created `src-tauri/src/services/file_watcher.rs` with debounced watch (100ms)
- `FileWatcherService` manages per-root watchers with `watch_root()`, `unwatch_root()`, `unwatch_all()`
- Registered in `main.rs`: auto-watches existing root folders on startup
- Emits `gallery_updated` Tauri event with `rootPath` and `changedPaths`
- Created `useGalleryUpdateListener` hook for frontend event listening
- Exported from `src/shared/hooks/index.ts`

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

### 6.9: Implement Light Mode Theme

**Priority: LOW** — Dark mode is the primary theme but light mode tokens exist in the design.

- Define light mode CSS variables in `global.css` under `[data-theme="light"]`
- Ensure all components use CSS variables (not hardcoded dark colors)
- Test contrast ratios for accessibility
- Wire theme toggle in settings to `document.documentElement.dataset.theme`
- Verify offline overlay, badges, progress bars are visible in light mode

**Files:**
- `src/app/global.css` (add light theme variables)
- `src/features/settings/ui/SettingsPanel.tsx` (ensure theme toggle works)

---

### 6.10: Fix ArtistCard Thumbnail

**Priority: LOW** — ArtistCard currently shows a placeholder instead of the first gallery's cover image.

- When loading artists, also fetch the first gallery's `coverPath` for each artist
- Pass cover path to `ArtistCard` and render via `toAssetUrl()`
- Fall back to placeholder if no galleries exist or cover is null
- Handle offline drive (show cached thumbnail or placeholder)

**Files:**
- `src/features/browse-artists/ui/ArtistCard.tsx`
- `src/features/browse-artists/api/artistApi.ts` (fetch cover with artist)
- May need a new Rust command or modify `get_artists` to include first gallery cover

---

### 6.11: Replace Drive Polling with Tauri Events

**Priority: LOW** — Currently polls drive status every 5 seconds instead of using event-driven updates.

- Use Tauri's `listen` API to subscribe to volume change events from Rust
- In Rust, emit `volume_status_changed` event when file watcher detects mount/unmount
- Remove the 5s `setInterval` in `useDriveStatus.ts`
- Fall back to polling only if event-based detection is unavailable on the platform

**Files:**
- `src/shared/hooks/useDriveStatus.ts`
- `src-tauri/src/services/volume_tracker.rs` (emit events)
- `src-tauri/src/main.rs` (set up event listener)

---

### 6.12: Add Database Migration System

**Priority: LOW** — Currently uses a single idempotent `schema.sql`. Fine for now, but will break when schema changes are needed post-release.

- Add a `schema_version` table to track applied migrations
- Create `src-tauri/src/db/migrations/` with numbered SQL files (e.g., `001_initial.sql`, `002_add_settings_table.sql`)
- Run unapplied migrations in order on startup
- This enables safe schema evolution without data loss

**Files:**
- `src-tauri/src/db/mod.rs` (add migration runner)
- `src-tauri/src/db/migrations/001_initial.sql` (move current schema.sql content)

---

## Task Parallel Safety

All Phase 6 tasks can be done independently. No file conflicts between tasks except:

| Shared File | Tasks That Touch It |
|-------------|-------------------|
| `main.rs` | 6.2, 6.7, 6.11 (append-only — register commands/events) |
| `ArtistPage.tsx` | 6.5, 6.6 (different sections of the page) |
| `GalleryReader.tsx` | 6.1, 6.4 (different areas — thumbnail grid vs progress saving) |

---

## Test Coverage

| Suite | Tests |
|-------|-------|
| Rust (all services) | 117 |
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
| **Grand total** | **275** |

**Note:** Rust tests require `libgtk-3-dev` and other Tauri system dependencies. Frontend tests run cleanly with `npx vitest run`. Run `npm install` before frontend tests.

---

## i18n Coverage (en + zh-TW)

Browse Roots (12), Browse Artists (14), Gallery Viewer (3), Video Player (6), Sidebar (11), Header (4), Status Bar (9), Settings (40+), Favorites (5), Tags (11), Search (7), File Manager (12), Zip Recovery (15), Shared (16), Reader Toolbar (13), Smart Groups (2), Timeline (3).

---

## Known Technical Debt

| Item | File | Category |
|------|------|----------|
| `Mutex<Connection>` — needs connection pool | `db/mod.rs` | PERF |
| Polls drives every 5s instead of Tauri events | `useDriveStatus.ts` | UX |
| Light mode CSS not implemented | `global.css` | UI |
| `ArtistCard` uses placeholder, not first gallery cover | `ArtistCard.tsx` | UI |
| ~~`thumbnail_grid` mode uses raw `entry.path`, not `toAssetUrl()`~~ | `GalleryReader.tsx` | ~~Bug~~ ✅ Fixed |
| ~~`getFavoriteGalleries` filters all galleries client-side~~ | `favoritesApi.ts` | ~~PERF~~ ✅ Fixed |
| ~~15 frontend `invoke()` calls reference unimplemented Rust commands~~ | Backend | ~~Critical~~ ✅ Fixed |
| ~~`SmartGroupsPanel` not wired into `ArtistPage`~~ | `SmartGroupsPanel.tsx` | ~~Missing~~ ✅ Fixed (6.5) |
| EXIF date extraction not implemented (filename-based only) | `chrono_linking.rs` | Feature gap |
| ~~No Error Boundary~~ | `App.tsx` | ~~Robustness~~ ✅ Fixed (6.3) |
| ~~`reading-progress` feature is an empty stub~~ | `features/reading-progress/` | ~~Missing~~ ✅ Fixed (6.4) |
| ~~File watcher (`notify`) imported but not integrated~~ | `services/file_watcher.rs` | ~~Missing~~ ✅ Fixed (6.7) |
| ~~Settings commands (`get_settings`/`update_settings`) not implemented~~ | Backend | ~~Missing~~ ✅ Fixed |
| Metadata export/import commands not implemented | Backend | Missing |
| No database migration system | `db/mod.rs` | Tech debt |
| ~~File Manager + Zip Recovery have no frontend tests~~ | Frontend | ~~Test gap~~ ✅ Fixed (6.8) |
| Tag filtering in ArtistPage doesn't scope to current artist | `ArtistPage.tsx` | UX |
| `useGalleryUpdateListener` hook created but not yet consumed by stores | Frontend | Integration gap |

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
