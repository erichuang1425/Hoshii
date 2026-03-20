# Architecture & Design Specification v2

## 1. Tech Stack

### Framework: Tauri v2 + React + TypeScript

**Why Tauri:** ~5-10MB installer, ~30-40MB idle RAM, `asset://` protocol serves local images directly to webview without base64/IPC overhead, Rust backend gives native filesystem performance for scanning external drives over USB.

**Why React:** Best virtual scrolling ecosystem (`@tanstack/react-virtual`), concurrent rendering for smooth thumbnail loading, stronger TypeScript integration.

**Why TypeScript:** Enforces contracts between features — critical when multiple Claude instances edit different slices. Catches integration bugs at compile time.

### Full Stack
| Layer | Tech | Purpose |
|-------|------|---------|
| Shell | Tauri v2 | Windows, dialogs, asset protocol, file watching, sidecar |
| Backend | Rust | FS scanning, natural sort, SQLite, thumbnails, zip handling |
| Frontend | React 18 + TypeScript | UI, virtual scrolling, media playback |
| State | Zustand | Per-feature store slices, no boilerplate |
| Styling | Tailwind CSS + CSS variables | Utility-first with theme tokens |
| DB | SQLite (rusqlite, WAL mode) | Volume-aware metadata cache |
| Virtual Scroll | @tanstack/react-virtual | Render only visible items |
| Bundler | Vite | Fast HMR, tree-shaking |
| Video | ffmpeg (optional, user-installed) | Remux MKV→MP4, video frame extraction |

---

## 2. Architecture: Feature-Sliced Vertical

### Directory Structure

```
src/
├── app/                          # App setup (routes, providers, global CSS)
│   ├── App.tsx
│   ├── routes.tsx                # ← append-only (merge-safe)
│   ├── providers.tsx             # ← append-only (merge-safe)
│   └── global.css                # Theme tokens
│
├── shared/                       # Shared infrastructure (NO business logic)
│   ├── ui/                       # Dumb components: Button, Modal, Spinner, Badge, Toast, Skeleton
│   ├── lib/                      # Utils: logger, naturalSort (frontend), formatBytes, debounce
│   ├── api/                      # Tauri invoke wrapper: typed invoke<T>()
│   ├── hooks/                    # useKeyboard, useIntersectionObserver, useDriveStatus
│   ├── types/                    # ALL TypeScript interfaces (single source of truth)
│   │   ├── index.ts              # Re-exports everything
│   │   ├── gallery.ts
│   │   ├── media.ts
│   │   ├── volume.ts
│   │   └── common.ts             # AsyncState<T>, PaginatedResult<T>, etc.
│   └── i18n/                     # Localization files
│
├── features/                     # ★ VERTICAL SLICES — independent feature folders
│   ├── browse-roots/             # Root folder + volume management
│   │   ├── ui/                   # RootGrid, RootCard, AddRootButton, DriveStatusBadge
│   │   ├── model/                # useBrowseRootsStore.ts
│   │   ├── api/                  # Tauri commands for root/volume operations
│   │   └── index.ts              # Public barrel export
│   │
│   ├── browse-artists/           # Artist grid within a root
│   │   ├── ui/
│   │   ├── model/
│   │   ├── api/
│   │   └── index.ts
│   │
│   ├── gallery-viewer/           # Full gallery reader
│   │   ├── ui/
│   │   │   ├── GalleryReader.tsx  # Main reader container
│   │   │   ├── PageView.tsx       # Routes to ImageView or VideoPlayer by media type
│   │   │   ├── ImageView.tsx      # Static images
│   │   │   ├── AnimatedImageView.tsx # GIF, animated WebP (NOT animated AVIF directly)
│   │   │   ├── VideoPlayer.tsx    # Custom player: seek, loop, volume, speed, PiP
│   │   │   ├── VideoControls.tsx
│   │   │   ├── ThumbnailStrip.tsx
│   │   │   └── SubheadingNav.tsx  # Jump nav for prefix-grouped media
│   │   ├── model/
│   │   │   ├── useGalleryReaderStore.ts
│   │   │   └── mediaGrouping.ts
│   │   ├── api/
│   │   └── index.ts
│   │
│   ├── file-manager/             # Organize scattered files into galleries
│   │   └── ...
│   ├── zip-recovery/             # Detect/restore backup zips
│   │   └── ...
│   ├── search/                   # Global search
│   │   └── ...
│   ├── favorites/                # Bookmark galleries
│   │   └── ...
│   ├── reading-progress/         # Track last-read page
│   │   └── ...
│   ├── tag-system/               # Tag + filter galleries
│   │   └── ...
│   └── settings/                 # App configuration
│       └── ...
│
├── layouts/                      # Page-level layout shells
│   ├── MainLayout.tsx            # Sidebar + header + content area + status bar
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── StatusBar.tsx
│
└── pages/                        # Route-level components
    ├── HomePage.tsx
    ├── ArtistListPage.tsx
    ├── ArtistPage.tsx
    ├── GalleryPage.tsx
    ├── FileManagerPage.tsx
    └── SettingsPage.tsx
```

