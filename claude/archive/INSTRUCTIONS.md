# Claude Instructions — Hoshii Gallery App

## Golden Rules

1. **Read ARCHITECTURE.md first** before writing any code.
2. **Never modify files outside your assigned feature slice** unless explicitly asked.
3. **Preserve existing functionality.** Re-read the current file before updating. Do not remove existing props, handlers, imports, or logic unless the change explicitly requires it.
4. **Give complete, contiguous code blocks.** Do not scatter tiny edits across many locations.
5. **Every async operation needs try/catch.** Every Tauri invoke needs error handling. Every file access must handle "drive disconnected" gracefully.
6. **Never store `asset://` URLs in the database or Zustand.** Store filesystem paths only. Compute `asset://` URLs at render time via `toAssetUrl()`.

## Project Structure

```
src/
├── app/              # Routes, providers, global CSS (append-only merge points)
├── shared/           # Types, hooks, UI primitives, utils, i18n, api wrapper
├── features/         # ★ Independent vertical slices (one folder per feature)
│   ├── browse-roots/
│   ├── browse-artists/
│   ├── gallery-viewer/
│   ├── file-manager/
│   ├── zip-recovery/
│   ├── search/
│   ├── favorites/
│   ├── reading-progress/
│   ├── tag-system/
│   └── settings/
├── layouts/          # MainLayout, Sidebar, Header, StatusBar
└── pages/            # Route-level page components

src-tauri/src/
├── commands/         # Tauri invoke handlers
├── services/         # Business logic
├── models/           # Rust data structs
└── db/               # SQLite schema + migrations
```

No `entities/` layer. No `widgets/` layer. Types live in `shared/types/`. Layout shells live in `layouts/`.

## Coding Conventions

### TypeScript / React

**Naming:** Components `PascalCase.tsx`, hooks `use*.ts`, utils `camelCase.ts`, types `PascalCase`, stores `use[Feature]Store.ts`, constants `UPPER_SNAKE_CASE`.

**Components:** Functional only. Named exports via barrel `index.ts`. Props interface in same file, above component. One component per file. Destructure props in signature.

**State (Zustand):** One store per feature in `features/[name]/model/`. Never import one feature's store into another. Share data through props or `shared/types/`.

**Import Order:**
```typescript
// 1. React/libraries
// 2. shared/ imports (use @/ alias)
// 3. Feature-local imports (relative ./)
```

**Asset URLs — CRITICAL:**
```typescript
// ✅ CORRECT — compute at render time
import { toAssetUrl } from '@/shared/lib/assetUrl';
<img src={toAssetUrl(media.path)} />

// ❌ WRONG — stored URL goes stale when drive remounts
<img src={media.assetUrl} />
```

**Error Handling:**
```typescript
try {
  const result = await invoke<GalleryMetadata>('scan_gallery', { path });
  logger.debug('Gallery scanned', { path, pages: result.pageCount });
  return result;
} catch (error) {
  const msg = String(error);
  if (msg.includes('not found') || msg.includes('No such file')) {
    logger.warn('Drive may be disconnected', { path });
    toast.warning(t('driveDisconnected'));
  } else {
    logger.error('Failed to scan gallery', { path, error });
    toast.error(t('scanFailed'));
  }
  throw error;
}
```

**Drive Disconnect Pattern:**
```typescript
// Wrap any file-dependent render in availability check
function GalleryCard({ gallery }: { gallery: Gallery }) {
  const isOnline = useDriveStatus(gallery.volumeId);
  if (!isOnline) return <OfflineGalleryCard gallery={gallery} />;
  return <OnlineGalleryCard gallery={gallery} />;
}
```

### Rust (src-tauri)

**Naming:** Files `snake_case.rs`, functions `snake_case`, types `PascalCase`, constants `UPPER_SNAKE_CASE`.

**Command Pattern:**
```rust
#[tauri::command]
pub async fn scan_gallery(path: String) -> Result<GalleryMetadata, String> {
    let path = PathBuf::from(&path);
    if !path.exists() {
        return Err(format!("Path not found (drive disconnected?): {}", path.display()));
    }
    scanner::scan_gallery_dir(&path)
        .map_err(|e| {
            log::error!("scan_gallery failed for {}: {}", path.display(), e);
            format!("Scan failed: {}", e)
        })
}
```

