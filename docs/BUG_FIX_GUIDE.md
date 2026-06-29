# Bug Fix Guide — How and Why Each Bug Was Found and Fixed

An educational reference documenting the systematic bug-fixing process applied to Hoshii. Each bug includes: what it was, how it was detected, why it happened, the fix, and the general lesson.

---

## Detection Methodology

Bugs were found through a **systematic 3-pronged approach:**

1. **Automated scanning** — grep for anti-patterns (`.unwrap()`, `any` type, `console.log`, `TODO/FIXME`, cross-feature imports, hardcoded strings)
2. **Manual store review** — read every Zustand store and check state transitions, error handling, race conditions
3. **Data flow tracing** — follow data from frontend component → store → API → Rust command → SQL and verify types match at each boundary

---

## Bug 1: Stale Favorite Toggle (GalleryCard.tsx)

### What Happened

Clicking the favorite heart worked on the first click but could desync after that. If a parent component re-rendered and passed a new `gallery` prop with updated `favorited` state, the heart icon showed the wrong state.

### How It Was Found

**Manual store review.** Read `GalleryCard.tsx` and noticed `useState(gallery.favorited)` — this only sets the initial value. React's `useState` does NOT re-initialize when props change.

### The Code (Before)

```tsx
const [localFavorited, setLocalFavorited] = useState(gallery.favorited);
// No sync! If gallery.favorited changes externally, localFavorited goes stale.

async function handleFavoriteClick(e: React.MouseEvent) {
  e.stopPropagation();
  setLocalFavorited((prev) => !prev);
  await toggleFavorite({ ...gallery, favorited: localFavorited });
  // localFavorited is the OLD value here because setState is async
}
```

### Why It Happened

Two issues combined:
1. **No prop sync** — `useState(initialValue)` only uses `initialValue` on mount. If `gallery.favorited` changes later (e.g., from a store update), the local state stays stale.
2. **Stale closure** — `localFavorited` in the click handler captures the value from the current render, not the value after `setLocalFavorited` runs. This actually works correctly in the simple case (because the store uses `!gallery.favorited`), but it's fragile and confusing.

### The Fix

```tsx
const [localFavorited, setLocalFavorited] = useState(gallery.favorited);

// Sync when prop changes
useEffect(() => {
  setLocalFavorited(gallery.favorited);
}, [gallery.favorited]);

async function handleFavoriteClick(e: React.MouseEvent) {
  e.stopPropagation();
  const newFavorited = !localFavorited;  // Capture clearly
  setLocalFavorited(newFavorited);
  await toggleFavorite({ ...gallery, favorited: localFavorited });
}
```

### General Lesson

> **When using `useState` initialized from a prop, ALWAYS add a `useEffect` to sync it.** React intentionally does not re-initialize state when props change. This is a common source of bugs in controlled/uncontrolled component hybrids.

---

## Bug 2: Move Modal Retained Stale Selection (FileManagerView.tsx)

### What Happened

User opens the "Move to Gallery" modal, selects "Gallery A", closes without moving. Next time they open the modal, "Gallery A" is still highlighted. If they click "Move" without looking carefully, files go to the wrong gallery.

### How It Was Found

**Manual component review.** Read the modal open/close handlers and noticed `selectedGalleryPath` was never reset.

### The Code (Before)

```tsx
const [selectedGalleryPath, setSelectedGalleryPath] = useState('');

// Opening the modal — no state reset!
<Button onClick={() => setMoveModalOpen(true)}>Move selected</Button>

// Closing the modal — also no reset!
onClose={() => setMoveModalOpen(false)}
```

### Why It Happened

The developer correctly initialized `selectedGalleryPath` as empty but forgot that modal open/close cycles don't re-mount the component. `useState('')` only runs on the first mount. After that, the state persists across modal opens.

### The Fix

```tsx
<Button onClick={() => { setSelectedGalleryPath(''); setMoveModalOpen(true); }}>
  Move selected
</Button>
```

