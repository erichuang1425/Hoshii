# UI/UX Reference v2

## Theme Tokens

```css
:root {
  --bg-primary:     #0a0a0b;
  --bg-secondary:   #141416;
  --bg-elevated:    #1c1c1f;
  --bg-hover:       #252528;
  --bg-active:      #2d2d31;
  --bg-offline:     #1a1418;

  --text-primary:   #e8e8ec;
  --text-secondary: #8b8b96;
  --text-muted:     #55555e;

  --accent:         #e85d75;
  --accent-hover:   #f06e84;
  --accent-muted:   rgba(232, 93, 117, 0.12);

  --border:         #2a2a2e;
  --border-hover:   #3a3a3f;
  --success:        #4ade80;
  --warning:        #fbbf24;
  --error:          #f87171;
  --offline:        #6b7280;

  --card-radius:    6px;
  --card-shadow:    0 2px 8px rgba(0, 0, 0, 0.4);
  --thumb-ratio:    3/4;
  --sidebar-width:  240px;
  --header-height:  48px;
  --reader-bg:      #000000;

  --ease-smooth:    cubic-bezier(0.4, 0, 0.2, 1);
  --duration-fast:  150ms;
  --duration-normal:250ms;
}
```

## Layout

```
┌───────────────────────────────────────────────────┐
│ HEADER (48px)  [☰] Hoshii    [🔍 Search]  [⚙][♡] │
├──────────┬────────────────────────────────────────┤
│ SIDEBAR  │ MAIN CONTENT                           │
│ (240px)  │                                        │
│          │  Gallery grid / Artist grid / Reader    │
│ DRIVES   │                                        │
│ 🟢 Drive1│                                        │
│ 🔴 Drive2│  ← offline indicator                   │
│          │                                        │
│ ROOTS    │                                        │
│  📁 Root1│                                        │
│  📁 Root2│  (greyed if parent drive offline)      │
│          │                                        │
│ RECENT   │                                        │
│ FAVS     │                                        │
│ TAGS     │                                        │
├──────────┴────────────────────────────────────────┤
│ 3 drives (1 offline) │ 847 galleries │ 12,403 files│
└───────────────────────────────────────────────────┘
```

- Sidebar collapses to icon-only at < 800px
- Reader mode hides sidebar + header entirely (Escape to exit)

## Drive Status UI

### Sidebar Drive Items
- Small colored dot next to each drive label: green = online, red/grey = offline
- Offline drives stay listed — user can see their galleries (thumbnails cached) but not open them
- Tooltip on offline drive: "Last seen: 2 days ago"

### Gallery Cards When Drive Offline
- Cached thumbnail still visible (thumbnails stored locally)
- Semi-transparent grey overlay (opacity 0.5)
- "Offline" pill badge centered on card
- Click shows toast: "Reconnect [Drive Label] to view this gallery"
- Metadata (favorites, tags, progress bar) still rendered normally

### Drive Reconnect Flow
1. Drive plugged in → Rust detects new mount via periodic poll (5s interval) or file watcher
2. Volume UUID matched against DB → mark online, update mount_path
3. Frontend receives `volume_status_changed` event → Zustand store refreshes
4. Cards transition from greyed/offline to full color (200ms fade)
5. Asset protocol scope dynamically expanded to include new mount path

### Status Bar
`3 drives (1 offline) │ 847 galleries │ 12,403 files │ Last scan: 2m ago`

---

## Page Layouts

### Home Page (Root Selection)
- Section per connected volume, each showing its root folders as cards
- Root card: folder name, artist count, gallery count, last scan time, drive indicator
- "Add Root Folder" card with dashed border + plus icon (opens native folder picker)
- Offline volumes shown at bottom in a collapsed "Offline Drives" section
- Recent galleries carousel below (only from online drives)

### Artist List Page
- Breadcrumb: `Drive Label > Root Name`
- Grid of artist cards (4-6 per row depending on window width)
- Each card: first gallery's cover as thumbnail, artist name, gallery count
- Sort options: alphabetical (default), gallery count, recently updated
- Virtual scrolling for 100+ artists

