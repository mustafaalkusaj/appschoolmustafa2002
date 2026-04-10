<!-- Generated: 2026-04-08 (v2) — Phase 2: Figma Production Preparation -->
# Figma Execution Plan

## Implementation Sequence Overview

| Phase | Name | Duration | Deliverables | Dependencies |
|-------|------|----------|--------------|--------------|
| 1 | Foundations | 3-4 days | Variables, tokens, primitives, shell components | None |
| 2 | Variables & Styles | 2-3 days | Variable collections, Text Styles, Color Styles, Effect Styles | Phase 1 |
| 3 | Core Components | 4-5 days | 16 priority components with all variants | Phase 1-2 |
| 4 | App Shell | 2 days | Sidebar + Topbar + Layout assembly | Phase 1-3 |
| 5 | Priority Screens | 5-6 days | Login, Dashboard, Students, Payments, Salaries | Phase 1-4 |

**Total Estimated Duration**: 16-20 days

---

## Phase 1: Foundations

### 1.1 Create Variable Collections

Create these Figma Variable collections in order:

| Collection Name | Type | Modes | Description |
|-----------------|------|-------|-------------|
| **Primitives** | Color | - | Raw brand palette colors |
| **Semantic** | Color | Light, Dark | Semantic color tokens |
| **Spacing** | Number | - | Spacing scale (0-80px) |
| **Radii** | Number | - | Border radius scale |
| **Layout** | Number | - | Dimensions (sidebar, topbar, z-index) |
| **Motion** | String | - | Animation timing tokens |

### 1.2 Populate Color Primitives

From `design-tokens.json` → **Primitives Collection**:

| Variable Name | Type | Value | Notes |
|---------------|------|-------|-------|
| `primitive/primary-50` | Color | #eff6ff | Lightest |
| `primitive/primary-100` | Color | #dbeafe | Very light |
| `primitive/primary-200` | Color | #bfdbfe | Light |
| `primitive/primary-400` | Color | #60a5fa | Medium |
| `primitive/primary-500` | Color | #4f8cff | **Primary brand** |
| `primitive/primary-600` | Color | #3e7df7 | Strong |
| `primitive/primary-700` | Color | #2563eb | Dark |
| `primitive/cyan-400` | Color | #79d7ff | Secondary |
| `primitive/cyan-500` | Color | #38bdf8 | Cyan medium |

### 1.3 Populate Spacing Scale

**Spacing Collection** (Number variables):

| Variable | Value (px) | CSS Equivalent |
|----------|------------|----------------|
| `spacing/0` | 0 | 0 |
| `spacing/4` | 4 | 0.25rem |
| `spacing/8` | 8 | 0.5rem |
| `spacing/12` | 12 | 0.75rem |
| `spacing/16` | 16 | 1rem |
| `spacing/20` | 20 | 1.25rem |
| `spacing/24` | 24 | 1.5rem |
| `spacing/32` | 32 | 2rem |
| `spacing/40` | 40 | 2.5rem |
| `spacing/48` | 48 | 3rem |
| `spacing/56` | 56 | 3.5rem |
| `spacing/64` | 64 | 4rem |
| `spacing/72` | 72 | 4.5rem |
| `spacing/80` | 80 | 5rem |

### 1.4 Populate Radii Scale

**Radii Collection** (Number variables):

| Variable | Value | Usage |
|----------|-------|-------|
| `radius/xs` | 6px | Small elements |
| `radius/sm` | 10px | Buttons, inputs |
| `radius/md` | 14px | Cards |
| `radius/lg` | 18px | Large cards |
| `radius/xl` | 24px | Modals |
| `radius/2xl` | 32px | Hero cards |
| `radius/full` | 9999px | Pills, circles |

**Aliases** (for reference):
- `radius-card` → 24px
- `radius-input` → 18px
- `radius-button` → 16px
- `radius-modal` → 28px
- `radius-pill` → 9999px

### 1.5 Create Effect Styles (Shadows)

Create these Effect Styles in Figma:

**Light Mode Shadows**:

| Style Name | Type | Value |
|------------|------|-------|
| `effect/shadow-xs` | Drop Shadow | 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04) |
| `effect/shadow-sm` | Drop Shadow | 0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04) |
| `effect/shadow-md` | Drop Shadow | 0 8px 24px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06) |
| `effect/shadow-lg` | Drop Shadow | 0 16px 48px rgba(15,23,42,0.12), 0 8px 16px rgba(15,23,42,0.08) |
| `effect/shadow-xl` | Drop Shadow | 0 24px 64px rgba(15,23,42,0.14), 0 12px 24px rgba(15,23,42,0.10) |
| `effect/shadow-primary` | Drop Shadow | 0 4px 16px rgba(79,140,255,0.28) |
| `effect/shadow-inset` | Inner Shadow | inset 0 1px 0 rgba(255,255,255,0.65) |

**Dark Mode Shadows**:

| Style Name | Type | Value |
|------------|------|-------|
| `effect/shadow-xs-dark` | Drop Shadow | 0 1px 3px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.20) |
| `effect/shadow-sm-dark` | Drop Shadow | 0 4px 12px rgba(0,0,0,0.32), 0 2px 4px rgba(0,0,0,0.20) |
| `effect/shadow-md-dark` | Drop Shadow | 0 8px 24px rgba(0,0,0,0.38), 0 4px 8px rgba(0,0,0,0.24) |
| `effect/shadow-lg-dark` | Drop Shadow | 0 16px 48px rgba(0,0,0,0.42), 0 8px 16px rgba(0,0,0,0.28) |
| `effect/shadow-xl-dark` | Drop Shadow | 0 24px 64px rgba(0,0,0,0.50), 0 12px 24px rgba(0,0,0,0.32) |
| `effect/shadow-primary-dark` | Drop Shadow | 0 4px 16px rgba(118,169,255,0.22) |
| `effect/shadow-inset-dark` | Inner Shadow | inset 0 1px 0 rgba(255,255,255,0.06) |

