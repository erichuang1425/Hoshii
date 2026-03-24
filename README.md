# Hoshii (星)

A local-first desktop gallery application for managing large artwork collections across multiple external hard drives. Built with Tauri v2 (Rust backend) + React 18 + TypeScript.

## What It Does

Browse, read, and organize galleries stored across external drives — with drive hot-plug awareness, mixed-media support (images, GIFs, AVIF, videos), natural sort ordering, and a fast keyboard-navigable reader.

**Key features:**
- Grid-based browsing: root folders → artists → galleries
- Multiple reading modes: single page, double page, vertical scroll, webtoon (long strip), thumbnail grid
- Mixed media handling: static images, animated GIFs/WebP/AVIF, video (MP4/WebM, with ffmpeg remux for MKV/AVI)
- Smart collection linking: fuzzy-match similar gallery names into groups
- Chronological navigation: date-aware gallery and image browsing
- External drive management: tracks drives by UUID, handles disconnect/reconnect gracefully
- File management: organize loose files, detect/restore backup zips
- Metadata portability: export tags/favorites/progress as JSON sidecar files

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Desktop Shell | Tauri v2 |
| Backend | Rust (filesystem scanning, SQLite, thumbnails, video processing) |
| Frontend | React 18 + TypeScript |
| State | Zustand |
| Styling | Tailwind CSS v4 + CSS variables |
| Database | SQLite (WAL mode) via `rusqlite` |
| Virtual Scrolling | @tanstack/react-virtual |
| Bundler | Vite |
| Video (optional) | ffmpeg (user-installed) |

## Prerequisites

1. **Node.js** >= 18
2. **Rust** — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. **System WebView:**
   - Windows 10+: pre-installed (WebView2)
   - macOS: pre-installed (WebKit)
   - Linux: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf`
4. **ffmpeg** (optional, for video remux + thumbnails):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`

## Quick Start

```bash
git clone <repo-url> && cd hoshii
npm install

# Run tests
cargo test --manifest-path src-tauri/Cargo.toml
npm run test

# Development
npm run tauri dev
```

## Commands

| Command | Purpose |
|---------|---------|
| `npm run tauri dev` | Start dev mode with hot reload |
| `npm run tauri build` | Production build (creates installer) |
| `npm run dev` | Frontend-only dev server |
| `npm run test` | Run frontend tests (Vitest) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Rust tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml` | Rust linting |

## Architecture

Feature-Sliced Vertical Architecture — each feature is a self-contained folder with its own UI, state, and API layer. See [claude/ARCHITECTURE.md](claude/ARCHITECTURE.md) for full details.

```
src/
├── app/           # Routes, providers, global CSS
├── shared/        # Types, hooks, UI primitives, utils, i18n
├── features/      # Independent feature slices (browse-roots, gallery-viewer, etc.)
├── layouts/       # MainLayout, Sidebar, Header, StatusBar
└── pages/         # Route-level components

src-tauri/src/
├── commands/      # Tauri invoke handlers
├── services/      # Business logic (scanner, thumbnails, video, etc.)
├── models/        # Rust data structs
└── db/            # SQLite schema + migrations
```

## Documentation

Detailed docs live in [`claude/`](claude/) — see [CLAUDE.md](CLAUDE.md) for the full documentation map.

## License

Private project.
