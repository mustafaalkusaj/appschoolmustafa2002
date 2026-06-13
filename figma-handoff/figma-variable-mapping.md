<!-- Generated: 2026-04-08 (v2) -->

# Figma Variable Mapping Guide

Complete mapping of CSS design tokens to Figma Variable constructs. This guide enables accurate translation of the School App design system into Figma's variable system.

---

## Variable Collections Overview

| Collection | Type | Modes | Purpose |
|------------|------|-------|---------|
| Colors | Color | Light, Dark | Semantic color tokens |
| Primitives | Color | - | Raw brand palette |
| Spacing | Number | - | Spacing scale |
| Radii | Number | - | Border radius scale |
| Shadows | Effect Styles | Light, Dark | Shadow definitions |
| Typography | Text Styles | - | Font specifications |
| Layout | Number | - | Dimensions |
| Motion | String | - | Animation tokens |
| Z-Index | Number | - | Layer ordering |
| Theme Presets | Color | Per Preset | Brand variations |

---

## 1. Colors Collection

### Semantic Colors (Light Mode)

| CSS Variable | Figma Variable Name | Type | Mode: Light | Mode: Dark | Notes |
|-------------|-------------------|------|------------|------------|-------|
| `--background` | color/background | Color | #f4f7fc | #080e1a | Page background |
| `--background-subtle` | color/background-subtle | Color | #eef2f9 | #0d1425 | Subtle backgrounds |
| `--foreground` | color/foreground | Color | #0f172a | #f1f5f9 | Primary text |
| `--surface` | color/surface | Color | rgba(255,255,255,0.85) | rgba(14,22,40,0.85) | Card surfaces |
| `--surface-strong` | color/surface-strong | Color | #ffffff | #111827 | Elevated surfaces |
| `--surface-muted` | color/surface-muted | Color | rgba(255,255,255,0.58) | rgba(24,31,48,0.68) | Muted backgrounds |
| `--surface-soft` | color/surface-soft | Color | rgba(248,251,255,0.95) | rgba(14,22,40,0.95) | Soft backgrounds |
| `--surface-hover` | color/surface-hover | Color | rgba(79,140,255,0.05) | rgba(118,169,255,0.07) | Hover states |
| `--surface-active` | color/surface-active | Color | rgba(79,140,255,0.10) | rgba(118,169,255,0.14) | Active states |
| `--primary` | color/primary | Color | #4f8cff | #76a9ff | Primary brand |
| `--primary-strong` | color/primary-strong | Color | #3e7df7 | #5e97ff | Primary hover |
| `--primary-soft` | color/primary-soft | Color | #eff6ff | rgba(118,169,255,0.12) | Primary subtle |
| `--secondary` | color/secondary | Color | #79d7ff | #8ae7ff | Secondary accent |
| `--text-primary` | color/text-primary | Color | #0f172a | #f1f5f9 | Main text |
| `--text-secondary` | color/text-secondary | Color | #475569 | #94a3b8 | Secondary text |
| `--text-tertiary` | color/text-tertiary | Color | #94a3b8 | #64748b | Tertiary text |
| `--text-on-primary` | color/text-on-primary | Color | #ffffff | #0f172a | Text on primary |
| `--brand-text-strong` | color/brand-text-strong | Color | #0f172a | #f1f5f9 | Brand text |
| `--border` | color/border | Color | rgba(15,23,42,0.07) | rgba(255,255,255,0.07) | Borders |
| `--border-strong` | color/border-strong | Color | rgba(15,23,42,0.13) | rgba(255,255,255,0.12) | Strong borders |
| `--border-focus` | color/border-focus | Color | #4f8cff | #76a9ff | Focus borders |
| `--success` | color/success | Color | #10b981 | #34d399 | Success state |
| `--success-soft` | color/success-soft | Color | #ecfdf5 | rgba(16,185,129,0.12) | Success subtle |
| `--warning` | color/warning | Color | #f59e0b | #fbbf24 | Warning state |
| `--warning-soft` | color/warning-soft | Color | #fffbeb | rgba(245,158,11,0.12) | Warning subtle |
| `--danger` | color/danger | Color | #ef4444 | #f87171 | Error state |
| `--danger-soft` | color/danger-soft | Color | #fef2f2 | rgba(239,68,68,0.12) | Error subtle |
| `--info` | color/info | Color | #3b82f6 | #60a5fa | Info state |
| `--info-soft` | color/info-soft | Color | #eff6ff | rgba(59,130,246,0.12) | Info subtle |
| `--button-accent` | color/button-accent | Color | #4f8cff | #76a9ff | Button primary |
| `--button-accent-strong` | color/button-accent-strong | Color | #3e7df7 | #5b95fb | Button hover |
| `--focus-ring` | color/focus-ring | Color | rgba(79,140,255,0.30) | rgba(118,169,255,0.30) | Focus ring |
| `--focus-ring-solid` | color/focus-ring-solid | Color | #4f8cff | #76a9ff | Solid focus |