---

## Phase 2: Variables & Styles

### 2.1 Semantic Colors Collection

Create **Semantic** collection with Light/Dark modes:

| Variable | Light Value | Dark Value | Description |
|----------|-------------|------------|-------------|
| `color/background` | #f4f7fc | #080e1a | Page background |
| `color/background-subtle` | #eef2f9 | #0d1425 | Subtle backgrounds |
| `color/foreground` | #0f172a | #f1f5f9 | Primary text |
| `color/surface` | rgba(255,255,255,0.85) | rgba(14,22,40,0.85) | Card surfaces |
| `color/surface-strong` | #ffffff | #111827 | Elevated surfaces |
| `color/surface-muted` | rgba(255,255,255,0.58) | rgba(24,31,48,0.68) | Muted backgrounds |
| `color/surface-soft` | rgba(248,251,255,0.95) | rgba(14,22,40,0.95) | Soft backgrounds |
| `color/surface-hover` | rgba(79,140,255,0.05) | rgba(118,169,255,0.07) | Hover states |
| `color/surface-active` | rgba(79,140,255,0.10) | rgba(118,169,255,0.14) | Active states |
| `color/primary` | #4f8cff | #76a9ff | Primary brand |
| `color/primary-strong` | #3e7df7 | #5e97ff | Primary hover |
| `color/primary-soft` | #eff6ff | rgba(118,169,255,0.12) | Primary subtle |
| `color/secondary` | #79d7ff | #8ae7ff | Secondary accent |
| `color/text-primary` | #0f172a | #f1f5f9 | Main text |
| `color/text-secondary` | #475569 | #94a3b8 | Secondary text |
| `color/text-tertiary` | #94a3b8 | #64748b | Tertiary text |
| `color/text-on-primary` | #ffffff | #0f172a | Text on primary |
| `color/border` | rgba(15,23,42,0.07) | rgba(255,255,255,0.07) | Borders |
| `color/border-strong` | rgba(15,23,42,0.13) | rgba(255,255,255,0.12) | Strong borders |
| `color/border-focus` | #4f8cff | #76a9ff | Focus borders |
| `color/success` | #10b981 | #34d399 | Success state |
| `color/success-soft` | #ecfdf5 | rgba(16,185,129,0.12) | Success subtle |
| `color/warning` | #f59e0b | #fbbf24 | Warning state |
| `color/warning-soft` | #fffbeb | rgba(245,158,11,0.12) | Warning subtle |
| `color/danger` | #ef4444 | #f87171 | Error state |
| `color/danger-soft` | #fef2f2 | rgba(239,68,68,0.12) | Error subtle |
| `color/info` | #3b82f6 | #60a5fa | Info state |
| `color/info-soft` | #eff6ff | rgba(59,130,246,0.12) | Info subtle |
| `color/focus-ring` | rgba(79,140,255,0.30) | rgba(118,169,255,0.30) | Focus ring |

### 2.2 Shell-Specific Colors

| Variable | Light Value | Dark Value | Description |
|----------|-------------|------------|-------------|
| `color/topbar-bg` | rgba(255,255,255,0.82) | rgba(10,16,30,0.88) | Topbar background |
| `color/sidebar-bg` | #ffffff | #0d1425 | Sidebar background |
| `color/sidebar-border` | rgba(15,23,42,0.07) | rgba(255,255,255,0.07) | Sidebar border |
| `color/sidebar-item-hover` | rgba(79,140,255,0.07) | rgba(118,169,255,0.08) | Nav hover |
| `color/sidebar-item-active-text` | #ffffff | #08111f | Active nav text |
| `color/grid-line` | rgba(79,140,255,0.08) | rgba(138,231,255,0.07) | Grid lines |

**Note**: `color/sidebar-item-active-bg` is a gradient - create as Color Style:
- Light: `linear-gradient(135deg, rgba(79, 140, 255, 0.96), rgba(121, 215, 255, 0.96))`
- Dark: `linear-gradient(135deg, rgba(118, 169, 255, 0.96), rgba(138, 231, 255, 0.84))`

### 2.3 Text Styles

Create these Text Styles (Cairo for Arabic, Inter for Latin):

| Style Name | Font | Size | Weight | Line Height | Letter Spacing |
|------------|------|------|--------|-------------|----------------|
| `text/display-xl` | Cairo/Inter | 56px | 900 | 1.1 | - |
| `text/heading-xl` | Cairo/Inter | 32px | 900 | 1.2 | - |
| `text/heading-lg` | Cairo/Inter | 24px | 900 | 1.25 | - |
| `text/heading-md` | Cairo/Inter | 20px | 800 | 1.3 | - |
| `text/heading-sm` | Cairo/Inter | 18px | 800 | 1.35 | - |
| `text/body-lg` | Cairo/Inter | 16px | 500 | 1.7 | - |
| `text/body-md` | Cairo/Inter | 14px | 500 | 1.6 | - |
| `text/body-sm` | Cairo/Inter | 12px | 500 | 1.5 | - |
| `text/label-lg` | Cairo/Inter | 14px | 800 | 1.4 | - |
| `text/label-md` | Cairo/Inter | 12px | 800 | 1.35 | - |
| `text/label-sm` | Cairo/Inter | 11px | 800 | 1.3 | - |
| `text/overline` | Cairo/Inter | 10px | 900 | 1.2 | 0.15em |

### 2.4 Layout Collection

