# Hoshii — Claude Code Guide

## Quick Context

Hoshii is a **local-first desktop gallery app** built with **Tauri v2 (Rust) + React 18 + TypeScript**. It manages artwork collections across multiple external hard drives. All 5 development phases are complete (209 tests passing).

## Documentation Map

Read these docs in `claude/` before making changes:

| Doc | What | When to Read |
|-----|------|-------------|
| [ARCHITECTURE.md](claude/ARCHITECTURE.md) | Tech stack, directory structure, DB schema, drive handling, scanning | Before any structural change |
| [CONVENTIONS.md](claude/CONVENTIONS.md) | Coding standards, patterns, anti-patterns, error handling | Before writing any code |
| [SECURITY.md](claude/SECURITY.md) | Immutable security constraints (path validation, SQL injection, CSP) | Before any file/DB/IPC code |
| [TYPES_REFERENCE.md](claude/TYPES_REFERENCE.md) | All TypeScript interfaces + Tauri command signatures | Before adding/modifying types or commands |
| [UI_REFERENCE.md](claude/UI_REFERENCE.md) | Theme tokens, layouts, keyboard shortcuts, WebKit compat | Before any UI work |
| [GLOSSARY.md](claude/GLOSSARY.md) | Domain terms (Volume, Gallery, Smart Group, etc.) | When confused by terminology |
| [ADR.md](claude/ADR.md) | Why each major decision was made | When questioning a design choice |
| [MEDIA_DETECTION.md](claude/MEDIA_DETECTION.md) | File extension mapping, detection logic | Before touching media handling |
| [NATURAL_SORT_TESTS.md](claude/NATURAL_SORT_TESTS.md) | Test fixtures for natural sort algorithm | Before touching sort logic |
| [DEVELOPMENT_STATUS.md](claude/DEVELOPMENT_STATUS.md) | Implementation status, known debt, session insights | To understand current state |

## Critical Rules

1. **Read ARCHITECTURE.md first** before writing any code.
2. **Never modify files outside your assigned feature slice** unless explicitly asked.
3. **Never store `asset://` URLs** in DB or Zustand — compute at render time via `toAssetUrl()`.
4. **Every async operation needs error handling.** Every file access must handle "drive disconnected."
5. **No cross-feature-slice imports.** Share through `shared/` or props.
6. **All SQL must be parameterized.** No string formatting for queries.
7. **No `.unwrap()` in Rust production code.** No `any` in TypeScript.

## Key Commands

```bash
npm run test                                        # Frontend tests (Vitest)
cargo test --manifest-path src-tauri/Cargo.toml     # Rust tests
npm run tauri dev                                   # Dev mode with hot reload
cargo clippy --manifest-path src-tauri/Cargo.toml   # Rust linting
```

## Architecture at a Glance

- **Frontend:** Feature-Sliced Vertical — `src/features/{name}/` with `ui/`, `model/`, `api/`
- **Backend:** Rust services in `src-tauri/src/services/`, commands in `commands/`
- **State:** Zustand (one store per feature)
- **DB:** SQLite (WAL mode), volume-aware records tracked by UUID
- **Merge-safe files:** `app/routes.tsx`, `app/providers.tsx`, `src-tauri/src/main.rs` (append-only)