### Shell-Specific Colors

| CSS Variable | Figma Variable Name | Type | Mode: Light | Mode: Dark | Notes |
|-------------|-------------------|------|------------|------------|-------|
| `--topbar-bg` | color/topbar-bg | Color | rgba(255,255,255,0.82) | rgba(10,16,30,0.88) | Topbar background |
| `--sidebar-bg` | color/sidebar-bg | Color | #ffffff | #0d1425 | Sidebar background |
| `--sidebar-border` | color/sidebar-border | Color | rgba(15,23,42,0.07) | rgba(255,255,255,0.07) | Sidebar border |
| `--sidebar-item-hover` | color/sidebar-item-hover | Color | rgba(79,140,255,0.07) | rgba(118,169,255,0.08) | Nav hover |
| `--sidebar-item-active-bg` | color/sidebar-item-active-bg | Color | *gradient* | *gradient* | Active nav (see below) |
| `--sidebar-item-active-text` | color/sidebar-item-active-text | Color | #ffffff | #08111f | Active nav text |
| `--grid-line` | color/grid-line | Color | rgba(79,140,255,0.08) | rgba(138,231,255,0.07) | Grid lines |

**Note**: `--sidebar-item-active-bg` is a gradient. In Figma, use a layer style or create as a color style with gradient fill:
- Light: `linear-gradient(135deg, rgba(79, 140, 255, 0.96), rgba(121, 215, 255, 0.96))`
- Dark: `linear-gradient(135deg, rgba(118, 169, 255, 0.96), rgba(138, 231, 255, 0.84))`

### Legacy Palette Aliases

| CSS Variable | Figma Variable Name | Type | Mode: Light | Mode: Dark | Notes |
|-------------|-------------------|------|------------|------------|-------|
| `--p2` | color/legacy-p2 | Color | #255ea8 | #9ec3ff | Legacy primary-2 |
| `--p3` | color/legacy-p3 | Color | #4f8cff | #7fb1ff | Legacy primary-3 |
| `--p4` | color/legacy-p4 | Color | #79d7ff | #80d8f6 | Legacy primary-4 |
| `--bg` | color/legacy-bg | Color | #eef4fb | #0f172a | Legacy background |
| `--dark` | color/legacy-dark | Color | #16324f | #e8f2ff | Legacy dark |
| `--gray` | color/legacy-gray | Color | #6b7280 | #a8b0c8 | Legacy gray |
| `--sidebar-a` | color/legacy-sidebar-a | Color | #edf6ff | #182338 | Legacy sidebar A |
| `--sidebar-b` | color/legacy-sidebar-b | Color | #dbeafb | #111b2e | Legacy sidebar B |

---

## 2. Primitives Collection

### Primary Brand Scale

| CSS Variable | Figma Variable Name | Type | Value | Notes |
|-------------|-------------------|------|-------|-------|
| `--color-primary-50` | primitive/primary-50 | Color | #eff6ff | Lightest |
| `--color-primary-100` | primitive/primary-100 | Color | #dbeafe | Very light |
| `--color-primary-200` | primitive/primary-200 | Color | #bfdbfe | Light |
| `--color-primary-400` | primitive/primary-400 | Color | #60a5fa | Medium |
| `--color-primary-500` | primitive/primary-500 | Color | #4f8cff | **Primary** |
| `--color-primary-600` | primitive/primary-600 | Color | #3e7df7 | Strong |
| `--color-primary-700` | primitive/primary-700 | Color | #2563eb | Dark |
| `--color-cyan-400` | primitive/cyan-400 | Color | #79d7ff | Secondary |
| `--color-cyan-500` | primitive/cyan-500 | Color | #38bdf8 | Cyan medium |

---

## 3. Spacing Collection