| Variable | Type | Value | Description |
|----------|------|-------|-------------|
| `layout/sidebar-width` | Number | 280px | Sidebar width |
| `layout/sidebar-width-collapsed` | Number | 64px | Collapsed sidebar |
| `layout/topbar-height` | Number | 64px | Topbar height |
| `layout/glass-blur` | Number | 22px | Backdrop blur |
| `layout/z-sidebar` | Number | 60 | Sidebar layer |
| `layout/z-topbar` | Number | 40 | Topbar layer |
| `layout/z-modal` | Number | 200 | Modal layer |
| `layout/z-toast` | Number | 300 | Toast layer |

### 2.5 Motion Collection

| Variable | Type | Value | Description |
|----------|------|-------|-------------|
| `motion/fast` | String | 120ms ease | Quick feedback |
| `motion/base` | String | 200ms ease | Standard |
| `motion/slow` | String | 320ms ease | Emphasis |
| `motion/spring` | String | 300ms cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy |

---

## Phase 3: Core Components

### Component: Button

**Source**: `components/ui/button.tsx`

**Figma Component Name**: `CMP / Primitives / Button`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover, focus, active, disabled |
| Variant | Variant | default, outline, secondary, ghost, destructive |
| Size | Variant | default, sm, lg |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[Button]
├── _Container (Auto Layout: Horizontal, gap: 8, padding: 12 16)
│   ├── icon-leading (Instance Swap, optional)
│   ├── label (Text, style: text/body-md)
│   └── icon-trailing (Instance Swap, optional)
```

**Auto Layout Settings**:
- Direction: Horizontal
- Gap: 8px
- Padding: 12px 16px (vertical horizontal)
- Alignment: Center, Center
- Resizing: Hug contents / Fill container (optional)

**Interaction States**:
| State | Visual Change |
|-------|--------------|
| default | bg: color/primary, text: color/text-on-primary |
| hover | bg: color/primary-strong, shadow: effect/shadow-sm |
| focus | 2px ring, color/focus-ring |
| active | scale: 0.98 |
| disabled | opacity: 0.50 |

**Size Specifications**:
| Size | Height | Padding | Font |
|------|--------|---------|------|
| sm | 36px | 8px 12px | text/body-sm |
| default | 40px | 12px 16px | text/body-md |
| lg | 44px | 16px 24px | text/body-md |

---

### Component: Input

**Source**: `components/ui/input.tsx`

**Figma Component Name**: `CMP / Primitives / Input`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover, focus, disabled, error, success |
| Size | Variant | default, sm |
| HasIcon | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[Input]
├── _Container (Auto Layout: Horizontal, gap: 12, padding: 16)
│   ├── icon-leading (Instance Swap, optional)
│   ├── input-text (Text, style: text/body-md)
│   └── icon-trailing (Instance Swap, optional - e.g., eye toggle)
```

**Auto Layout Settings**:
- Direction: Horizontal
- Gap: 12px
- Padding: 16px
- Alignment: Center, Space Between
- Resizing: Fill container (horizontal), Hug contents (vertical)
- Min Height: 56px (default), 48px (sm)

**Interaction States**:
| State | Visual Change |
|-------|--------------|
| default | bg: color/surface, border: 1px color/border |
| hover | border: color/border-strong |
| focus | border: color/border-focus, ring: 4px color/focus-ring |
| disabled | opacity: 0.50, cursor: not-allowed |
| error | border: color/danger, icon: AlertCircle |
| success | border: color/success, icon: CheckCircle |

---

### Component: Card

**Source**: `components/ui/card.tsx`

**Figma Component Name**: `CMP / Data Display / Card`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover |
| Theme | Variant | light, dark |
| HasHeader | Boolean | true, false |
| HasFooter | Boolean | true, false |

**Nested Layer Structure**:
```
[Card]
├── Card (Frame, radius: radius/xl, fill: color/surface)
│   ├── CardHeader (Auto Layout, optional)
│   │   ├── icon (Instance Swap, optional)
│   │   ├── title (Text, style: text/heading-sm)
│   │   └── action (Instance Swap, optional)
│   ├── CardContent (Auto Layout)
│   │   └── [slot content]
│   └── CardFooter (Auto Layout, optional)
│       └── [action buttons]
```

**Auto Layout Settings**:
- Direction: Vertical
- Gap: 0px
- Padding: 0px (children handle padding)
- Alignment: Stretch
- Resizing: Fill container

**Card Parts**:
| Part | Padding | Notes |
|------|---------|-------|
| CardHeader | 20px 24px | Border bottom: color/border |
| CardContent | 24px | Main content area |
| CardFooter | 20px 24px | Border top: color/border |

**Interaction States**:
| State | Visual Change |
|-------|--------------|
| default | bg: color/surface, shadow: effect/shadow-sm |
| hover | translateY: -4px, shadow: effect/shadow-md |

---

### Component: StatsCard

**Source**: `components/ui/stats-card.tsx`

