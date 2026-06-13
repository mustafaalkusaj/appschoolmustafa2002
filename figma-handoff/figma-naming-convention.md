<!-- Generated: 2026-04-08 (v2) -->

# Figma Naming Convention

## Overview

This document establishes the naming conventions for all Figma elements including pages, frames, components, variants, and layer names. Following these conventions ensures consistency, searchability, and efficient handoff between design and development.

---

## Page Naming

Use numbered top-level pages with descriptive names:

```
##_PageName
```

| Number | Page Name |
|--------|-----------|
| 01 | Cover |
| 02 | Foundations |
| 03 | Tokens |
| 04 | Icons and Assets |
| 05 | Components |
| 06 | Patterns |
| 07 | Templates |
| 08 | Screens - Auth |
| 09 | Screens - Dashboard |
| 10 | Screens - Academic / Core App |
| 11 | Screens - Finance |
| 12 | Screens - Reports / Monitoring |
| 13 | Screens - Admin |
| 14 | Screens - Super Admin |
| 15 | Prototypes / User Flows |
| 16 | Archive / Inferred |

**Examples**:
- `01_Cover`
- `05_Components`
- `14_Screens - Super Admin`

---

## Frame Naming

### Screen Frames

```
SCR / [Screen] / [State] / [Viewport] / [Direction]
```

**Components**:
- **Screen**: The route or surface name (e.g., Login, Dashboard, Students)
- **State**: Default, Loading, Empty, Error, Filtered, ModalOpen, PanelOpen
- **Viewport**: Desktop, Tablet, Mobile
- **Direction**: AR (RTL Arabic), EN (LTR English)

**Examples**:
```
SCR / Login / Default / Desktop / AR
SCR / Login / Default / Desktop / EN
SCR / Login / Error / Desktop / AR
SCR / Login / Default / Mobile / AR
SCR / Dashboard / Default / Desktop / AR
SCR / Students / Add Modal / Desktop / AR
SCR / Payments / Detail Panel / Desktop / AR
SCR / Super Admin / Schools Tab / Desktop / AR
```

### Foundation Frames

```
FRA / [Topic] / [Subtopic]
```

**Examples**:
```
FRA / Foundations / Color Primitives
FRA / Foundations / Typography
FRA / Tokens / Light Semantic
FRA / Tokens / Dark Semantic
FRA / Assets / Lucide Navigation Icons
```

### Flow Frames

```
FLOW / [Journey Name]
```

**Examples**:
```
FLOW / Authentication
FLOW / Admin Daily
FLOW / Employee Collection
FLOW / Super Admin Operations
FLOW / School Scope Switching
```

---

## Component Naming

### Master Components

```
CMP / [Category] / [Name]
```

**Categories**:
- `Shell` — App shell components (Sidebar, Topbar, ProfileMenu)
- `Primitives` — Base UI elements (Button, Input, Badge)
- `Data Display` — Cards, Tables, Stats
- `Navigation` — Breadcrumb, Pagination, Tabs
- `Feedback` — Toast, Skeleton, ConfirmDialog
- `Overlays` — Modal, Drawer, Popover
- `Forms` — FormField, Select, Checkbox, DatePicker
- `Brand` — Logo, BrandLockup

**Examples**:
```
CMP / Shell / Sidebar
CMP / Shell / Topbar
CMP / Shell / Profile Menu
CMP / Primitives / Button
CMP / Primitives / Input
CMP / Data Display / Stats Card
CMP / Data Display / Table
CMP / Navigation / Breadcrumb
CMP / Feedback / Toast
CMP / Overlays / Confirm Dialog
CMP / Brand / School Logo
CMP / Brand / Brand Lockup
```

---

## Variant Property Naming

### Standard Variant Properties

| Property | Values | Description |
|----------|--------|-------------|
| **State** | Default, Hover, Focus, Active, Selected, Disabled, Expanded, Collapsed, Open, Current, Invalid, Success, Destructive | Interaction states |
| **Theme** | Light, Dark | Color theme |
| **Direction** | RTL, LTR | Text direction |
| **Size** | XS, SM, MD, LG, XL | Component size |
| **Tone** | Neutral, Primary, Success, Warning, Danger, Info | Semantic color |
| **Icon** | None, Leading, Trailing, Both | Icon placement |
| **Density** | Comfortable, Compact | Spacing density |
| **TabState** | Active, Transferred, Suspended, Deleted | Tab selection state |
| **Viewport** | Desktop, Tablet, Mobile | Responsive variant |
| **Density** | Default, Compact | Spacing variant |

### Naming Format in Figma

When creating component variants in Figma, use property notation:

```
Property=Value
```

**Example variant names**:
```
State=Default, Theme=Light, Direction=RTL
State=Hover, Theme=Light
State=Disabled, Theme=Dark
Size=SM, Tone=Primary
Tone=Danger, State=Default
```

