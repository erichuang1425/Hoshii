# Development Status

**All 5 planned phases are complete.** 209 tests passing (79 Rust + 130 frontend).

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

### 6.1: Fix Known Bugs

**Priority: HIGH** — These are broken behaviors in existing code.

| Bug | File | Fix |
|-----|------|-----|
| `thumbnail_grid` mode uses raw `entry.path` instead of `toAssetUrl()` | `GalleryReader.tsx` | Replace `entry.path` with `toAssetUrl(entry.path)` in thumbnail grid render |
| `getFavoriteGalleries` fetches ALL galleries and filters client-side | `favoritesApi.ts` | Use the existing `get_favorite_galleries` Rust command instead of `search_galleries('')` + filter |

**Files to touch:** `src/features/gallery-viewer/ui/GalleryReader.tsx`, `src/features/favorites/api/favoritesApi.ts`

---

### 6.2: Implement Missing Rust Commands

**Priority: HIGH** — The frontend expects these commands but they don't exist in the backend.

| Command | Signature | Purpose |
|---------|-----------|---------|
| `get_settings` | `() → AppSettings` | Load persisted app settings from SQLite |
| `update_settings` | `(settings: Partial<AppSettings>) → AppSettings` | Save settings to SQLite |
| `add_root_folder` | `({ path, label? }) → RootFolder` | Add root folder + register asset scope |
| `remove_root_folder` | `({ id }) → void` | Remove root folder from DB |
| `get_root_folders` | `() → RootFolder[]` | List all root folders |
| `toggle_favorite` | `({ galleryId }) → boolean` | Toggle gallery favorite status |
| `update_reading_progress` | `({ galleryId, page }) → void` | Save reading progress |
| `get_recent_galleries` | `({ limit }) → Gallery[]` | Get recently read galleries |
| `add_tag` | `({ galleryId, tag }) → Tag` | Add tag to gallery |
| `remove_tag` | `({ galleryId, tagId }) → void` | Remove tag from gallery |
| `get_gallery_tags` | `({ galleryId }) → Tag[]` | Get tags for a gallery |
| `search_by_tags` | `({ tags }) → Gallery[]` | Find galleries by tag names |
| `search_galleries` | `({ query, rootId? }) → Gallery[]` | Text search galleries |
| `move_files_to_gallery` | `({ files, galleryPath }) → void` | Move files into a gallery folder |
| `create_gallery_folder` | `({ artistPath, name }) → Gallery` | Create new gallery directory + DB record |
| `verify_zip_integrity` | `({ artistPath }) → [{ gallery, status }]` | Check zip files against gallery folders |
| `restore_from_zip` | `({ zipPath, targetDir }) → void` | Extract zip to restore a gallery |
| `export_metadata` | `({ rootId }) → string` | Export `.hoshii-meta.json` sidecar |
| `import_metadata` | `({ rootId, filePath }) → { imported, skipped }` | Import sidecar metadata |

**Files to create/modify:**
- `src-tauri/src/commands/settings.rs` — get/update settings
- `src-tauri/src/commands/root_folders.rs` — add/remove/list root folders
- `src-tauri/src/commands/gallery_ops.rs` — toggle_favorite, update_progress, recent, search
- `src-tauri/src/commands/tag_ops.rs` — tag CRUD + search by tags
- `src-tauri/src/commands/file_ops.rs` — move files, create gallery folder
- `src-tauri/src/commands/zip_ops.rs` — verify + restore
- `src-tauri/src/commands/metadata_export.rs` — export/import sidecar
- `src-tauri/src/main.rs` — register all new commands
- `src-tauri/src/db/schema.sql` — add `app_settings` table (key-value store)

**Note:** Some of these commands exist as partial implementations in `db_ops.rs` (e.g., upsert_artist, upsert_gallery). The task is to expose them as proper Tauri commands matching the signatures in TYPES_REFERENCE.md.

---

### 6.3: Add Error Boundary

**Priority: HIGH** — The app currently has no crash protection for rendering errors.

