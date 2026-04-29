# Mobile Access Strategy — Hoshii on Your Phone

How to browse your 2TB desktop gallery collection from your phone, anywhere, with minimal cost and optimal performance.

---

## The Problem

- 2TB of artwork on your desktop (external drives)
- You want to browse from your phone (at home, at work, on the go)
- Cloud storage for 2TB costs $20-100/month
- You don't want to buy a NAS ($300+)
- You don't want to maintain complex server infrastructure

---

## Full Options Comparison

### Category 1: Network Tunnel / VPN Approaches

These keep all data on your desktop and provide secure remote access from your phone.

| Option | Cost | Setup | Latency | Security | Offline | Maintenance | 2TB OK? |
|--------|------|-------|---------|----------|---------|-------------|---------|
| **Tailscale** | Free (100 devices) | 5 min | 5-15ms direct | WireGuard encrypted mesh | No | Minimal | Yes |
| **Cloudflare Tunnel** | Free (needs domain) | 30 min | 10-30ms (edge routed) | HTTPS, no inbound ports | No | Minimal | Yes |
| **WireGuard (DIY)** | Free | 60+ min | 1-3ms (kernel mode) | Best-in-class encryption | No | High (manual keys) | Yes |
| **ZeroTier** | Free (25 devices) | 10 min | 15-50ms | IPsec-based, open source | No | Low | Yes |
| **FRP (fast reverse proxy)** | Server cost (~$5/mo) | 30 min | 20-50ms | Auth + encryption available | No | Medium | Yes |
| **Ngrok** | $14/mo (persistent URL) | 5 min | 30-100ms | HTTPS via ngrok infra | No | None | Limited on free |
| **Reverse SSH tunnel** | Server cost only | 45 min | 20-50ms | SSH encryption | No | High | Yes |

**Best for Hoshii:** Tailscale — zero cost, 5-minute setup, encrypted, no port forwarding. Cloudflare Tunnel is the runner-up if you need public sharing or already have a domain.

---

### Category 2: Mobile App Framework Options

How to build the phone client that connects to the desktop server.

| Option | Code Reuse | Performance | Offline | Native APIs | App Store? | Dev Effort |
|--------|-----------|-------------|---------|------------|-----------|-----------|
| **Tauri Mobile v2** | High (same Rust + React) | Native Rust + WebView | Yes (local cache) | Biometric, notifications, deep links | Optional | 2-3 weeks |
| **Capacitor wrapper** | Highest (existing React app) | WebView (~2-5ms bridge) | Yes (service workers) | Via plugins | Yes | 1 week |
| **PWA (browser)** | High (React, shared styles) | WebView-native | Yes (service worker) | Limited (no biometric) | No (home screen) | 1-2 weeks |
| **React Native** | Low (rewrite frontend) | 50-60 FPS (JS bridge) | Yes (Redux/Zustand) | Full native | Yes | 4-6 weeks |
| **Flutter** | None (Dart rewrite) | 60-120 FPS native ARM | Yes | Full native | Yes | 6-8 weeks |
| **Kotlin Multiplatform** | Partial (Rust FFI possible) | Native compilation | Yes | Full native | Yes | 6-8 weeks |
| **Native Swift/Kotlin** | None (two codebases) | Best possible | Yes | Full native | Yes | 8-12 weeks |

**Best for Hoshii:** Tauri Mobile v2 (maximum Rust backend reuse) or Capacitor (fastest deployment of existing React app). PWA is the simplest MVP.

---

### Category 3: Sync / Replication Approaches

Copy selected data to the phone for fully offline access.

| Option | Cost | Selective Sync | Bandwidth Efficiency | Offline | Bidirectional | 2TB OK? |
|--------|------|---------------|---------------------|---------|---------------|---------|
| **Syncthing** | Free | Folder-level only (.stignore workaround) | Block-level delta | Full | Yes | Partial (no native selective) |
| **Rsync (scheduled)** | Free | Manual subfolder selection | Delta transfer (excellent) | Full (synced content) | One-way | Yes (with careful selection) |
| **Custom delta sync** | Dev time | Full control | As efficient as you build it | Full | Configurable | Yes |
| **Git LFS / git-annex** | Free | Partial checkout possible | Delta compression | Partial | Yes | Poor (not designed for media) |