### Artist Page (Gallery List)
- Breadcrumb: `Drive > Root > Artist Name`
- Grid of gallery cover thumbnails (4-6 per row)
- Each gallery card shows:
  - Cover image (3:4 ratio, from `coverPath` via `toAssetUrl()`)
  - Gallery name (truncated, full on hover)
  - Page count badge bottom-left: `47 📄`
  - Media type badges top-right: `🎬` for video, `GIF` for animated
  - Video total duration badge bottom-right: `▶ 2:34` (only if contains videos)
  - Favorite heart top-left (appears on hover)
  - Reading progress bar (thin accent line at card bottom, width = lastReadPage/pageCount %)
  - Unread dot if never opened

### Gallery Reader Page

```
┌─────────────────────────────────────────────────┐
│ ← Back    Gallery Title           3/47 📖  [⚙]  │  ← Auto-hides after 2s
├─────────────────────────────────────────────────┤
│                                                 │
│           ┌───────────────────┐                 │
│    ◀      │                   │      ▶          │
│   PREV    │   MEDIA CONTENT   │     NEXT        │  Click zones: left/right 20%
│  (20%)    │  (image / video)  │    (20%)        │
│           │                   │                 │
│           └───────────────────┘                 │
│                                                 │
├─────────────────────────────────────────────────┤
│ GROUPS: [All 24] [lucy ●12] [eva ●8] [mia ●4]  │  ← Only if 2+ groups detected
├─────────────────────────────────────────────────┤
│ [①][②][③][④]│[⑤][⑥][⑦]│[⑧][⑨] ... [47]        │  ← Thumbnail strip
└─────────────────────────────────────────────────┘

Legend:
│ = group divider (subtle vertical line with label)
① = current page (accent border, scale 1.1)
```

**Reader Chrome Behavior:**
- Top bar + bottom strip auto-hide after 2s of no mouse movement
- Mouse to top 10% → reveal top bar
- Mouse to bottom 15% → reveal thumbnail strip + subheading nav
- Escape → exit reader, return to gallery list

### Reading Modes
1. **Single Page** — one media item centered, fit to window
2. **Vertical Scroll** — continuous scroll, virtual list, items stacked vertically
3. **Double Page** — two images side-by-side (for manga/doujin)
4. **Thumbnail Grid** — overview of all pages in grid, click to jump
5. **Long Strip (Webtoon)** — continuous vertical scroll, all pages in one column, fit-to-width default, seamless reading with no page breaks

### Infinite Slider (Scrubbable Thumbnail Scrollbar)

```
Reader right edge (or bottom edge in horizontal layouts):

  ▲
  ║   ← slider track
  ║
  ║  ┌────────────────────┐
  ●──│  Page 23 / 47      │  ← floating thumbnail preview (appears on hover/drag)
  ║  │  [thumbnail image] │
  ║  └────────────────────┘
  ║
  ▼
```

- Appears on right edge of reader in all modes
- Handle position maps linearly to `currentPage / totalPages`
- Hover over track → show floating thumbnail preview of target page
- Drag handle → live preview updates, release to jump
- Click anywhere on track → instant jump to that page
- Auto-hides with reader chrome after 2s, reveals on mouse hover near right edge

### Assistive Reading Tools

**Reading Toolbar** (accessible via gear icon in reader header):

```
┌─────────────────────────────────────────────────────┐
│ Fit: [Width] [Height] [Original] [Best]             │
│ Direction: [LTR →] [← RTL] [↓ Vertical]            │
│ Auto-scroll: [Off ○──────● On]  Speed: [━━●━━━━━]  │
└─────────────────────────────────────────────────────┘
```

- **Fit modes:** Toggle buttons — fit-to-width, fit-to-height, original size, fit-best (auto)
- **Reading direction:**
  - LTR (default): left click zone = prev, right = next; ← arrow = prev, → arrow = next
  - RTL (manga): left click zone = next, right = prev; ← arrow = next, → arrow = prev; double page shows right page first
  - Vertical: up = prev, down = next; click zones top/bottom instead of left/right
- **Auto-scroll:** Toggle on/off, adjustable speed slider (10-200 px/s), pauses on mouse hover over content, resumes on mouse leave
- Reading direction preference persisted per-gallery in Zustand store

### Chronological Navigation

