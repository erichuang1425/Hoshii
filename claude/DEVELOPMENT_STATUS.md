# Development Status & Current Plan

**Snapshot (2026-04-20).** All 6 planned phases are complete. Phase 6 hardening, the post-phase bug-fix pass, and a follow-up UI/accessibility/perf polish pass are also done. **275+ tests passing** (158 frontend + 117+ Rust). The app is feature-complete for desktop; remaining work is polish, tech-debt reduction, and optional roadmap items.

This document is the single source of truth for "what is done, what is broken, and what is next." Everything historical is kept in short form; the forward-looking plan is the priority.

---

## 1. Current State (what works today)

### Features shipped end-to-end

| Area | Status |
|------|--------|
| Multi-drive scanning (full + incremental, volume-aware) | ✅ |
| Thumbnail pipeline (Lanczos3 WebP, LRU eviction) | ✅ |
| Media probe + ffmpeg remux/convert (AVIF→WebP) | ✅ |
| Browse Roots / Artists / Gallery reader | ✅ |
| Reading modes: single, double, vertical scroll, thumbnail grid, long strip, webtoon | ✅ (long_strip wired in `GalleryReader.tsx:256` since eb29056) |
| Video player (seek, volume, speed, PiP, loop) | ✅ |
| Sidebar / Header / Status Bar | ✅ |
| Settings (theme, reading, thumbnails, video, gallery, advanced) + light mode | ✅ |
| Favorites (optimistic toggle + dedicated page) | ✅ |
| Tag system (modal, filter bar, batch fetching to avoid N+1) | ✅ |
| Search (debounced, URL-sync, recent queries) | ✅ |
| File manager (selection, bulk move, create gallery) | ✅ |
| Zip recovery (integrity verification + restore) | ✅ |
| Smart collection linking (Levenshtein + regex, union-find) | ✅ |
| Chronological linking (filename date parsing, prev/next chain) | ✅ |
| Timeline navigation (per-image date plotting, zoom) | ✅ |
| Reading progress (3s debounced save, Continue Reading section) | ✅ |
| Error boundary (class component, recovery UI) | ✅ |
| File watcher (notify, 100ms debounce, Tauri events) | ✅ |
| DB migrations (embedded SQL, schema_version table) | ✅ |
| Drive status via Tauri events (+30s fallback poll) | ✅ |
| ArtistCard cover thumbnail (first gallery cover via SQL subquery) | ✅ |
| i18n (en + zh-TW, full coverage) | ✅ |

### Backend surface

- **42 registered Tauri commands** in `src-tauri/src/main.rs`.
- Services: scanner, thumbnail, media_detector, natural_sort, video_processor, volume_tracker, smart_grouping, chrono_linking, file_watcher.
- DB: SQLite (WAL), migrations in `src-tauri/src/db/migrations/`.
- Zero `unwrap()` / `expect()` in production code paths (test code only).

### Frontend architecture

- 12 feature slices under `src/features/` (browse-artists, browse-roots, chrono-linking, favorites, file-manager, gallery-viewer, reading-progress, search, settings, smart-groups, tag-system, zip-recovery).
- Cross-feature-slice imports: **zero** after 0e32766. Shared components (`GalleryCard`, `TagModal`) live in `src/shared/ui/` and receive all cross-cutting concerns as props.
- Zustand stores per feature. No `any` types in TS source.
- Router + providers in append-only merge-safe files.

---

## 2. Recently Completed (since the last documentation refresh)

Five commits landed after the previous `DEVELOPMENT_STATUS.md` snapshot. Each resolves an item that was previously listed under "Remaining Work."

