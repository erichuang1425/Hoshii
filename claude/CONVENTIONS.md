# Coding Conventions & Standards

## Golden Rules

1. **Read ARCHITECTURE.md first** before writing any code.
2. **Never modify files outside your assigned feature slice** unless explicitly asked.
3. **Preserve existing functionality.** Re-read the current file before updating. Do not remove existing props, handlers, imports, or logic unless the change explicitly requires it.
4. **Give complete, contiguous code blocks.** Do not scatter tiny edits across many locations.
5. **Every async operation needs try/catch.** Every Tauri invoke needs error handling. Every file access must handle "drive disconnected" gracefully.
6. **Never store `asset://` URLs in the database or Zustand.** Store filesystem paths only. Compute `asset://` URLs at render time via `toAssetUrl()`.

---

## TypeScript / React

### Naming

- Components: `PascalCase.tsx`
- Hooks: `use*.ts`
- Utils: `camelCase.ts`
- Types/interfaces: `PascalCase`
- Stores: `use[Feature]Store.ts`
- Constants: `UPPER_SNAKE_CASE`

### Components

- Functional only. Named exports via barrel `index.ts`.
- Props interface in same file, above component. One component per file.
- Destructure props in signature.
- Components over 200 lines should be split.

### State (Zustand)

- One store per feature in `features/[name]/model/`.
- Never import one feature's store into another.
- Share data through props or `shared/types/`.
- `AsyncState<T>` wrapper for all data fetching.

### Import Order

```typescript
// 1. React/libraries
// 2. shared/ imports (use @/ alias)
// 3. Feature-local imports (relative ./)
```

### Asset URLs — CRITICAL

```typescript
// ✅ CORRECT — compute at render time
import { toAssetUrl } from '@/shared/lib/assetUrl';
<img src={toAssetUrl(media.path)} />

// ❌ WRONG — stored URL goes stale when drive remounts
<img src={media.assetUrl} />
```

### Error Handling

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

### Local State Sync with Props

When using `useState` initialized from a prop, sync it when the prop changes:

```typescript
// ✅ CORRECT — sync local state with prop
const [localValue, setLocalValue] = useState(gallery.favorited);
useEffect(() => {
  setLocalValue(gallery.favorited);
}, [gallery.favorited]);

// ❌ WRONG — local state goes stale when prop changes
const [localValue, setLocalValue] = useState(gallery.favorited);
// Never synced again after mount!
```

### Race Condition Prevention

When async operations depend on rapidly-changing selections (e.g., dropdown changes), use a request counter:

```typescript
const requestRef = useRef(0);

async function handleChange(id: number) {
  const requestId = ++requestRef.current;
  setSelectedId(id);
  const data = await fetchData(id);
  // Only apply if this is still the latest request
  if (requestRef.current === requestId) {
    setData(data);
  }
}
```

### Avoid Double Fetching

Never split dependent fetches into separate `useEffect` hooks with overlapping deps:

```typescript
// ❌ WRONG — both fire on mount, causing double fetch
useEffect(() => { fetch(id); }, [id]);
useEffect(() => { fetch(id); }, [sort, id]);

// ✅ CORRECT — single effect with all deps
useEffect(() => { fetch(id); }, [sort, id]);
```

### Drive Disconnect Pattern

```typescript
function GalleryCard({ gallery }: { gallery: Gallery }) {
  const isOnline = useDriveStatus(gallery.volumeId);
  if (!isOnline) return <OfflineGalleryCard gallery={gallery} />;
  return <OnlineGalleryCard gallery={gallery} />;
}
```

---

## Rust (src-tauri)

### Naming

- Files: `snake_case.rs`
- Functions: `snake_case`
- Types: `PascalCase`
- Constants: `UPPER_SNAKE_CASE`
- Functions over 50 lines should be split into helpers.

### Command Pattern

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

### Errors

- Commands return `Result<T, String>`.
- Internal services use `anyhow::Result`.
- Always log with context before converting to String.

---

## Styling

- Tailwind utility classes for layout. CSS variables for theme tokens.
- **Always include `-webkit-` prefixes** for `backdrop-filter`, `mask-image`, `text-fill-color`.
- Test `aspect-ratio`, `gap` in flexbox, and scroll-snap on WebKit (macOS).
- No inline `style={}` unless dynamically computed (virtual scroll positions).

---

## Localization (i18n)

Keys use `feature.context.action` format. Always provide both languages:

```typescript
// en
'browseRoots.status.driveOffline': 'Drive disconnected',
// zh-TW
'browseRoots.status.driveOffline': '硬碟未連接',
```

---

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

---

## Testing

### Rust

- Unit tests in each service module: `#[cfg(test)] mod tests { ... }`
- Required coverage: natural sort (all edge cases), media type detection, incremental scan diff, zip integrity
- Integration tests: scanner with `tempdir` fixtures, SQLite CRUD round-trips

### Frontend

- Vitest + React Testing Library
- Required coverage: PageView media type routing, keyboard navigation, virtual scroll rendering, drive offline card
- Store tests: Zustand actions produce expected state transitions (use `getState()`/`setState()` directly, no React render needed)

---

## Technical Debt Format

Use structured TODO comments that are greppable:

```typescript
// TODO(debt): [CATEGORY] Description — Logged by Task X.X
```

Categories: `[PERF]`, `[COMPAT]`, `[EDGE-CASE]`, `[SECURITY]`, `[UX]`, `[REFACTOR]`, `[TEST]`

Find all debt:
```bash
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

---

## Anti-Patterns to Avoid

### Rust

- ❌ `.unwrap()` or `.expect()` in production code — use `?` operator
- ❌ Sprinkling `.clone()` to satisfy borrow checker — think about ownership first
- ❌ `unsafe` blocks — no valid reason in this project
- ❌ Synchronous file I/O in async command handlers — use `tokio::fs` or `spawn_blocking`
- ❌ Hardcoding paths with `/` — use `PathBuf::join()`
- ❌ Ignoring `log` crate — every command entry/exit and error must be logged

### TypeScript/React

- ❌ `any` type — define proper interfaces
- ❌ `useEffect` for data that should be in Zustand — effects are for side-effects
- ❌ Storing derived data (like `asset://` URLs) in state
- ❌ Missing error boundaries — every page needs one
- ❌ Missing loading states — use `AsyncState<T>` pattern
- ❌ Importing between feature slices — breaks the architecture

### Tauri

- ❌ Using `fs` plugin for bulk operations — do filesystem work in Rust commands
- ❌ Assuming asset protocol scope covers all paths — external drives need `allow_directory()`
- ❌ Sending large binary data over IPC — use asset protocol for media, IPC only for metadata

---

## What NOT To Do

- ❌ Store `asset://` URLs — compute at render time
- ❌ Import between feature slices — share through `shared/` or props
- ❌ Use `localStorage` / `sessionStorage` — use Zustand + SQLite
- ❌ Suppress errors silently — always log, surface to user when appropriate
- ❌ Add dependencies without noting it — list new `npm install` or Cargo deps
- ❌ Assume drive is always connected — wrap file access in availability checks
- ❌ Rely on animated AVIF in `<img>` — convert to WebP in Rust
- ❌ Assume ffmpeg is installed — check availability, degrade gracefully