**Figma Component Name**: `CMP / Data Display / StatsCard`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover |
| Tone | Variant | primary, info, success, warning, danger, neutral |
| HasTrend | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[StatsCard]
├── _Container (Auto Layout: Vertical, gap: 16, padding: 20)
│   ├── _Header (Auto Layout: Horizontal)
│   │   ├── icon-container (Frame, 48x48, radius: radius/lg)
│   │   │   └── icon (Instance Swap)
│   │   └── trend-badge (Auto Layout, optional)
│   │       ├── trend-icon (Instance Swap)
│   │       └── trend-value (Text)
│   ├── _Content (Auto Layout: Vertical, gap: 4)
│   │   ├── value (Text, style: text/heading-xl)
│   │   └── label (Text, style: text/body-sm)
│   └── _Footer (optional)
│       └── comparison-text (Text, style: text/body-sm)
```

**Auto Layout Settings**:
- Direction: Vertical
- Gap: 16px
- Padding: 20px
- Alignment: Stretch
- Resizing: Fill container

**Tone Color Mapping**:
| Tone | Icon BG | Icon Color |
|------|---------|------------|
| primary | color/primary-soft | color/primary |
| info | color/info-soft | color/info |
| success | color/success-soft | color/success |
| warning | color/warning-soft | color/warning |
| danger | color/danger-soft | color/danger |
| neutral | color/surface-muted | color/text-secondary |

**Interaction States**:
| State | Visual Change |
|-------|--------------|
| default | bg: color/surface, shadow: effect/shadow-sm |
| hover | translateY: -4px, shadow: effect/shadow-md |

---

### Component: AppSidebar

**Source**: `components/AppSidebar.tsx`

**Figma Component Name**: `CMP / Shell / Sidebar`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover, active, selected |
| Viewport | Variant | desktop, tablet, mobile |
| HasScopeSelector | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[AppSidebar]
├── _Container (Frame, width: 280px, fill: color/sidebar-bg)
│   ├── _Header (Auto Layout: Horizontal, padding: 16)
│   │   └── BrandLockup
│   ├── _NavGroups (Auto Layout: Vertical)
│   │   └── NavGroup (repeating)
│   │       ├── group-label (Text, style: text/label-sm)
│   │       └── NavItems (Auto Layout: Vertical)
│   │           └── NavItem (Auto Layout: Horizontal)
│   │               ├── icon (Instance Swap, 20x20)
│   │               └── label (Text, style: text/body-md)
│   ├── _ScopeSelector (Auto Layout, optional)
│   │   ├── label (Text)
│   │   └── dropdown (Input)
│   ├── _Footer (Auto Layout)
│   │   ├── PingIndicator
│   │   └── ProfileMenu
│   └── _MobileToggle (Button, tablet/mobile only)
```

**Auto Layout Settings**:
- Direction: Vertical
- Gap: 8px (nav items), 24px (sections)
- Padding: 16px
- Alignment: Stretch
- Resizing: Fixed width (280px), Hug contents (height)

**NavItem States**:
| State | Visual Change |
|-------|--------------|
| default | bg: transparent, text: color/text-secondary |
| hover | bg: color/sidebar-item-hover |
| active | bg: gradient, text: color/sidebar-item-active-text |
| selected | bg: color/surface-active |

---

### Component: AppShellTopbar

**Source**: `components/AppShellTopbar.tsx`

**Figma Component Name**: `CMP / Shell / Topbar`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, menu-open |
| Position | Variant | fixed, sticky |
| HasSubtitle | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[AppShellTopbar]
├── _Container (Frame, height: 64px, fill: color/topbar-bg)
│   ├── _Left (Auto Layout: Horizontal)
│   │   ├── menu-toggle (Button, tablet/mobile only)
│   │   ├── eyebrow (Text, style: text/overline)
│   │   └── title (Text, style: text/heading-sm)
│   ├── _Center (Auto Layout)
│   │   └── academic-year-pill (Badge)
│   └── _Right (Auto Layout: Horizontal)
│       ├── actions (Instance Swap, optional)
│       ├── PingIndicator
│       └── ProfileMenu
```

**Auto Layout Settings**:
- Direction: Horizontal
- Gap: 16px
- Padding: 12px 24px
- Alignment: Center, Space Between
- Resizing: Fill container (horizontal), Fixed (64px height)

---

### Component: ProfileMenu

**Source**: `components/ProfileMenu.tsx`

**Figma Component Name**: `CMP / Shell / ProfileMenu`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, hover, open |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[ProfileMenu]
├── _Trigger (Auto Layout: Horizontal, gap: 12)
│   ├── avatar (Frame, 38x38, radius: radius-full)
│   │   └── [image or initials]
│   ├── _Info (Auto Layout: Vertical)
│   │   ├── name (Text, style: text/body-sm)
│   │   └── role (Text, style: text/label-sm)
│   └── chevron (Icon, ChevronDown)
└── _Panel (Frame, width: 288px, positioned below trigger)
    ├── _UserHeader (Auto Layout)
    │   ├── avatar-large (48x48)
    │   ├── name (Text, style: text/body-md)
    │   └── email (Text, style: text/body-sm)
    ├── _Divider (Line)
    ├── _ThemeSection (Auto Layout)
    │   ├── label (Text)
    │   └── ThemeModeToggle
    ├── _LanguageSection (Auto Layout)
    │   ├── label (Text)
    │   └── LanguageToggle
    ├── _Divider (Line)
    └── _Logout (Button, destructive)
```

**Panel Auto Layout**:
- Direction: Vertical
- Gap: 8px
- Padding: 16px
- Fill: color/surface-strong
- Shadow: effect/shadow-lg
- Radius: radius/lg

---

### Component: ConfirmDialog

**Source**: `components/ConfirmDialog.tsx`

**Figma Component Name**: `CMP / Overlays / ConfirmDialog`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, busy |
| Tone | Variant | danger, primary |
| HasDescription | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[ConfirmDialog]
├── _Backdrop (Frame, fill: rgba(0,0,0,0.5))
└── _Modal (Frame, max-width: 420px, center)
    ├── _Header (Auto Layout: Horizontal)
    │   ├── icon (Instance Swap, alert icon)
    │   └── title (Text, style: text/heading-sm)
    ├── _Description (Text, style: text/body-md, optional)
    ├── _Content [slot]
    └── _Actions (Auto Layout: Horizontal)
        ├── cancel-button (Button, secondary)
        └── confirm-button (Button, tone-matched)
```

**Modal Auto Layout**:
- Direction: Vertical
- Gap: 20px
- Padding: 24px
- Fill: color/surface-strong
- Shadow: effect/shadow-xl
- Radius: radius/xl

**Tone Specifications**:
| Tone | Icon | Confirm Button |
|------|------|----------------|
| danger | AlertTriangle, color/danger | destructive variant |
| primary | HelpCircle, color/info | primary variant |

---

### Component: Toast

**Source**: `components/toast.tsx`

**Figma Component Name**: `CMP / Feedback / Toast`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| Type | Variant | success, error, warning, info |
| State | Variant | default, dismissing |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[Toast]
├── _Container (Auto Layout: Horizontal, gap: 12)
│   ├── icon (Instance Swap, type-matched)
│   ├── _Content (Auto Layout: Vertical)
│   │   ├── title (Text, style: text/body-md)
│   │   └── description (Text, style: text/body-sm, optional)
│   └── close-button (Button, ghost, X icon)
└── _Progress (Frame, height: 3px, bottom)
```