---

## Screen State Suffixes

Use these suffixes to indicate screen-level states:

| Suffix | Description |
|--------|-------------|
| `Default` | Normal operational state with data |
| `Loading` | Data fetching in progress |
| `Empty` | No data available |
| `Error` | Error message displayed |
| `Filtered` | Filters applied to data |
| `Searching` | Search query in progress |
| `Modal Open` | Modal overlay visible |
| `Panel Open` | Side panel/drawer visible |
| `Delete Confirm` | Delete confirmation dialog open |

**Examples**:
```
SCR / Students / Default / Desktop / AR
SCR / Students / Loading / Desktop / AR
SCR / Students / Empty / Desktop / AR
SCR / Students / Add Modal / Desktop / AR
SCR / Students / Delete Confirm / Desktop / AR
```

---

## Non-Routable Surface Naming

### Tab Panels

For tab panels within a parent screen:

```
SCR / [Parent] / [Tab] Tab / [Viewport] / [Direction]
```

**Examples**:
```
SCR / Students / Active Tab / Desktop / AR
SCR / Students / Transferred Tab / Desktop / AR
SCR / Students / Suspended Tab / Desktop / AR
SCR / Students / Deleted Tab / Desktop / AR
SCR / Expenses / Invoices Tab / Desktop / AR
SCR / Expenses / Types Tab / Desktop / AR
SCR / Monitoring / Messages Tab / Desktop / AR
SCR / Monitoring / Homework Tab / Desktop / AR
```

### Super Admin Tabs

```
SCR / Super Admin / [Tab] Tab / [Viewport] / [Direction]
```

**Examples**:
```
SCR / Super Admin / Overview Tab / Desktop / AR
SCR / Super Admin / Schools Tab / Desktop / AR
SCR / Super Admin / Users Tab / Desktop / AR
SCR / Super Admin / Subscriptions Tab / Desktop / AR
SCR / Super Admin / Audit Tab / Desktop / AR
SCR / Super Admin / Roles Tab / Desktop / AR
SCR / Super Admin / Trash Tab / Desktop / AR
SCR / Super Admin / Notifications Tab / Desktop / AR
SCR / Super Admin / Monitoring Tab / Desktop / AR
SCR / Super Admin / Branches Tab / Desktop / AR
```

### Salaries Sections

```
SCR / Salaries / [Section] / [Viewport] / [Direction]
```

**Examples**:
```
SCR / Salaries / Main / Desktop / AR
SCR / Salaries / Schedule / Desktop / AR
SCR / Salaries / Deductions / Desktop / AR
SCR / Salaries / Calendar / Desktop / AR
SCR / Salaries / Reports / Desktop / AR
SCR / Salaries / Archive / Desktop / AR
SCR / Salaries / Settings / Desktop / AR
```

---

## Modal Naming

### Overlay Components

```
OVL / [Module] / [ModalName]
```

**Examples**:
```
OVL / Students / AddStudentModal
OVL / Students / EditStudentModal
OVL / Students / DeleteConfirmModal
OVL / Students / ImportExcelModal
OVL / Students / AccountCardModal
OVL / Teachers / TeacherFormModal
OVL / Teachers / TeacherImportModal
OVL / Payments / PaymentModal
OVL / Payments / ArchiveDetailModal
OVL / Salaries / PaySalaryModal
OVL / Salaries / TeacherModal
OVL / Salaries / DailyLogModal
OVL / Salaries / ExportModal
OVL / Salaries / PrintModal
OVL / Dashboard / ClassesModal
OVL / Dashboard / FeeModal
OVL / Monitoring / DetailModal
OVL / Fee Notifications / HistoryModal
OVL / Super Admin / SchoolFormModal
OVL / Super Admin / UserFormModal
OVL / Super Admin / DeleteSchoolDialog
OVL / Super Admin / DeleteUserDialog
```

### Modal Within Screen Frame

When documenting modal states within screen frames:

```
SCR / [Screen] / [ModalName] / [Viewport] / [Direction]
```

**Examples**:
```
SCR / Students / Add Modal / Desktop / AR
SCR / Dashboard / Classes Modal / Desktop / AR
SCR / Salaries / Pay Modal / Desktop / AR
```

---

## Token/Style Naming

### Color Tokens

```
color/[category]/[name]
```

**Examples**:
```
color/primary/default
color/primary/strong
color/primary/soft
color/text/primary
color/text/secondary
color/text/tertiary
color/surface/strong
color/surface/soft
color/surface/muted
color/border/default
color/border/strong
color/border/focus
color/success/default
color/success/soft
color/warning/default
color/warning/soft
color/danger/default
color/danger/soft
color/info/default
color/info/soft
```

### Typography Tokens

```
text/[level]
```