| CSS Variable | Figma Variable Name | Type | Value (px) | Notes |
|-------------|-------------------|------|------------|-------|
| `--spacing-0` | spacing/0 | Number | 0 | Zero |
| `--spacing-4` | spacing/4 | Number | 4 | 0.25rem |
| `--spacing-8` | spacing/8 | Number | 8 | 0.5rem |
| `--spacing-12` | spacing/12 | Number | 12 | 0.75rem |
| `--spacing-16` | spacing/16 | Number | 16 | 1rem |
| `--spacing-20` | spacing/20 | Number | 20 | 1.25rem |
| `--spacing-24` | spacing/24 | Number | 24 | 1.5rem |
| `--spacing-32` | spacing/32 | Number | 32 | 2rem |
| `--spacing-40` | spacing/40 | Number | 40 | 2.5rem |
| `--spacing-48` | spacing/48 | Number | 48 | 3rem |
| `--spacing-56` | spacing/56 | Number | 56 | 3.5rem |
| `--spacing-64` | spacing/64 | Number | 64 | 4rem |
| `--spacing-72` | spacing/72 | Number | 72 | 4.5rem |
| `--spacing-80` | spacing/80 | Number | 80 | 5rem |

---

## 4. Radii Collection

| CSS Variable | Figma Variable Name | Type | Value | Notes |
|-------------|-------------------|------|-------|-------|
| `--radius-xs` | radius/xs | Number | 6px | Small elements |
| `--radius-sm` | radius/sm | Number | 10px | Buttons, inputs |
| `--radius-md` | radius/md | Number | 14px | Cards |
| `--radius-lg` | radius/lg | Number | 18px | Large cards |
| `--radius-xl` | radius/xl | Number | 24px | Modals |
| `--radius-2xl` | radius/2xl | Number | 32px | Hero cards |
| `--radius-full` | radius/full | Number | 9999px | Pills, circles |

### Radius Aliases (for reference)

| Alias | Maps To | Usage |
|-------|---------|-------|
| `--radius-card` | radius/xl (24px) | Cards |
| `--radius-input` | radius/lg (18px) | Input fields |
| `--radius-button` | radius/sm (16px) | Buttons |
| `--radius-modal` | radius/xl (28px) | Modals |
| `--radius-pill` | radius/full | Pills |

---

## 5. Shadows → Effect Styles

### Light Mode Shadows

| CSS Variable | Figma Effect Style Name | Type | Value |
|-------------|------------------------|------|-------|
| `--shadow-xs` | effect/shadow-xs | Drop Shadow | 0 1px 3px rgba(15,23,42,0.06), 0 1px 2px rgba(15,23,42,0.04) |
| `--shadow-sm` | effect/shadow-sm | Drop Shadow | 0 4px 12px rgba(15,23,42,0.08), 0 2px 4px rgba(15,23,42,0.04) |
| `--shadow-md` | effect/shadow-md | Drop Shadow | 0 8px 24px rgba(15,23,42,0.10), 0 4px 8px rgba(15,23,42,0.06) |
| `--shadow-lg` | effect/shadow-lg | Drop Shadow | 0 16px 48px rgba(15,23,42,0.12), 0 8px 16px rgba(15,23,42,0.08) |
| `--shadow-xl` | effect/shadow-xl | Drop Shadow | 0 24px 64px rgba(15,23,42,0.14), 0 12px 24px rgba(15,23,42,0.10) |
| `--shadow-primary` | effect/shadow-primary | Drop Shadow | 0 4px 16px rgba(79,140,255,0.28) |
| `--shadow-inset` | effect/shadow-inset | Inner Shadow | inset 0 1px 0 rgba(255,255,255,0.65) |

### Dark Mode Shadows

| CSS Variable | Figma Effect Style Name | Type | Value |
|-------------|------------------------|------|-------|
| `--shadow-xs` | effect/shadow-xs | Drop Shadow | 0 1px 3px rgba(0,0,0,0.28), 0 1px 2px rgba(0,0,0,0.20) |
| `--shadow-sm` | effect/shadow-sm | Drop Shadow | 0 4px 12px rgba(0,0,0,0.32), 0 2px 4px rgba(0,0,0,0.20) |
| `--shadow-md` | effect/shadow-md | Drop Shadow | 0 8px 24px rgba(0,0,0,0.38), 0 4px 8px rgba(0,0,0,0.24) |
| `--shadow-lg` | effect/shadow-lg | Drop Shadow | 0 16px 48px rgba(0,0,0,0.42), 0 8px 16px rgba(0,0,0,0.28) |
| `--shadow-xl` | effect/shadow-xl | Drop Shadow | 0 24px 64px rgba(0,0,0,0.50), 0 12px 24px rgba(0,0,0,0.32) |
| `--shadow-primary` | effect/shadow-primary | Drop Shadow | 0 4px 16px rgba(118,169,255,0.22) |
| `--shadow-inset` | effect/shadow-inset | Inner Shadow | inset 0 1px 0 rgba(255,255,255,0.06) |

