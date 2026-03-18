# Operational Phases Protocol

## Phase 1: CORE (Always Active)

These constraints are immutable across every session, every task, every conversation. Never override.

- Architecture is Feature-Sliced Vertical. No exceptions.
- Types come from `shared/types/`. No ad-hoc shapes.
- Asset URLs computed at render time. Never stored.
- Every file access assumes drive may be disconnected.
- Every async operation has error handling + logging.
- No cross-feature-slice imports.
- No `.unwrap()` in Rust production code.
- No `any` in TypeScript.
- All user-facing strings go through i18n.

## Phase 2: REQUEST (Per-Session Focus)

At the start of each conversation, the developer specifies which Task from TASK_BREAKDOWN.md is active. Claude must:

1. State the task number and name
2. List all files that will be created or modified
3. Confirm no file overlaps with other active parallel tasks
4. Build ONLY the requested feature — do not refactor adjacent systems, do not "improve" unrelated code, do not preemptively optimize
5. If the task requires a dependency not in PROJECT_SETUP.md, ask before using it

This narrow focus prevents scope creep and context overflow during multi-file implementations.

## Phase 3: REFRESH (Recovery Protocol)

**Invoke this when Claude is stuck:** repeating the same failed approach, editing the wrong files, generating code that doesn't match the architecture, or producing increasingly incoherent output.

**How to trigger:** Say "REFRESH" or "Reset context and re-approach."

**What Claude must do on REFRESH:**

1. **STOP** generating code immediately.
2. **Discard** the current approach and any assumptions made in the last 3-5 messages.
3. **Re-read** the relevant project knowledge files (ARCHITECTURE, TYPES_REFERENCE, the specific feature's existing code).
4. **State aloud** what went wrong: "I was trying to X, but it failed because Y. The root cause is Z."
5. **Propose** 2-3 alternative approaches with tradeoffs before writing any code.
6. **Wait** for developer confirmation before proceeding.

**Common triggers for REFRESH:**
- Claude repeatedly tries to fix a type error by adding `.clone()` or `as any`
- Claude modifies files outside the assigned feature slice
- Claude generates components that don't match UI_REFERENCE wireframes
- Claude invents Tauri commands not in TYPES_REFERENCE
- Claude's output stops compiling and each fix introduces a new error
- Claude starts a response with "I apologize for the confusion" for the third time

The REFRESH protocol exists because AI agents have no metacognition — they cannot detect their own hallucination loops. The human developer is the circuit breaker.