| Commit | Area | What changed |
|--------|------|-------------|
| 0e32766 | **Architecture** | Resolved all 7 cross-feature-slice import violations. `GalleryCard` and `TagModal` moved to `shared/ui/` as prop-driven components; pages wire stores and pass data down. `GalleryReader` receives chrono/reading-progress state as props. |
| eb29056 | **Correctness** | `get_galleries` no longer builds SQL with `format!()` — each allowed ORDER BY is a compile-time `&'static str` chosen via `match`, satisfying CLAUDE.md rule 6. `long_strip` reading mode is now handled (shares `vertical_scroll` branch). |
| a83fbaf | **Layout** | Seven layout bugs fixed: Sidebar `h-full` collapse in `MainLayout`, flex truncation requiring `min-w-0`, bogus `-webkit-backdrop-filter-blur-[2px]` class, `ThumbnailStrip` thumbnail overflow, Firefox-only `scrollbarWidth: none`, `InfiniteSlider` popover overflowing viewport bottom, `useGridColumns` stuck on fallback (rewritten with `useLayoutEffect` + `ResizeObserver`). |
| 8f0c06c | **Accessibility & UX** | Global `.focus-ring` utility applied to every non-`<Button>` interactive element; `aria-current` / `aria-pressed` / `aria-expanded` / `aria-label` added where state was only visual; `GalleryCard` handles Space in addition to Enter; `useKeyboard` now ignores editable targets and requires exact modifier match; reader shortcuts `w` / `r` / `s` / `[` / `]` / `f` / Shift+Arrow wired per `UI_REFERENCE.md`; global `/` and Ctrl/Cmd+F focus Header search; semantic z-index tokens (`--z-overlay/sticky/reader/dropdown/modal/toast`) replace magic numbers; `WebkitBackdropFilter` paired with `backdrop-blur-sm`. |
| 8ce5bcb | **Microinteractions & perf** | `GalleryCard` and `ArtistCard` gain `scale(1.03)` hover + shadow lift and are wrapped in `React.memo`. `Skeleton` uses a shimmer gradient (respects `prefers-reduced-motion`). `ImageView` fades in on load (200ms, `decoding="async"`). `ArtistPage` memoizes `displayedGalleries` (Set-based lookup) and stabilizes `renderCard` with `useCallback` so `memo(GalleryCard)` actually pays off. |

---

## 3. Forward Plan (prioritized remaining work)

The sections below are **what still needs to happen**, ordered so the next session can pick up at the top.

### 3.1 High priority

None at this point. The previous HIGH item — cross-feature import cleanup — is done (0e32766).

### 3.2 Medium priority

| # | Item | Why | Scope |
|---|------|-----|-------|
| M1 | **Connection pooling** | `Mutex<Connection>` serializes every DB call. Under heavy scan + UI fetch load, the UI stalls on scan threads. See `TODO(debt)` at `src-tauri/src/db/mod.rs:9`. | Swap `Mutex<Connection>` for `r2d2` + `r2d2_sqlite`. Update every `db_state.conn.lock()` call site (~15 commands). Keep WAL mode. Re-run the full Rust test suite. |
| M2 | **EXIF date extraction** | `chrono_linking.rs` only parses dates from filenames, so JPEGs named `IMG_0001.jpg` do not chronologically link. | Add `kamadak-exif` (or `exif` crate); extract `DateTimeOriginal` from JPEG/TIFF during scan; fall back to filename parsing; persist to the existing date column. Unit-test with fixture images. |
| M3 | **E2E integration tests** | Unit/store tests cannot catch Tauri IPC wiring regressions or router/state interactions. | Add Playwright (Tauri WebDriver) covering: add root → scan → browse artists → open gallery → favorite → tag → search → restart and reload. Run in CI. |
| M4 | **Accessibility audit pass 2** | 8f0c06c handled focus and keyboard; screen-reader semantics and live regions are not yet audited. | Manual NVDA/VoiceOver pass on reader + modals; add `aria-live` for toasts and scan progress; verify dialog focus trap on `Modal`; confirm tab order on the reader chrome. |

### 3.3 Low priority / roadmap