For galleries linked by date (Smart Linking feature):

```
┌─────────────────────────────────────────────────────┐
│ ← Mar 14  │  Gallery Title  │  3/47  │  Mar 16 →   │
└─────────────────────────────────────────────────────┘
```

- "← Previous (date)" and "Next (date) →" buttons in reader header
- Only visible for galleries that have chronological links (date detected in name)
- Clicking navigates to the adjacent gallery in chronological order

### Timeline View (Per-Image)

```
┌──────────────────────────────────────────────────────────┐
│  Timeline                                    [Day▾]      │
│                                                          │
│  Mar 15       Mar 16            Mar 18       Mar 20      │
│   ┃            ┃                  ┃           ┃          │
│  ┌┸┐  ┌┸┐    ┌┸┐  ┌┸┐         ┌┸┐  ┌┸┐    ┌┸┐          │
│  │ │  │ │    │ │  │ │         │ │  │ │    │ │           │
│  └─┘  └─┘    └─┘  └─┘         └─┘  └─┘    └─┘          │
│  ═══════════════●═══════════════════════════  scrubber   │
└──────────────────────────────────────────────────────────┘
```

- Horizontal axis represents time, images plotted at parsed dates
- Zoom control: Day / Week / Month granularity (dropdown top-right)
- Draggable scrubber along bottom, snaps to nearest image cluster
- Click any thumbnail → open in reader at that page
- Date labels auto-space based on zoom level and image density
- Keyboard shortcut: `T` toggles timeline view in reader

### Smart Group UI

On the Artist Page (gallery list), Smart Groups are indicated:

```
┌─────────────────────────────────────────────────────┐
│  📂 justin          Smart Group (3 galleries)  [▾]  │
│  ┌──────┐  ┌──────┐  ┌──────┐                      │
│  │cover1│  │cover2│  │cover3│                       │
│  │      │  │      │  │      │                       │
│  └──────┘  └──────┘  └──────┘                       │
│  justin-1   justin_1   justin1                      │
├─────────────────────────────────────────────────────┤
│  📂 alice-vacation   Smart Group (2 galleries)      │
│  ...                                                │
└─────────────────────────────────────────────────────┘
```

- Smart Groups shown as collapsible sections on the artist page
- Badge: "Smart Group (N galleries)" with link icon
- Expand to see all member galleries side-by-side
- Right-click gallery → "Unlink from Smart Group" option
- Galleries not in any group display normally in the regular grid

---

## Media Rendering

### Static Images (jpg, png, webp, bmp, tiff, static avif)
- `<img src={toAssetUrl(path)}>` with lazy loading
- Fade-in on load (opacity 0→1, 200ms)
- Blur-up: tiny thumbnail placeholder → sharp image
- Double-click: toggle fit-to-width ↔ actual size
- Scroll wheel: zoom (centered on cursor position)
- Click-drag: pan when zoomed

### Animated Images (gif, apng, animated webp)
- `<img>` tag — browser handles animation natively
- Hover overlay: play/pause toggle, frame count, duration
- Pause: canvas snapshot of current frame (freeze in place)
- Auto-play when scrolled into viewport (IntersectionObserver)
- Auto-pause when scrolled out of viewport
- Thumbnail grid: show static first frame, animate on hover

### Animated AVIF (special handling)
- NOT rendered directly in `<img>` (WebKit playback issues)
- Rust converts to animated WebP on first access, cached locally
- Converted WebP served via `toAssetUrl(convertedPath)`
- Small "AVIF→WebP" badge shown during conversion (loading spinner)
- After conversion: renders identically to animated WebP

### Video (mp4, webm)
Custom VideoPlayer component:

```
┌─────────────────────────────────────────┐
│                                         │
│            VIDEO CONTENT                │  ← Click to play/pause
│                                         │
├─────────────────────────────────────────┤
│ ▶ ━━━━━━━●━━━━━━━━━━━ 1:23 / 3:47      │  ← Seek bar with hover preview
│ 🔊━━━● │ 1x ▾ │ 🔁 │ ⧉ PiP │ ⛶ Full   │  ← Controls
└─────────────────────────────────────────┘
```

