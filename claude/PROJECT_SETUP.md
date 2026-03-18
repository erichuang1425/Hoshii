# Project Setup Guide v2

## Prerequisites

1. **Node.js** ≥ 18
2. **Rust** — `curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh`
3. **System WebView:**
   - Windows 10+: pre-installed (WebView2)
   - macOS: pre-installed (WebKit)
   - Linux: `sudo apt install libwebkit2gtk-4.1-dev libgtk-3-dev libayatana-appindicator3-dev`
4. **ffmpeg** (OPTIONAL — for video remux + video thumbnails):
   - Windows: `winget install ffmpeg`
   - macOS: `brew install ffmpeg`
   - Linux: `sudo apt install ffmpeg`
   - App works without it; video support is degraded gracefully

## Bootstrap

```bash
# 1. Create Tauri v2 project
npm create tauri-app@latest hoshii -- --template react-ts --manager npm
cd hoshii

# 2. Frontend dependencies
npm install zustand @tanstack/react-virtual react-router-dom clsx
npm install tailwindcss @tailwindcss/vite
npm install -D @types/node vitest @testing-library/react @testing-library/jest-dom

# 3. Create directory structure
mkdir -p src/{app,shared/{ui,lib,api,hooks,types,i18n},features/{browse-roots/{ui,model,api},browse-artists/{ui,model,api},gallery-viewer/{ui,model,api},file-manager/{ui,model,api},zip-recovery/{ui,model,api},search/{ui,model,api},favorites/{ui,model,api},reading-progress/{ui,model,api},tag-system/{ui,model,api},settings/{ui,model,api}},layouts,pages}

mkdir -p src-tauri/src/{commands,services,models,db/migrations}

# 4. Verify dev mode
npm run tauri dev
```

## Cargo.toml Dependencies (src-tauri/Cargo.toml)

```toml
[dependencies]
tauri = { version = "2", features = ["protocol-asset"] }
tauri-plugin-dialog = "2"
tauri-plugin-fs = "2"
tauri-plugin-shell = "2"       # for ffmpeg sidecar calls
serde = { version = "1", features = ["derive"] }
serde_json = "1"
rusqlite = { version = "0.31", features = ["bundled"] }
walkdir = "2"
image = "0.25"                 # image resize for thumbnails
zip = "0.6"
regex = "1"
rayon = "1.8"                  # parallel scanning
natord = "1.0"                 # natural sort helper
log = "0.4"
env_logger = "0.11"
anyhow = "1"
chrono = { version = "0.4", features = ["serde"] }
notify = "6"                   # filesystem watcher
```

## Tauri Configuration (src-tauri/tauri.conf.json)

```jsonc
{
  "$schema": "https://raw.githubusercontent.com/tauri-apps/tauri/dev/packages/tauri-cli/config.schema.json",
  "productName": "Hoshii",
  "version": "0.1.0",
  "identifier": "com.hoshii.gallery",
  "build": {
    "frontendDist": "../dist",
    "devUrl": "http://localhost:1420",
    "beforeDevCommand": "npm run dev",
    "beforeBuildCommand": "npm run build"
  },
  "app": {
    "windows": [
      {
        "title": "Hoshii",
        "width": 1280,
        "height": 800,
        "minWidth": 640,
        "minHeight": 480
      }
    ],
    "security": {
      "assetProtocol": {
        "enable": true,
        "scope": {
          "allow": ["**/*"],
          "deny": []
        }
      },
      "csp": "default-src 'self'; img-src 'self' asset: https://asset.localhost; media-src 'self' asset: https://asset.localhost; style-src 'self' 'unsafe-inline'"
    }
  },
  "bundle": {
    "active": true,
    "targets": "all",
    "icon": [
      "icons/32x32.png",
      "icons/128x128.png",
      "icons/icon.icns",
      "icons/icon.ico"
    ]
  }
}
```

**Important:** The static `scope: ["**/*"]` covers initial startup. At runtime, when users add root folders on external drives, the Rust backend **also** calls `app.asset_protocol_scope().allow_directory(&path, true)` to dynamically register the specific drive path. This ensures external drive paths are accessible even if the static scope doesn't catch them on certain platforms.

## Capabilities (src-tauri/capabilities/default.json)

```json
{
  "identifier": "default",
  "description": "Default capabilities for Hoshii",
  "windows": ["main"],
  "permissions": [
    "core:default",
    "dialog:allow-open",
    "dialog:allow-message",
    "dialog:allow-confirm",
    "fs:allow-read",
    "fs:allow-write",
    "fs:allow-exists",
    "fs:allow-stat",
    "fs:allow-readdir",
    "fs:allow-rename",
    "fs:allow-copy-file",
    "fs:allow-remove",
    "fs:allow-mkdir",
    "shell:allow-execute",
    "shell:allow-spawn",
    {
      "identifier": "fs:scope",
      "allow": [
        { "path": "$APPLOCALDATA/**" },
        { "path": "$HOME/**" },
        { "path": "**" }
      ]
    }
  ]
}
```

## Vite Config (vite.config.ts)

```typescript
import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import path from 'path';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: {
    alias: {
      '@': path.resolve(__dirname, './src'),
    },
  },
  clearScreen: false,
  server: {
    port: 1420,
    strictPort: true,
  },
  envPrefix: ['VITE_', 'TAURI_'],
  build: {
    target: process.env.TAURI_PLATFORM === 'windows' ? 'chrome105' : 'safari13',
    minify: !process.env.TAURI_DEBUG ? 'esbuild' : false,
    sourcemap: !!process.env.TAURI_DEBUG,
  },
  test: {
    globals: true,
    environment: 'jsdom',
    setupFiles: './src/test-setup.ts',
  },
});
```

## SQLite Initialization (Rust)

```rust
// db/mod.rs — called once at app startup
pub fn init_db(app_data_dir: &Path) -> Result<rusqlite::Connection> {
    let db_path = app_data_dir.join("hoshii").join("hoshii.db");
    std::fs::create_dir_all(db_path.parent().unwrap())?;
    
    let conn = rusqlite::Connection::open(&db_path)?;
    conn.execute_batch("PRAGMA journal_mode = WAL;")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")?;
    conn.execute_batch("PRAGMA busy_timeout = 5000;")?;
    
    // Run schema.sql for initial table creation
    conn.execute_batch(include_str!("schema.sql"))?;
    
    Ok(conn)
}
```

## Dev Commands

| Command | What |
|---------|------|
| `npm run tauri dev` | Start Tauri dev mode with hot reload |
| `npm run tauri build` | Production build (creates installer) |
| `npm run dev` | Frontend-only dev server (no Rust backend) |
| `npm run test` | Run frontend tests (Vitest) |
| `cargo test --manifest-path src-tauri/Cargo.toml` | Run Rust tests |
| `cargo clippy --manifest-path src-tauri/Cargo.toml` | Rust linting |
