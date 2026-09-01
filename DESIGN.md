---
name: MediaVault
description: Private mission control for personal media archiving
colors:
  accent-emerald: "#10b981"
  accent-emerald-light: "#6ee7b7"
  canvas-navy: "#071221"
  canvas-deep: "#020704"
  surface-slate: "#0f172a"
  surface-deep: "#020617"
  text-primary: "#ffffff"
  text-secondary: "#94a3b8"
  border-subtle: "rgba(255,255,255,0.08)"
typography:
  display:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(2.5rem, 7vw, 4.5rem)"
    fontWeight: 900
    lineHeight: 1
  headline:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "clamp(1.5rem, 3vw, 2.25rem)"
    fontWeight: 800
    lineHeight: 1.1
  title:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "1rem"
    fontWeight: 700
    lineHeight: 1.25
  body:
    fontFamily: "ui-sans-serif, system-ui, sans-serif"
    fontSize: "0.875rem"
    fontWeight: 400
    lineHeight: 1.5
  label:
    fontFamily: "ui-monospace, SFMono-Regular, monospace"
    fontSize: "0.6875rem"
    fontWeight: 700
    letterSpacing: "0.08em"
rounded:
  sm: "0.5rem"
  md: "0.75rem"
  lg: "1rem"
  xl: "1.5rem"
  pill: "9999px"
spacing:
  xs: "0.5rem"
  sm: "0.75rem"
  md: "1rem"
  lg: "1.5rem"
  xl: "2rem"
components:
  button-primary:
    backgroundColor: "{colors.accent-emerald}"
    textColor: "{colors.canvas-deep}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  button-ghost:
    backgroundColor: "transparent"
    textColor: "{colors.text-secondary}"
    rounded: "{rounded.md}"
    padding: "0.75rem 1rem"
  surface-card:
    backgroundColor: "{colors.surface-slate}"
    textColor: "{colors.text-primary}"
    rounded: "{rounded-xl}"
    padding: "1.5rem"
---

# Design System: MediaVault

## Overview

**Creative North Star: "Private Mission Control"**

MediaVault should feel like a private operations room for a personal archive: calm under a heavy queue, precise around sensitive credentials, and visually confident without pretending to be a public social platform. Premium technical character comes from disciplined hierarchy, dense but readable data surfaces, and restrained emerald signal color.

The system uses layered glass over deep navy/slate canvases. Studio, Vault, Settings, and the operational Console share one shell language; Console may intensify its Matrix treatment inside its content region, never across shared navigation. The interface prioritizes task completion, state visibility, and trustworthy feedback.

**Key Characteristics:**
- Dark navy control-room canvas with emerald operational signals.
- Layered glass surfaces, subtle borders, controlled blur.
- High-density media and job information with generous grouping rhythm.
- Monospace labels for IDs, statuses, metrics, and technical events.
- Responsive shell: collapsible desktop rail, mobile drawer, content-first layouts.

## Colors

The palette is restrained: deep navy establishes privacy, slate separates working surfaces, and emerald communicates action/health. Red and amber remain semantic states, not decorative brand colors.

### Primary
- **Operational Emerald** (`#10b981`): primary actions, online state, selected controls, progress, and success.
- **Emerald Light** (`#6ee7b7`): highlighted labels, links, and active signal accents.

### Neutral
- **Private Navy** (`#071221`): global Studio and dashboard canvas.
- **Deep Console** (`#020704`): Matrix Console content canvas.
- **Slate Surface** (`#0f172a`): cards, navigation, drawers, and raised working surfaces.
- **Deep Surface** (`#020617`): inset media areas and dense controls.
- **Primary White** (`#ffffff`): headings, critical metadata, and active text.
- **Muted Slate** (`#94a3b8`): supporting copy, inactive navigation, and secondary metadata.
- **Subtle Border** (`rgba(255,255,255,0.08)`): component boundaries and dividers.

### Named Rules

**The Signal Economy Rule.** Emerald marks action or system state. Do not spread it across decorative text or every border.

**The Private Canvas Rule.** Never use a light marketing canvas for authenticated archive surfaces.

## Typography

**Display Font:** system sans (`ui-sans-serif, system-ui, sans-serif`) with platform fallbacks.  
**Body Font:** system sans (`ui-sans-serif, system-ui, sans-serif`).  
**Label/Mono Font:** system monospace (`ui-monospace, SFMono-Regular, monospace`).

**Character:** The sans face stays immediate and utilitarian for scanning. Monospace appears where precision matters: console events, platform labels, timestamps, IDs, counters, and technical statuses.

### Hierarchy

