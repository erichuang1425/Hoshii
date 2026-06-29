# Hoshii

**A local-first desktop gallery for large image and media collections spread across external drives.**

Hoshii is built for people who keep artwork, references, comics, scans, or mixed media archives on real folders instead of cloud libraries. Add your root folders, scan once, and browse fast with drive-aware status, natural sorting, thumbnails, favorites, tags, search, and multiple reading modes.

> Status: desktop feature set is implemented. The project is ready for polish, packaging, and broader real-world testing.

## Highlights

- **External-drive aware library**: tracks volumes by UUID so collections survive disconnects, reconnects, and changed mount paths.
- **Fast gallery browsing**: root folders, artists, galleries, thumbnails, favorites, tags, and global search.
- **Reader built for mixed collections**: single page, double page, vertical scroll, long strip, webtoon, and thumbnail grid modes.
- **Mixed media support**: images, animated formats, AVIF, MP4/WebM playback, and optional ffmpeg-powered video remuxing/thumbnails.
- **Smart organization tools**: fuzzy smart groups, chronological linking, loose-file organization, and backup zip recovery.
- **Portable metadata**: tags, favorites, and reading progress can be exported as JSON sidecars.
- **Local-first architecture**: Rust filesystem/SQLite backend, React UI, no hosted service required.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop shell | Tauri v2 |
| Backend | Rust, SQLite, `rusqlite` |
| Frontend | React 18, TypeScript, React Router |
| State | Zustand |
| Styling | Tailwind CSS v4, CSS variables |
| Virtualization | `@tanstack/react-virtual` |
| Build | Vite |
| Tests | Vitest, Testing Library, Rust tests |
| Optional media tooling | ffmpeg |

## Quick Start

```bash
git clone https://github.com/erichuang1425/Hoshii.git
cd Hoshii
npm install
npm run tauri dev
```

### Prerequisites

- Node.js 18 or newer
- Rust stable toolchain
- Platform WebView dependencies required by Tauri
- ffmpeg, optional, for video remuxing and video thumbnails

Linux development may require:

```bash
sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev patchelf
```

## Common Commands

| Command | Purpose |
| --- | --- |
| `npm run tauri dev` | Run the desktop app in development mode |
| `npm run tauri build` | Build production desktop bundles |
| `npm run dev` | Run the frontend-only Vite server |
| `npm run build` | Type-check and build frontend assets |
| `npm run test` | Run frontend tests |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Rust tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml` | Run Rust lint checks |

## Project Structure

```text
src/
  app/                  App setup, routes, providers, global styles
  features/             Vertical feature slices
  layouts/              Main shell, sidebar, header, status bar
  pages/                Route-level screens
  shared/               Shared UI, hooks, API wrapper, types, utilities

src-tauri/
  src/commands/         Tauri command handlers
  src/db/               SQLite schema and migrations
  src/models/           Rust data models
  src/services/         Scanner, thumbnails, sorting, volume tracking, media tools

docs/                   Architecture notes, conventions, security notes, references
```

## Development Notes

Hoshii uses a feature-sliced frontend: each feature owns its `ui`, `model`, and `api` files, while cross-cutting pieces live in `src/shared`. The Rust backend exposes Tauri commands backed by services and a SQLite database in WAL mode.

Before making structural changes, start with [CONTRIBUTING.md](CONTRIBUTING.md) and the deeper references in [docs/](docs/), especially [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md), [docs/CONVENTIONS.md](docs/CONVENTIONS.md), and [docs/SECURITY.md](docs/SECURITY.md).

## Testing

```bash
npm run test
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
```

The current test suite covers frontend stores/components, media grouping, shared UI primitives, Rust services, and database behavior. End-to-end Tauri coverage is still on the roadmap.

## Deployment

Desktop bundles are produced through Tauri:

```bash
npm run tauri build
```

The build uses the Vite frontend output in `dist/` and Tauri configuration from `src-tauri/tauri.conf.json`.

## Roadmap

- Add connection pooling for heavier scan and UI workloads.
- Extract EXIF dates for stronger chronological linking.
- Add end-to-end tests around Tauri IPC and reader workflows.
- Complete a second accessibility audit pass.
- Profile very large libraries and tune indexes/virtualization settings.
- Explore a companion mobile or remote-access flow without compromising the local-first model.

## License

MIT