- Create `src/shared/ui/ErrorBoundary.tsx` — class component wrapping `componentDidCatch`
- Display a recovery UI with "Something went wrong" + retry button
- Wrap the `RouterProvider` in `App.tsx` with `ErrorBoundary`
- Add per-page error boundaries for feature isolation (one feature crash shouldn't kill the whole app)
- Add a test for the error boundary

**Files:**
- `src/shared/ui/ErrorBoundary.tsx` (new)
- `src/shared/ui/index.ts` (add export)
- `src/app/App.tsx` (wrap router)

---

### 6.4: Implement Reading Progress Feature

**Priority: MEDIUM** — The feature slice exists as a stub with no implementation.

The `features/reading-progress/` directory has empty barrel files. Implement:

- `useReadingProgressStore.ts` — track `lastReadPage` per gallery, persist via `update_reading_progress` command
- Auto-save progress when user navigates pages in `GalleryReader` (debounced, every 3s or on page change)
- Auto-save on reader exit (unmount / Escape key)
- Show progress bar on `GalleryCard` (already has `ProgressBar` UI component)
- Show "Continue reading" on HomePage from `get_recent_galleries`

**Files:**
- `src/features/reading-progress/model/useReadingProgressStore.ts`
- `src/features/reading-progress/api/readingProgressApi.ts`
- `src/features/reading-progress/index.ts`
- Integrate into `GalleryReader.tsx` (call save on page change / unmount)
- Integrate into `GalleryCard.tsx` (show progress bar from gallery.lastReadPage)
- Integrate into `HomePage.tsx` (recent galleries section)

---

### 6.5: Wire Up SmartGroupsPanel into ArtistPage

**Priority: MEDIUM** — The component exists but isn't connected to any page.

- Import `SmartGroupsPanel` into `ArtistPage.tsx`
- Show above the gallery grid when smart groups are detected for the current artist
- Respect `enableSmartGrouping` setting from settings store
- Add collapse/expand toggle

**Files:** `src/pages/ArtistPage.tsx`

---

### 6.6: Integrate Tag System into Gallery Browsing

**Priority: MEDIUM** — Tags can be added/removed but aren't used for filtering during browsing.

- Add `TagFilter` to `ArtistPage.tsx` above gallery grid (filter galleries by tag)
- Add tag pills to `GalleryCard.tsx` (show first 2-3 tags, overflow "+N more")
- Add "Tag" option to gallery card context menu / hover actions
- Connect `TagModal` to gallery cards for quick tagging

**Files:**
- `src/pages/ArtistPage.tsx` (add TagFilter)
- `src/features/browse-artists/ui/GalleryCard.tsx` (show tags, add tag button)

---

### 6.7: Integrate File Watcher Service

**Priority: MEDIUM** — The `notify` crate is imported but the file watcher service isn't connected.

- Implement `services/file_watcher.rs` — watch active root folders for file changes
- Debounce events (100ms) to batch rapid changes
- On change: trigger incremental scan for affected gallery, update SQLite
- Emit Tauri event `gallery_updated` to frontend
- Frontend: listen for event in `useBrowseRootsStore` / `useBrowseArtistsStore` and refresh affected data
- Start/stop watcher when root folders are added/removed
- Handle drive disconnect (watcher errors) gracefully

**Files:**
- `src-tauri/src/services/file_watcher.rs` (implement)
- `src-tauri/src/main.rs` (start watcher on app launch)
- `src/features/browse-roots/model/useBrowseRootsStore.ts` (listen for events)

---

### 6.8: Add Missing Test Coverage

**Priority: MEDIUM** — Several features have no frontend tests.

| Feature | Missing Tests | Priority |
|---------|--------------|----------|
| File Manager | Store tests (selection, move, create) | Medium |
| Zip Recovery | Store tests (verify, restore) | Medium |
| Error Boundary | Catches error, shows fallback | High |
| GalleryReader | Keyboard navigation end-to-end | Medium |
| Reading Progress | Save/load progress round-trip | Medium |
| Sidebar | Section collapse, navigation | Low |
| Header | Search input behavior | Low |
| StatusBar | Count display formatting | Low |

**Files:** Create `__tests__/` directories under each feature's `model/` and `ui/` as needed.

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
| Rust (all services) | 79 |
| Shared UI | 49 |
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
| **Frontend total** | **130** |
| **Grand total** | **209** |

**Note:** Rust tests require `libgtk-3-dev` (not available in all containers). Frontend tests run cleanly with `npx vitest run`.

---

## i18n Coverage (en + zh-TW)

Browse Roots (12), Browse Artists (14), Gallery Viewer (3), Video Player (6), Sidebar (11), Header (4), Status Bar (9), Settings (40+), Favorites (5), Tags (11), Search (7), File Manager (12), Zip Recovery (15), Shared (15), Reader Toolbar (13), Smart Groups (2), Timeline (3).

---

## Known Technical Debt

| Item | File | Category |
|------|------|----------|
| `Mutex<Connection>` — needs connection pool | `db/mod.rs` | PERF |
| Polls drives every 5s instead of Tauri events | `useDriveStatus.ts` | UX |
| Light mode CSS not implemented | `global.css` | UI |
| `ArtistCard` uses placeholder, not first gallery cover | `ArtistCard.tsx` | UI |
| `thumbnail_grid` mode uses raw `entry.path`, not `toAssetUrl()` | `GalleryReader.tsx` | Bug |
| `getFavoriteGalleries` filters all galleries client-side | `favoritesApi.ts` | PERF |
| `SmartGroupsPanel` not wired into `ArtistPage`/`GalleryPage` sidebar | `SmartGroupsPanel.tsx` | Missing |
| EXIF date extraction not implemented (filename-based only) | `chrono_linking.rs` | Feature gap |
| No Error Boundary | `App.tsx` | Robustness |
| `reading-progress` feature is an empty stub | `features/reading-progress/` | Missing |
| File watcher (`notify`) imported but not integrated | `services/file_watcher.rs` | Missing |
| Settings commands (`get_settings`/`update_settings`) not implemented | Backend | Missing |
| No metadata export/import commands | Backend | Missing |
| No database migration system | `db/mod.rs` | Tech debt |
| File Manager + Zip Recovery have no frontend tests | Frontend | Test gap |

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
