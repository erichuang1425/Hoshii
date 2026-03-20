# Quality Gates & Technical Debt Protocol

## Pre-Completion Checklist

Before marking ANY task as done, Claude must verify:

### Code Quality
- [ ] No `any` types in TypeScript
- [ ] No `.unwrap()` or `.expect()` in Rust production code (tests are fine)
- [ ] No cross-feature-slice imports
- [ ] No stored `asset://` URLs in state or DB
- [ ] All async operations have try/catch (TS) or `?` operator (Rust)
- [ ] All errors are logged with context (`logger.*` or `log::*`)
- [ ] All user-facing strings go through i18n (both en + zh-TW provided)
- [ ] Component files are under 200 lines (split if over)
- [ ] Rust functions are under 50 lines (extract helpers if over)

### Architecture Compliance
- [ ] New files are in the correct feature slice directory
- [ ] New Tauri commands are registered in `main.rs` and `commands/mod.rs`
- [ ] New routes are added to `app/routes.tsx`
- [ ] New store slices follow `use[Feature]Store.ts` naming
- [ ] Types match TYPES_REFERENCE.md exactly (no ad-hoc shapes)
- [ ] Command signatures match TYPES_REFERENCE.md exactly

### External Drive Awareness
- [ ] File access operations handle "drive disconnected" error case
- [ ] UI components that depend on file access check drive online status
- [ ] Thumbnails use volume-UUID-keyed cache paths
- [ ] Paths use `PathBuf::join()` (Rust) not string concat

### Testing
- [ ] Rust: unit tests for business logic in the service layer
- [ ] Rust: natural sort test fixtures from NATURAL_SORT_TESTS.md covered
- [ ] Frontend: component renders without crash (basic smoke test minimum)
- [ ] Frontend: Zustand store actions produce correct state transitions

### Security
- [ ] SQL queries use parameterized statements only
- [ ] Path inputs validated against allowed roots
- [ ] No shell command string concatenation
- [ ] No `dangerouslySetInnerHTML`, `eval`, or `unsafe`

---

## Technical Debt Tracking

### When to Log Debt

Claude must create a TODO entry when:
- A shortcut is taken to meet immediate scope (e.g., hardcoded value instead of configurable)
- A known edge case is deliberately deferred (e.g., "handle APNG-in-.png later")
- A performance optimization is needed but not yet implemented (e.g., "thumbnail preloading")
- A cross-platform issue is identified but not fixed (e.g., "WebKitGTK scroll snap jank")
- An error is caught but recovery logic is incomplete (e.g., "retry on transient USB error")

### TODO Format

In code, use structured comments that are greppable:

```typescript
// TODO(debt): [CATEGORY] Description — Logged by Task X.X
// TODO(debt): [PERF] Thumbnail preloading for adjacent pages — Task 2.2
// TODO(debt): [COMPAT] Test backdrop-filter on WebKitGTK — Task 1.3
// TODO(debt): [EDGE-CASE] Handle APNG files with .png extension — Task 2.1
// TODO(debt): [SECURITY] Rate-limit ffmpeg sidecar spawning — Task 2.3
```

```rust
// TODO(debt): [PERF] Use connection pool instead of Mutex<Connection> — Task 1.2
// TODO(debt): [EDGE-CASE] Handle symlinks in gallery folders — Task 2.1
```

### Categories

| Tag | Meaning |
|-----|---------|
| `[PERF]` | Performance optimization deferred |
| `[COMPAT]` | Cross-platform compatibility issue known |
| `[EDGE-CASE]` | Known edge case deliberately unhandled |
| `[SECURITY]` | Security hardening needed |
| `[UX]` | User experience improvement deferred |
| `[REFACTOR]` | Code structure needs cleanup |
| `[TEST]` | Test coverage gap |

### Debt Review

At the end of each Phase (1, 2, 3, 4), run:
```bash
grep -rn "TODO(debt)" src/ src-tauri/src/ --include="*.ts" --include="*.tsx" --include="*.rs"
```

This surfaces all accumulated debt for review and prioritization before starting the next phase.

---

## Second Brain Protocol

### What This Is

As Claude works on tasks, it will discover non-obvious technical insights — things that aren't in the architecture docs but are critical for future development. These must be captured, not lost when the conversation ends.

### When to Capture

Claude should propose a knowledge entry when:
- A Tauri API behaves differently than documented
- A WebKit CSS quirk is discovered during implementation
- A Rust crate has an undocumented limitation
- A performance bottleneck is identified and the solution is non-obvious
- An integration between two features requires a pattern not covered in INSTRUCTIONS.md

### How to Capture

At the end of a task, Claude appends a "Session Insights" section with this structure:

```markdown
## Session Insight: [Short Title]
**Task:** X.X — [Task Name]
**Category:** Insight | Architecture | Compatibility | Performance | Gotcha
**Discovery:** [What was found — 1-2 sentences]
**Impact:** [What breaks if this is ignored]
**Resolution:** [What was done or should be done]
**Files Affected:** [list]
```

The developer can then add these to the project knowledge for future sessions. This creates a living knowledge base that gets smarter over time — the "Second Brain" the research describes.

### Example

```markdown
## Session Insight: Tauri asset protocol requires re-registration on wake
**Task:** 2.4 — Browse Roots UI
**Category:** Gotcha
**Discovery:** After macOS sleep/wake, the asset protocol scope for external drives becomes invalid. Images fail to load with 403 until the scope is re-registered.
**Impact:** All gallery thumbnails break after laptop sleep if external drive is connected.
**Resolution:** Added a `window.addEventListener('focus', refreshAssetScopes)` call in App.tsx that re-invokes `register_known_scopes` on window focus.
**Files Affected:** src/app/App.tsx, src-tauri/src/commands/volumes.rs
```
