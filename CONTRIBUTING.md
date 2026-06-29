# Contributing to Hoshii

Hoshii is a local-first desktop gallery app built with Tauri v2, Rust, React, and TypeScript. It manages large artwork and mixed-media collections across external drives, with a strong bias toward preserving local file ownership and predictable desktop behavior.

## Documentation Map

Read the relevant docs in `docs/` before making changes:

| Doc | What it covers | When to read |
| --- | --- | --- |
| [ARCHITECTURE.md](docs/ARCHITECTURE.md) | Tech stack, directory structure, DB schema, drive handling, scanning | Before structural changes |
| [CONVENTIONS.md](docs/CONVENTIONS.md) | Coding standards, patterns, anti-patterns, error handling | Before writing code |
| [SECURITY.md](docs/SECURITY.md) | Path validation, SQL injection, CSP, file/DB/IPC safety | Before file, database, or IPC work |
| [TYPES_REFERENCE.md](docs/TYPES_REFERENCE.md) | TypeScript interfaces and Tauri command signatures | Before changing types or commands |
| [UI_REFERENCE.md](docs/UI_REFERENCE.md) | Theme tokens, layouts, keyboard shortcuts, WebKit compatibility | Before UI work |
| [GLOSSARY.md](docs/GLOSSARY.md) | Domain terms such as Volume, Gallery, and Smart Group | When terminology is unclear |
| [ADR.md](docs/ADR.md) | Major architecture decisions and tradeoffs | When changing direction |
| [MEDIA_DETECTION.md](docs/MEDIA_DETECTION.md) | File extension mapping and detection logic | Before media handling changes |
| [NATURAL_SORT_TESTS.md](docs/NATURAL_SORT_TESTS.md) | Natural sort fixtures | Before sorting or grouping changes |
| [DEVELOPMENT_STATUS.md](docs/DEVELOPMENT_STATUS.md) | Current implementation status and known debt | Before planning new work |
| [MOBILE_STRATEGY.md](docs/MOBILE_STRATEGY.md) | Remote/mobile access strategy for large local data | Before remote access work |
| [BUG_FIX_GUIDE.md](docs/BUG_FIX_GUIDE.md) | Background on notable bug fixes | When investigating regressions |

## Core Rules

1. Read `docs/ARCHITECTURE.md` before structural changes.
2. Keep changes inside the relevant feature slice unless shared code is truly needed.
3. Never store `asset://` URLs in SQLite or Zustand; compute them at render time with `toAssetUrl()`.
4. Every async file operation must handle drive disconnects gracefully.
5. Avoid cross-feature-slice imports. Share through `src/shared/` or pass data through props.
6. Parameterize SQL. Do not build queries from unchecked strings.
7. Avoid `.unwrap()` and `.expect()` in Rust production paths. Tests are the exception.
8. Avoid `any` in TypeScript.
9. When local state is initialized from props, synchronize it with `useEffect` on prop changes.
10. Guard user-driven async work against races with request counters or equivalent cancellation.

## Commands

```bash
npm run test
cargo test --manifest-path src-tauri/Cargo.toml
cargo clippy --manifest-path src-tauri/Cargo.toml
npm run tauri dev
```

## Architecture at a Glance

- Frontend features live under `src/features/{feature}/` with `ui/`, `model/`, and `api/` subfolders.
- Shared infrastructure belongs in `src/shared/`.
- Rust Tauri commands live in `src-tauri/src/commands/`.
- Business logic lives in `src-tauri/src/services/`.
- SQLite schema and migrations live in `src-tauri/src/db/`.
- Append-only or merge-sensitive files include `src/app/routes.tsx`, `src/app/providers.tsx`, `src-tauri/src/main.rs`, and `src-tauri/src/commands/mod.rs`.