**Auto Layout Settings**:
- Direction: Horizontal
- Gap: 12px
- Padding: 16px
- Min Width: 280px, Max Width: 360px
- Fill: color/surface-strong
- Shadow: effect/shadow-lg
- Radius: radius/md

**Type Color Mapping**:
| Type | Icon | Border Left |
|------|------|-------------|
| success | CheckCircle2, color/success | 3px color/success |
| error | XCircle, color/danger | 3px color/danger |
| warning | AlertTriangle, color/warning | 3px color/warning |
| info | Info, color/info | 3px color/info |

---

### Component: Skeleton

**Source**: `components/skeleton.tsx`

**Figma Component Name**: `CMP / Feedback / Skeleton`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| Type | Variant | box, stat-card, table, analysis, student-card, dashboard, page |
| Theme | Variant | light, dark |

**Skeleton Types**:

| Type | Description | Structure |
|------|-------------|-----------|
| SkBox | Generic placeholder | Rectangle with shimmer |
| StatCardSkeleton | Stats card placeholder | Icon circle + 2 text lines |
| TableSkeleton | Table placeholder | Header row + 5 data rows |
| AnalysisSkeleton | Charts placeholder | 2 chart areas + text |
| StudentCardSkeleton | Mobile card placeholder | Avatar + 3 text lines |
| DashboardSkeleton | Full dashboard | Grid of stat cards + panels |
| StudentsPageSkeleton | Students page | Tabs + toolbar + table |
| PaymentsPageSkeleton | Payments page | Stats + filters + table |

**Visual Specifications**:
- Fill: color/surface-muted
- Shimmer animation: gradient sweep
- Border radius: matches content type

---

### Component: DataTableShell

**Source**: `components/school/DataTableShell.tsx`

**Figma Component Name**: `CMP / Data Display / DataTableShell`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | loading, error, empty, default, filtered |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[DataTableShell]
├── _LoadingState
│   └── TableSkeleton
├── _ErrorState (Auto Layout: Vertical, center)
│   ├── error-icon (AlertTriangle)
│   ├── error-title (Text)
│   ├── error-message (Text)
│   └── retry-button (Button)
├── _EmptyState (Auto Layout: Vertical, center)
│   ├── empty-icon (Inbox)
│   ├── empty-title (Text)
│   └── empty-message (Text)
└── _DataState
    ├── _Toolbar [slot]
    ├── _Table [slot]
    └── _Pagination (ListPagination)
```

---

### Component: ListPagination

**Source**: `components/school/ListPagination.tsx`

**Figma Component Name**: `CMP / Navigation / Pagination`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, active, disabled |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[ListPagination]
├── _Container (Auto Layout: Horizontal, gap: 4)
│   ├── prev-button (Button, icon: ChevronLeft)
│   ├── page-numbers (Auto Layout: Horizontal, gap: 4)
│   │   ├── page-button (Button)
│   │   ├── gap-indicator (Text, "...")
│   │   └── ...
│   ├── next-button (Button, icon: ChevronRight)
│   └── info-text (Text, "Showing X of Y")
```

**Page Button States**:
| State | Visual |
|-------|--------|
| default | bg: transparent, text: color/text-secondary |
| active | bg: gradient, text: white, font-weight: 700 |
| disabled | opacity: 0.50 |

---

### Component: Breadcrumb

**Source**: `components/school/Breadcrumb.tsx`

**Figma Component Name**: `CMP / Navigation / Breadcrumb`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| State | Variant | default, current |
| Theme | Variant | light, dark |
| Direction | Variant | rtl, ltr |

**Nested Layer Structure**:
```
[Breadcrumb]
├── _Container (Auto Layout: Horizontal, gap: 8)
│   └── BreadcrumbItems (repeating)
│       ├── link (Text/Link, style: text/body-sm)
│       ├── separator (Icon, ChevronRight/ChevronLeft)
│       └── current (Text, style: text/body-sm, font-weight: 600)
```

**Auto Layout Settings**:
- Direction: Horizontal
- Gap: 8px
- Alignment: Center

**Visual Specifications**:
| Element | Style |
|---------|-------|
| Link | color: color/primary, hover: underline |
| Separator | color: color/text-tertiary |
| Current | color: color/text-primary, font-weight: 600 |

---

### Component: SchoolModuleLayout

**Source**: `components/school/SchoolModuleLayout.tsx`

**Figma Component Name**: `CMP / Layout / SchoolModuleLayout`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| HasBreadcrumb | Boolean | true, false |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[SchoolModuleLayout]
├── _Container (Frame, fill: color/background)
│   ├── _BreadcrumbSlot (optional)
│   ├── _Header (Auto Layout: Horizontal)
│   │   ├── _TitleGroup (Auto Layout: Vertical)
│   │   │   ├── title (Text, style: text/heading-lg)
│   │   │   └── subtitle (Text, style: text/body-md)
│   │   └── _Actions (Auto Layout: Horizontal)
│   └── _Content (Frame)
│       └── [slot content]
```

---

### Component: ThemeModeToggle

**Source**: `components/ThemeModeToggle.tsx`

**Figma Component Name**: `CMP / Controls / ThemeModeToggle`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| Variant | Variant | floating, inline |
| Compact | Boolean | true, false |
| ShowLabels | Boolean | true, false |
| Selected | Variant | system, light, dark |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[ThemeModeToggle]
├── _Container (Auto Layout: Horizontal, gap: 4)
│   ├── system-option (Button)
│   │   ├── icon (Monitor)
│   │   └── label (Text, optional)
│   ├── light-option (Button)
│   │   ├── icon (Sun)
│   │   └── label (Text, optional)
│   └── dark-option (Button)
│       ├── icon (Moon)
│       └── label (Text, optional)
```

