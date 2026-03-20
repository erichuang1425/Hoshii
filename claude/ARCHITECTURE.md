# Architecture & Technical Reference

## Overview

Hoshii is a **local-first desktop gallery application** built with **Tauri v2 (Rust backend) + React 18 + TypeScript**. It manages large collections of artwork stored across **multiple external hard drives** organized as folder structures on the user's filesystem.

**Target user:** A single user managing hundreds of artist galleries across multiple external drives, each gallery containing tens to thousands of mixed media files (images, GIFs, AVIF, videos). The app handles drive hot-plugging, varying USB speeds, and 100k+ file scale.

**Content structure on disk:**
```
[External Drive]/
├── ArtistA/
│   ├── GalleryPost1/        → folder of images/videos (a "gallery")
│   ├── GalleryPost1.zip     → backup zip matching gallery name
│   ├── GalleryPost2/
│   ├── loose_image.jpg      → unorganized file
│   └── random_clip.mp4      → unorganized file
├── ArtistB/
│   └── ...
```

---

## 1. Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Desktop Shell | Tauri v2 | Window management, native dialogs, `asset://` protocol, file watching, sidecar |
| Backend | Rust | Filesystem scanning, natural sort, SQLite, thumbnail generation, zip handling |
| Frontend | React 18 + TypeScript | UI rendering, virtual scrolling, media playback |
| State | Zustand | Per-feature store slices, zero boilerplate |
| Styling | Tailwind CSS v4 + CSS variables | Utility-first with theme tokens |
| DB | SQLite via `rusqlite` (WAL mode) | Volume-aware metadata cache |
| Virtual Scroll | @tanstack/react-virtual | Render only visible items |
| Bundler | Vite | Fast HMR, tree-shaking |
| Video | ffmpeg (optional, user-installed) | Remux MKV→MP4, video frame extraction |

**Why Tauri:** ~5-10MB installer, ~30-40MB idle RAM, `asset://` protocol serves local images directly to WebView without base64/IPC overhead, Rust gives native filesystem performance for USB scanning.

**Why React:** Best virtual scrolling ecosystem (`@tanstack/react-virtual`), concurrent rendering for smooth thumbnail loading, strong TypeScript integration for cross-slice contracts.

---

## 2. Directory Structure

### Frontend

```
src/
├── app/                          # App setup (append-only merge points)
│   ├── App.tsx
│   ├── routes.tsx                # ← append-only
│   ├── providers.tsx             # ← append-only
│   └── global.css                # Theme tokens
│
├── shared/                       # Shared infrastructure (NO business logic)
│   ├── ui/                       # Dumb components: Button, Modal, Spinner, Badge, Toast, etc.
│   ├── lib/                      # Utils: logger, assetUrl, mediaUtils, naturalSort
│   ├── api/                      # Tauri invoke wrapper: typed invoke<T>()
│   ├── hooks/                    # useKeyboard, useIntersectionObserver, useDriveStatus
│   ├── types/                    # ALL TypeScript interfaces (single source of truth)
│   └── i18n/                     # Localization (en + zh-TW)
│
├── features/                     # ★ VERTICAL SLICES — independent feature folders
│   ├── browse-roots/             # Root folder + volume management
│   │   ├── ui/                   # RootFolderGrid, RootFolderCard, AddRootButton, OfflineDrivesSection
│   │   ├── model/                # useBrowseRootsStore.ts
│   │   ├── api/                  # rootFolderApi.ts
│   │   └── index.ts
│   ├── browse-artists/           # Artist grid + gallery cards + smart groups
│   ├── gallery-viewer/           # Full gallery reader (all modes, video, timeline)
│   ├── file-manager/             # Organize scattered files into galleries
│   ├── zip-recovery/             # Detect/restore backup zips
│   ├── search/                   # Global search
│   ├── favorites/                # Bookmark galleries
│   ├── reading-progress/         # Track last-read page
│   ├── tag-system/               # Tag + filter galleries
│   └── settings/                 # App configuration
│
├── layouts/                      # Page-level layout shells
│   ├── MainLayout.tsx            # Sidebar + header + content + status bar
│   ├── Sidebar.tsx
│   ├── Header.tsx
│   └── StatusBar.tsx
│
└── pages/                        # Route-level components
    ├── HomePage.tsx
    ├── ArtistListPage.tsx
    ├── ArtistPage.tsx
    ├── GalleryPage.tsx           # Full-screen reader (outside MainLayout)
    ├── FileManagerPage.tsx
    ├── ZipRecoveryPage.tsx
    ├── FavoritesPage.tsx
    ├── SearchPage.tsx
    └── SettingsPage.tsx
```