### General Lesson

> **Reset ephemeral UI state when re-opening modals/dialogs.** A modal that closes and reopens is NOT unmounted/remounted — it's just hidden. Any selection state from the previous session lingers.

---

## Bug 3: Silent localStorage Failure (useGalleryReaderStore.ts)

### What Happened

In private browsing mode or when storage quota is exceeded, reader preferences (fit mode, reading direction, etc.) silently failed to save. The user would configure preferences, read a gallery, come back later, and find everything reset to defaults with no indication of what went wrong.

### How It Was Found

**Anti-pattern scan.** Searched for empty `catch` blocks and found:

```typescript
catch {
  // ignore storage errors
}
```

### Why It Happened

The original developer knew localStorage could fail and caught the error — but then did nothing with it. This is worse than not catching at all, because it masks the problem entirely.

### The Fix

```typescript
catch (err) {
  logger.warn('Failed to save reader preferences to localStorage', {
    galleryId,
    error: String(err),
  });
}
```

### General Lesson

> **Never use empty catch blocks.** At minimum, log the error. An empty catch block is a debugging black hole — when something goes wrong, you'll have zero evidence of what happened. The CONVENTIONS.md rule "Never suppress errors silently" exists for exactly this reason.

---

## Bug 4: Missing Error State (useReadingProgressStore.ts)

### What Happened

When saving reading progress failed (network error, DB lock timeout), the error was logged to console but the UI had no way to know it failed. The `savingProgress` flag went from `true` back to `false`, and the component thought everything was fine.

### How It Was Found

**Store review.** Compared the store interface to the standard `AsyncState<T>` pattern. All other stores had `error: string | null` for their async operations. This one didn't.

### The Code (Before)

```typescript
interface ReadingProgressState {
  savingProgress: boolean;   // ← Can tell if saving
  // No error field!         // ← Can't tell if save FAILED

  saveProgress: (...) => Promise<void>;
}
```

### The Fix

```typescript
interface ReadingProgressState {
  savingProgress: boolean;
  saveError: string | null;    // NEW
  fetchError: string | null;   // NEW

  saveProgress: (...) => Promise<void>;
}
```

The catch block now sets `saveError`:
```typescript
catch (err) {
  const message = String(err);
  logger.error('Failed to save reading progress', { ... });
  set({ savingProgress: false, saveError: message });  // ← Now exposed to UI
}
```

### General Lesson

> **Every async operation needs three states: loading, success, and error.** The `AsyncState<T>` pattern (`{ data, loading, error }`) exists because skipping any one creates a blind spot. If your store has `loading: boolean` but no `error: string | null`, the UI can't distinguish "done successfully" from "failed silently."

---

## Bug 5: Race Condition on Artist Change (FileManagerPage.tsx)

### What Happened

In the File Manager, quickly switching between artists could show galleries from the wrong artist. Example: select Artist A (slow network), immediately select Artist B (fast response) — Artist B's galleries show first, then Artist A's response arrives and overwrites them.

### How It Was Found

**Manual flow analysis.** Read `handleArtistChange` and noticed two concurrent async operations (`fetchUnorganizedFiles` + `invoke('get_galleries')`) without any cancellation or staleness check.

### The Code (Before)

```typescript
async function handleArtistChange(artistId: number) {
  setSelectedArtistId(artistId);
  fetchUnorganizedFiles(artistId);      // fire-and-forget
  const galleryList = await invoke('get_galleries', { artistId });
  setGalleries(galleryList);            // Always applies, even if user switched again!
}
```

### Why It Happened

Classic "last-writer-wins" problem. Both requests race, and whichever finishes last sets the state — regardless of which artist is currently selected.

### The Fix

