# Glossary & Quick Reference v2

## Project Terms

| Term | Meaning |
|------|---------|
| **Volume** | A mounted filesystem, typically an external hard drive. Identified by UUID (stable across reconnects). Can be online or offline. |
| **Root Folder** | A directory the user adds to the app, located on a volume. Contains artist subfolders. User can have multiple roots across multiple drives. |
| **Artist** | A direct subfolder of a root folder, named after the artist/creator. Contains galleries and possibly loose files. |
| **Gallery** | A subfolder within an artist folder containing ordered media files. The primary content unit — like a "post" or "album." |
| **Media Entry** | A single file within a gallery (image, animated image, or video). |
| **Backup Zip** | A `.zip` file at the same level as a gallery folder, with a matching name. Backup for that gallery's contents. |
| **Unorganized File** | A loose media file sitting directly in an artist folder (not inside a gallery). The file manager helps organize these. |
| **Group / Prefix Group** | When files share a naming prefix (e.g., `lucy1.jpg`, `lucy2.jpg`), they form a group. Used for subheading jump navigation. |
| **Natural Sort** | Sorting that treats embedded numbers numerically: `1, 2, 10` not `1, 10, 2`. Case-insensitive. |
| **Subheading Nav** | Clickable pills in the reader that jump between prefix groups within a gallery. |
| **Reader** | The full-screen media viewing experience for a gallery. Multiple modes: single, vertical scroll, double page, thumbnail grid. |
| **Thumbnail Strip** | Horizontal scrollable row of small thumbnails at bottom of the reader. |
| **Remux** | Converting video container format (MKV → MP4) without re-encoding. Fast, lossless. Requires ffmpeg. |
| **Asset Protocol** | Tauri's `asset://` URL scheme. Maps local paths to URLs the WebView can load. Scope must be dynamically expanded per root folder. |
| **Feature Slice** | A self-contained feature folder (`features/X/`) with its own UI, state, API. Core architectural unit. |
| **Incremental Scan** | After initial scan, only process files with changed mtime. Skips unchanged files entirely. |
| **Metadata Sidecar** | `.hoshii-meta.json` file written in a root folder, containing favorites/tags/progress. Portable across machines. |
| **Volume UUID** | Filesystem-level identifier for a drive. Stable even if mount path changes (e.g., D: becomes E:). |

## File Extension Reference

| Category | Extensions | Notes |
|----------|-----------|-------|
| Static Image | `jpg` `jpeg` `png` `webp` `bmp` `tiff` `tif` | Rendered via `<img>` |
| Animated Image | `gif` `apng` | Rendered via `<img>`, play/pause overlay |
| Animated WebP | `webp` (animated) | Detected by Rust, rendered via `<img>` |
| Video (native) | `mp4` `webm` | `<video>` with custom controls |
| Video (remux) | `mkv` `avi` `mov` `wmv` `flv` | Needs ffmpeg → remux to MP4 |
| AVIF (static) | `avif` (single frame) | Rendered via `<img>` |
| AVIF (animated) | `avif` (multi-frame) | Converted to WebP by Rust (WebKit quirks) |
| Archive | `zip` | Backup detection only |
| Ignored | Everything else | Flagged in scan errors, not displayed |

## Key File Paths

| What | Path |
|------|------|
| React entry | `src/app/App.tsx` |
| Routes | `src/app/routes.tsx` |
| Store providers | `src/app/providers.tsx` |
| Theme tokens | `src/app/global.css` |
| All TypeScript types | `src/shared/types/` |
| Asset URL helper | `src/shared/lib/assetUrl.ts` |
| Logger | `src/shared/lib/logger.ts` |
| Tauri invoke wrapper | `src/shared/api/invoke.ts` |
| Rust entry | `src-tauri/src/main.rs` |
| DB schema | `src-tauri/src/db/schema.sql` |
| SQLite file | `{app_local_data}/hoshii/hoshii.db` |
| Thumbnail cache | `{app_local_data}/hoshii/thumbs/{volume_uuid}/` |
| Remuxed video cache | `{app_local_data}/hoshii/remux-cache/` |
| Converted AVIF cache | `{app_local_data}/hoshii/avif-converted/` |
| Metadata sidecar | `{root_folder}/.hoshii-meta.json` |

## Platform-Specific Notes

| Platform | WebView | Volume UUID Source | ffmpeg Install |
|----------|---------|-------------------|----------------|
| Windows | WebView2 (Chromium) | `GetVolumeInformation` → serial number | `winget install ffmpeg` or manual |
| macOS | WebKit | `diskutil info` → Volume UUID | `brew install ffmpeg` |
| Linux | WebKitGTK | `blkid` or `/dev/disk/by-uuid/` | `apt install ffmpeg` or equivalent |