- Controls auto-hide after 2s, show on mouse move or hover
- Spacebar: play/pause
- Arrow keys: ← -5s, → +5s, ↑ volume up, ↓ volume down
- Loop toggle: auto-on for clips < 30s (configurable threshold)
- Speed: 0.5x | 1x | 1.5x | 2x (dropdown)
- PiP: picture-in-picture (native browser API)
- Fullscreen: native fullscreen API
- Gallery grid hover: play first 3s muted preview

### Video (mkv, avi, mov — requires ffmpeg)
- If ffmpeg NOT available: show poster frame (if extractable) + message: "Install ffmpeg for video playback" + link to settings page
- If ffmpeg available: remux to MP4 on first play (show progress bar), cache result, then play normally
- Remux progress: "Converting video... 45%" overlay on video area

---

## Keyboard Shortcuts

| Key | Action | Context |
|-----|--------|---------|
| `←` / `A` | Previous page | Reader |
| `→` / `D` | Next page | Reader |
| `Space` | Play/pause (video) or next page (image) | Reader |
| `Escape` | Exit reader / close modal | Global |
| `F` | Toggle fullscreen | Reader |
| `G` | Toggle thumbnail grid mode | Reader |
| `V` | Toggle vertical scroll mode | Reader |
| `1` | Single page mode | Reader |
| `2` | Double page mode | Reader |
| `Home` | First page | Reader |
| `End` | Last page | Reader |
| `F11` | App fullscreen | Global |
| `/` or `Ctrl+F` | Focus search | Global |
| `Ctrl+,` | Open settings | Global |
| `W` | Toggle Long Strip (Webtoon) mode | Reader |
| `T` | Toggle Timeline view | Reader |
| `R` | Cycle reading direction (LTR → RTL → Vertical) | Reader |
| `S` | Toggle auto-scroll | Reader |
| `[` / `]` | Decrease / increase auto-scroll speed | Reader (auto-scroll active) |
| `Shift+←` | Navigate to previous chronological gallery | Reader (chrono-linked) |
| `Shift+→` | Navigate to next chronological gallery | Reader (chrono-linked) |

---

## Responsive Behavior

| Window Width | Sidebar | Grid Columns | Thumbnail Strip |
|-------------|---------|-------------|-----------------|
| > 1400px | Full (240px) | 6 | Large (96px height) |
| 1000-1400px | Full (240px) | 4 | Small (64px height) |
| 800-1000px | Icons only (48px) | 3 | Small (64px height) |
| < 800px | Hidden (hamburger toggle) | 2 | Hidden (swipe navigation) |

## Animations

- **Page transitions:** fade + slight slide (100ms)
- **Card hover:** scale(1.03) + shadow increase (200ms ease)
- **Sidebar collapse:** width transition (250ms ease)
- **Reader chrome show/hide:** opacity + translateY (200ms)
- **Loading skeletons:** shimmer gradient (1.5s loop)
- **Thumbnail strip scroll:** smooth scroll-behavior CSS
- **Toast enter/exit:** slide-in from right (300ms spring curve)
- **Drive reconnect:** grey→color fade (200ms)
- **Offline overlay appear:** fade-in (150ms)

## WebKit CSS Compatibility Notes

These require explicit attention when styling (Tauri uses WebKit on macOS + Linux):

| Property | Issue | Fix |
|----------|-------|-----|
| `backdrop-filter` | Needs prefix | Use `-webkit-backdrop-filter` alongside |
| `scrollbar-width` | Not supported in WebKit | Use `::-webkit-scrollbar` pseudo-elements |
| Custom scrollbars | Different API | Provide both `scrollbar-*` and `::-webkit-scrollbar-*` |
| `aspect-ratio` | Works but verify | Test on macOS Safari/WebKit specifically |
| Scroll snap | Slightly different inertia | Test scrolling feel on all platforms |
| `gap` in flexbox | Fine in modern WebKit | But verify on WebKitGTK (Linux) which can lag |
| CSS `color-mix()` | May not be in older WebKitGTK | Fallback to computed values |
| Font rendering | Different from Chromium | Use `-webkit-font-smoothing: antialiased` |

Always test visual output on macOS (WebKit) and Linux (WebKitGTK) alongside Windows (Chromium WebView2).