```typescript
const artistRequestRef = useRef(0);

async function handleArtistChange(artistId: number) {
  const requestId = ++artistRequestRef.current;  // Monotonically increasing ID
  setSelectedArtistId(artistId);
  setGalleries([]);                                // Clear immediately
  fetchUnorganizedFiles(artistId);
  const galleryList = await invoke('get_galleries', { artistId });
  if (artistRequestRef.current === requestId) {   // Only apply if still current
    setGalleries(galleryList);
  }
}
```

### General Lesson

> **When an async operation is triggered by user selection, always guard against stale responses.** The simplest technique is a request counter (`useRef<number>`). Increment on each request, check before applying the result. More advanced: use `AbortController` for cancelable fetch requests.

---

## Bug 6: Hardcoded English in ReadingToolbar (ReadingToolbar.tsx)

### What Happened

The fit mode buttons (Best, Width, Height, 1:1) were hardcoded English strings while all other toolbar buttons used the `t()` translation function. For zh-TW users, the reading mode and direction labels appeared in Chinese, but the fit mode labels stayed in English.

### How It Was Found

**i18n audit.** Compared the reading toolbar constants:

```typescript
// READING_MODES — correctly internationalized
{ value: 'single', label: t('reader.modeSingle'), icon: '□' },

// FIT_MODES — hardcoded English!
{ value: 'fit_best', label: 'Best' },
```

### The Fix

1. Added 4 new translation keys to both `en` and `zh-TW`:
   ```typescript
   'reader.fitBest': 'Best',      // zh-TW: '最佳'
   'reader.fitWidth': 'Width',    // zh-TW: '寬度'
   'reader.fitHeight': 'Height',  // zh-TW: '高度'
   'reader.fitOriginal': '1:1',   // zh-TW: '1:1'
   ```

2. Updated the constant to use translation keys:
   ```typescript
   const FIT_MODES = [
     { value: 'fit_best', labelKey: 'reader.fitBest' },
     // ...
   ];
   // Usage: {t(fm.labelKey)}
   ```

### General Lesson

> **When adding UI text, always use the i18n system from day one.** It's much harder to find and fix hardcoded strings later. A quick grep for quoted strings in UI components (`grep -rn "'[A-Z]" src/features/`) can catch these early.

---

## Bug 7: Double Fetch on Mount (ArtistPage.tsx)

### What Happened

Every time ArtistPage loaded, `fetchGalleries(artistId)` was called twice. This meant double the API requests, double the database queries, and a flash of empty content between the two responses.

### How It Was Found

**useEffect dependency analysis.** Two separate `useEffect` hooks both called the same function:

```typescript
useEffect(() => { fetchGalleries(id); }, [id, fetchGalleries]);
useEffect(() => { fetchGalleries(id); }, [gallerySort, id, fetchGalleries]);
```

Both fire on mount because all their dependencies are satisfied.

### Why It Happened

The developer originally had one effect for initial load, then added another for "re-fetch when sort changes." They didn't realize the second effect's dependency array is a superset of the first — it fires on mount AND on sort change.

### The Fix

Merge into one:

```typescript
useEffect(() => {
  if (!isNaN(numericArtistId)) {
    fetchGalleries(numericArtistId);
  }
}, [gallerySort, numericArtistId, fetchGalleries]);
```

### General Lesson

> **Before adding a new `useEffect`, check if an existing one already covers your dependencies.** If effect B's dep array is a superset of effect A's, they will BOTH fire on mount. Merge them.

---

## Bug 8: Double Search from URL (SearchPage.tsx)

### What Happened

When opening the search page with a `?q=term` URL parameter, two search API calls fired — one immediately from `search(q)` and one 300ms later from the debounce inside `setQuery(q)`.

### How It Was Found

**Data flow tracing.** Followed what happens in the mount effect:

```typescript
useEffect(() => {
  const q = searchParams.get('q') ?? '';
  if (q) {
    setQuery(q);  // Triggers debounced search (fires in 300ms)
    search(q);    // Triggers immediate search
  }
}, []);
```