- **Display** (900, `clamp(2.5rem, 7vw, 4.5rem)`, 1): Studio/Settings hero titles only; use sparingly.
- **Headline** (800, `clamp(1.5rem, 3vw, 2.25rem)`, 1.1): primary page and section headings.
- **Title** (700, `1rem`, 1.25): cards, panels, and navigation groups.
- **Body** (400, `0.875rem`, 1.5): descriptions and operational guidance.
- **Label** (700, `0.6875rem`, 0.08em): uppercase status, source, platform, and metric labels.

### Named Rules

**The Scan First Rule.** Heading, state, action, then detail. Never use typography as decoration that hides operational status.

## Layout

Studio uses a centered responsive container up to approximately `1440px`, with `px-4`, `sm:px-6`, and `md:px-8` gutters. Dashboard pages reserve a left rail of `256px` expanded or `72px` collapsed on desktop; content occupies the remaining width. On mobile, the rail becomes an overlay drawer and content returns to full width.

Use grid layouts for media and metric surfaces, with denser columns at larger widths and no horizontal scrolling for core actions. Group sections with `1.5rem`–`2rem` vertical rhythm. Console toolbars may remain sticky inside their content panel. Keep primary actions visible without forcing users to search the sidebar.

## Elevation & Depth

Layered glass is the depth model: deep canvas, translucent slate surface, subtle white border, backdrop blur, then restrained shadow for drawers, modals, and active elevation. Depth communicates containment and state, not ornament. Console Matrix texture remains low-opacity and behind content.

### Shadow Vocabulary

- **Working surface:** `shadow-sm` or `shadow-md`; distinguish cards from canvas without floating every element.
- **Modal/drawer:** `shadow-2xl`; establish focus and separation from the application.
- **Active action:** emerald-tinted shadow only when it reinforces selected/progress state.

### Named Rules

**The Layered Restraint Rule.** One surface should not combine heavy border glow, heavy shadow, and opaque blur. Choose tonal separation first.

## Shapes

Use rounded silhouettes consistently: `0.5rem` for compact controls, `0.75rem` for inputs and buttons, `1rem` for panels, and `1.5rem` for hero/card shells. Pills belong to status chips, compact counts, and active navigation—not large content containers. Media canvases clip at their parent radius. Focus rings must remain visible against dark surfaces.

## Components

### Buttons

- **Shape:** rounded compact control, typically `0.75rem`; pills reserved for compact action bars.
- **Primary:** emerald fill with dark text; clear padding and strong weight.
- **Hover / Focus:** brighten or shift surface, preserve visible focus ring, use short transitions.
- **Secondary / Ghost:** slate/glass surface with muted text; emerald appears on hover or active state.

### Chips

- **Style:** subtle slate/semantic background, thin border, compact monospace label.
- **State:** selected uses white or emerald contrast; unselected remains muted. Status color communicates meaning.

### Cards / Containers

- **Corner Style:** `1rem` standard, `1.5rem` for major shells.
- **Surface:** translucent slate over navy; border `rgba(255,255,255,0.08)`.
- **Media:** thumbnail-first, lazy-loaded, intrinsic dimensions; original video only in lightbox.
- **Information:** author/platform/status visible before secondary caption details.

### Navigation

- **Studio:** existing top Navbar remains standalone.
- **Dashboard:** collapsible left rail for Vault, Console, Settings; active item uses high-contrast white surface.
- **Mobile:** drawer with backdrop, Escape close, focus entry/return, and body scroll lock.

### Console

- **Character:** Matrix terminal treatment contained within the content surface.
- **Events:** severity, source, code, timestamp, message, and expandable technical data.
- **Motion:** subtle background drift; disabled under reduced-motion preference.

### Forms and States

- **Inputs:** deep surface, subtle border, emerald focus treatment, readable labels.
- **Loading:** explicit `Connecting`/loading state; never rely on color alone.
- **Error:** semantic red plus human-readable action; technical details expandable.
- **Empty:** explain what action creates content and provide a direct next step.

## Do's and Don'ts

### Do

- Keep sensitive operational state visible and legible.
- Use emerald as a controlled signal.
- Preserve the Studio visual language across dashboard surfaces.
- Use thumbnails for media grids and defer expensive playback.
- Keep keyboard focus, reduced motion, and mobile drawer behavior intact.
- Pair technical error codes with human-readable remediation.

### Don't

- Do not expose credentials, tokens, cookies, or session contents in UI or logs.
- Do not load many `<video>` elements in a gallery grid.
- Do not use Matrix effects behind primary controls or readable content.
- Do not make every surface glow; hierarchy needs quiet areas.
- Do not hide status, retry, or authentication failures behind silent spinners.
- Do not introduce a separate visual language per route without explicit product approval.