**Errors:** Commands return `Result<T, String>`. Internal services use `anyhow::Result`. Always log with context before converting to String.

### Styling

- Tailwind utility classes for layout. CSS variables for theme tokens.
- **Always include `-webkit-` prefixes** for `backdrop-filter`, `mask-image`, `text-fill-color`.
- Test `aspect-ratio`, `gap` in flexbox, and scroll-snap on WebKit (macOS).
- No inline `style={}` unless dynamically computed (virtual scroll positions).

### Localization (i18n)

Keys use `feature.context.action` format. When adding new keys, provide both languages:
```typescript
// en
'browseRoots.status.driveOffline': 'Drive disconnected',
'browseRoots.status.driveOnline': 'Drive connected',

// zh-TW
'browseRoots.status.driveOffline': '硬碟未連接',
'browseRoots.status.driveOnline': '硬碟已連接',
```

## Media Type Rules

| Type | Extensions | Renderer |
|------|-----------|----------|
| Static Image | jpg, jpeg, png, webp, bmp, tiff | `<img>` via `asset://` |
| Animated Image | gif, apng, animated webp | `<img>` with play/pause overlay |
| Video (native) | mp4, webm | `<video>` with custom VideoPlayer |
| Video (remux) | mkv, avi, mov, wmv, flv | Show "install ffmpeg" if unavailable, else remux→`<video>` |
| AVIF (static) | avif (non-animated) | `<img>` via `asset://` |
| AVIF (animated) | avif (animated) | **Convert to animated WebP in Rust, serve converted file** |

**Why animated AVIF is converted:** WebKit (Tauri on macOS/Linux) has playback quirks with animated AVIF. Converting to WebP guarantees consistent cross-platform behavior.

## File Ordering

Rust backend handles all sorting. Frontend receives pre-sorted arrays. Key rules:
- Case-insensitive prefix grouping
- Numeric extraction from last number sequence before extension
- Mixed media types sort together (a video between images stays in place)
- Camera names (`IMG_20240301_001.jpg`) group by the non-numeric prefix
- Files with no number get sort position 0 within their group

## Logging

```typescript
// Frontend
import { logger } from '@/shared/lib/logger';
logger.debug('Thumbnail loaded', { galleryId, page: 3 });
logger.warn('Backup zip missing', { galleryPath });
logger.error('Failed to remux video', { path, error });
```

```rust
// Rust
log::debug!("Scanning directory: {}", path.display());
log::warn!("ffmpeg not found, video features disabled");
log::error!("Failed to read volume UUID: {}", err);
```

## Testing

### Rust
- Unit tests in each service module: `#[cfg(test)] mod tests { ... }`
- **Required test coverage:** natural sort (all edge cases from ARCHITECTURE.md table), media type detection, incremental scan diff logic, zip integrity check
- Integration tests: scanner with `tempdir` fixtures, SQLite CRUD round-trips

### Frontend
- Vitest + React Testing Library
- **Required test coverage:** PageView media type routing, keyboard navigation in reader, virtual scroll renders correct range, drive offline card rendering
- Store tests: Zustand actions produce expected state transitions

## What NOT To Do

- ❌ Store `asset://` URLs — compute at render time
- ❌ Import between feature slices — share through `shared/` or props
- ❌ Use `localStorage` / `sessionStorage` — use Zustand + SQLite
- ❌ Use `any` type — define proper interfaces
- ❌ Suppress errors silently — always log, surface to user when appropriate
- ❌ Add dependencies without noting it — list new `npm install` or Cargo deps
- ❌ Assume drive is always connected — wrap file access in availability checks
- ❌ Rely on animated AVIF in `<img>` — convert to WebP in Rust
- ❌ Assume ffmpeg is installed — check availability, degrade gracefully
- ❌ Use `WidthType.PERCENTAGE` or browser-specific CSS without `-webkit-` testing