**Best for Hoshii:** Custom delta sync integrated with Tauri commands — sync metadata + thumbnails automatically, full-res on demand. Syncthing is a good low-effort option for curated subsets.

---

### Category 4: Cloud Storage / CDN Approaches

Upload data to the cloud; phone fetches from CDN.

| Option | Storage Cost (2TB) | Egress Cost | Setup | Performance | Offline | Image Optimization |
|--------|-------------------|-------------|-------|-------------|---------|-------------------|
| **Cloudflare R2** | $30/mo | Free egress! | Medium | Global CDN, 100-400ms | No | Workers image resize |
| **AWS S3 + CloudFront** | $46/mo | $0.085/GB US | Medium | Global CDN, 100-400ms | No | Lambda@Edge resize |
| **Backblaze B2 + CF** | $10/mo | Free via CF bandwidth alliance | Medium | Good | No | Via Cloudflare Workers |
| **Supabase Storage** | ~$45/mo at 2TB | $0.05/GB | Low | CDN-backed | No | None built-in |
| **Firebase Storage** | ~$50/mo at 2TB | Included in plan | Very low | CDN-backed | Firebase SDK caching | None built-in |
| **Hetzner Object Storage** | $12/mo | $1/TB | Medium | EU-centric | No | None |

**Best for Hoshii:** None — all are expensive for 2TB. Only viable for a **thumbnail-only CDN** (~500MB = $0.01-0.02/mo on R2 with free egress). Keep full-res images on desktop.

---

### Category 5: NAS / Hardware Server Approaches

Dedicated always-on hardware serving your media.

| Option | One-time Cost | Monthly Cost | Setup | Performance | Mobile App | Maintenance |
|--------|-------------|-------------|-------|-------------|-----------|-------------|
| **Synology NAS (DS224+)** | $350-500 | $5/mo electricity | Medium | Excellent LAN, good remote | Synology Photos (native) | Medium |
| **QNAP NAS (TS-264)** | $350-500 | $5/mo electricity | Medium | Excellent LAN, good remote | QuMagie (native, AI tagging) | Medium |
| **Raspberry Pi 5 (8GB)** | $80-100 | $0.25/mo (~3W) | High | Moderate (ARM, USB) | Custom (run Hoshii server) | High |
| **Intel NUC / Mini PC** | $200-500 | $3-5/mo | High | Good (x86, NVMe) | Custom | High |
| **USB-C direct to phone** | $0-50 adapter | $0 | Very high | USB 3.1 speeds | Requires OTG + file manager | Complex |

**Best for Hoshii:** Raspberry Pi 5 if you want always-on for $100 total. Synology if you want a polished ecosystem with native mobile apps. NUC if you need x86 performance.

---

### Category 6: Existing Gallery Software (Use Instead or Alongside)

Standalone self-hosted gallery apps with their own mobile clients.

| Option | License | Mobile Client | AI Features | 2TB Scale | Integration with Hoshii |
|--------|---------|--------------|-------------|-----------|------------------------|
| **Immich** | Free, open source | Native iOS/Android (excellent) | Face recognition, smart search, object detection | Excellent | Coexist: Hoshii curates, Immich serves mobile |
| **PhotoPrism** | Free (personal), $99 (pro) | PWA only | TensorFlow classification, face/object detection | Good (100K+ photos) | Coexist as search/browse layer |
| **Piwigo** | Free, open source | Responsive web | Plugins (limited AI) | Excellent (500K+ tested) | Good for sharing with others |
| **Lychee** | Free, open source | Responsive web | None | Good | Lightweight alternative layer |
| **Nextcloud Photos** | Free, open source | Native iOS/Android | Limited (face detection plugin) | Excellent | Good if already using Nextcloud |

**Best for Hoshii:** Immich as a companion — use Hoshii as the desktop curator (tagging, smart grouping, reading progress) and Immich as the mobile browsing/search layer. They serve different roles well.

---

### Category 7: Hybrid Approaches (Recommended)

Combine the best of multiple categories.

#### Hybrid A: Metadata in Cloud + Media on Desktop

```
Phone (app) ←→ Cloud DB (metadata + thumbnails, ~500MB)
                  ↕
Desktop (Hoshii) ←→ 2TB media (Tailscale tunnel for full-res)
```