---

## 6. Typography → Text Styles

### Font Families

| CSS Variable | Figma Text Style | Font Family | Weights |
|-------------|-----------------|-------------|---------|
| `--font-sans` | font/latin | Inter, Segoe UI, system-ui | 400, 500, 600, 700, 800 |
| `--font-arabic` | font/arabic | Cairo, Tahoma | 400, 500, 600, 700, 800 |
| `--font-ui` | font/ui | Cairo, Inter, Arial | Contextual |

### Typography Scale

| Usage | Figma Text Style Name | Font | Size | Weight | Line Height | Letter Spacing |
|-------|----------------------|------|------|--------|-------------|----------------|
| Display XL | text/display-xl | Cairo/Inter | 56px | 900 | 1.1 | - |
| Heading XL | text/heading-xl | Cairo/Inter | 32px | 900 | 1.2 | - |
| Heading L | text/heading-lg | Cairo/Inter | 24px | 900 | 1.25 | - |
| Heading M | text/heading-md | Cairo/Inter | 20px | 800 | 1.3 | - |
| Heading S | text/heading-sm | Cairo/Inter | 18px | 800 | 1.35 | - |
| Body L | text/body-lg | Cairo/Inter | 16px | 500 | 1.7 | - |
| Body M | text/body-md | Cairo/Inter | 14px | 500 | 1.6 | - |
| Body S | text/body-sm | Cairo/Inter | 12px | 500 | 1.5 | - |
| Label L | text/label-lg | Cairo/Inter | 14px | 800 | 1.4 | - |
| Label M | text/label-md | Cairo/Inter | 12px | 800 | 1.35 | - |
| Label S | text/label-sm | Cairo/Inter | 11px | 800 | 1.3 | - |
| Overline | text/overline | Cairo/Inter | 10px | 900 | 1.2 | 0.15em |

---

## 7. Layout Collection

| CSS Variable | Figma Variable Name | Type | Value | Notes |
|-------------|-------------------|------|-------|-------|
| `--sidebar-width` | layout/sidebar-width | Number | 280px | Current sidebar |
| `--sidebar-width-collapsed` | layout/sidebar-width-collapsed | Number | 64px | Legacy collapsed |
| `--topbar-height` | layout/topbar-height | Number | 64px | Topbar height |
| `--glass-blur` | layout/glass-blur | Number | 22px | Backdrop blur |
| `--z-sidebar` | layout/z-sidebar | Number | 60 | Sidebar layer |
| `--z-topbar` | layout/z-topbar | Number | 40 | Topbar layer |
| `--z-modal` | layout/z-modal | Number | 200 | Modal layer |
| `--z-toast` | layout/z-toast | Number | 300 | Toast layer |

---

## 8. Motion Collection

| CSS Variable | Figma Variable Name | Type | Value | Notes |
|-------------|-------------------|------|-------|-------|
| `--transition-fast` | motion/fast | String | 120ms ease | Quick feedback |
| `--transition-base` | motion/base | String | 200ms ease | Standard |
| `--transition-slow` | motion/slow | String | 320ms ease | Emphasis |
| `--transition-spring` | motion/spring | String | 300ms cubic-bezier(0.34, 1.56, 0.64, 1) | Bouncy |

---

## 9. Theme Presets → Variable Modes

### Preset: blue-academic (Academic Classic)

| Token | Mode Value |
|-------|-----------|
| color/primary | #1E5AA8 |
| color/secondary | #6DB4FF |
| color/accent | #F0A43B |
| color/background | #F4F8FE |
| color/surface | #FFFFFF |
| color/surface-muted | #E8F0FB |
| color/sidebar-bg | #E1ECFB |
| color/text-primary | #10233F |

### Preset: blue-modern (Modern School)

| Token | Mode Value |
|-------|-----------|
| color/primary | #0F5B8D |
| color/secondary | #4EC4F3 |
| color/accent | #7B61FF |
| color/background | #F2F9FD |
| color/surface | #FFFFFF |
| color/surface-muted | #E3F3FA |
| color/sidebar-bg | #D6EEF9 |
| color/text-primary | #0F172A |