| # | Item | Status / notes |
|---|------|----------------|
| L1 | Performance profiling at 10k+ galleries | Smoke-test virtual scrolling, thumbnail cache eviction, DB index coverage. Likely output: add indexes on `galleries(artist_id, name)`, `gallery_tags(tag_id)`, and confirm `react-virtual` overscan for the artist grid. |
| L2 | Mobile / remote access | See `MOBILE_STRATEGY.md` for the comparison matrix. No code work started. |
| L3 | Additional reading-progress UX | Per-image progress (for long strip) currently stores last-read page only; consider scroll-position persistence. |
| L4 | Export/import round-trip UI | `export_metadata` / `import_metadata` Rust commands exist but have no dedicated UI; exposed only as advanced setting. |

### 3.4 Intentionally NOT doing

- **Adding a generic HTTP server** — see `MOBILE_STRATEGY.md`; the chosen approach is a companion syncthing/WebDAV flow, not a bundled server.
- **Abstracting over Tauri vs. web** — app is desktop-first by architecture (see ADR.md).
- **Any feature gated behind "drive connected" without an explicit offline path** — see CLAUDE.md rule 4.

---

## 4. Known flaws & technical debt

Only the items that still bite. Everything previously listed and now fixed has been removed.

| Item | Location | Severity | Notes |
|------|----------|----------|-------|
| `Mutex<Connection>` serializes DB | `src-tauri/src/db/mod.rs` | Medium | Tracked as M1 above. `TODO(debt)` marker in source. |
| Filename-only chronological dates | `src-tauri/src/services/chrono_linking.rs` | Medium | Tracked as M2. |
| No E2E coverage | — | Medium | Tracked as M3. Regressions in IPC wiring are only caught at dev-time. |
| Reader toolbar i18n has 16 keys; the few remaining hardcoded strings live in dev-only error toasts | `src/shared/ui/ToastProvider.tsx` internals | Low | Error messages bubbled from Rust are passed through unchanged. |
| `Skeleton` shimmer uses a fixed color stop that looks slightly off on pure-white light-mode backgrounds | `src/shared/ui/Skeleton.tsx` | Low | Needs a light-mode-specific gradient stop. |
| No offline-mode indicator on the Gallery reader itself (sidebar already shows drive status) | `src/features/gallery-viewer/ui/GalleryReader.tsx` | Low | An `OfflineOverlay` exists in `shared/ui/` but is only used by grid views. |

Find all in-code debt markers:

```bash
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

Currently the grep returns **one** marker (the connection-pool note above).

---

## 5. Things you must know before editing

These are rules and gotchas that have burned previous sessions. Read before touching the listed area.

### 5.1 Hard rules (from CLAUDE.md — re-read if unsure)

1. **Never store `asset://` URLs** in DB or Zustand. Compute at render time via `toAssetUrl()`. The `thumbnail_grid` regression that already cost us once came from this.
2. **Every async operation handles "drive disconnected."** The drive can vanish mid-scan; the UI must not crash.
3. **No cross-feature-slice imports.** Share via `shared/` or props. As of 0e32766 the codebase is clean — do not reintroduce violations.
4. **All SQL parameterized.** `get_galleries` in `db_ops.rs` previously used `format!()` for the ORDER BY clause (safe due to whitelist, but disallowed). Use the `match`-to-`&'static str` pattern instead.
5. **No `.unwrap()` / `.expect()` in Rust production code.** Tests only.
6. **No `any` in TypeScript.** Ever.
7. **Sync local state with props.** `useState` seeded from a prop needs a `useEffect` syncing on prop change. This was the stale-closure favorite-toggle bug.
8. **Prevent race conditions** on user-driven async. Use a request counter (`artistRequestRef` pattern in `FileManagerPage.tsx`) to discard stale responses.

### 5.2 Tauri v2 specifics