- Phone always has gallery structure, thumbnails, tags, favorites offline
- Full-res images fetched on-demand via Tailscale when desktop is on
- Cloud metadata syncs automatically (Supabase free tier: 500MB, or Firebase)
- Cost: $0 (within free tiers)

#### Hybrid B: Thumbnail CDN + Full-Res Local

```
Desktop generates thumbnails → Upload to Cloudflare R2 (500MB ≈ $0.01/mo)
Phone browses thumbnails from CDN (fast, cacheable, global)
Phone requests full-res → Tailscale tunnel to desktop
```

- Gallery browsing is always fast (CDN-backed, ~5ms globally)
- Full-res is on-demand only (saves bandwidth)
- Thumbnails can be shared publicly without exposing originals
- Cost: ~$0.02/mo (R2 storage) + $0 (Tailscale)

#### Hybrid C: Capacitor Wrapper + Tailscale (Fastest MVP)

```
Existing Hoshii React app → Wrap in Capacitor → iOS/Android app
Desktop runs HTTP API server (axum)
Phone connects via Tailscale mesh VPN
```

- Reuse 100% of existing React components
- Single codebase: `npm run tauri dev` (desktop), `npx cap run ios` (mobile)
- Tailscale handles all networking complexity
- Cost: $0, Setup: ~1 week

#### Hybrid D: Hoshii Desktop + Immich Mobile (Best of Both Worlds)

```
Hoshii (desktop) → Curate, tag, smart group, organize
         ↓ sync curated galleries
Immich (server) → AI search, face recognition, phone auto-upload
         ↓ native apps
Phone (Immich app) → Browse, search, view
```

- Hoshii stays focused on desktop curation (its strength)
- Immich handles mobile experience (its strength)
- Optional: sync curated galleries from Hoshii → Immich via script/API
- Cost: $5-15/mo (Immich server electricity) or $0 (run on same desktop)

---

### Category 8: P2P / Decentralized Approaches

Direct device-to-device without central infrastructure.

| Option | Setup | Latency | Offline | NAT Traversal | Maturity | Best For |
|--------|-------|---------|---------|---------------|----------|----------|
| **WebRTC direct** | High (signaling server needed) | <50ms P2P | No (both online) | Complex | Mature | Real-time streaming |
| **libp2p** | Very high | 40-100ms | No | Pluggable transports | Moderate | Decentralized apps |
| **IPFS** | Medium | 100-500ms (DHT lookup) | Cached content only | Built-in | Mature | Immutable content publishing |

**Best for Hoshii:** Skip P2P — over-engineered for a single-user gallery app. Tailscale already solves the networking problem with less complexity.

---

## Decision Matrix

| Your Priority | Recommended Approach | Cost | Effort |
|---------------|---------------------|------|--------|
| **Fastest MVP** | Hybrid C: Capacitor + Tailscale | $0 | 1 week |
| **Maximum code reuse** | Tauri Mobile v2 + Tailscale | $0 | 2-3 weeks |
| **Best mobile UX** | Hybrid D: Hoshii + Immich | $0-15/mo | 2-3 weeks |
| **Always-fast browsing** | Hybrid B: Thumbnail CDN + Tailscale | $0.02/mo | 2 weeks |
| **Complete offline** | Custom delta sync + Tauri Mobile | $0 | 4-5 weeks |
| **Zero maintenance** | Cloud storage (R2/S3) | $10-50/mo | 2 weeks |
| **Public sharing** | Cloudflare Tunnel + PWA | $0 (need domain) | 2 weeks |
| **Polished ecosystem** | Synology NAS | $350+ hardware | 1 week |
| **Maximum privacy** | WireGuard (DIY) + Tauri Mobile | $0 | 4+ weeks |
| **Family sharing** | Tailscale mesh + Tauri Mobile | $0 | 3 weeks |

---

## Recommended Strategy: Phased Approach

### Phase M1: HTTP API Server + PWA (Quick Win)

Add an **optional HTTP server** to the existing Rust backend using `axum`. Serve a lightweight PWA for mobile browsing via Tailscale.