**Option States**:
| State | Visual |
|-------|--------|
| unselected | bg: transparent, text: color/text-secondary |
| selected | bg: color/surface-active, text: color/primary |

---

### Component: LanguageToggle

**Source**: `components/LanguageToggle.tsx`

**Figma Component Name**: `CMP / Controls / LanguageToggle`

**Variant Properties**:
| Property | Type | Values |
|----------|------|--------|
| Compact | Boolean | true, false |
| Current | Variant | ar, en |
| Theme | Variant | light, dark |

**Nested Layer Structure**:
```
[LanguageToggle]
├── _Container (Button or Auto Layout)
│   ├── flag-icon (Frame, 16x16 or 20x20)
│   ├── language-code (Text, optional)
│   └── chevron (Icon, optional)
```

**Visual Specifications**:
| Mode | Display |
|------|---------|
| Compact | Flag icon only |
| Full | Flag + "AR"/"EN" + chevron |

---

## Phase 4: App Shell

### 4.1 Shell Architecture

The App Shell consists of three main regions:

```
┌─────────────────────────────────────────────────────────┐
│                      TOPBAR (64px)                      │
├──────────────────┬──────────────────────────────────────┤
│                  │                                      │
│   SIDEBAR        │         CONTENT AREA                 │
│   (280px)        │         (fill remaining)             │
│                  │                                      │
│                  │                                      │
└──────────────────┴──────────────────────────────────────┘
```

### 4.2 Desktop Variant (1440px+)

**Frame**: `FRA / Templates / App Shell Desktop`

| Element | Position | Dimensions | Behavior |
|---------|----------|------------|----------|
| Sidebar | Fixed left (LTR) / right (RTL) | 280px × 100vh | Always visible |
| Topbar | Fixed top | 100% × 64px | Offset by sidebar width |
| Content | Below topbar, beside sidebar | fill × fill | Scrollable |

**Auto Layout Structure**:
```
[App Shell Desktop]
├── Sidebar (Fixed, 280px)
└── Main Area
    ├── Topbar (Fixed, 64px)
    └── Content (Scrollable)
        └── [page content]
```

### 4.3 Tablet Variant (768px)

**Frame**: `FRA / Templates / App Shell Tablet`

| Element | Position | Dimensions | Behavior |
|---------|----------|------------|----------|
| Sidebar | Fixed, hidden by default | 280px × 100vh | Overlay when toggled |
| Topbar | Fixed top | 100% × 64px | Full width, hamburger visible |
| Content | Below topbar | 100% × fill | Scrollable |

**Auto Layout Structure**:
```
[App Shell Tablet]
├── Sidebar (Overlay, hidden)
├── Topbar (with menu toggle)
└── Content
    └── [page content]
```

### 4.4 Mobile Variant (390px)

**Frame**: `FRA / Templates / App Shell Mobile`

| Element | Position | Dimensions | Behavior |
|---------|----------|------------|----------|
| Sidebar | Fixed, slide-over | 82vw max × 100vh | Drawer when toggled |
| Topbar | Fixed top | 100% × 64px | Full width, hamburger visible |
| Content | Below topbar | 100% × fill | Scrollable |

### 4.5 RTL Variant

**Frame**: `FRA / Templates / App Shell RTL`

Mirror the LTR layout:
- Sidebar positioned on right
- Topbar title/actions mirrored
- Content flows RTL
- Navigation icons on right of labels

---

## Phase 5: Priority Screens

### Screen: Login

**Route**: `/[locale]/login`

**Frame List**:
| Frame Name | Size | Direction | Device |
|-----------|------|-----------|--------|
| SCR / Login / Default / Desktop / AR | 1440×900 | RTL | Desktop |
| SCR / Login / Default / Desktop / EN | 1440×900 | LTR | Desktop |
| SCR / Login / Default / Tablet / AR | 768×1024 | RTL | Tablet |
| SCR / Login / Default / Mobile / AR | 390×844 | RTL | Mobile |
| SCR / Login / Error / Desktop / AR | 1440×900 | RTL | Desktop |
| SCR / Login / Loading / Desktop / AR | 1440×900 | RTL | Desktop |
| SCR / Login / Dark / Desktop / AR | 1440×900 | RTL | Desktop |

**Child Components Used**:
- CMP / Brand / BrandLockup
- CMP / Primitives / Input (email, password with eye toggle)
- CMP / Primitives / Button (primary, lg)
- CMP / Controls / ThemeModeToggle
- CMP / Controls / LanguageToggle

**Layout Structure**:
```
[Login Desktop]
├── Hero Section (60% width, RTL: right)
│   └── [illustration/gradient background]
└── Form Section (40% width, RTL: left)
    └── Glass Card
        ├── BrandLockup
        ├── Secure Badge (pill)
        ├── Title ("تسجيل الدخول")
        ├── Email Input
        ├── Password Input
        ├── Submit Button
        ├── Forgot Password Link
        └── Footer (theme + language)
```

**Auto Layout**:
- Direction: Horizontal (desktop) / Vertical (tablet, mobile)
- Hero: Hidden on mobile
- Form Card: max-width 420px, centered
- Padding: 48px
- Gap: 24px between form fields

**RTL Notes**:
- Form fields: text-align right
- Labels: right-aligned above inputs
- Split layout: hero on right, form on left
- Font: Cairo 500

**Dark Mode Notes**:
- Background: #080e1a
- Surface: rgba(14, 22, 40, 0.85)
- Input borders: rgba(255, 255, 255, 0.07)
- Text: #f1f5f9