### Rust Backend

```
src-tauri/src/
├── main.rs                       # Tauri builder, command registrations (append-only)
├── commands/                     # One file per Tauri invoke
│   ├── mod.rs
│   ├── volumes.rs                # Detect/list volumes, track UUID
│   ├── scan_roots.rs             # Scan root → artists → galleries
│   ├── scan_gallery.rs           # Scan gallery → media with natural sort
│   ├── incremental_scan.rs       # mtime-based change detection
│   ├── thumbnails.rs             # Generate thumbnails
│   ├── media_probe.rs            # Dimensions, duration, animated detection
│   ├── video_remux.rs            # MKV/AVI → MP4 via ffmpeg
│   ├── zip_ops.rs                # Verify/restore backup zips
│   ├── file_ops.rs               # Move/rename/organize
│   ├── db_ops.rs                 # SQLite CRUD
│   ├── smart_groups.rs           # Smart grouping + chrono linking commands
│   ├── timeline.rs               # Timeline data commands
│   ├── metadata_export.rs        # Export/import JSON sidecar
│   └── settings.rs               # App settings CRUD
│
├── services/                     # Business logic
│   ├── scanner.rs                # Directory walking with incremental support
│   ├── thumbnail.rs              # Image resize + LRU disk cache
│   ├── media_detector.rs         # Extension → MediaType, animated detection
│   ├── video_processor.rs        # ffmpeg interface (checks availability)
│   ├── natural_sort.rs           # Case-insensitive natural sort with group extraction
│   ├── smart_grouping.rs         # Fuzzy matching engine (regex + Levenshtein)
│   ├── chrono_linking.rs         # Date parsing from folder/file names
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
    ├── mod.rs                    # init_db with WAL mode, foreign_keys, busy_timeout
    ├── schema.sql                # All tables + indexes
    └── migrations/
```

### Parallel Editing Safety

Each developer/instance works in an isolated feature slice. Merge-sensitive files are append-only:
- `app/routes.tsx` — add route entry
- `app/providers.tsx` — add store provider
- `src-tauri/src/main.rs` — register command
- `src-tauri/src/commands/mod.rs` — re-export module

---

## 3. External Drive Handling

### Volume Tracking

Drives are identified by **volume UUID** (not mount path), persisted in the DB. On each app launch, Rust detects mounted volumes and matches against known UUIDs.

```rust
// volume_tracker.rs — platform-specific UUID detection
// Windows: GetVolumeInformation → serial number
// macOS: diskutil info → Volume UUID
// Linux: blkid or /dev/disk/by-uuid/
```

### Drive Lifecycle

1. **App launch:** Scan mounted volumes → match UUIDs against DB → mark online/offline
2. **Drive connected:** Periodic poll (5s) detects new mount → check if known → auto-show galleries
3. **Drive disconnected:** File operations fail → catch errors → mark offline → grey out UI → **do NOT delete DB records** (soft delete only)
4. **Drive reconnects at different path:** UUID matches → update mount_path → asset URLs regenerated

### Asset Protocol Dynamic Scope

When user adds a root folder, Rust dynamically expands the asset protocol scope:

```rust
app.asset_protocol_scope().allow_directory(&path, true); // recursive
```

On startup, re-register all known root paths for online volumes.

### Thumbnail Cache