- **`fs` permissions are per-scope, no `fs:allow-all`.** Each permission goes in `src-tauri/capabilities/default.json`.
- **`protocol-asset` feature is required** on the `tauri` dependency for `toAssetUrl()` to work — it is enabled in `src-tauri/Cargo.toml`.
- **Migrations are `include_str!()`-compiled**; no runtime file resolution. Add new migrations as `NNN_description.sql` under `src-tauri/src/db/migrations/` and append to the `MIGRATIONS` const in `db/mod.rs`.

### 5.3 Platform-specific gotchas

- **Linux volume detection**: `blkid` requires root on some distros. The fallback chain resolves `/dev/disk/by-uuid/` symlinks. Keep both.
- **WebKit backdrop-filter**: Tailwind's `backdrop-blur-*` does not emit `-webkit-backdrop-filter`. Pair with an inline `WebkitBackdropFilter` style (see reader header after 8f0c06c).
- **Firefox-only `scrollbarWidth: none`**: Use the `.scrollbar-hidden` utility in `global.css` for cross-browser hiding.
- **`useGridColumns` must use `useLayoutEffect` + `ResizeObserver`** — reading width during render returns the fallback.

### 5.4 Build / test gotchas

- **jsdom is explicit**: `vitest` does not bundle it. `jsdom` is in devDependencies; do not remove.
- **npm install quirks**: if rollup optional deps break the install, use `npm install --prefer-offline --no-optional` then `npm install --ignore-scripts`.
- **Rust tests require Tauri system deps** (`libgtk-3-dev`, etc.). Frontend tests run cleanly in any Node 20+ environment.
- **Zustand store tests don't render React**: use `vi.mock()` for the API module and poke state via `useXStore.getState()` / `setState()`.

### 5.5 Patterns to copy

- **Batch fetching over N+1**: `useTagStore.fetchBatchGalleryTags(ids)` called once from the page, `GalleryCard` checks the cache before any fetch.
- **Event-driven polling fallback**: `useDriveStatus` listens to `volume_status_changed` and keeps a 30s fallback poll — emit an event from Rust on state change, let the frontend subscribe.
- **Props-over-imports for cross-slice data**: see `GalleryReader`, which takes `chronoData`, `onProgressSave`, etc. as props from `GalleryPage`.
- **`React.memo` + stable callbacks**: only helps when parents memoize the inputs. See `ArtistPage` after 8ce5bcb for the pairing.
- **Semantic z-index tokens**: use `--z-modal`, `--z-reader`, `--z-toast` etc. Never write `z-[9999]`.

### 5.6 Keyboard shortcut contract

`useKeyboard` (after 8f0c06c) ignores events inside inputs/textareas/selects/`contenteditable`, and requires **exact modifier match** — a plain `r` binding will not fire when Ctrl+R is pressed. Any new shortcut should pass through this hook; do not bypass it with a raw `window.addEventListener`.

---

## 6. Test Coverage

| Suite | Tests |
|-------|-------|
| Rust (services + migrations) | 117+ |
| Shared UI (incl. ErrorBoundary) | 54 |
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
| File Manager store | 9 |
| Zip Recovery store | 9 |
| Reading Progress store | 5 |
| **Frontend total** | **158** |
| **Grand total** | **275+** |

Run:

```bash
npm run test                                        # Frontend
cargo test --manifest-path src-tauri/Cargo.toml     # Rust
cargo clippy --manifest-path src-tauri/Cargo.toml   # Rust lint
npm run tauri dev                                   # Dev with hot reload
```

---

## 7. Historical reference

Phase-by-phase task completion, original bug lists, and the post-phase bug-fix breakdown are preserved in:

- `claude/BUG_FIX_GUIDE.md` — educational writeup of every bug fixed (frontend + Rust).
- `claude/archive/PROGRESS.md` — per-phase narrative.
- `claude/archive/TASK_BREAKDOWN.md` — original task list (1.1 through 6.12).

Do not treat the archive as authoritative for current code shape; it is a log, not a spec.
