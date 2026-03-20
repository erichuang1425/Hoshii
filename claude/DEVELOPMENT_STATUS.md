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
| `get_all_tags` command missing from Rust backend | `Sidebar.tsx` | Missing |
| `getFavoriteGalleries` filters all galleries client-side | `favoritesApi.ts` | PERF |
| `SmartGroupsPanel` not wired into `ArtistPage`/`GalleryPage` sidebar | `SmartGroupsPanel.tsx` | Missing |
| EXIF date extraction not implemented (filename-based only) | `chrono_linking.rs` | Feature gap |

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