- **Location:** `{app_local_data}/hoshii/thumbs/{volume_uuid}/{gallery_hash}/`
- **Why local:** Faster SSD reads, no write wear on external drive, no leftover files
- **Invalidation:** mtime comparison on rescan
- **Eviction:** LRU when cache exceeds configurable limit (default 2GB)

---

## 4. Scanning

### First Scan (Cold Start)

Full directory walk using `walkdir` + `rayon`. For each media file: stat, detect type, extract metadata. Batch insert into SQLite. Thumbnails generated on-demand.

### Incremental Scan (Warm Start)

```
1. Quick stat-walk: list all files with mtime only (~1-2s for 100k files)
2. Compare against DB:
   - New files → process + insert
   - Modified files (mtime differs) → re-process + update
   - Deleted files → soft delete (recoverable)
   - Unchanged → skip
3. Update gallery metadata for affected galleries only
```

### Live File Watching

While app is running, Tauri file watcher on active root folders:
- Debounce events (100ms) to batch rapid changes
- Update affected gallery in SQLite
- Emit event to frontend → Zustand store invalidates

---

## 5. Mixed Media Handling

| Type | Extensions | WebView Renderer | Thumbnail Source |
|------|-----------|-----------------|-----------------|
| Static Image | jpg, jpeg, png, webp, bmp, tiff | `<img>` via `asset://` | Rust `image` crate resize |
| Animated Image | gif, apng, animated webp | `<img>` (native animation) | First frame |
| Video (native) | mp4, webm | `<video>` with custom controls | ffmpeg frame extract |
| Video (remux needed) | mkv, avi, mov, wmv, flv | Remux → mp4 → `<video>` | ffmpeg frame extract |
| AVIF (static) | avif (non-animated) | `<img>` via `asset://` | Rust decode + resize |
| AVIF (animated) | avif (animated) | Convert to WebP in Rust → `<img>` | First frame |

**Animated AVIF** is converted to WebP because WebKit has playback quirks. Cached in `{app_data}/avif-converted/`.

**ffmpeg** is optional, not bundled (80-120MB, licensing issues). Without it: images/GIFs/AVIF work fully, MP4/WebM play natively, MKV/AVI show install prompt. Detection on startup, graceful degradation.

---

## 6. Natural Sort + Image Grouping

| Pattern | Example | Grouping |
|---------|---------|----------|
| Bare numbers | `1.jpg, 2.jpg, 10.jpg` | Single group (empty prefix) |
| Prefixed | `lucy1.jpg, lucy2.jpg` | Groups: "lucy", "eva" |
| Zero-padded | `page_001.jpg, page_010.jpg` | Group: "page_" |
| Camera style | `IMG_20240301_001.jpg` | Group: "IMG_20240301_" |
| Download dupes | `image (1).jpg, image (2).jpg` | Group: "image " |
| Mixed media | `1.jpg, 2.mp4, 3.gif` | All sorted together |
| Unicode | `日本語1.jpg` | Group by Unicode prefix |
| Mixed case | `Lucy1.jpg, lucy2.jpg` | Same group (case-insensitive) |

**Important:** Uses the **first** digit sequence (not last) for extraction. Sort key: `(lowercase_prefix, number)`.

When 2+ distinct prefix groups exist, the reader shows jump navigation pills.

---

## 7. Database Schema (SQLite, WAL mode)