Then checked the store: `setQuery` internally calls `set({ loading: true })` and starts a 300ms timer that calls `search()`. Meanwhile, `search()` also fires immediately. Result: two concurrent search requests.

### The Fix

Remove the redundant `setQuery(q)` call. `search(q)` already sets the query in the store:

```typescript
useEffect(() => {
  const q = searchParams.get('q') ?? '';
  if (q) {
    search(q);  // Sets query AND searches — no need for setQuery()
  }
}, []);
```

### General Lesson

> **Before calling multiple store actions in sequence, check if they overlap.** If action A internally triggers action B, calling both A and B causes a duplicate. Read the store implementation, not just the interface.

---

## Bug 9: Duplicate Tag Struct (Rust — tags.rs vs models/media.rs)

### What Happened

Two different `Tag` structs existed:
- `models/media.rs`: `gallery_count: Option<i64>` (with `#[serde(skip_serializing_if)]`)
- `commands/tags.rs`: `gallery_count: i64` (required field)

The frontend received different JSON shapes depending on which endpoint was called.

### How It Was Found

**Cross-file type comparison.** Searched for `struct Tag` across all `.rs` files and found two definitions.

### Why It Happened

When `tags.rs` was written, the developer defined a local `Tag` struct that fit the specific SQL query (which always returns a count). They didn't know or forgot that a canonical `Tag` struct already existed in models.

### The Fix

Delete the duplicate struct from `tags.rs`, import from `crate::models::Tag`, and wrap the count in `Some()`:

```rust
// Before (tags.rs)
gallery_count: row.get(2)?,

// After
gallery_count: Some(row.get(2)?),
```

### General Lesson

> **Types should have one canonical definition.** When adding a new endpoint, check if the type already exists in models. Duplicating structs across modules creates serialization inconsistencies that are invisible until runtime.

---

## Bug 10: Gallery Sort Silently Ignored (Rust — db_ops.rs)

### What Happened

The ArtistPage had a sort dropdown (A-Z, Z-A, Newest, etc.) that appeared to work — the UI re-fetched galleries when sort changed. But the results were always alphabetical because the backend ignored the `sort` parameter.

### How It Was Found

**Data flow tracing.** Traced from frontend to backend:

```
Frontend: api.getGalleries(artistId, sort)
          → invoke('get_galleries', { artistId, sort })

Backend:  pub async fn get_galleries(db, artist_id: i64)
          // No `sort` parameter!  ← BUG
          // SQL: ORDER BY name COLLATE NOCASE  ← Always alphabetical
```

The `sort` field was sent by the frontend but the Rust command didn't accept it. Tauri silently ignores extra parameters in `invoke()` calls.

### The Fix

1. Added `sort: Option<String>` to the Rust command
2. Added match expression to translate sort values to SQL ORDER BY clauses
3. Used `format!()` for the ORDER BY clause (safe because values are hardcoded match arms, not user input)

```rust
let order_clause = match sort {
    Some("name_desc") => "name COLLATE NOCASE DESC",
    Some("date_desc") => "last_read_at DESC NULLS LAST, name COLLATE NOCASE",
    Some("pages_desc") => "page_count DESC, name COLLATE NOCASE",
    _ => "name COLLATE NOCASE ASC",
};
```

### General Lesson

> **When adding frontend features that send new parameters to the backend, verify the backend actually receives them.** Tauri's `invoke()` doesn't error on extra parameters — they're silently dropped. This creates the illusion of working (the UI re-fetches, the sort dropdown updates) while the backend does nothing different. Always verify end-to-end.

---

## Bug 11: `.expect()` in Production (main.rs)

### What Happened

During app startup, if the `root_folders` table didn't exist (fresh install, migration issue), the fallback query preparation used `.expect("fallback query")` which would panic and crash the app.

### How It Was Found

**Anti-pattern scan.** Searched for `.expect(` in non-test Rust files.

### The Code (Before)

