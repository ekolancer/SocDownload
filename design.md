# Design System: MediaVault (Personal Social Archiver & Media Studio)

## 1. Visual Theme & Atmosphere
- **Atmosphere:** A tactile, high-density archival workspace engineered for personal media preservation. It balances the precision of an editorial photo lab with the utility of an offline media workstation.
- **Density:** 6/10 (Balanced Pro-Tool). Spacious enough for rich high-resolution photo/video grid evaluation, yet structured with compact metadata indicators.
- **Variance:** 7/10 (Controlled Asymmetric). Uses purposeful asymmetry between input command centers, status pipelines, and dynamic media galleries rather than repetitive card templates.
- **Motion:** 5/10 (Hardware-Accelerated Fluid CSS). Instant tactile responsiveness on clicks, subtle opacity dissolves on overlays, and clean GPU-composited hover depth without layout shifts or blur-repaint thrashing.

---

## 2. Color Palette & Roles
Strict semantic color calibration using slate/zinc neutral foundations with a singular high-agency Indigo accent:

- **Canvas Base** (`#F8FAFC` / Slate 50) — Primary background for the entire application surface.
- **Surface Pure** (`#FFFFFF` / White) — High-contrast container fill for cards, toolbar docks, and navigation panels.
- **Surface Subdued** (`#F1F5F9` / Slate 100) — Pill backgrounds, segment track controls, and disabled state chips.
- **Charcoal Ink** (`#0F172A` / Slate 900) — Primary typography, titles, and high-contrast text.
- **Muted Slate** (`#64748B` / Slate 500) — Metadata captions, subtitles, timestamps, and secondary labels.
- **Whisper Border** (`#E2E8F0` / Slate 200) — Crisp 1px structural container borders and dividers.
- **Primary Accent: Indigo Core** (`#4F46E5` / Indigo 600) — Single high-contrast focal accent for download actions, active selection rings, and primary triggers.
- **Accent Surface Tint** (`#EEF2FF` / Indigo 50) — Subtle background for active navigation items, count badges, and focus indicators.
- **Status Indicators (Functional Only):**
  - **Success Emerald** (`#10B981` / Emerald 500) — Completed downloads and online adapters.
  - **Warning Amber** (`#F59E0B` / Amber 500) — Queued tasks and favorite stars (`#FBBF24`).
  - **Danger Rose** (`#F43F5E` / Rose 500) — Failed downloads and permanent delete actions.

---

## 3. Typography Rules
- **Display & Headings:** `Outfit` or `Geist Sans` (Weight: 700 to 900) — Track-tight (`letter-spacing: -0.03em`), proportional scale, authoritative and clean.
- **Body & Controls:** `Geist Sans` or `Satoshi` (Weight: 500 to 600) — High legibility, relaxed line-height, strictly structured hierarchy.
- **Data & Monospace:** `JetBrains Mono` or `Geist Mono` (Weight: 600 to 700) — Used for download counts, timestamps, file sizes, URL indicators, and status badges.
- **Banned:** `Inter` (overused/generic), `Times New Roman`, generic serifs, all emojis in core labels.

---

## 4. Component Stylings & Specifications

### 4.1 Studio URL Input & Ingestion Command Bar
- **Container:** High-elevation pill/squircle (`rounded-2xl` / 16px radius), pure white background, 1px slate-200 border with soft diffuse elevation shadow.
- **Input Field:** Borderless inside the container, clear placeholder (`Paste Instagram, TikTok, X, Threads, YouTube, Pinterest URL...`).
- **Platform Auto-Detection Pill:** Dynamically shows detected platform icon and label inside the input bar with smooth state change.
- **Action Triggers:** 
  - Clipboard `Paste` button (Slate-100 pill).
  - High-contrast `Download` button in solid Indigo-600 with tactile active click state (`active:scale-95`).

### 4.2 Gallery & Vault Media Cards
- **Geometry:** 18px squircle radius (`rounded-[18px]`), crisp 1px `#E2E8F0` border, `bg-white`.
- **Canvas Aspect:** Support for both 4:5 Uniform Portrait Grid and Native Masonry layout.
- **Thumbnail Viewport:** Deep slate background (`#020617`), solid media rendering, zero heavy `backdrop-blur` layers inside the card to maintain 60fps scrolling.
- **Hover Micro-Interactions:** 
  - Card elevation shadow transition (`hover:shadow-md`).
  - Solid white floating action pill overlay (Copy link, direct file download, star favorite).
  - Multi-select checkbox squircle on top-left corner.
- **Footer Strip:** Author username link (`@username`), platform badge, and capture date in mono font.

