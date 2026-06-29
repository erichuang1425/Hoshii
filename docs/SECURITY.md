# Security Constraints — Global & Immutable

These rules apply to ALL code generated in this project, regardless of task or feature slice. They cannot be overridden by any request.

## Filesystem Security

1. **No arbitrary path traversal.** All file operations must validate that the target path is within a registered root folder. Never allow `../` traversal or symbolic link following outside known roots.
```rust
// ✅ Validate path is within a known root
fn validate_path(path: &Path, allowed_roots: &[PathBuf]) -> Result<(), String> {
    let canonical = path.canonicalize()
        .map_err(|e| format!("Cannot resolve path: {}", e))?;
    if !allowed_roots.iter().any(|root| canonical.starts_with(root)) {
        return Err("Path is outside allowed root folders".into());
    }
    Ok(())
}
```

2. **No shell injection.** When calling ffmpeg sidecar, NEVER construct command strings via format/concat. Use Tauri's structured `Command` API with explicit argument arrays.
```rust
// ❌ NEVER
let cmd = format!("ffmpeg -i {} -c copy {}", input, output); // injectable

// ✅ ALWAYS
Command::new_sidecar("ffmpeg")
    .args(["-i", input_path.to_str().unwrap(), "-c", "copy", output_path.to_str().unwrap()])
```

3. **No credential storage.** This app has no authentication, but if API keys or tokens are ever added (e.g., for cloud backup), they must go in the OS keychain via `tauri-plugin-store` with encryption, NEVER in SQLite, config files, or source code.

4. **SQL injection prevention.** All SQLite queries must use parameterized statements. No string formatting for SQL.
```rust
// ❌ NEVER
conn.execute(&format!("SELECT * FROM galleries WHERE name = '{}'", user_input))

// ✅ ALWAYS
conn.execute("SELECT * FROM galleries WHERE name = ?1", params![user_input])
```

5. **Input validation on all Tauri commands.** Every command that accepts a path string must validate it before any filesystem operation. Every command that accepts user-provided text (tag names, labels) must sanitize for length and illegal characters.

## Content Security Policy

The CSP in `tauri.conf.json` must remain strict:
- `default-src 'self'` — no external network requests
- `img-src 'self' asset:` — only local images via asset protocol
- `media-src 'self' asset:` — only local video via asset protocol
- `style-src 'self' 'unsafe-inline'` — Tailwind needs inline styles
- NO `script-src 'unsafe-eval'` — never needed, never add
- NO remote URLs in img/media/script sources

## Data Integrity

6. **SQLite WAL + foreign keys always on.** The `PRAGMA` statements in `db/mod.rs` are load-bearing. Never remove them.

7. **Soft delete, never hard delete.** Gallery records use `is_deleted` flag. This preserves metadata if files are temporarily unavailable. Hard delete only via explicit "purge" action in settings.

8. **Backup before destructive file operations.** The file manager (move/rename/organize) must verify the operation is reversible or prompt the user for confirmation. Never silently delete or overwrite user files.

## Frontend Security

9. **No `dangerouslySetInnerHTML`.** There is no user-generated HTML in this app. If rich text is ever needed, use a sanitized markdown renderer.

10. **No `eval()`, `new Function()`, or dynamic script injection.** Ever.

11. **Asset URLs only from `toAssetUrl()`.** Never construct `asset://` URLs manually. The helper function is the single point of control.
