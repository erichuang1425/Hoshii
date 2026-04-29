# Contributing

Thank you for your interest in improving Hoshii.

## Development Workflow

1. Create a topic branch from `main`.
2. Keep commits focused and logically grouped.
3. Run tests and checks locally before opening a PR.
4. Include concise technical rationale in pull request descriptions.

## Code Standards

- Prefer descriptive names over abbreviations.
- Keep components and functions small and single-purpose.
- Avoid hidden coupling between features.
- Add tests when changing behavior.

## Recommended Checks

```bash
npm run build
npm run test
# if Rust backend touched:
cargo test --manifest-path src-tauri/Cargo.toml
```

## Pull Request Checklist

- [ ] Changes are scoped and documented.
- [ ] Existing behavior remains intact unless intentionally changed.
- [ ] New behavior includes tests (when practical).
- [ ] README and docs are updated if relevant.
