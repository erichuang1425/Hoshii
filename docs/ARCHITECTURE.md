# Architecture Overview

## Principles

Hoshii follows a **feature-oriented structure** on the frontend and **service-oriented modules** on the backend.

### Frontend

- Feature code is colocated by domain (`src/features/*`).
- Cross-cutting concerns live in `src/shared/*`.
- Page-level composition remains in `src/pages/*`.
- Layout concerns are isolated in `src/layouts/*`.

### Backend (Tauri / Rust)

- Commands in `src-tauri/src/commands/*` provide UI-facing APIs.
- Business logic is implemented in `src-tauri/src/services/*`.
- Persistence concerns are grouped in `src-tauri/src/db/*`.

## Design Goals

1. **Reliability for external drives**
   - Graceful handling of disconnected or remounted volumes.
2. **Performance at scale**
   - Efficient scanning and browsing for large libraries.
3. **Clear module boundaries**
   - Distinct responsibility between UI, state, and service layers.
4. **Maintainability**
   - Predictable folder structure and incremental feature growth.

## Operational Notes

- Keep feature APIs explicit (avoid cross-feature implicit dependencies).
- Prefer pure utility functions in shared modules.
- Limit layout-level state to presentation concerns.