---

### Screen: Dashboard

**Route**: `/[locale]/dashboard`

**Frame List**:
| Frame Name | Size | Direction | Device |
|-----------|------|-----------|--------|
| SCR / Dashboard / Default / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Dashboard / Default / Desktop / EN | 1440×1200 | LTR | Desktop |
| SCR / Dashboard / Default / Tablet / AR | 768×1024 | RTL | Tablet |
| SCR / Dashboard / Default / Mobile / AR | 390×1200 | RTL | Mobile |
| SCR / Dashboard / Loading / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Dashboard / Empty / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Dashboard / Super Admin Scoped / Desktop / AR | 1440×1200 | RTL | Desktop |
| OVL / Dashboard / Classes Modal | 480×auto | RTL | Modal |
| OVL / Dashboard / Fee Modal | 720×auto | RTL | Modal |

**Child Components Used**:
- CMP / Shell / Sidebar
- CMP / Shell / Topbar
- CMP / Data Display / StatsCard (7 instances)
- CMP / Data Display / Card (panels)
- CMP / Feedback / Skeleton (loading state)
- CMP / Overlays / [Modal components]

**Layout Structure**:
```
[Dashboard]
├── App Shell
│   ├── Sidebar
│   └── Main
│       ├── Topbar
│       └── Content (Scrollable)
│           ├── SchoolScopeBanner (super_admin only)
│           ├── DashboardActions
│           ├── StatisticsCards (grid: 4 cols)
│           ├── FinancialAnalysisPanel
│           │   ├── Bar Chart
│           │   └── Donut Chart
│           ├── SchoolBrandingPanel (super_admin only)
│           ├── ActivityGrid (2 cols)
│           │   ├── RecentActivityPanel
│           │   └── NotificationsPanel
│           └── TablesRow (2 cols)
│               ├── ClassFeesTable
│               └── RecentPaymentsPanel
```

**Auto Layout**:
- Main grid: 24px gap
- Panels: 16px internal padding
- Stats grid: 16px gap
- Responsive: 4 cols → 2 cols → 1 col

**Key States**:
- **Loading**: DashboardSkeleton
- **Empty**: Empty state panels
- **Scoped**: SchoolScopeBanner visible
- **Modal Open**: ClassesModal or FeeModal overlay

---

### Screen: Students

**Route**: `/[locale]/students`

**Frame List**:
| Frame Name | Size | Direction | Device |
|-----------|------|-----------|--------|
| SCR / Students / Active Tab / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Students / Transferred Tab / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Students / Suspended Tab / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Students / Deleted Tab / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Students / Default / Desktop / EN | 1440×1200 | LTR | Desktop |
| SCR / Students / Default / Tablet / AR | 768×1024 | RTL | Tablet |
| SCR / Students / Default / Mobile / AR | 390×1200 | RTL | Mobile |
| SCR / Students / Loading / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Students / Empty / Desktop / AR | 1440×1200 | RTL | Desktop |
| OVL / Students / AddStudentModal | 600×700 | RTL | Modal |
| OVL / Students / EditStudentModal | 600×600 | RTL | Modal |
| OVL / Students / DeleteConfirmModal | 420×auto | RTL | Modal |
| OVL / Students / ImportExcelModal | 800×600 | RTL | Modal |
| OVL / Students / AccountCardModal | 400×auto | RTL | Modal |

**Child Components Used**:
- CMP / Shell / Sidebar
- CMP / Shell / Topbar
- CMP / Navigation / Tabs (StudentsTabs)
- CMP / Data Display / StatsCard (4 instances)
- CMP / Data Display / DataTableShell
- CMP / Navigation / Pagination
- CMP / Overlays / [Modal components]

**Layout Structure**:
```
[Students]
├── App Shell
│   ├── Sidebar
│   └── Main
│       ├── Topbar
│       └── Content
│           ├── StudentsTabs (Active, Transferred, Suspended, Deleted)
│           ├── StudentsStats (4 cards)
│           ├── StudentsToolbar
│           │   ├── Search Input
│           │   ├── Filters
│           │   └── Actions (export, import, print)
│           ├── DataTableShell
│           │   ├── StudentsTable (desktop)
│           │   └── StudentCards (mobile)
│           └── ListPagination
```

**Table Columns (Desktop)**:
| Column | Width | Notes |
|--------|-------|-------|
| # | 60px | Row number |
| Name | flex | Student name |
| Class/Section | 120px | Class badge |
| Phone | 120px | Student phone |
| Parent Phone | 120px | Parent phone |
| Status | 100px | Status badge |
| Fees | 120px | Fee amount |
| Actions | 80px | Dropdown menu |

**Mobile Card Layout**:
- Name (bold)
- Class (secondary)
- Status badge
- Quick action buttons

**Key States**:
- **Tab Switching**: Content updates per tab
- **Loading**: TableSkeleton
- **Empty**: Empty state with add button
- **Filtered**: Filter chips visible
- **Modal Open**: Various modals

---

### Screen: Payments

**Route**: `/[locale]/payments`

**Frame List**:
| Frame Name | Size | Direction | Device |
|-----------|------|-----------|--------|
| SCR / Payments / Default / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Payments / Default / Desktop / EN | 1440×1200 | LTR | Desktop |
| SCR / Payments / Default / Tablet / AR | 768×1024 | RTL | Tablet |
| SCR / Payments / Default / Mobile / AR | 390×1200 | RTL | Mobile |
| SCR / Payments / Loading / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Payments / Empty / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Payments / Filtered / Desktop / AR | 1440×1200 | RTL | Desktop |
| OVL / Payments / PaymentModal | 600×700 | RTL | Modal |
| OVL / Payments / ArchiveDetailModal | 1200×800 | RTL | Modal |
| OVL / Payments / StudentDetailPanel | 480×100vh | RTL | Drawer |

