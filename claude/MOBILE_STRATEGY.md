# Mobile Access Strategy — Hoshii on Your Phone

How to browse your 2TB desktop gallery collection from your phone, anywhere, with minimal cost and optimal performance.

---

## The Problem

- 2TB of artwork on your desktop (external drives)
- You want to browse from your phone (at home, at work, on the go)
- Cloud storage for 2TB costs $20-100/month
- You don't want to buy a NAS ($300+)
- You don't want to maintain complex server infrastructure

## The Solution: Desktop as Server + Tailscale + PWA

```
┌─────────────────────────────────────────────────────┐
│  YOUR DESKTOP (always-on or wake-on-LAN)            │
│                                                      │
│  ┌──────────────┐    ┌─────────────────────────┐    │
│  │ Hoshii App   │    │ Hoshii HTTP API Server   │    │
│  │ (Tauri GUI)  │    │ (Rust, port 8470)        │    │
│  └──────┬───────┘    └──────────┬──────────────┘    │
│         │                       │                    │
│         └───────┬───────────────┘                    │
│                 ▼                                     │
│         ┌──────────────┐                             │
│         │  SQLite DB   │                             │
│         │  + 2TB files │                             │
│         └──────────────┘                             │
│                 │                                     │
│         ┌──────────────┐                             │
│         │  Tailscale   │  ← encrypted WireGuard VPN  │
│         └──────┬───────┘                             │
└────────────────┼─────────────────────────────────────┘
                 │ (100.x.y.z private IP)
                 │
        ┌────────┴────────┐
        │   YOUR PHONE    │
        │                 │
        │  ┌───────────┐  │
        │  │ Tailscale │  │
        │  └─────┬─────┘  │
        │        │         │
        │  ┌─────┴─────┐  │
        │  │ Browser /  │  │
        │  │ Hoshii PWA │  │
        │  └───────────┘  │
        └─────────────────┘
```

**Total cost: $0/month.** Tailscale personal plan is free for up to 100 devices.

---

## Architecture Components

### 1. Companion HTTP API Server (Rust)

Add an **optional HTTP server** to the existing Rust backend using `axum` (lightweight, async, Tokio-based). It reuses the same `SQLite` database and services.

```
src-tauri/src/
├── server/                    # NEW — HTTP API companion
│   ├── mod.rs                 # Server startup, routes
│   ├── routes/
│   │   ├── galleries.rs       # GET /api/galleries, /api/galleries/:id/media
│   │   ├── artists.rs         # GET /api/artists
│   │   ├── search.rs          # GET /api/search?q=
│   │   ├── media.rs           # GET /api/media/:id — streams file
│   │   ├── thumbnails.rs      # GET /api/thumbs/:id — serves cached thumb
│   │   └── favorites.rs       # GET/POST /api/favorites
│   ├── middleware/
│   │   ├── auth.rs            # Bearer token auth (simple shared secret)
│   │   └── cache.rs           # Cache-Control headers for thumbnails
│   └── config.rs              # Port, auth token, enabled/disabled
```

**Key design decisions:**

| Decision | Why |
|----------|-----|
| `axum` over `actix-web` | Same Tokio runtime as Tauri, smaller binary, better ergonomics |
| Separate process OR embedded | Can run standalone (headless server) OR inside Tauri app |
| Bearer token auth | Simple, no user management needed for single-user app |
| Thumbnail-first loading | Send 5KB thumbnails immediately, full images on tap |
| Range request support | Resume interrupted downloads, seek in videos |

### 2. Tailscale (Networking)