```sql
PRAGMA journal_mode = WAL;
PRAGMA foreign_keys = ON;
PRAGMA busy_timeout = 5000;

CREATE TABLE volumes (
    id INTEGER PRIMARY KEY, uuid TEXT NOT NULL UNIQUE, label TEXT,
    mount_path TEXT, is_online BOOLEAN DEFAULT FALSE, is_removable BOOLEAN DEFAULT TRUE,
    total_bytes INTEGER, last_seen DATETIME, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE root_folders (
    id INTEGER PRIMARY KEY, volume_id INTEGER REFERENCES volumes(id) ON DELETE CASCADE,
    path TEXT NOT NULL UNIQUE, relative_path TEXT NOT NULL, label TEXT,
    last_scan DATETIME, scan_version INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE artists (
    id INTEGER PRIMARY KEY, root_id INTEGER REFERENCES root_folders(id) ON DELETE CASCADE,
    name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, gallery_count INTEGER DEFAULT 0,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE galleries (
    id INTEGER PRIMARY KEY, artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    name TEXT NOT NULL, path TEXT NOT NULL UNIQUE, page_count INTEGER DEFAULT 0,
    total_size INTEGER DEFAULT 0, cover_path TEXT,
    has_backup_zip BOOLEAN DEFAULT FALSE, zip_status TEXT DEFAULT 'unknown',
    last_read_page INTEGER DEFAULT 0, last_read_at DATETIME,
    favorited BOOLEAN DEFAULT FALSE, is_deleted BOOLEAN DEFAULT FALSE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE gallery_media (
    id INTEGER PRIMARY KEY, gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    filename TEXT NOT NULL, path TEXT NOT NULL, relative_path TEXT NOT NULL,
    sort_order INTEGER NOT NULL, group_name TEXT DEFAULT '',
    media_type TEXT NOT NULL DEFAULT 'image',
    width INTEGER, height INTEGER, file_size INTEGER,
    duration_ms INTEGER, is_animated BOOLEAN DEFAULT FALSE,
    mtime INTEGER, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE tags (id INTEGER PRIMARY KEY, name TEXT NOT NULL UNIQUE COLLATE NOCASE);

CREATE TABLE gallery_tags (
    gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    tag_id INTEGER REFERENCES tags(id) ON DELETE CASCADE,
    PRIMARY KEY (gallery_id, tag_id)
);

CREATE TABLE unorganized_files (
    id INTEGER PRIMARY KEY, artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    filename TEXT NOT NULL, path TEXT NOT NULL UNIQUE,
    media_type TEXT, file_size INTEGER, mtime INTEGER
);

CREATE TABLE smart_groups (
    id INTEGER PRIMARY KEY, artist_id INTEGER REFERENCES artists(id) ON DELETE CASCADE,
    canonical_name TEXT NOT NULL, created_at DATETIME DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE smart_group_members (
    smart_group_id INTEGER REFERENCES smart_groups(id) ON DELETE CASCADE,
    gallery_id INTEGER REFERENCES galleries(id) ON DELETE CASCADE,
    confidence REAL DEFAULT 1.0,
    PRIMARY KEY (smart_group_id, gallery_id)
);

-- Key indexes
CREATE INDEX idx_root_volume ON root_folders(volume_id);
CREATE INDEX idx_galleries_artist ON galleries(artist_id);
CREATE INDEX idx_gallery_media_gallery ON gallery_media(gallery_id);
CREATE INDEX idx_gallery_media_sort ON gallery_media(gallery_id, sort_order);
CREATE INDEX idx_galleries_favorited ON galleries(favorited) WHERE favorited = TRUE;
CREATE INDEX idx_galleries_last_read ON galleries(last_read_at) WHERE last_read_at IS NOT NULL;
CREATE INDEX idx_galleries_deleted ON galleries(is_deleted) WHERE is_deleted = FALSE;
CREATE INDEX idx_smart_groups_artist ON smart_groups(artist_id);
CREATE INDEX idx_smart_group_members_gallery ON smart_group_members(gallery_id);
```

---

## 8. Smart Linking

### Smart Collection Linking (Fuzzy Matching)

Groups similar gallery names within an artist using regex normalization + Levenshtein distance:

```
Input:  ["justin-1", "justin_1", "justin1", "alice-vacation"]
Step 1: Normalize → strip separators, lowercase
Step 2: Extract base name + sequence number via regex
Step 3: Group by exact base match, then fuzzy merge (threshold ≤ 2)
Output: SmartGroup{ "justin" → [justin-1, justin_1, justin1] }
```

### Chronological Linking

Parses dates from gallery/folder names (YYYY-MM-DD, YYYYMMDD, month names, etc.) and builds prev/next navigation chains.

### Timeline Navigation