### Preset: blue-premium (Premium Campus)

| Token | Mode Value |
|-------|-----------|
| color/primary | #233876 |
| color/secondary | #7FA7FF |
| color/accent | #D5A13E |
| color/background | #F6F7FC |
| color/surface | #FFFFFF |
| color/surface-muted | #E8ECF8 |
| color/sidebar-bg | #E2E8F8 |
| color/text-primary | #151E34 |

### Preset: green-growth (Growth)

| Token | Mode Value |
|-------|-----------|
| color/primary | #0F8A6A |
| color/secondary | #76D9BE |
| color/accent | #F4B740 |
| color/background | #F2FBF8 |
| color/surface | #FFFFFF |
| color/surface-muted | #E0F5EF |
| color/sidebar-bg | #D5F0E8 |
| color/text-primary | #10332B |

### Preset: green-heritage (Heritage)

| Token | Mode Value |
|-------|-----------|
| color/primary | #2F6B57 |
| color/secondary | #B9C98A |
| color/accent | #C78D4D |
| color/background | #F7FAF5 |
| color/surface | #FFFFFF |
| color/surface-muted | #EBF1E7 |
| color/sidebar-bg | #E5ECDD |
| color/text-primary | #203227 |

### Preset: green-stem (STEM Green)

| Token | Mode Value |
|-------|-----------|
| color/primary | #157A74 |
| color/secondary | #8FE3D4 |
| color/accent | #6A8DFF |
| color/background | #F1FBFA |
| color/surface | #FFFFFF |
| color/surface-muted | #DDF3F1 |
| color/sidebar-bg | #D2EEEA |
| color/text-primary | #112827 |

### Preset: warm-leadership (Leadership)

| Token | Mode Value |
|-------|-----------|
| color/primary | #8D2D49 |
| color/secondary | #E39DB0 |
| color/accent | #F4B35D |
| color/background | #FCF6F8 |
| color/surface | #FFFFFF |
| color/surface-muted | #F4E6EB |
| color/sidebar-bg | #F0DDE5 |
| color/text-primary | #331824 |

### Preset: warm-desert (Desert Gold)

| Token | Mode Value |
|-------|-----------|
| color/primary | #A45A2A |
| color/secondary | #F1C27A |
| color/accent | #7D4DCC |
| color/background | #FFF8F2 |
| color/surface | #FFFFFF |
| color/surface-muted | #F8EBDD |
| color/sidebar-bg | #F5E4D2 |
| color/text-primary | #3A2415 |

### Preset: warm-scholars (Scholars)

| Token | Mode Value |
|-------|-----------|
| color/primary | #7A3E2B |
| color/secondary | #D7B08B |
| color/accent | #A74AC7 |
| color/background | #FBF6F2 |
| color/surface | #FFFFFF |
| color/surface-muted | #F1E7DF |
| color/sidebar-bg | #ECDDCE |
| color/text-primary | #2F211A |

### Preset: purple-royal (Royal Academy)

| Token | Mode Value |
|-------|-----------|
| color/primary | #6B46C1 |
| color/secondary | #C084FC |
| color/accent | #FBBF24 |
| color/background | #F8F7FC |
| color/surface | #FFFFFF |
| color/surface-muted | #EDE9FE |
| color/sidebar-bg | #E8DAFD |
| color/text-primary | #1A0D2E |

### Preset: purple-creative (Creative Arts)

| Token | Mode Value |
|-------|-----------|
| color/primary | #8B5CF6 |
| color/secondary | #D8B4FE |
| color/accent | #F59E0B |
| color/background | #FBFAFE |
| color/surface | #FFFFFF |
| color/surface-muted | #EDE9FE |
| color/sidebar-bg | #E2D8FD |
| color/text-primary | #1E1B4B |

### Preset: purple-tech (Tech Innovation)

| Token | Mode Value |
|-------|-----------|
| color/primary | #7C3AED |
| color/secondary | #A78BFA |
| color/accent | #06B6D4 |
| color/background | #F5F3FF |
| color/surface | #FFFFFF |
| color/surface-muted | #EDE9FE |
| color/sidebar-bg | #DDD6FE |
| color/text-primary | #1E1B4B |

### Preset: classic-white (Classic White)