[Tailscale](https://tailscale.com) creates a private WireGuard VPN mesh between your devices.

**Setup (5 minutes):**
1. Install Tailscale on desktop → get private IP like `100.64.0.1`
2. Install Tailscale on phone → get private IP like `100.64.0.2`
3. Both devices are now on the same private network
4. Phone accesses `http://100.64.0.1:8470` — encrypted, no port forwarding needed

**Why Tailscale over alternatives:**

| Option | Cost | Setup | Security | Verdict |
|--------|------|-------|----------|---------|
| Tailscale | Free | 5 min | WireGuard encrypted | Best choice |
| Cloudflare Tunnel | Free | 30 min | HTTPS | Good but needs domain |
| Port forwarding | Free | 15 min | Exposed to internet | Risky |
| Ngrok | $8/mo | 5 min | HTTPS | Unnecessary cost |
| ZeroTier | Free | 10 min | Encrypted | Good alternative |

### 3. Progressive Web App (PWA) — Phone Client

A responsive web app that works in the phone browser and can be "installed" to the home screen. No app store needed.

```
src-mobile/                    # NEW — PWA companion app
├── index.html
├── manifest.json              # PWA manifest (name, icons, theme)
├── sw.js                      # Service worker for offline caching
├── src/
│   ├── App.tsx                # React app (shared components with desktop)
│   ├── api/                   # HTTP client for the companion server
│   ├── pages/
│   │   ├── BrowsePage.tsx     # Artist/gallery grid
│   │   ├── ReaderPage.tsx     # Full-screen image viewer (swipe)
│   │   └── SearchPage.tsx     # Search
│   ├── components/
│   │   ├── GalleryCard.tsx    # Reuse desktop component styles
│   │   ├── SwipeReader.tsx    # Touch-optimized reader
│   │   └── LazyImage.tsx      # Progressive loading (thumb → full)
│   └── hooks/
│       ├── useOfflineCache.ts # Cache recently viewed galleries
│       └── useSwipeNav.ts     # Swipe left/right for page nav
```

---

## Performance Optimization for Mobile

### Thumbnail Pipeline

```
Phone requests gallery → Server sends metadata + thumbnail URLs
                          (each thumb is ~5KB, 100 thumbs = 500KB)

User taps image → Server streams full-res image
                   (progressive JPEG: shows blurry preview at 10%, sharp at 100%)

Next images prefetched → Browser loads next 2-3 images in background
```

### Bandwidth Budget

| Action | Data Transfer | Time (4G LTE) |
|--------|---------------|----------------|
| Load artist list (50 artists) | ~250KB (thumbs) | <1s |
| Load gallery grid (100 galleries) | ~500KB (thumbs) | <2s |
| View single image (1080p) | ~200-500KB (JPEG) | <1s |
| View single image (4K) | ~2-5MB (JPEG) | 2-5s |
| Browse 20 pages | ~4-10MB | Feels instant with prefetch |

### Caching Strategy

```
Layer 1: Service Worker cache      (phone storage, ~500MB)
         → Recently viewed thumbnails + gallery metadata
         → Offline browsing of cached content

Layer 2: HTTP Cache-Control headers (browser cache)
         → Thumbnails: max-age=604800 (7 days)
         → Full images: max-age=86400 (1 day)
         → Metadata: no-cache (always fresh)

Layer 3: Server-side thumbnail cache (already exists)
         → Pre-generated WebP thumbnails
         → Served instantly, no re-processing
```

### Quality Tiers for Mobile

Serve different image sizes based on connection:

```rust
// Server detects client hint or query param
GET /api/media/123?quality=thumb     → 200px wide, ~5KB
GET /api/media/123?quality=preview   → 720px wide, ~50KB
GET /api/media/123?quality=full      → Original resolution
GET /api/media/123?quality=auto      → Detect from Accept-CH / Save-Data header
```

---

## Implementation Phases

### Phase M1: HTTP API Server (Estimated effort: 2 sessions)

1. Add `axum`, `tokio`, `tower-http` to Cargo.toml
2. Create read-only API endpoints:
   - `GET /api/artists` → list all artists
   - `GET /api/artists/:id/galleries` → artist's galleries
   - `GET /api/galleries/:id/media` → gallery media list
   - `GET /api/media/:id/file` → stream actual file (Range support)
   - `GET /api/media/:id/thumb` → serve thumbnail
   - `GET /api/search?q=` → search galleries
   - `GET /api/favorites` → list favorites
3. Add bearer token auth middleware
4. Add CORS headers for PWA access
5. Add toggle in Hoshii settings: "Enable remote access" (on/off + show token)

### Phase M2: PWA Mobile Client (Estimated effort: 2-3 sessions)

1. Create `src-mobile/` with Vite + React (can share component styles)
2. Build responsive gallery grid (CSS Grid, touch-optimized)
3. Build swipe-based image reader (touch events, pinch-to-zoom)
4. Add service worker for offline caching
5. PWA manifest for home screen install
6. Progressive image loading (thumbnail → preview → full)

### Phase M3: Quality of Life (Estimated effort: 1-2 sessions)

1. Wake-on-LAN integration (wake desktop from phone)
2. Reading progress sync (phone ↔ desktop via API)
3. Offline mode (browse cached content when desktop is off)
4. Video streaming with adaptive quality
5. Push notification when new content is scanned

---

## Desktop Requirements

Your desktop needs to stay on (or be wake-able) for remote access. Options:

| Approach | Power Cost | Availability |
|----------|-----------|-------------|
| Always-on desktop | ~$5-15/month electricity | 24/7 |
| Sleep + Wake-on-LAN | ~$1-3/month | 30s wake delay |
| Scheduled uptime (e.g., 8am-midnight) | ~$3-8/month | During schedule |
| Wake-on-LAN from Tailscale | ~$1-3/month | 30s delay, any time |

**Recommended:** Sleep mode with Wake-on-LAN. Tailscale supports [subnet routers that can send WoL packets](https://tailscale.com/kb/1240/wake-on-lan), or use a Raspberry Pi (~$15) as a WoL relay that's always on.

---

## Alternative: Raspberry Pi as Always-On Server

If you don't want your desktop always on, a **Raspberry Pi 5 (8GB, ~$80)** can serve as an always-on media server:

```
Desktop (2TB drives) ──USB──→ Raspberry Pi 5 ──Tailscale──→ Phone
                                   │
                              Runs Hoshii server
                              (Rust ARM binary, ~10MB)
                              SQLite + thumbnail cache
                              ~3W power draw ($3/year)
```

This gives you:
- $3/year electricity (vs $60-180/year for desktop always-on)
- Desktop can sleep/shutdown freely
- Pi handles thumbnail generation + API serving
- Drives connected to Pi via USB hub
- Total one-time cost: ~$100 (Pi + case + power supply)

---

## Cost Comparison

| Solution | Monthly Cost | One-time Cost | Performance |
|----------|-------------|---------------|-------------|
| **Hoshii + Tailscale (desktop)** | $0 | $0 | Excellent |
| **Hoshii + Pi relay** | $0.25 | $100 | Good |
| Google Drive (2TB) | $10/mo | $0 | Depends on upload |
| Dropbox (3TB) | $12/mo | $0 | Sync conflicts |
| Synology NAS (DS224+) | $5/mo electricity | $350+ | Excellent |
| iCloud (2TB) | $10/mo | $0 | Apple-only |
| Self-hosted Immich | $5-15/mo | $0-300 | Good for photos |

**Winner for your case:** Hoshii + Tailscale on desktop = **$0/month**, optimal performance, zero vendor lock-in.

---

## Security Considerations

| Concern | Mitigation |
|---------|------------|
| API exposed to internet | Tailscale = private network, never exposed |
| Auth bypass | Bearer token required for all endpoints |
| File path traversal | API serves by ID (database lookup), never by path |
| Thumbnail enumeration | Sequential IDs are fine — it's a single-user app |
| Token theft | Token stored in phone's secure storage (Keychain/Keystore) |
| Desktop compromise | Same risk as any Tailscale device — use MFA on Tailscale account |

---

## Cargo Dependencies (New)

```toml
# Only needed for mobile companion server
[features]
server = ["axum", "tower-http", "tokio/full"]

[dependencies]
axum = { version = "0.7", optional = true }
tower-http = { version = "0.5", features = ["cors", "fs", "compression-gzip"], optional = true }
tokio = { version = "1", features = ["rt-multi-thread", "macros"], optional = true }
```

Binary size impact: ~2MB additional when `server` feature is enabled.
