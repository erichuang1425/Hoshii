# Architecture Decision Records (ADR)

Quick reference for why each major decision was made. Useful when revisiting a choice later.

## ADR-001: Tauri v2 over Electron
**Decision:** Tauri v2 with Rust backend
**Why:** App manages 100k+ media files on external USB drives. Electron's ~200MB RAM idle + Chromium bundling would compete with media loading. Tauri's `asset://` protocol serves local files directly to WebView without base64/IPC, which is the critical path for displaying thousands of images. Rust gives native filesystem performance for scanning over USB.
**Tradeoff:** Team must know some Rust. WebView inconsistency across platforms (WebKit on macOS, WebKitGTK on Linux, Chromium on Windows).

## ADR-002: React over Vue
**Decision:** React 18 + TypeScript
**Context:** The existing project (in project knowledge) uses Vue 3 + Firebase. This is a new separate project.
**Why:** Better virtual scrolling ecosystem (@tanstack/react-virtual), concurrent rendering for smooth thumbnail loading during scroll, stronger TypeScript integration for cross-slice contracts.
**Tradeoff:** Vue would have been familiar from the existing project.

## ADR-003: Feature-Sliced Vertical Architecture
**Decision:** Features as self-contained folders, no layered architecture
**Why:** Primary constraint is parallel Claude instance development. Layered architecture (services/controllers/repos) means every feature touches shared files → merge conflicts. VSA isolates each feature. Only append-only files (routes, main.rs) are shared merge points.
**Tradeoff:** Some code duplication between slices. Mitigated by shared types + shared UI components.

## ADR-004: Zustand over Redux/Pinia
**Decision:** Zustand for state management
**Why:** Zero boilerplate, natural slice pattern (one store per feature), no Provider wrapping needed, excellent TypeScript support, tiny bundle size. Redux is overkill for a desktop app. Pinia is Vue-only.
**Tradeoff:** Less ecosystem tooling than Redux DevTools (but Zustand has its own devtools middleware).

## ADR-005: SQLite with WAL mode
**Decision:** Local SQLite database (not filesystem-only)
**Why:** Incremental scanning requires comparing current files vs known state. Tags, favorites, reading progress need persistent storage. SQLite is fast, single-file, no server. WAL mode allows concurrent reads (file watcher + UI queries).
**Tradeoff:** Extra complexity vs pure filesystem scanning. Worth it for metadata persistence and incremental scan performance.

## ADR-006: Volume UUID tracking
**Decision:** Identify drives by filesystem UUID, not mount path
**Why:** External drives change mount paths (D: → E: on Windows, different /Volumes/ path on macOS). UUID is stable across reconnects. Allows detecting when a known drive returns at a new path.
**Tradeoff:** Platform-specific UUID detection code needed (3 implementations). Abstracted in `volume_tracker.rs`.

## ADR-007: Thumbnails cached locally, not on external drive
**Decision:** Store thumbnail cache in app data dir, keyed by volume UUID
**Why:** (1) SSD reads are faster than external drive reads for thumbnails. (2) No write wear on external drives. (3) No leftover cache files if user browses drive on another machine. (4) Thumbnails are small (~5KB each) and regenerable.
**Tradeoff:** Thumbnails lost if user reinstalls OS / switches computers. Acceptable — they regenerate on next scan.

## ADR-008: ffmpeg optional, not bundled
**Decision:** Do not bundle ffmpeg with the installer
**Why:** ffmpeg binary is 80-120MB — defeats the purpose of Tauri's lightweight installer. Licensing complexity (LGPL/GPL). Most users primarily have images, not videos.
**Tradeoff:** Video features degraded without ffmpeg. Mitigated by graceful degradation + install prompt.

## ADR-009: Animated AVIF → WebP conversion
**Decision:** Convert animated AVIF to animated WebP in Rust backend
**Why:** WebKit (Tauri on macOS + Linux) has documented playback quirks with animated AVIF. Static AVIF works fine. Converting to WebP guarantees consistent cross-platform behavior.
**Tradeoff:** Extra conversion step on first view, cached afterward. Tiny disk cost.

## ADR-010: No stored asset:// URLs
**Decision:** Compute asset URLs at render time via `toAssetUrl()`, never store in DB or Zustand
**Why:** When an external drive remounts at a different path, all stored `asset://` URLs become invalid. Computing from the current filesystem path ensures URLs are always correct.
**Tradeoff:** Slightly more render-time computation (negligible — `convertFileSrc` is a string concat).

## ADR-011: Incremental scanning over full rescan
**Decision:** Use mtime comparison for change detection on subsequent launches
**Why:** Full scan of 100k files takes 5-10s. With mtime-only stat walk, unchanged files are skipped entirely. Reduces warm-start scan to 1-3s.
**Tradeoff:** Relies on filesystem mtime accuracy. Edge case: copied files may retain old mtime. Mitigated by periodic full rescan option in settings.

## ADR-012: Metadata sidecar export
**Decision:** Optional `.hoshii-meta.json` written to root folder
**Why:** SQLite is local to one machine. If user switches computers, all tags/favorites/progress are lost. Sidecar travels with the drive, uses relative paths, can be imported on any machine.
**Tradeoff:** Extra disk writes, potential for stale sidecar if user forgets to export. Mitigated by auto-export option on app close.

## ADR-013: Soft delete for missing galleries
**Decision:** Mark galleries as `is_deleted = true` instead of removing DB records
**Why:** If files are temporarily unavailable (drive disconnected, USB hiccup), hard-deleting DB records would lose all tags/favorites/progress. Soft delete preserves metadata. Records can be restored when files reappear.
**Tradeoff:** Requires filtering `WHERE is_deleted = 0` in all gallery queries.

## ADR-014: Removed entities/ and widgets/ layers
**Decision:** Flat structure: shared/ → features/ → layouts/ → pages/
**Why:** Initial architecture had `entities/` (domain models with "minimal UI") and `widgets/` (composed sections). In practice: entity types are just interfaces (belong in shared/types), entity cards are just shared UI (belong in shared/ui), and widgets are just layout components (belong in layouts/). Extra layers added confusion about file placement without architectural benefit.
**Tradeoff:** Less formal separation of concerns. Compensated by clear naming conventions and feature isolation.