### Rust Backend Structure

```
src-tauri/src/
├── main.rs                       # Tauri builder, command registrations (append-only)
├── commands/                     # One file per Tauri invoke
│   ├── mod.rs
│   ├── volumes.rs                # Detect/list mounted volumes, track UUID
│   ├── scan_roots.rs             # Scan root → artists → galleries
│   ├── scan_gallery.rs           # Scan gallery → media files with natural sort
│   ├── incremental_scan.rs       # Fast mtime comparison for changed files only
│   ├── thumbnails.rs             # Generate thumbnails (images via `image` crate, video via ffmpeg)
│   ├── media_probe.rs            # Dimensions, duration, animated detection
│   ├── video_remux.rs            # MKV/AVI → MP4 via ffmpeg (if available)
│   ├── zip_ops.rs                # Verify/restore backup zips
│   ├── file_ops.rs               # Move/rename/organize files
│   ├── db_ops.rs                 # SQLite CRUD
│   ├── metadata_export.rs        # Export/import metadata JSON sidecar
│   └── settings.rs               # App settings CRUD
│
├── services/                     # Business logic (called by commands)
│   ├── scanner.rs                # Directory walking with incremental support
│   ├── thumbnail.rs              # Image resize + LRU disk cache
│   ├── media_detector.rs         # Extension → MediaType, animated AVIF detection
│   ├── video_processor.rs        # ffmpeg interface (optional — checks if ffmpeg exists)
│   ├── natural_sort.rs           # Case-insensitive natural sort with group extraction
│   ├── zip_handler.rs            # Zip integrity verification
│   ├── volume_tracker.rs         # Volume UUID detection per platform
│   └── file_watcher.rs           # Filesystem change notifications
│
├── models/                       # Rust structs (serde-serializable, match TS types)
│   ├── mod.rs
│   ├── volume.rs
│   ├── gallery.rs
│   ├── media.rs
│   └── scan.rs
│
└── db/
    ├── mod.rs                    # Connection pool, migrations, WAL mode setup
    ├── schema.sql
    └── migrations/
```

### Parallel Editing Safety

Each Claude instance works in an isolated feature slice. The only merge-sensitive files are append-only:
- `app/routes.tsx` — add route entry
- `app/providers.tsx` — add store provider
- `src-tauri/src/main.rs` — register command
- `src-tauri/src/commands/mod.rs` — re-export module

---

## 3. External Drive Handling

### Volume Tracking

Drives are identified by **volume UUID** (not mount path), persisted in the DB. On each app launch, Rust detects currently mounted volumes and matches against known UUIDs.