```rust
let mut stmt = conn
    .prepare("SELECT path FROM root_folders")
    .unwrap_or_else(|_| conn.prepare("SELECT '' WHERE 0").expect("fallback query"));
```

### Why It's Bad

`.expect()` panics on failure, crashing the entire application. In a startup path, this means the app won't launch at all — the user sees a crash instead of an empty gallery list.

### The Fix

```rust
match conn.prepare("SELECT path FROM root_folders") {
    Ok(mut stmt) => stmt.query_map(...)...,
    Err(e) => {
        log::warn!("Could not query root folders on startup: {}", e);
        Vec::new()  // Graceful degradation: start with no watchers
    }
}
```

### General Lesson

> **Never use `.unwrap()` or `.expect()` in production Rust code.** They convert recoverable errors into unrecoverable panics. Use `match`, `if let`, `.unwrap_or_default()`, or the `?` operator instead. Reserve `.unwrap()` for tests where panicking IS the desired failure behavior.

---

## Bug 12: Volume Fallback FK Violation (root_folders.rs)

### What Happened

When adding a root folder with no volumes detected, the code tried to create a "local" placeholder volume. If that also failed (e.g., due to a constraint violation), it fell back to `volume_id = 1`. If no row with `id = 1` existed in the volumes table, the subsequent `INSERT INTO root_folders (volume_id = 1, ...)` would fail with a foreign key violation.

### How It Was Found

**Logic analysis.** Read the fallback chain:

```rust
.unwrap_or_else(|_| {
    conn.execute("INSERT OR IGNORE INTO volumes ...").ok();  // Might fail silently
    conn.query_row("SELECT id FROM volumes WHERE uuid = 'local'", ...)
        .unwrap_or(1)  // Magic number! What if id=1 doesn't exist?
})
```

### The Fix

Added a cascading fallback with logging:

```rust
.unwrap_or_else(|_| {
    conn.execute("INSERT OR IGNORE INTO volumes ...").ok();
    conn.query_row("SELECT id FROM volumes WHERE uuid = 'local'", ...)
        .map_err(|e| {
            log::error!("Failed to create or find local volume: {}", e);
            e
        })
        .unwrap_or_else(|_| {
            // Last resort: get ANY volume that exists
            conn.query_row("SELECT id FROM volumes ORDER BY id LIMIT 1", ...)
                .unwrap_or(1)
        })
})
```

### General Lesson

> **Never hardcode database IDs as fallback values.** Auto-increment IDs are not guaranteed to start at 1, and the row might not exist. Use a query to find an actual existing row, or create one explicitly. When writing fallback chains, ensure each level is safer than the last, not equally fragile.

---

## Summary: Bug Categories and Detection Methods

| Category | Count | Detection Method |
|----------|-------|-----------------|
| Stale state / prop sync | 2 | Manual store + component review |
| Race conditions | 1 | Data flow tracing |
| Missing error state | 2 | Pattern comparison (AsyncState) |
| i18n gaps | 1 | Translation audit |
| Duplicate operations | 2 | useEffect dependency analysis |
| Type duplication | 1 | Cross-file struct search |
| Frontend/backend mismatch | 1 | End-to-end data flow tracing |
| Production safety | 2 | Anti-pattern grep (`.expect()`, `.unwrap()`) |

### Prevention Checklist

Use this before submitting any PR:

- [ ] Every `useState(prop)` has a sync `useEffect`
- [ ] Every async operation triggered by user selection has staleness protection
- [ ] Every store has `error` state for each async action
- [ ] All user-facing strings use `t()` translation function
- [ ] No two `useEffects` have overlapping dependency arrays that call the same function
- [ ] No duplicate struct/type definitions across modules
- [ ] Frontend `invoke()` parameters match Rust command signatures
- [ ] No `.unwrap()` or `.expect()` in production Rust code
- [ ] No empty `catch` blocks
- [ ] No hardcoded database IDs as fallback values
