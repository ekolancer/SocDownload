# Design System: savefromins.com

> Extracted 2026-08-20

---

## 1. Design Language Overview

**Vibe:** vibrant · rounded · Dark theme
**Built with:** shadcn/ui

**Design rhythm:** 4px grid · pill buttons · very rounded · generous line-height (1.6) · flat (no shadows)

## 2. Color System

| Role     | Hex      | Usage |
|----------|----------|-------|
| Primary  | `#743CF3` | CTAs, primary actions, links |
| Accent   | `#9063F5` | Highlights, success states, decorative |
| Surface  | `#000000` | Main page background |
| Elevated | `#FFFFFF` | Cards, raised containers |
| Text     | `#E5E7EB` | Body and heading text |
| Muted    | `#666666` | Secondary text, captions |
| Border   | `#E5E5E5` | Dividers, borders |

## 3. Typography

- **H1** — Arial 50px / weight 700, line-height 1.5
- **H2** — Arial 44px / weight 700, line-height 1.2
- **H3** — Arial 36px / weight 700, line-height 1.18
- **Body** — Arial 16px / weight 400, line-height 1.5
- **Scale:** 36px / 24px / 16px

## 4. Spacing & Layout

- **Spacing scale:** 8,12,16,20,24,28,32,36,40,60
- **Border radius:** pill buttons, 18px cards
- **Radius vocabulary:** button → pill, card → 18px

## 5. Effects

### Gradients
- `#76B4FF,#FF11F2,#FF9F7A`

## 6. Component Specs

### Button
- #743CF3 bg
- #FFFFFF text
- 9999px radius
- 700 weight

### Card
- #FFFFFF bg
- 1px solid #F3F4F6
- 18px radius
- 28px 36px padding

### Input
- default input

### Link
- #2F294B

## 7. Implementation Rules

**DO:**
- Use `#743CF3` for all primary CTAs and interactive accents
- Reserve `#9063F5` for accent moments — don't overuse
- Stick to the spacing scale (8,12,16,20,24,28,32,36,40,60) — don't introduce arbitrary values
- Match the radius vocabulary: pill buttons, 18px cards
- Pair Arial 700 headings with Arial 16px 400, 1.6 line-height
- Honour the visual hierarchy: bold colour on primary actions, muted tones on secondary

**DON'T:**
- Copy this design verbatim — use the tokens as a system to build something original
- Mix in colours outside this palette (especially competing primary colours)
- Break the radius scale by introducing one-off values
- Use the same shadow tier for everything — match elevation to importance

---

*Source: savefromins.com · 2026-08-20*
*Do not copy the design. Use these tokens to build similar UI with the same feel.*