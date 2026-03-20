# Media Type Detection Reference

Both Rust (`services/media_detector.rs`) and TypeScript (`shared/lib/mediaUtils.ts`) must use identical mappings. This is the single source of truth.

## Extension → MediaType Mapping

```
image:           jpg, jpeg, png, webp, bmp, tiff, tif
animated_image:  gif, apng
video:           mp4, webm, mkv, avi, mov, wmv, flv, m4v
avif_static:     avif (if single frame — requires container inspection)
avif_animated:   avif (if multi-frame — requires container inspection)
```

## Detection Logic

### Static vs Animated Detection

**GIF:** All GIFs are classified as `animated_image` (even single-frame GIFs — simpler, and single-frame GIFs are rare and render fine in `<img>`).

**WebP:** Must inspect the file header. If VP8X chunk has the animation bit set → `animated_image`. Otherwise → `image`. Rust: use `image` crate or read bytes 12-15 for “VP8X” then check byte 20 bit 1.

**AVIF:** Must inspect container. If the AVIF contains an `avis` brand (image sequence) → `avif_animated`. If `avif` or `mif1` brand only → `avif_static`. Rust: read first ~32 bytes for the `ftyp` box brands.

**APNG:** File extension `.apng` → `animated_image`. Note: some PNGs are actually animated (APNG) but have `.png` extension. For simplicity, only `.apng` extension triggers animated detection. True APNG-in-PNG detection requires reading the `acTL` chunk — implement this only if users report issues.

### Video: Browser-Native vs Needs-Remux

|Extension|Browser-Native?                                      |Action                    |
|---------|-----------------------------------------------------|--------------------------|
|mp4      |Yes (H.264/H.265)                                    |Play directly             |
|webm     |Yes (VP8/VP9/AV1)                                    |Play directly             |
|mkv      |No                                                   |Remux to MP4 via ffmpeg   |
|avi      |No                                                   |Remux to MP4 via ffmpeg   |
|mov      |Partial (works on macOS WebKit, not always on others)|Remux to MP4 for safety   |
|wmv      |No                                                   |Remux to MP4 via ffmpeg   |
|flv      |No                                                   |Remux to MP4 via ffmpeg   |
|m4v      |Usually yes (it’s MP4 container)                     |Try direct, remux if fails|

### Remux vs Transcode

Remux (fast, lossless): `ffmpeg -i input.mkv -c copy output.mp4`
This copies the video/audio streams without re-encoding. Takes seconds, not minutes. Only works if the codecs inside are browser-compatible (H.264 video + AAC audio).

If remux produces an unplayable file (rare codecs), fall back to transcode:
`ffmpeg -i input.mkv -c:v libx264 -c:a aac output.mp4`
This is slow. Show progress bar. Cache the result.

## TypeScript Helper (for thumbnail badge display)

```typescript
// src/shared/lib/mediaUtils.ts

import type { MediaType, MediaEntry } from '@/shared/types';

export function isVideoType(type: MediaType): boolean {
  return type === 'video';
}

export function isAnimatedType(type: MediaType): boolean {
  return type === 'animated_image' || type === 'avif_animated';
}

export function isStaticImageType(type: MediaType): boolean {
  return type === 'image' || type === 'avif_static';
}

export function needsRemux(filename: string): boolean {
  const ext = filename.split('.').pop()?.toLowerCase() ?? '';
  return ['mkv', 'avi', 'mov', 'wmv', 'flv'].includes(ext);
}

export function getMediaBadgeLabel(type: MediaType): string | null {
  switch (type) {
    case 'animated_image': return 'GIF';
    case 'avif_animated': return 'AVIF';
    case 'video': return 'VIDEO';
    default: return null;
  }
}

export function formatDuration(ms: number): string {
  const totalSeconds = Math.floor(ms / 1000);
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, '0')}`;
}

/** Get unique media types present in a gallery's media list */
export function getGalleryMediaTypes(media: MediaEntry[]): MediaType[] {
  return [...new Set(media.map(m => m.mediaType))];
}
```

## Rust Helper

```rust
// src-tauri/src/services/media_detector.rs

pub const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"];
pub const ANIMATED_IMAGE_EXTS: &[&str] = &["gif", "apng"];
pub const VIDEO_EXTS: &[&str] = &["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v"];
pub const AVIF_EXTS: &[&str] = &["avif"];

pub const BROWSER_NATIVE_VIDEO: &[&str] = &["mp4", "webm"];
pub const NEEDS_REMUX_VIDEO: &[&str] = &["mkv", "avi", "mov", "wmv", "flv"];

pub fn all_media_extensions() -> Vec<&'static str> {
    let mut all = Vec::new();
    all.extend_from_slice(IMAGE_EXTS);
    all.extend_from_slice(ANIMATED_IMAGE_EXTS);
    all.extend_from_slice(VIDEO_EXTS);
    all.extend_from_slice(AVIF_EXTS);
    all
}

pub fn is_media_file(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    all_media_extensions().contains(&ext.as_str())
}

pub fn classify_extension(ext: &str) -> Option<&'static str> {
    let ext = ext.to_lowercase();
    let ext = ext.as_str();
    if IMAGE_EXTS.contains(&ext) { return Some("image"); }
    if ANIMATED_IMAGE_EXTS.contains(&ext) { return Some("animated_image"); }
    if VIDEO_EXTS.contains(&ext) { return Some("video"); }
    if AVIF_EXTS.contains(&ext) { return Some("avif_static"); } // refined later by container inspection
    None
}
```