**Examples**:
```
text/displayXL
text/displayL
text/headingL
text/headingM
text/headingS
text/bodyL
text/bodyM
text/bodyS
text/label
text/caption
text/overline
```

### Effect Tokens

```
effect/[name]
```

**Examples**:
```
effect/shadow-xs
effect/shadow-sm
effect/shadow-md
effect/shadow-lg
effect/shadow-xl
effect/shadow-primary
effect/focus-ring
```

### Spacing Tokens

```
spacing/[size]
```

**Examples**:
```
spacing/0
spacing/1    (4px)
spacing/2    (8px)
spacing/3    (12px)
spacing/4    (16px)
spacing/5    (20px)
spacing/6    (24px)
spacing/8    (32px)
spacing/10   (40px)
spacing/12   (48px)
spacing-20   (80px)
```

### Radius Tokens

```
radius/[size]
```

**Examples**:
```
radius/xs     (6px)
radius/sm     (10px)
radius/md     (14px)
radius/lg     (18px)
radius/xl     (24px)
radius/2xl    (32px)
radius/full   (9999px)
```

---

## Screenshot Naming

### Standard Screenshot Format

```
{screen}--{viewport}--{direction}--{state}.png
```

**Components**:
- **screen**: lowercase kebab-case (e.g., `login`, `dashboard`, `students`, `payments`, `salaries`, `super-admin`)
- **viewport**: `desktop` (1440), `tablet` (768), `mobile` (390)
- **direction**: `ltr`, `rtl`
- **state**: `default`, `loading`, `empty`, `error`, `modal-open`, `filtered`

**Examples**:
```
login--desktop--rtl--default.png
login--desktop--rtl--dark.png
login--desktop--ltr--default.png
login--mobile--rtl--default.png
login--tablet--ltr--default.png
dashboard--desktop--rtl--default.png
students--desktop--rtl--default.png
payments--desktop--rtl--default.png
super-admin--desktop--rtl--default.png
```

---

## Viewport Naming Conventions

| Viewport | Width | Use Case |
|----------|-------|----------|
| Desktop | 1440px | Primary desktop layout |
| Tablet | 768px | Tablet portrait |
| Mobile | 390px | Mobile phone |

### Breakpoint Scale (Tailwind)

| Token | Width | Name |
|-------|-------|------|
| xs | 390px | Mobile |
| sm | 640px | Small tablet |
| md | 768px | Tablet |
| lg | 1024px | Small desktop |
| xl | 1280px | Desktop |
| 2xl | 1536px | Large desktop |

---

## Layer Naming

### Slot-Based Layer Names

Use explicit slot names instead of generic names:

**Good**:
```
Title
Subtitle
Leading Icon
Trailing Action
Table Header
Row Actions
Overlay Backdrop
Modal Content
Form Footer
KPI Value
Stat Label
```

**Bad**:
```
Group 123
Rectangle 88
Frame 45
Text Layer
```

### Container Naming

```
[Component] Container
[Section] Section
[Panel] Panel
```

**Examples**:
```
Sidebar Container
Header Section
KPI Panel
Filter Bar
Table Body
Pagination Footer
```

---

## Theme Preset Naming

Theme presets follow the pattern:

```
[Family]-[Variant]
```

**Examples**:
```
blue-academic
blue-modern
blue-premium
green-growth
green-heritage
green-stem
warm-leadership
warm-desert
warm-scholars
purple-royal
purple-creative
purple-tech
classic-white
dark-professional
```

---

## Icon Naming

Icons use Lucide React naming convention:

```
[PascalCase Icon Name]
```

**Navigation Icons**:
- Home
- House
- Users
- GraduationCap
- CreditCard
- Wallet
- Banknote
- BarChart3
- FileText
- Settings
- Bell
- CalendarDays
- LayoutDashboard

**Action Icons**:
- Pencil
- PencilLine
- Trash2
- Plus
- Download
- Upload
- ExternalLink
- Copy
- Save
- RefreshCw
- RotateCcw
- Printer
- Search
- Filter

**Status Icons**:
- CheckCircle2
- AlertTriangle
- XCircle
- Loader2
- Info
- Ban
- ShieldCheck
- BadgeCheck

**UI Icons**:
- Moon
- Sun
- Languages
- ChevronDown
- ChevronLeft
- ChevronRight
- Menu
- X
- Eye
- EyeOff
- ArrowUp
- ArrowDown

---

## Summary Checklist

- [ ] Pages use numbered prefixes (01_, 02_, etc.)
- [ ] Screen frames use SCR / prefix with 4-part path
- [ ] Component masters use CMP / prefix with category
- [ ] Overlays use OVL / prefix
- [ ] Token styles use semantic naming (color/, text/, etc.)
- [ ] Screenshots follow kebab-case with 4-part format
- [ ] Layer names are explicit slot names (not generic)
- [ ] Variant properties use Property=Value notation