```rust
// volume_tracker.rs
pub struct VolumeInfo {
    pub uuid: String,            // filesystem UUID (stable across reconnects)
    pub mount_path: PathBuf,     // current mount point (changes!)
    pub label: Option<String>,   // volume label (e.g., "MyGalleryDrive")
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub is_removable: bool,
}

// Platform-specific UUID detection:
// Windows: WMIC or GetVolumeInformation → VolumeSerialNumber
// macOS: diskutil info → Volume UUID
// Linux: blkid or /dev/disk/by-uuid/
```

### Drive Lifecycle

1. **App launch:** Scan mounted volumes → match UUIDs against DB → mark online/offline
2. **Drive connected (while app open):** File watcher or periodic poll detects new mount → check if known volume → auto-show galleries
3. **Drive disconnected:** All file operations for that volume start failing → catch errors → mark volume offline → grey out galleries in UI with "Drive disconnected" overlay → **do NOT delete DB records**
4. **Drive reconnects at different path:** UUID matches existing volume → update mount_path in DB → all `asset://` URLs regenerated from new path

### Asset Protocol Dynamic Scope

When user adds a root folder, Rust dynamically expands the asset protocol scope:

```rust
#[tauri::command]
async fn add_root_folder(app: tauri::AppHandle, path: String) -> Result<RootFolder, String> {
    let path = PathBuf::from(&path);
    // Expand asset protocol scope to include this directory
    app.asset_protocol_scope().allow_directory(&path, true) // recursive
        .map_err(|e| format!("Failed to allow directory: {}", e))?;
    // ... rest of add logic
}
```

On app startup, re-register all known root paths for online volumes.

### Thumbnail Cache Strategy