Parses dates from individual filenames (camera patterns like `IMG_20240315_001.jpg`) and plots images on a horizontal timeline axis with day/week/month zoom.

---

## 9. Metadata Portability

Optional `.hoshii-meta.json` sidecar in root folders:

```json
{
  "version": 1,
  "exported_at": "2026-03-18T12:00:00Z",
  "galleries": [
    { "relative_path": "ArtistA/Gallery1", "tags": ["fantasy"], "favorited": true, "last_read_page": 23 }
  ]
}
```

Uses relative paths for portability. Export manually or auto-export on app close.

---

## 10. Performance Targets

| Metric | Target | How |
|--------|--------|-----|
| App startup | < 500ms | Tauri native, lazy feature loading |
| Warm launch | < 1s | SQLite cache, mtime check |
| Gallery grid (100 items) | < 100ms | Virtual scrolling, cached thumbnails |
| Open gallery (1000 files) | < 200ms | Pre-sorted in SQLite, lazy thumbnails |
| Image display | < 50ms | `asset://` protocol, zero IPC |
| Incremental rescan (100k) | < 3s | mtime stat-only walk |
| Full cold scan (500 galleries) | < 10s | `rayon` parallel, batch inserts |
| Memory idle | < 80MB | Virtual DOM, offscreen disposal |
| Memory reading (1000 pages) | < 150MB | Only 3-5 items in DOM |

---

## 11. Setup & Configuration

### Dependencies

**Cargo.toml (src-tauri):**
```toml
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
walkdir = "2"
image = "0.25"
zip = "0.6"
regex = "1"
rayon = "1.8"
natord = "1.0"
log = "0.4"
env_logger = "0.11"
anyhow = "1"
chrono = { version = "0.4", features = ["serde"] }
notify = "6"
```

**package.json (frontend):**
```
zustand, @tanstack/react-virtual, react-router-dom, clsx
tailwindcss, @tailwindcss/vite
vitest, @testing-library/react, @testing-library/jest-dom, jsdom
```

### Tauri Config Highlights

- Asset protocol enabled with `scope: ["**/*"]` + dynamic `allow_directory()` at runtime
- CSP: `default-src 'self'; img-src 'self' asset:; media-src 'self' asset:; style-src 'self' 'unsafe-inline'`
- Window: 1280x800, min 640x480
- Capabilities: fs read/write/exists/stat/readdir/rename/copy/remove/mkdir, dialog open/message/confirm, shell execute/spawn

### Vite Config

- `@/` alias resolves to `./src`
- Test environment: jsdom with `src/test-setup.ts`
- Build target: `chrome105` (Windows) / `safari13` (macOS/Linux)

### SQLite Initialization

```rust
pub fn init_db(app_data_dir: &Path) -> Result<Connection> {
    let db_path = app_data_dir.join("hoshii").join("hoshii.db");
    std::fs::create_dir_all(db_path.parent().unwrap())?;
    let conn = Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.execute_batch("PRAGMA busy_timeout = 5000;")?;
    conn.execute_batch(include_str!("schema.sql"))?;
    Ok(conn)
}
```

### Key File Paths

| What | Path |
|------|------|
| React entry | `src/app/App.tsx` |
| Routes | `src/app/routes.tsx` |
| Theme tokens | `src/app/global.css` |
| All TypeScript types | `src/shared/types/` |
| Asset URL helper | `src/shared/lib/assetUrl.ts` |
| Logger | `src/shared/lib/logger.ts` |
| Tauri invoke wrapper | `src/shared/api/invoke.ts` |
| Rust entry | `src-tauri/src/main.rs` |
| DB schema | `src-tauri/src/db/schema.sql` |
| SQLite file | `{app_local_data}/hoshii/hoshii.db` |
| Thumbnail cache | `{app_local_data}/hoshii/thumbs/` |
| Remuxed video cache | `{app_local_data}/hoshii/remuxed/` |
| Converted AVIF cache | `{app_local_data}/hoshii/avif-converted/` |
| Metadata sidecar | `{root_folder}/.hoshii-meta.json` |
