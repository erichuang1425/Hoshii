# Project: Hoshii (星) — Desktop Gallery App

## What Is This

Hoshii is a **local-first desktop gallery application** built with **Tauri v2 (Rust backend) + React + TypeScript**. It manages large collections of artwork stored across **multiple external hard drives** organized in folders on the user's filesystem. Think of it as a local nhentai/hitomi-style gallery browser — dark theme, grid-based browsing, fast mixed-media reading — but for your own downloaded content.

## Who Is This For

A single user managing hundreds of artist galleries across multiple external drives, each gallery containing tens to thousands of mixed media files (images, GIFs, AVIF, videos). The app must handle drive hot-plugging, varying USB speeds, and this scale without performance degradation.

## Core Problem It Solves

The user has external drives with folder structures like:
```
[External Drive E:] or [/Volumes/MyDrive]/
├── ArtistA/
│   ├── GalleryPost1/        → folder of images/videos (a "gallery")
│   ├── GalleryPost1.zip     → backup zip matching gallery name
│   ├── GalleryPost2/
│   ├── GalleryPost2.zip
│   ├── loose_image.jpg      → unorganized file
│   └── random_clip.mp4      → unorganized file
├── ArtistB/
│   └── ...
```

Multiple root folders can exist across different drives. Drives may be connected or disconnected at any time.

The user wants to:
1. **Browse** — navigate root folders → artists → galleries in a visually appealing grid, with drive online/offline awareness
2. **Read** — view gallery media in order with a fast, keyboard-navigable reader
3. **Handle mixed media** — images, animated GIFs, AVIF (static + animated), and videos (MP4, WebM, MKV) all in the same gallery
4. **Smart ordering** — `1.jpg, 2.jpg, 10.jpg` sort numerically; `lucy1.jpg, eva1.jpg` group by prefix with subheading jump navigation
5. **File management** — organize loose/scattered files into galleries
6. **Zip recovery** — detect backup zips, verify integrity, restore missing galleries
7. **Track progress** — remember last-read page, favorites, tags — with optional metadata sidecar on the drive itself for portability

## Tech Stack

| Layer | Tech | Purpose |
|-------|------|---------|
| Desktop Shell | Tauri v2 | Window management, native dialogs, asset protocol, file watching |
| Backend | Rust | Filesystem scanning, natural sort, SQLite, thumbnail generation, zip handling |
| Frontend | React 18 + TypeScript | UI rendering, virtual scrolling, media playback |
| State | Zustand | Per-feature store slices |
| Styling | Tailwind CSS | Utility-first with CSS variables for theming |
| DB | SQLite via `rusqlite` (WAL mode) | Local metadata cache with volume-aware records |
| Virtual Scroll | @tanstack/react-virtual | Large list rendering |
| Bundler | Vite | Fast HMR, tree-shaking |
| Video (optional) | ffmpeg (user-installed, not bundled) | Remux MKV/AVI → MP4, extract video thumbnails |

## Architecture

**Feature-Sliced Vertical Architecture** — every feature is a self-contained folder (`features/gallery-viewer/`, `features/file-manager/`, etc.) with its own UI, state, and API. See `ARCHITECTURE.md` for full structure.

Simplified from earlier draft: removed unnecessary `entities/` and `widgets/` layers. Types centralized in `shared/types/`. Layout components in `layouts/`.

## Key Constraints

1. **External drives** — mount paths change, drives disconnect. DB tracks volumes by UUID, not just path. All file access wrapped in availability checks.
2. **Scale** — 100k+ files across hundreds of galleries. Incremental scanning (mtime comparison), not full rescan. Virtual scrolling everywhere.
3. **Mixed media** — images, animated images, and videos coexist in galleries. Animated AVIF has WebKit quirks — use fallback conversion strategy.
4. **Parallel development** — architecture enables multiple Claude instances to work on different feature slices simultaneously without file conflicts.
5. **Cross-platform WebView** — Tauri uses WebKit on macOS, WebKitGTK on Linux, WebView2 (Chromium) on Windows. CSS must be tested on all three. Use `-webkit-` prefixes.

## Key Design References

UI/UX draws from gallery sites (nhentai grid layout, hitomi artist grouping, hentaiera's reader) polished into a desktop app. Dark theme default. Warm pink accent (#e85d75). Gallery covers 3:4 portrait ratio.