- **Location:** `{app_local_data}/hoshii/thumbs/{volume_uuid}/{gallery_hash}/`
- **Why local, not on drive:** Faster SSD reads, no write wear on external drive, no leftover files if user browses drive on another machine
- **Invalidation:** Compare file mtime stored in DB vs current mtime on rescan. If changed, regenerate thumbnail.
- **Eviction:** LRU eviction when cache exceeds configurable limit (default 2GB). Offline volume thumbnails kept (they're small and allow browsing history).

---

## 4. Incremental Scanning

### First Scan (Cold Start)
Full directory walk using `walkdir` + `rayon`. For each media file: stat, detect type, extract metadata. Batch insert into SQLite. Generate thumbnails for visible galleries on-demand (not all at once).

### Subsequent Scans (Warm Start)
```
1. Quick stat-walk: list all files/dirs with mtime only (fast, ~1-2s for 100k files)
2. Compare against DB records:
   - New files (path not in DB) → process + insert
   - Modified files (mtime differs) → re-process + update
   - Deleted files (in DB but not on disk) → mark deleted (soft delete, recoverable)
   - Unchanged files → skip entirely
3. Update gallery metadata (page counts, sizes) for affected galleries only
```

### Live File Watching
While app is running, use Tauri's file watcher on active root folders:
```rust
// Debounce events (100ms) to batch rapid changes
// On file created/modified/deleted in a watched root:
//   → Update affected gallery in SQLite
//   → Emit event to frontend: "gallery_updated" { galleryId, changeType }
//   → Frontend Zustand store invalidates relevant query
```

---

## 5. Mixed Media Handling

### Supported Formats

| Type | Extensions | WebView Renderer | Thumbnail Source |
|------|-----------|-----------------|-----------------|
| Static Image | jpg, jpeg, png, webp, bmp, tiff | `<img>` via `asset://` | Rust `image` crate resize |
| Animated Image | gif, apng, animated webp | `<img>` (native animation) | First frame via `image` crate |
| Video (native) | mp4, webm | `<video>` with custom controls | ffmpeg frame extract (or Rust) |
| Video (remux needed) | mkv, avi, mov, wmv, flv | Remux → mp4 → `<video>` | ffmpeg frame extract |
| AVIF (static) | avif (non-animated) | `<img>` via `asset://` | Rust `image` crate decode + resize |
| AVIF (animated) | avif (animated) | ⚠️ **Fallback strategy** (see below) | First frame extraction |

### Animated AVIF Fallback Strategy

Animated AVIF has inconsistent support in WebKit (macOS/Linux). Rather than relying on the WebView:

1. Rust detects animated AVIF at scan time (check frame count in AVIF container)
2. On first view: Rust converts to animated WebP (well-supported) or extracts individual frames
3. Converted file cached in `{app_data}/avif-converted/{hash}.webp`
4. Frontend serves the converted WebP instead of the raw AVIF for animation
5. Static AVIF displays fine everywhere — no conversion needed

### ffmpeg Dependency (Optional)

ffmpeg is NOT bundled with the installer. It is optional:

- **Without ffmpeg:** Images, GIFs, AVIF work fully. MP4/WebM videos play natively. MKV/AVI/MOV files show a "Cannot play — install ffmpeg for full video support" message. Video thumbnails use a placeholder or Rust-extracted keyframe (limited).
- **With ffmpeg:** Full video format support. Video thumbnail extraction. MKV→MP4 remuxing.
- **Detection:** On startup, Rust checks if `ffmpeg` is in PATH. Stores result in app state. Features degrade gracefully.
- **Install prompt:** Settings page shows ffmpeg status with platform-specific install instructions.

### Video Player Features
- Play/pause, seek bar with hover preview
- Volume + mute, playback speed (0.5x/1x/1.5x/2x)
- Loop toggle (auto-on for clips < 30s)
- Picture-in-picture, fullscreen
- Click video area to toggle play. Spacebar, arrow keys (±5s), up/down (volume)
- In gallery grid: hover thumbnail plays first 3s muted preview

---

## 6. Natural Sort + Image Grouping

### Naming Patterns Handled

| Pattern | Example | Sorting | Grouping |
|---------|---------|---------|----------|
| Bare numbers | `1.jpg, 2.jpg, 10.jpg` | Numeric: 1, 2, 10 | Single group (empty prefix) |
| Prefixed | `lucy1.jpg, lucy2.jpg` | By prefix, then numeric | Groups: "lucy", "eva" |
| Zero-padded | `page_001.jpg, page_010.jpg` | Numeric: 1, 10 | Group: "page_" |
| Camera style | `IMG_20240301_001.jpg` | By date, then sequence | Group: "IMG_20240301_" |
| Download dupes | `1 (1).jpg, 1 (2).jpg` | Numeric on parenthetical | Detected as duplicates |
| Mixed media | `1.jpg, 2.mp4, 3.gif` | Numeric (type-agnostic) | All sorted together |
| Unicode | `日本語1.jpg` | Unicode prefix + numeric | Group by Unicode prefix |
| Mixed case | `Lucy1.jpg, lucy2.jpg` | Case-insensitive | Same group |

### Rust Implementation Notes

```rust
// Case-insensitive comparison for grouping
// Extract prefix: everything before the last numeric sequence
// Extract number: the last numeric sequence in the filename (before extension)
// Sort key: (lowercase_prefix, number)
// Handle edge cases: files with no number get sort_key ("filename", 0)
```

### Subheading Navigation

When a gallery has 2+ distinct prefix groups, the reader shows jump navigation:
- Clickable pills: `[All 24] [lucy ●12] [eva ●8] [mia ●4]`
- Clicking scrolls to first item of that group
- Thumbnail strip shows group dividers (subtle vertical line + label)
- If only one group (or all ungrouped), subheading nav is hidden

---

## 7. Database Schema (SQLite, WAL mode)

```sql
-- WAL mode for concurrent reads (file watcher + UI queries simultaneously)
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;

-- ★ NEW: Volume tracking for external drives
CREATE TABLE volumes (
    id          INTEGER PRIMARY KEY,
    uuid        TEXT NOT NULL UNIQUE,        -- filesystem UUID (stable across reconnects)
    label       TEXT,                         -- user-friendly name
    mount_path  TEXT,                         -- current mount point (updated on each launch)
    is_online   BOOLEAN DEFAULT FALSE,       -- currently connected?
    is_removable BOOLEAN DEFAULT TRUE,
    total_bytes INTEGER,
    last_seen   DATETIME,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE root_folders (
    id          INTEGER PRIMARY KEY,
    volume_id   INTEGER REFERENCES volumes(id) ON DELETE CASCADE,
    path        TEXT NOT NULL UNIQUE,         -- full path (updated when mount_path changes)
    relative_path TEXT NOT NULL,              -- path relative to volume mount point (stable!)
    label       TEXT,
    last_scan   DATETIME,
    scan_version INTEGER DEFAULT 0,          -- incremented on each scan for change detection
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artists (
    id          INTEGER PRIMARY KEY,
    root_id     INTEGER REFERENCES root_folders(id) ON DELETE CASCADE,
    name        TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    gallery_count INTEGER DEFAULT 0,
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE galleries (
    id              INTEGER PRIMARY KEY,
    artist_id       INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    name            TEXT NOT NULL,
    path            TEXT NOT NULL UNIQUE,
    page_count      INTEGER DEFAULT 0,
    total_size      INTEGER DEFAULT 0,
    cover_path      TEXT,                     -- relative path to cover image (NOT asset:// URL)
    has_backup_zip  BOOLEAN DEFAULT FALSE,
    zip_status      TEXT DEFAULT 'unknown',
    last_read_page  INTEGER DEFAULT 0,
    last_read_at    DATETIME,
    favorited       BOOLEAN DEFAULT FALSE,
    is_deleted      BOOLEAN DEFAULT FALSE,    -- soft delete for removed files
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gallery_media (
    id          INTEGER PRIMARY KEY,
    gallery_id  INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    path        TEXT NOT NULL,                -- absolute path
    relative_path TEXT NOT NULL,              -- relative to gallery folder (stable)
    sort_order  INTEGER NOT NULL,
    group_name  TEXT DEFAULT '',
    media_type  TEXT NOT NULL DEFAULT 'image',
    width       INTEGER,
    height      INTEGER,
    file_size   INTEGER,
    duration_ms INTEGER,                      -- NULL for static images
    is_animated BOOLEAN DEFAULT FALSE,
    mtime       INTEGER,                      -- file modification time (for incremental scan)
    created_at  DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (
    id      INTEGER PRIMARY KEY,
    name    TEXT NOT NULL UNIQUE COLLATE NOCASE
);

CREATE TABLE gallery_tags (
    gallery_id  INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    tag_id      INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (gallery_id, tag_id)
);

CREATE TABLE unorganized_files (
    id          INTEGER PRIMARY KEY,
    artist_id   INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    filename    TEXT NOT NULL,
    path        TEXT NOT NULL UNIQUE,
    media_type  TEXT,
    file_size   INTEGER,
    mtime       INTEGER
);

-- Indexes
CREATE INDEX idx_root_volume ON root_folders(volume_id);
CREATE INDEX idx_galleries_artist ON galleries(artist_id);
CREATE INDEX idx_gallery_media_gallery ON gallery_media(gallery_id);
CREATE INDEX idx_gallery_media_sort ON gallery_media(gallery_id, sort_order);
CREATE INDEX idx_gallery_media_type ON gallery_media(gallery_id, media_type);
CREATE INDEX idx_galleries_favorited ON galleries(favorited) WHERE favorited = TRUE;
CREATE INDEX idx_galleries_last_read ON galleries(last_read_at) WHERE last_read_at IS NOT NULL;
CREATE INDEX idx_galleries_deleted ON galleries(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_volumes_online ON volumes(is_online);
```

---

## 8. Metadata Portability

### Problem
SQLite is on the local machine. If user switches computers or reinstalls OS, all favorites/tags/reading progress are lost. Media files on external drives are safe.

### Solution: Sidecar Metadata Files
Optionally write a `.hoshii-meta.json` in each root folder:

```json
{
  "version": 1,
  "exported_at": "2026-03-18T12:00:00Z",
  "galleries": [
    {
      "relative_path": "ArtistA/Gallery1",
      "tags": ["fantasy", "color"],
      "favorited": true,
      "last_read_page": 23,
      "last_read_at": "2026-03-17T20:30:00Z"
    }
  ]
}
```

- Export: manual trigger or auto-export on app close (configurable)
- Import: detected on root folder scan, user prompted to merge
- Uses relative paths so it works regardless of mount point

---

## 9. Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| App startup | < 500ms | Tauri native, lazy feature loading |
| Warm launch (known drives) | < 1s | SQLite cache, skip full scan, mtime check background |
| Gallery grid render (100 items) | < 100ms | Virtual scrolling, cached thumbnails |
| Open gallery (1000 media files) | < 200ms | Pre-sorted in SQLite, async thumbnail lazy-load |
| Image display | < 50ms | `asset://` protocol, zero IPC |
| Incremental rescan (100k files) | < 3s | mtime stat-only walk, batch SQLite updates |
| Full cold scan (500 galleries) | < 10s | `rayon` parallel, batch inserts, background thumbnail gen |
| Memory idle | < 80MB | Virtual DOM, offscreen disposal |
| Memory reading (1000-page gallery) | < 150MB | Only 3-5 media items in DOM at any time |

---

## 10. Testing Strategy

### Rust (src-tauri)
- **Unit tests:** Every service module has `#[cfg(test)] mod tests`
- **Key tests:** Natural sort with all edge cases, media type detection, incremental scan logic, zip integrity verification
- **Integration tests:** Scanner with temp directory fixtures, SQLite operations

### Frontend (React)
- **Component tests:** Vitest + React Testing Library for each feature's UI
- **Store tests:** Zustand slice actions/selectors tested in isolation
- **Key tests:** Virtual scroll rendering, media type routing in PageView, keyboard navigation

### Cross-Platform
- Test on Windows (WebView2), macOS (WebKit), Linux (WebKitGTK)
- Verify CSS: `-webkit-` prefixes, `backdrop-filter`, `aspect-ratio`, scroll snap
- Verify asset protocol works with paths containing spaces, Unicode, and deep nesting

---

## 11. Parallel Development Task Assignment

| # | Slice | Files | Safe Parallel With |
|---|-------|-------|--------------------|
| 1 | Core Scaffold | `app/`, `shared/`, config files | None (foundation) |
| 2 | Rust Scanner + DB | `commands/scan_*`, `services/scanner.rs`, `db/` | None (foundation) |
| 3 | Rust Volume Tracker | `services/volume_tracker.rs`, `commands/volumes.rs` | #2 |
| 4 | Browse Roots UI | `features/browse-roots/` | #5, #6, #7 |
| 5 | Browse Artists UI | `features/browse-artists/` | #4, #6, #7 |
| 6 | Gallery Viewer UI | `features/gallery-viewer/` (reader + images) | #4, #5, #7 |
| 7 | Video Player UI | `features/gallery-viewer/ui/VideoPlayer*` | #4, #5, #8 |
| 8 | File Manager | `features/file-manager/` | #7, #9, #10 |
| 9 | Zip Recovery | `features/zip-recovery/`, `services/zip_handler.rs` | #8, #10, #11 |
| 10 | Search | `features/search/` | #8, #9, #11 |
| 11 | Favorites + Tags + Progress | `features/favorites/`, `features/tag-system/`, `features/reading-progress/` | #8, #9, #10 |
| 12 | Settings + Metadata Export | `features/settings/`, `commands/metadata_export.rs` | Any |
| 13 | Layouts (Sidebar, Header, StatusBar) | `layouts/` | Any Phase 2+ |
| 14 | Long Strip / Webtoon Reader | `features/gallery-viewer/ui/LongStrip*` | #15, #16 |
| 15 | Infinite Slider + Reading Tools | `features/gallery-viewer/ui/InfiniteSlider*`, `ReadingToolbar*`, `AutoScroll*` | #14, #16 |
| 16 | Smart Collection Linking (Fuzzy) | `services/smart_grouping.rs`, `commands/smart_groups.rs`, `models/smart_group.rs` | #14, #15 |
| 17 | Chronological Smart Linking | `services/date_parser.rs`, `features/gallery-viewer/ui/ChronologicalNav*` | #16 |
| 18 | Custom Timeline Navigation | `commands/timeline.rs`, `features/gallery-viewer/ui/Timeline*` | #17 |

---

## 12. Implementation Status

### Completed
1. ~~Bootstrap Tauri v2 + React + TS project with this directory structure~~ ✅ (Task 1.1)
2. ~~Implement Rust volume tracker + SQLite schema with WAL mode~~ ✅ (Task 1.2)

### Next Steps (in priority order)
3. **Task 1.3: Shared UI Components** — Button, Modal, Spinner, Badge, Skeleton, Toast, OfflineOverlay, DriveStatusDot, MediaBadge, ProgressBar + hooks (useIntersectionObserver, useDriveStatus)
4. **Task 2.1: Rust Scanner** — Full + incremental scan, natural sort, media detection (can start in parallel with 1.3)
5. **Task 2.2: Rust Thumbnail Generator** — Image resize, LRU disk cache, volume-aware paths (can parallel with 2.1)
6. **Task 2.4-2.6: Frontend features** — Browse Roots, Browse Artists, Gallery Viewer UI (depend on 1.3)
7. Build core shell (layouts, routing, dark theme, asset protocol scope registration)

### Current Codebase State
- **Rust backend:** main.rs with Tauri builder, 3 volume commands registered, db/mod.rs with WAL init, full schema.sql, all model structs (Volume, RootFolder, Artist, Gallery, MediaEntry, etc.), volume_tracker service with platform-specific UUID detection
- **Frontend:** React app scaffolded with routes, all feature slice stubs (10 features × 3 subdirs), shared types matching TYPES_REFERENCE.md, logger, assetUrl helper, invoke wrapper, i18n skeleton, MainLayout shell, page stubs
- **Tests:** 8 Rust tests passing (schema creation, WAL mode, volume tracking, UUID extraction)

---

## 13. Advanced Gallery Modes & Smart Linking Architecture

### Reading Modes (Extended)

The existing four reading modes (`single`, `vertical_scroll`, `double_page`, `thumbnail_grid`) are extended with:

| Mode | Description | Key Behavior |
|------|-------------|-------------|
| `long_strip` | Continuous vertical scroll (Webtoon-style) | All pages in one virtualized column, fit-to-width, auto-progress tracking |

**Reading Direction** applies to `single` and `double_page` modes:
- `ltr` — Left-to-right (Western comics). Left click/arrow = previous, right = next.
- `rtl` — Right-to-left (manga). Left click/arrow = next, right = previous. Double page renders right page first.
- `vertical` — Top-to-bottom. Up arrow = previous, down = next.

**Fit Modes** control image scaling within the viewport:
- `fit_width` — Scale to viewport width (default for long_strip)
- `fit_height` — Scale to viewport height (default for single page)
- `original` — No scaling, pan to navigate
- `fit_best` — Fit whichever dimension is constraining

### Infinite Slider

A scrubbable scrollbar overlay that works across all reading modes:

```
┌──────────────────────────────────────────────┐
│                READER CONTENT                │
│                                              │
│  ┌────────────────────┐                      │
│  │  Thumbnail Preview │  ← floating popup    │
│  │  (page 23/47)      │    on hover/drag     │
│  └────────────────────┘                      │
│  ▲                                           │
│  ║  ← slider track (right edge or bottom)    │
│  ●  ← draggable handle                      │
│  ║                                           │
│  ▼                                           │
└──────────────────────────────────────────────┘
```

- Position: right edge (vertical layout) or bottom edge (horizontal layout)
- Handle position = `currentPage / totalPages`
- Drag → floating thumbnail preview appears showing target page
- Release → jump to page
- Click track → jump directly

### Smart Collection Linking (Fuzzy Matching)

**Grouping Pipeline:**
```
1. Input: all gallery names for an artist
   ["justin-1", "justin_1", "justin1", "alice-vacation", "alice_vacation_2"]

2. Normalize: strip separators, lowercase
   ["justin1", "justin1", "justin1", "alicevacation", "alicevacation2"]

3. Extract base name + sequence number (regex)
   [("justin", 1), ("justin", 1), ("justin", 1), ("alicevacation", None), ("alicevacation", 2)]

4. Group by exact base name match
   Group A: justin → [justin-1, justin_1, justin1]
   Group B: alicevacation → [alice-vacation, alice_vacation_2]

5. Fuzzy merge: for ungrouped items, compute Levenshtein distance
   against existing group canonical names (threshold ≤ 2)

6. Output: SmartGroup[] with canonical name + member galleries
```

**Database Tables:**
```sql
CREATE TABLE smart_groups (
    id              INTEGER PRIMARY KEY,
    artist_id       INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    canonical_name  TEXT NOT NULL,          -- display name for the group
    created_at      DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE smart_group_members (
    smart_group_id  INTEGER REFERENCES smart_groups(id) ON DELETE CASCADE,
    gallery_id      INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    confidence      REAL DEFAULT 1.0,      -- 1.0 = exact match, <1.0 = fuzzy
    PRIMARY KEY (smart_group_id, gallery_id)
);

CREATE INDEX idx_smart_groups_artist ON smart_groups(artist_id);
CREATE INDEX idx_smart_group_members_gallery ON smart_group_members(gallery_id);
```

### Chronological Smart Linking

For galleries whose names contain dates, build a navigation chain:

```
Artist: "photographer_x"
├── shoot-20240101  →  Jan 1, 2024  ← prev: none,        next: shoot-20240215
├── shoot-20240215  →  Feb 15, 2024 ← prev: shoot-20240101, next: march-2024-photos
├── march-2024-photos → Mar 1, 2024 ← prev: shoot-20240215, next: none
└── random-gallery  →  no date      ← excluded from chain
```

**Navigation UI:** "← Previous (Jan 1)" and "Next (Mar 1) →" buttons in reader header, visible only for date-linked galleries.

### Custom Timeline Navigation (Per-Image)

For galleries containing date-stamped filenames (e.g., camera photos), provide a visual timeline:

```
┌──────────────────────────────────────────────────────────┐
│  Timeline View                                           │
│                                                          │
│  Mar 15    Mar 16         Mar 18    Mar 20               │
│   ┃         ┃               ┃        ┃                   │
│  ┌┸┐  ┌┸┐  ┌┸┐  ┌┸┐      ┌┸┐  ┌┸┐ ┌┸┐                  │
│  │1│  │2│  │3│  │4│      │5│  │6│ │7│  ← image thumbs    │
│  └─┘  └─┘  └─┘  └─┘      └─┘  └─┘ └─┘                  │
│  ════════════●════════════════════════  ← scrubber        │
│           (drag to navigate)                              │
└──────────────────────────────────────────────────────────┘
```

- Horizontal axis = time, with date labels at natural breaks
- Images plotted at their parsed date positions
- Zoom levels: day view, week view, month view
- Draggable scrubber snaps to image clusters
- Click image thumbnail → open in reader at that page

### Phase 5 (planned)
8. **Task 5.1: Advanced Gallery Viewing Modes** — Long Strip (Webtoon) continuous scroll, Infinite Slider with thumbnail scrubber, assistive reading tools (fit modes, reading direction LTR/RTL/Vertical, auto-scroll)
9. **Task 5.2: Smart Collection Linking** — Fuzzy matching engine (regex + Levenshtein distance) to auto-group similar gallery names (e.g., `justin-1`, `justin_1`, `justin1` → one Smart Group)
10. **Task 5.3: Chronological Smart Linking** — Date-parsing utility for folder/gallery names, prev/next chronological navigation
11. **Task 5.4: Custom Timeline Navigation** — Parse dates from image filenames, render visual timeline axis for per-image chronological browsing
