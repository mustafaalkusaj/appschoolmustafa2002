<!-- Generated: 2026-04-08 (v2) — Phase 2: Figma Production Preparation -->
# Figma First Build Kit

## Quick Start
1. Create Figma file with 5 pages (see File Setup below)
2. Set up Essential Variables first (colors, spacing, radii)
3. Create Essential Text Styles (6-8 core styles)
4. Build First 5 Components (Button, Input, Card, StatsCard, ConfirmDialog)
5. Build Login screen as proof-of-concept

---

## 1. File Setup

Create new Figma file named **"School Admin Design System"**

Create pages in this order:
| # | Page Name | Purpose |
|---|-----------|---------|
| 01 | Cover | Title, description, team info |
| 02 | Foundations | Color primitives, typography scale |
| 03 | Tokens | Variables, styles, effects |
| 04 | Components | All reusable components |
| 05 | Screens | All screen frames |

---

## 2. Essential Variables (minimum to start)

### Color Variables (Semantic Collection with Light/Dark modes)

| Variable Name | Light Mode | Dark Mode |
|--------------|------------|-----------|
| color/background | #f4f7fc | #080e1a |
| color/foreground | #0f172a | #f1f5f9 |
| color/surface | rgba(255,255,255,0.85) | rgba(14,22,40,0.85) |
| color/surface-strong | #ffffff | #111827 |
| color/primary | #4f8cff | #76a9ff |
| color/primary-strong | #3e7df7 | #5e97ff |
| color/primary-soft | #eff6ff | rgba(118,169,255,0.12) |
| color/secondary | #79d7ff | #8ae7ff |
| color/text-primary | #0f172a | #f1f5f9 |
| color/text-secondary | #475569 | #94a3b8 |
| color/text-on-primary | #ffffff | #0f172a |
| color/border | rgba(15,23,42,0.07) | rgba(255,255,255,0.07) |
| color/border-strong | rgba(15,23,42,0.13) | rgba(255,255,255,0.12) |
| color/border-focus | #4f8cff | #76a9ff |
| color/success | #10b981 | #34d399 |
| color/warning | #f59e0b | #fbbf24 |
| color/danger | #ef4444 | #f87171 |
| color/info | #3b82f6 | #60a5fa |
| color/sidebar-bg | #ffffff | #0d1425 |
| color/topbar-bg | rgba(255,255,255,0.82) | rgba(10,16,30,0.88) |

### Primitives Collection (static values)

| Variable Name | Value |
|--------------|-------|
| primitive/primary-50 | #eff6ff |
| primitive/primary-100 | #dbeafe |
| primitive/primary-200 | #bfdbfe |
| primitive/primary-400 | #60a5fa |
| primitive/primary-500 | #4f8cff |
| primitive/primary-600 | #3e7df7 |
| primitive/primary-700 | #2563eb |
| primitive/cyan-400 | #79d7ff |
| primitive/cyan-500 | #38bdf8 |

### Spacing Variables

| Name | Value |
|------|-------|
| spacing/0 | 0px |
| spacing/4 | 4px |
| spacing/8 | 8px |
| spacing/12 | 12px |
| spacing/16 | 16px |
| spacing/20 | 20px |
| spacing/24 | 24px |
| spacing/32 | 32px |
| spacing/40 | 40px |
| spacing/48 | 48px |
| spacing/64 | 64px |
| spacing/80 | 80px |

### Radius Variables

| Name | Value |
|------|-------|
| radius/xs | 6px |
| radius/sm | 10px |
| radius/md | 14px |
| radius/lg | 18px |
| radius/xl | 24px |
| radius/2xl | 32px |
| radius/full | 9999px |

### Layout Variables

| Name | Value |
|------|-------|
| layout/sidebar-width | 280px |
| layout/topbar-height | 64px |
| layout/glass-blur | 22px |

---

## 3. Essential Text Styles (minimum to start)

| Style Name | Font | Size | Weight | Line Height |
|-----------|------|------|--------|-------------|
| text/display-xl | Cairo/Inter | 56px | 900 | 1.1 |
| text/heading-xl | Cairo/Inter | 32px | 900 | 1.2 |
| text/heading-lg | Cairo/Inter | 24px | 900 | 1.25 |
| text/heading-md | Cairo/Inter | 20px | 800 | 1.3 |
| text/body-lg | Cairo/Inter | 16px | 500 | 1.7 |
| text/body-md | Cairo/Inter | 14px | 500 | 1.6 |
| text/body-sm | Cairo/Inter | 12px | 500 | 1.5 |
| text/label-md | Cairo/Inter | 12px | 800 | 1.35 |