**Child Components Used**:
- CMP / Shell / Sidebar
- CMP / Shell / Topbar
- CMP / Data Display / StatsCard (4 instances)
- CMP / Data Display / DataTableShell
- CMP / Data Display / Card (archive cards)
- CMP / Navigation / Pagination

**Layout Structure**:
```
[Payments]
├── App Shell
│   ├── Sidebar
│   └── Main
│       ├── Topbar
│       └── Content
│           ├── PaymentsStats (4 cards)
│           │   ├── Total Payments
│           │   ├── Today's Collection
│           │   ├── Monthly Target
│           │   └── Outstanding
│           ├── PaymentsToolbar
│           │   ├── Quick Filters
│           │   └── Actions
│           ├── PaymentsFilters (expandable)
│           ├── DataTableShell
│           │   └── PaymentsTable
│           ├── ListPagination
│           └── PaymentsArchive (section)
│               └── Archive Cards Grid
```

**Table Columns (Desktop)**:
| Column | Width | Notes |
|--------|-------|-------|
| Receipt # | 100px | Receipt number |
| Date | 120px | Payment date |
| Student | flex | Student name (link) |
| Class | 100px | Class name |
| Amount | 120px | Payment amount |
| Method | 100px | Payment method |
| Status | 100px | Status badge |
| Actions | 80px | Dropdown menu |

**Key States**:
- **Quick Filter**: Filter chips active
- **Advanced Filter**: Expanded filter panel
- **Loading**: TableSkeleton
- **Empty**: Empty state
- **Panel Open**: StudentDetailPanel slide-in
- **Modal Open**: PaymentModal or ArchiveDetailModal

---

### Screen: Salaries

**Route**: `/[locale]/salaries`

**Frame List**:
| Frame Name | Size | Direction | Device |
|-----------|------|-----------|--------|
| SCR / Salaries / Default / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Salaries / Default / Desktop / EN | 1440×1200 | LTR | Desktop |
| SCR / Salaries / Default / Tablet / AR | 768×1024 | RTL | Tablet |
| SCR / Salaries / Default / Mobile / AR | 390×1200 | RTL | Mobile |
| SCR / Salaries / Loading / Desktop / AR | 1440×1200 | RTL | Desktop |
| SCR / Salaries / Empty / Desktop / AR | 1440×1200 | RTL | Desktop |
| OVL / Salaries / PaySalaryModal | 600×700 | RTL | Modal |
| OVL / Salaries / TeacherModal | 600×600 | RTL | Modal |
| OVL / Salaries / DailyLogModal | 800×600 | RTL | Modal |
| OVL / Salaries / PrintModal | 600×800 | RTL | Modal |

**Child Components Used**:
- CMP / Shell / Sidebar
- CMP / Shell / Topbar
- CMP / Navigation / SalariesSidebar (secondary nav)
- CMP / Data Display / StatsCard (4 instances)
- CMP / Data Display / DataTableShell
- CMP / Navigation / Pagination

**Layout Structure**:
```
[Salaries]
├── App Shell
│   ├── Sidebar (primary)
│   └── Main
│       ├── Topbar
│       └── Content (with secondary sidebar)
│           ├── SalariesSidebar (sections: Overview, Teachers, Schedule, etc.)
│           ├── StatsCards (4 cards)
│           ├── QuickAccessGrid (action buttons)
│           ├── Content Area (section-specific)
│           │   ├── TeachersTable (default view)
│           │   ├── ScheduleSection
│           │   ├── DeductionsSection
│           │   ├── ReportsSection
│           │   ├── ArchiveSection
│           │   ├── CalendarSection
│           │   └── SettingsSection
│           └── TeacherDetailPanel (drawer)
```

**SalariesSidebar Sections**:
1. Overview
2. Teachers
3. Schedule
4. Deductions
5. Reports
6. Archive
7. Calendar
8. Settings

**Table Columns (Teachers)**:
| Column | Width | Notes |
|--------|-------|-------|
| # | 60px | Row number |
| Teacher | flex | Name + avatar |
| Role | 120px | Role badge |
| Assignments | 150px | Classes/sections |
| Base Salary | 120px | Amount |
| Deductions | 120px | Amount |
| Net Salary | 120px | Amount |
| Actions | 80px | Dropdown menu |

**Key States**:
- **Section Switch**: Content updates per sidebar selection
- **Loading**: TableSkeleton
- **Empty**: Empty state
- **Panel Open**: TeacherDetailPanel slide-in
- **Modal Open**: Various modals (PaySalary, Teacher, DailyLog, Print)

---

## Appendix: Quick Reference

### Color Token Quick List

**Semantic Colors**: background, background-subtle, foreground, surface, surface-strong, surface-muted, surface-soft, surface-hover, surface-active, primary, primary-strong, primary-soft, secondary, text-primary, text-secondary, text-tertiary, text-on-primary, border, border-strong, border-focus, success, success-soft, warning, warning-soft, danger, danger-soft, info, info-soft, focus-ring

**Shell Colors**: topbar-bg, sidebar-bg, sidebar-border, sidebar-item-hover, sidebar-item-active-text

### Spacing Quick List

0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80 (px)

### Radius Quick List

xs=6, sm=10, md=14, lg=18, xl=24, 2xl=32, full=9999

### Typography Scale

display-xl (56/900), heading-xl (32/900), heading-lg (24/900), heading-md (20/800), heading-sm (18/800), body-lg (16/500), body-md (14/500), body-sm (12/500), label-lg (14/800), label-md (12/800), label-sm (11/800), overline (10/900)

### Breakpoints

- Desktop: 1440px
- Tablet: 768px
- Mobile: 390px

### Z-Index Scale

z-sidebar: 60, z-topbar: 40, z-modal: 200, z-toast: 300