```
src-tauri/src/
├── server/                    # NEW — HTTP API companion
│   ├── mod.rs                 # Server startup, routes
│   ├── routes/
│   │   ├── galleries.rs       # GET /api/galleries, /api/galleries/:id/media
│   │   ├── artists.rs         # GET /api/artists
│   │   ├── search.rs          # GET /api/search?q=
│   │   ├── media.rs           # GET /api/media/:id — streams file (Range support)
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

**Effort:** 2 sessions. **Networking:** Tailscale (free, 5 min setup).

### Phase M2: Mobile Client (Choose One Path)

**Path A — PWA (simplest):**
1. Create `src-mobile/` with Vite + React (share component styles with desktop)
2. Responsive gallery grid (CSS Grid, touch-optimized)
3. Swipe-based image reader (touch events, pinch-to-zoom)
4. Service worker for offline thumbnail caching
5. PWA manifest for home screen install

**Path B — Capacitor (native features):**
1. Wrap existing React app in Capacitor
2. Add mobile-specific touch handlers and navigation
3. Use Capacitor plugins for biometric auth, secure storage

**Path C — Tauri Mobile v2 (maximum reuse):**
1. Extend Tauri build for iOS/Android targets
2. Reuse Rust backend as local cache/proxy
3. Share React frontend with responsive breakpoints

**Effort:** 2-3 sessions.

### Phase M3: Quality of Life

1. Wake-on-LAN integration (wake desktop from phone)
2. Reading progress sync (phone ↔ desktop via API)
3. Offline mode (browse cached content when desktop is off)
4. Video streaming with adaptive quality
5. Push notification when new content is scanned

**Effort:** 1-2 sessions.

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

```rust
// Server detects client hint or query param
GET /api/media/123?quality=thumb     → 200px wide, ~5KB
GET /api/media/123?quality=preview   → 720px wide, ~50KB
GET /api/media/123?quality=full      → Original resolution
GET /api/media/123?quality=auto      → Detect from Accept-CH / Save-Data header
```

---

## Desktop Requirements

Your desktop needs to stay on (or be wake-able) for remote access:

| Approach | Power Cost | Availability |
|----------|-----------|-------------|
| Always-on desktop | ~$5-15/month electricity | 24/7 |
| Sleep + Wake-on-LAN | ~$1-3/month | 30s wake delay |
| Scheduled uptime (e.g., 8am-midnight) | ~$3-8/month | During schedule |
| Wake-on-LAN from Tailscale | ~$1-3/month | 30s delay, any time |
| Raspberry Pi 5 relay ($80, 3W) | ~$0.25/month | 24/7, desktop can sleep |

**Recommended:** Sleep mode with Wake-on-LAN. Tailscale supports WoL via subnet routers, or use a Raspberry Pi (~$15) as a WoL relay.

---

## Cost Comparison (All Options)

| Solution | Monthly Cost | One-time Cost | Performance | Maintenance |
|----------|-------------|---------------|-------------|-------------|
| **Hoshii + Tailscale (desktop)** | **$0** | **$0** | **Excellent** | **Minimal** |
| **Hoshii + Capacitor + Tailscale** | $0 | $0 | Excellent | Low |
| Hoshii + Raspberry Pi relay | $0.25 | $100 | Good | Medium |
| Hoshii + Thumbnail CDN (R2) | $0.02 | $0 | Excellent browse, good full-res | Low |
| Hoshii + Immich companion | $0-15 | $0-300 | Excellent | Medium |
| Cloudflare R2 (full 2TB) | $30 | $0 | Excellent (CDN) | Low |
| Backblaze B2 + Cloudflare | $10 | $0 | Good | Low |
| AWS S3 + CloudFront | $46+ | $0 | Excellent (CDN) | Low |
| Google Drive (2TB) | $10 | $0 | Depends on upload speed | None |
| Dropbox (3TB) | $12 | $0 | Good, sync conflicts | None |
| iCloud (2TB) | $10 | $0 | Good, Apple-only | None |
| Synology NAS (DS224+) | $5 electricity | $350+ | Excellent | Medium |
| QNAP NAS (TS-264) | $5 electricity | $350+ | Excellent | Medium |
| Self-hosted Immich (standalone) | $5-15 | $0-300 | Good | Medium |
| Self-hosted PhotoPrism | $5-15 | $0-300 | Good | Medium |

**Winner for Hoshii's use case:** Hoshii + Tailscale on desktop = **$0/month**, optimal performance, zero vendor lock-in, minimal maintenance.

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
| Cloud metadata leak | Hybrid A only: encrypt metadata at rest, use Supabase RLS |

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