---

## 4. First 5 Components to Build

### 1. Button
- **Figma name**: CMP / UI / Button
- **Anatomy**: Container (auto-layout) → Text label + optional icon
- **Variants needed**:
  - tone: primary, secondary, ghost, destructive
  - size: sm, md, lg
  - state: default, hover, focus, disabled, loading
- **Build time**: ~30 min
- **Key specs**: min-height 52px, radius 16px, font-weight 800

### 2. Input
- **Figma name**: CMP / UI / Input
- **Anatomy**: Container → Label (optional) + Input field + Helper text (optional) + Error message (optional)
- **Variants needed**:
  - state: default, hover, focus, error, disabled
  - hasLeadingIcon: true/false
  - hasTrailingAction: true/false
- **Build time**: ~25 min
- **Key specs**: min-height 56px, radius 18px, padding 0.95rem 1rem

### 3. Card
- **Figma name**: CMP / UI / Card
- **Anatomy**: Container → Header (optional) + Content + Footer (optional)
- **Variants needed**:
  - type: default, withHeader, withFooter, withBoth
  - state: default, hover
- **Build time**: ~20 min
- **Key specs**: radius 24px, background color/surface, shadow-md

### 4. StatsCard
- **Figma name**: CMP / UI / StatsCard
- **Anatomy**: Container → Icon (left) + Text stack (label + value) + Trend indicator (optional)
- **Variants needed**:
  - tone: primary, info, success, warning, danger, neutral
  - hasTrend: true/false
  - state: default, hover
- **Build time**: ~25 min
- **Key specs**: hover lift effect (-translate-y-1), shadow increase on hover

### 5. ConfirmDialog
- **Figma name**: CMP / Feedback / ConfirmDialog
- **Anatomy**: Backdrop + Modal container → Icon + Title + Description (optional) + Action buttons
- **Variants needed**:
  - tone: danger, primary
  - hasDescription: true/false
  - state: default, busy
- **Build time**: ~30 min
- **Key specs**: max-width 420px, radius 28px, centered

---

## 5. First Screen to Build: Login

**Frame name**: SCR / Login / Default / Desktop / AR

### Frame Specs
- **Size**: 1440×900
- **Background**: color/background with radial gradient overlay
- **Direction**: RTL (Arabic)

### Layout Structure
Two-column split layout:
- **Left (60%)**: Hero section with illustration/copy
- **Right (40%)**: Glass card with login form

### Components Needed
1. BrandLockup (logo + school name)
2. Secure-platform pill badge
3. Heading "تسجيل الدخول"
4. Input (email)
5. Input (password with eye toggle)
6. Button (primary, submit)
7. Text link (forgot password)
8. ThemeModeToggle (inline)
9. LanguageToggle (inline)

### Quick Build Steps
1. Create 1440×900 frame
2. Apply background color + gradient
3. Add left hero section with brand lockup
4. Create glass card (right side):
   - Background: color/surface with blur
   - Border: color/border
   - Shadow: shadow-lg
   - Radius: radius-xl
5. Add form elements inside card
6. Apply auto-layout to card content
7. Test dark mode switch
8. Duplicate for LTR (EN) variant

---

## 6. Reference Files

| Task | Reference File |
|------|----------------|
| Set up all variables | design-tokens.json |
| Map tokens to Figma | figma-variable-mapping.md |
| Naming rules | figma-naming-convention.md |
| Component build order | component-inventory.csv |
| States for components | interaction-states.md |
| Screen construction | screen-blueprints.md |
| Full build sequence | rebuild-priority.md |

---

## Build Time Estimate

| Phase | Time |
|-------|------|
| File setup + variables | 45 min |
| Text styles | 15 min |
| First 5 components | ~2 hours |
| Login screen | 45 min |
| **Total to first screen** | **~4 hours** |

---

## Next Steps After Login

1. Build AppShell components (Sidebar, Topbar)
2. Build Dashboard screen
3. Build Students screen with tabs
4. Continue with remaining screens per rebuild-priority.md phases
