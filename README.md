# Hoshii (星)

Hoshii is a local-first desktop gallery manager designed for large personal media libraries distributed across external drives.

It is built with **Tauri v2**, **Rust**, **React 18**, and **TypeScript**.

## Highlights

- **Drive-aware library management** with reconnect-safe root tracking.
- **High-performance browsing** for deep folder trees and large galleries.
- **Multiple reader modes** (single, double, vertical, webtoon, thumbnails).
- **Mixed-media support** for images and videos, including optional ffmpeg workflows.
- **Portable metadata** via JSON sidecar export/import.

## Tech Stack

| Layer | Technology |
| --- | --- |
| Desktop | Tauri v2 |
| Frontend | React 18 + TypeScript + Vite |
| Backend | Rust |
| State | Zustand |
| Styling | Tailwind CSS v4 |
| Data | SQLite (`rusqlite`, WAL mode) |

## Getting Started

### Prerequisites

- **Node.js** 18+
- **Rust toolchain** (stable)
- Platform dependencies for Tauri (WebView / GTK packages depending on OS)
- Optional: **ffmpeg** for video remuxing and richer thumbnail support

### Install

```bash
git clone <your-repo-url>
cd Hoshii
npm install
```

### Run in development

```bash
npm run tauri dev
```

### Build

```bash
npm run build
npm run tauri build
```

## Common Commands

| Command | Description |
| --- | --- |
| `npm run dev` | Frontend development server |
| `npm run build` | Type-check + production frontend build |
| `npm run test` | Run frontend tests (Vitest) |
| `npm run tauri dev` | Run desktop app in development mode |
| `npm run tauri build` | Build production desktop binaries |

## Project Structure

```text
src/
  app/         Application bootstrap and global setup
  features/    Feature modules (UI/state/api grouped by domain)
  layouts/     Layout system and shell variants
  shared/      Reusable utilities, hooks, primitives, and types
  pages/       Route-level pages

src-tauri/src/
  commands/    Tauri command handlers
  services/    Core backend services
  db/          SQLite schema and migration logic
  models/      Rust domain models
```

## Documentation

- [Project Architecture](docs/ARCHITECTURE.md)
- [Contributing Guide](docs/CONTRIBUTING.md)
- [Security Policy](docs/SECURITY.md)

## License

This repository is currently private and not licensed for redistribution.