| Token | Mode Value |
|-------|-----------|
| color/primary | #1F2937 |
| color/secondary | #6B7280 |
| color/accent | #111827 |
| color/background | #FFFFFF |
| color/surface | #F9FAFB |
| color/surface-muted | #F3F4F6 |
| color/sidebar-bg | #F9FAFB |
| color/text-primary | #111827 |

### Preset: dark-professional (Dark Professional)

| Token | Mode Value |
|-------|-----------|
| color/primary | #6366F1 |
| color/secondary | #A5B4FC |
| color/accent | #FCD34D |
| color/background | #0F172A |
| color/surface | #1E293B |
| color/surface-muted | #334155 |
| color/sidebar-bg | #1E293B |
| color/text-primary | #F8FAFC |

---

## Figma Style Organization

### Color Styles
```
semantic/
  ├── primary
  ├── primary-strong
  ├── secondary
  ├── background
  ├── surface
  ├── surface-strong
  ├── text-primary
  ├── text-secondary
  ├── border
  ├── success
  ├── warning
  ├── danger
  └── info

primitive/
  ├── primary-50
  ├── primary-100
  ├── primary-200
  ├── primary-400
  ├── primary-500
  ├── primary-600
  ├── primary-700
  ├── cyan-400
  └── cyan-500
```

### Text Styles
```
text/
  ├── display-xl
  ├── heading-xl
  ├── heading-lg
  ├── heading-md
  ├── heading-sm
  ├── body-lg
  ├── body-md
  ├── body-sm
  ├── label-lg
  ├── label-md
  ├── label-sm
  └── overline
```

### Effect Styles
```
effect/
  ├── shadow-xs
  ├── shadow-sm
  ├── shadow-md
  ├── shadow-lg
  ├── shadow-xl
  ├── shadow-primary
  └── shadow-inset
```

---

## Collection Grouping Strategy

### 1. Collection: Primitives
- **Type**: Color variables
- **Content**: Raw color values (primary-50 through primary-700, cyan scale)
- **Modes**: None (static values)

### 2. Collection: Semantic Colors
- **Type**: Color variables
- **Content**: Theme-aware semantic tokens
- **Modes**: Light, Dark
- **Mapping**: References Primitives or direct values

### 3. Collection: Brand / Theme Presets
- **Type**: Color variables
- **Content**: Per-preset overrides
- **Modes**: blue-academic, blue-modern, blue-premium, green-growth, green-heritage, green-stem, warm-leadership, warm-desert, warm-scholars, purple-royal, purple-creative, purple-tech, classic-white, dark-professional
- **Mapping**: Overrides semantic colors

### 4. Collection: Layout
- **Type**: Number variables
- **Content**: Dimensions, z-index, blur values
- **Modes**: None

### 5. Collection: Spacing
- **Type**: Number variables
- **Content**: 4-80px scale
- **Modes**: None

### 6. Collection: Radii
- **Type**: Number variables
- **Content**: Border radius scale
- **Modes**: None

### 7. Collection: Motion
- **Type**: String variables
- **Content**: Transition timing
- **Modes**: None

---

## Variable Application Guide

### Applying to Frames
1. Set frame background to `color/background` (switches with mode)
2. Use `color/surface` for card backgrounds
3. Apply `radius/xl` (24px) to cards
4. Apply `effect/shadow-md` to elevated cards

### Applying to Text
1. Use `text/body-md` for standard text
2. Use `text/heading-lg` for page titles
3. Apply `color/text-primary` to main text
4. Apply `color/text-secondary` to subtitles

### Applying to Buttons
1. Primary: `color/button-accent` background, `color/text-on-primary` text
2. Secondary: `color/surface` background, `color/text-primary` text
3. Danger: `color/danger` background, white text
4. Radius: `radius/sm` (16px)

### Applying to Inputs
1. Background: `color/surface-strong` or transparent
2. Border: `color/border`
3. Border radius: `radius-lg` (18px)
4. Focus: `color/border-focus` with `color/focus-ring`

---

## Runtime Branding Notes

The following CSS variables are mutated at runtime based on school branding:

```
--primary
--primary-strong
--secondary
--button-accent
--button-accent-strong
--brand-text-strong
--focus-ring
--p2, --p3, --p4
--bg
--sidebar-a, --sidebar-b
--sidebar-bg
--topbar-bg
```

**Figma Implementation**:
- Create default mode with blue/cyan values
- Create theme preset modes for each of the 14 presets
- Use variable modes to switch between brand identities
- Document that designers should test all presets