### 4.3 Floating Batch Action Dock
- **Position:** Fixed bottom center (`bottom-6`), isolated GPU layer.
- **Styling:** Solid pure white surface (`#FFFFFF`), crisp indigo-100 border, soft elevation shadow (`shadow-xl`), 20px rounded capsule.
- **Actions:** Deselect All, Add to Album (Folder+), Star Favorites, Download ZIP backup, Export CSV, and Permanent Delete.

### 4.4 Top Navigation Bar
- **Position:** Sticky top-0, solid `#FFFFFF` surface with crisp bottom border `#E2E8F0`.
- **Navigation Segment:** Symmetrical segmented control (Studio, Vault) with clean high-contrast active indicator.
- **Status Chips:** Symmetrical squircle health status chip (Online / Active Queue count) and Sync Refresh button.

---

## 5. Layout Architecture & Responsive Rules
- **Studio Home Layout:**
  1. Top App Header with Service Health & Route Navigation.
  2. Hero Ingestion Section: Command Input + Quick Import Archive Trigger.
  3. Active Ingestion Pipeline & Job Queue Stream (Filtered by All, Active, Done, Failed).
  4. Recent Downloads Strip: Mini carousel of the latest 8 archived items.
- **Vault Archive Layout:**
  1. Sub-Navigation Tabs: All Media, Creators Hub, Albums, Starred Favorites.
  2. Filter Toolbar: Full-text Search, Layout Mode Switcher (Grid vs Masonry), Sort Dropdown.
  3. Slide-over Filter Drawer: Multi-platform filter pills with live item count per network.
  4. Responsive Grid: 2 columns on mobile, 3 on tablet, 4 on desktop, 5 on wide screens (`grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5`).

---

## 6. Anti-Patterns (Banned in Stitch Prompts & Code)
- **NO** emojis as decorative or navigation icons (use clean monochrome SVG line icons).
- **NO** neon glow / cyberpunk gradients / AI purple-blue saturated buttons.
- **NO** pure black (`#000000`) surfaces.
- **NO** heavy `backdrop-blur` on scrollable containers or repetitive grid cards (prevents browser repaint flicker).
- **NO** generic 3-column equal feature card marketing templates.
- **NO** generic placeholder names or broken mock asset URLs.

---

## 7. Google Stitch Screen Prompts (Ready-to-Use Blueprints)

### Prompt 1: Studio Ingestion & Downloader Screen
```text
Screen for a personal self-hosted social media archiver named MediaVault. 
Theme: Minimalist modern editorial pro-tool in clean white (#FFFFFF) and slate-50 (#F8FAFC) with indigo-600 (#4F46E5) primary accents.
Top: Symmetrical header with logo squircle icon, segmented navigation (Studio / Vault), and online status indicator.
Center Hero: Wide rounded command search bar with live platform detection badge (Instagram, TikTok, YouTube, X, Threads), clipboard paste button, and high-contrast "Download" button.
Below Hero: Active download progress pipeline cards with platform tag, animated progress bar, status pill (Queued, Running, Done), and action buttons.
Bottom: "Recent Archives" horizontal gallery strip with media preview thumbnails and creator badges.
Typography: Outfit / Geist Sans with JetBrains Mono numbers. No emojis, no neon glow, clean 1px slate-200 borders.
```

### Prompt 2: Media Vault Gallery & Collection Screen
```text
Screen for the Media Vault archive gallery of MediaVault.
Top: Filter toolbar with search input ("Search captions, @users..."), Layout mode toggle (4:5 Portrait Grid vs Native Masonry), and Sort selector (Newest, Oldest, Favorites).
Left / Drawer: Multi-select platform filter tags with item counts (Instagram: 42, TikTok: 18, YouTube: 12, etc.).
Main Content: 5-column responsive media gallery grouped by date ("Today", "Yesterday", "August 2026"). Each card is a clean 18px rounded white container with high-res photo/video thumbnail, platform tag, author @username, and multi-select checkbox.
Bottom: Floating batch action bar capsule with actions for "Add to Album", "Export ZIP", "Favorite", and "Delete".
Style: Tactile soft UI, slate-50 canvas, pure white cards, crisp slate-200 borders, indigo-600 accents. Clean professional look.
```

### Prompt 3: Creators Hub & Profiles Screen
```text
Screen for the Creators Hub directory in MediaVault.
Layout: Grid of creator profile cards showing user avatar squircle, @username, total archived items count, badges for active platforms (Instagram, TikTok, X), and a 3-thumbnail preview strip of their most recent posts.
Header: "Creators Hub" title with total authors count, search bar for authors, and sorting by most archived media.
Clean, elevated white cards with subtle hover depth on slate-50 background. No neon colors, strictly professional photography portfolio aesthetic.
```
