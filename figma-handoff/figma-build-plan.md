<!-- Generated: 2026-04-08 (v2) -->

# Figma Build Plan

## Overview

- **Source of truth**: Frontend code in `/Users/musatafa/school-app`
- **Primary localized routes inventoried**: 19 routable pages
- **Non-routable surfaces**: 34+ (tab panels, modal stacks, conditional sections)
- **Total screens to reconstruct**: 60+ surfaces
- **Component files inventoried**: 103+
- **Direct Figma API/plugin creation**: Unavailable; optimized for manual rebuild
- **Framework**: Next.js 16 App Router + React 19
- **Styling**: Tailwind CSS v4 + globals.css token layer + runtime CSS variables
- **Localization**: Arabic-first (`/ar`) with English (`/en`) mirrors
- **Theming**: `next-themes` with light/dark/system + runtime brand presets
- **Charts**: Recharts
- **Icons**: Lucide mapped through `lib/icons.ts`

---

## Page Structure (16 Pages)

---

### Page 01: Cover

**Purpose**: Project overview, route map, and handoff metadata

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Cover / Overview Board | 1440×1024 | Vertical | 80px | 32px | Center-left | Project title, version, generated date |
| FRA / Cover / Route Map | 1440×900 | Horizontal | 64px | 24px | Center | Visual sitemap of 19 routes |
| FRA / Cover / Component Count | 1440×600 | Horizontal | 48px | 16px | Center | 103 components summary |

**Child Components**: ProjectTitle, VersionBadge, RouteMapNode, ComponentCountCard

**Prototyping Notes**: Static overview; no interactions required

---

### Page 02: Foundations

**Purpose**: Design primitives (colors, typography, spacing, radii, shadows, motion)

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Foundations / Color Primitives | 1600×1200 | Grid | 32px | 24px | Top-left | All Tailwind color swatches + brand primitives |
| FRA / Foundations / Typography | 1440×1200 | Vertical | 48px | 32px | Top-left | DisplayXL → Overline, Cairo + Inter samples |
| FRA / Foundations / Radius Shadows Motion | 1440×900 | Horizontal | 48px | 32px | Top-left | Radius scale (6-32px), shadow ladder, motion timing |
| FRA / Foundations / RTL Rules | 1440×900 | Vertical | 48px | 24px | Top-left | Mirroring examples, start/end positioning |

**Child Components**: ColorSwatch, TypographySample, RadiusDemo, ShadowDemo, MotionCurve

**Responsive Notes**: N/A (foundation reference)

**Prototyping Notes**: Static reference

---

### Page 03: Tokens

**Purpose**: Semantic tokens, light/dark modes, theme presets

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Tokens / Light Semantic | 1600×1400 | Vertical | 48px | 24px | Top-left | All semantic colors for light mode |
| FRA / Tokens / Dark Semantic | 1600×1400 | Vertical | 48px | 24px | Top-left | All semantic colors for dark mode |
| FRA / Tokens / Theme Presets / Blue | 1920×1200 | Grid | 32px | 24px | Top-left | Blue family (3 presets) |
| FRA / Tokens / Theme Presets / Green | 1920×1200 | Grid | 32px | 24px | Top-left | Green family (3 presets) |
| FRA / Tokens / Theme Presets / Warm | 1920×1200 | Grid | 32px | 24px | Top-left | Warm family (3 presets) |
| FRA / Tokens / Theme Presets / Purple | 1920×1200 | Grid | 32px | 24px | Top-left | Purple family (3 presets) |
| FRA / Tokens / Theme Presets / Classic Dark | 1920×800 | Grid | 32px | 24px | Top-left | Classic White + Dark Professional |
| FRA / Tokens / Layout Dimensions | 1440×800 | Horizontal | 48px | 24px | Top-left | Sidebar 280px, topbar 64px, z-index scale |

**Child Components**: TokenCard, ThemePresetSwatch, LayoutToken

**Theme Presets Documented** (14 total):
- **Blue Family**: blue-academic, blue-modern, blue-premium
- **Green Family**: green-growth, green-heritage, green-stem
- **Warm Family**: warm-leadership, warm-desert, warm-scholars
- **Purple Family**: purple-royal, purple-creative, purple-tech
- **Classic**: classic-white
- **Dark**: dark-professional

**Responsive Notes**: N/A

**Prototyping Notes**: Theme switch demo (optional)

---

### Page 04: Icons & Assets

**Purpose**: Lucide icon mapping, brand logos, chart swatches

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Assets / Lucide Navigation Icons | 1600×1200 | Grid | 24px | 16px | Top-left | 30 nav icons (Home, Users, GraduationCap, etc.) |
| FRA / Assets / Lucide Action Icons | 1600×1200 | Grid | 24px | 16px | Top-left | 25 action icons (Pencil, Trash2, Plus, etc.) |
| FRA / Assets / Lucide Status Icons | 1600×900 | Grid | 24px | 16px | Top-left | 15 status icons (CheckCircle2, AlertTriangle, etc.) |
| FRA / Assets / Lucide UI Icons | 1600×900 | Grid | 24px | 16px | Top-left | 20 UI icons (Moon, Sun, ChevronDown, etc.) |
| FRA / Assets / Brand Lockups | 1440×900 | Horizontal | 48px | 32px | Center | UltrathinkLogo, SchoolLogo, BrandLockup variants |
| FRA / Assets / Chart Swatches | 1440×600 | Horizontal | 32px | 16px | Center | Recharts color palette |

**Child Components**: IconSample, LogoVariant, ChartColorToken

**Responsive Notes**: Icon sizes: 16px (sm), 20px (md), 24px (lg)

**Prototyping Notes**: Static reference

---

### Page 05: Components

**Purpose**: Reusable UI components with all variants

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Components / Shell / Sidebar | 1920×1400 | Horizontal | 48px | 32px | Top-left | AppSidebar: desktop/mobile, role variants, theme variants |
| FRA / Components / Shell / Topbar | 1920×1200 | Horizontal | 48px | 32px | Top-left | AppShellTopbar: fixed/sticky, subtitle, actions |
| FRA / Components / Shell / Profile Menu | 1440×1000 | Horizontal | 48px | 32px | Top-left | ProfileMenu: avatar, language, theme, logout |
| FRA / Components / Primitives / Button | 1600×1200 | Grid | 32px | 24px | Top-left | Button: primary, secondary, outline, danger; states |
| FRA / Components / Primitives / Input | 1600×1200 | Grid | 32px | 24px | Top-left | Input: default, focus, error, disabled; with icons |
| FRA / Components / Data Display / Card | 1600×1000 | Grid | 32px | 24px | Top-left | Card family: Card, CardHeader, CardContent, CardFooter |
| FRA / Components / Data Display / Stats Card | 1600×1200 | Grid | 32px | 24px | Top-left | StatsCard: 6 tone variants, with/without trend |
| FRA / Components / Feedback / Toast | 1440×1000 | Horizontal | 48px | 32px | Top-left | Toast: success, error, warning, info |
| FRA / Components / Feedback / Skeleton | 1600×1400 | Vertical | 32px | 24px | Top-left | 8 skeleton types: StatCard, Table, Dashboard, etc. |
| FRA / Components / Overlays / Confirm Dialog | 1440×1000 | Horizontal | 48px | 32px | Top-left | ConfirmDialog: danger/primary, busy state |
| FRA / Components / Navigation / Breadcrumb | 1440×800 | Horizontal | 48px | 32px | Top-left | Breadcrumb: link, current, RTL/LTR |
| FRA / Components / Data Display / Table Shell | 1920×1600 | Vertical | 32px | 24px | Top-left | DataTableShell: loading, error, empty, default |
| FRA / Components / Navigation / Pagination | 1440×800 | Horizontal | 48px | 32px | Top-left | ListPagination: page buttons, info span |

**Child Components**: All component variants with state documentation

**Variant Properties**:
- State: Default, Hover, Focus, Active, Selected, Disabled, Expanded, Collapsed, Open, Current, Invalid, Success, Destructive
- Theme: Light, Dark
- Direction: RTL, LTR
- Size: XS, SM, MD, LG, XL
- Tone: Neutral, Primary, Success, Warning, Danger, Info
- Icon: None, Leading, Trailing, Both
- Density: Comfortable, Compact

**Responsive Notes**: Each component frame shows desktop, tablet (768), mobile (390) variants

**Prototyping Notes**: Component state transitions on hover/focus

---

### Page 06: Patterns

**Purpose**: Composed UI patterns for common use cases

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Patterns / Auth Form | 1440×1200 | Vertical | 48px | 32px | Top-left | Login form pattern with validation states |
| FRA / Patterns / Dashboard KPI Row | 1600×1000 | Horizontal | 48px | 24px | Top-left | 4-7 stat cards in responsive grid |
| FRA / Patterns / Data Management Header | 1600×900 | Horizontal | 48px | 24px | Top-left | Title, subtitle, filters, actions |
| FRA / Patterns / School Scope Banner | 1440×600 | Horizontal | 48px | 24px | Top-left | Super-admin context selector |
| FRA / Patterns / Gate Screens | 1600×900 | Vertical | 48px | 32px | Top-left | Access denied, subscription expired, not found |
| FRA / Patterns / Filter Bar | 1600×800 | Horizontal | 48px | 24px | Top-left | Search, dropdowns, quick filters |
| FRA / Patterns / Modal Stack | 1440×1200 | Vertical | 48px | 32px | Top-left | Base modal + confirmation flow |
| FRA / Patterns / CRUD Table | 1920×1400 | Vertical | 32px | 24px | Top-left | Table + toolbar + pagination pattern |

**Child Components**: Composed from page 05 components

**Responsive Notes**: Pattern frames show breakpoint variations

**Prototyping Notes**: Modal open/close animations

---

### Page 07: Templates

**Purpose**: Page layout templates

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Templates / App Shell Desktop | 1440×1400 | Horizontal | 0px | 0px | Top-left | Sidebar (280px) + Topbar (64px) + Main content area |
| FRA / Templates / App Shell Tablet | 768×1024 | Vertical | 0px | 0px | Top | Collapsed sidebar (overlay) + Topbar + Content |
| FRA / Templates / App Shell Mobile | 390×844 | Vertical | 0px | 0px | Top | Hidden sidebar (drawer) + Topbar + Content |
| FRA / Templates / Legacy Admin List | 1440×1200 | Vertical | 48px | 32px | Top-left | Schools/Subscriptions legacy pages |
| FRA / Templates / Auth Layout | 1440×1024 | Horizontal | 0px | 0px | Center | Split hero + form card layout |

**Child Components**: AppSidebar, AppShellTopbar, main content slot

**Responsive Notes**:
- Desktop (1440): Sidebar 280px fixed, topbar 64px, content fill
- Tablet (768): Sidebar overlay trigger, topbar compact
- Mobile (390): Sidebar hidden (drawer), topbar minimal

**Constraints/Resizing**:
- Sidebar: Fixed width, fixed position
- Topbar: Full width, fixed top
- Content: Fill container, overflow scroll

**Prototyping Notes**: Sidebar toggle animation, responsive breakpoint demo

---

### Page 08: Screens - Auth

**Purpose**: Authentication and gate screens

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Login / Default / Desktop / AR | 1440×1024 | Horizontal | 0px | 0px | Center | Desktop | RTL, hero left, form right |
| SCR / Login / Default / Desktop / EN | 1440×1024 | Horizontal | 0px | 0px | Center | Desktop | LTR, hero right, form left |
| SCR / Login / Default / Tablet / AR | 768×1024 | Vertical | 24px | 24px | Center | Tablet | RTL, stacked layout |
| SCR / Login / Default / Mobile / AR | 390×844 | Vertical | 16px | 16px | Center | Mobile | RTL, form-only (no hero) |
| SCR / Login / Error / Desktop / AR | 1440×1024 | Horizontal | 0px | 0px | Center | Desktop | RTL, validation error state |
| SCR / Login / Loading / Desktop / AR | 1440×1024 | Horizontal | 0px | 0px | Center | Desktop | RTL, submit in progress |
| SCR / Forgot Password / Default / Desktop / AR | 1440×1024 | Vertical | 0px | 0px | Center | Desktop | RTL, centered glass card |
| SCR / Forgot Password / Default / Desktop / EN | 1440×1024 | Vertical | 0px | 0px | Center | Desktop | LTR |
| SCR / Access Denied / Default / Desktop / AR | 1440×900 | Vertical | 0px | 0px | Center | Desktop | RTL, ShieldX icon |
| SCR / Access Denied / Default / Desktop / EN | 1440×900 | Vertical | 0px | 0px | Center | Desktop | LTR |
| SCR / Subscription Expired / Default / Desktop / AR | 1440×900 | Vertical | 0px | 0px | Center | Desktop | RTL, Crown icon |
| SCR / Not Found / Default / Desktop / AR | 1440×900 | Vertical | 0px | 0px | Center | Desktop | RTL, 404 message |
| SCR / Error / Default / Desktop / AR | 1440×900 | Vertical | 0px | 0px | Center | Desktop | RTL, generic error |

**Child Components**: AuthForm, GlassCard, IconMessage, Button

**Responsive Notes**:
- Desktop: Split layout (60/40 hero/form)
- Tablet: Stacked layout with reduced hero
- Mobile: Form-only, no hero image

**RTL/LTR**: Mirrored layouts, start/end positioning

**Dark Mode**: Glass card backgrounds adapt

**Prototyping Notes**: Login flow: Default → Loading → Success (navigate to dashboard) or Error (show validation)

---

### Page 09: Screens - Dashboard

**Purpose**: Dashboard and home launcher screens

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Home Launcher / Default / Desktop / AR | 1440×1024 | Vertical | 48px | 32px | Top | Desktop | RTL, role-filtered cards |
| SCR / Dashboard / Default / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL, KPI row + panels |
| SCR / Dashboard / Default / Desktop / EN | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Dashboard / Default / Tablet / AR | 768×1200 | Vertical | 24px | 16px | Top | Tablet | RTL, stacked KPIs |
| SCR / Dashboard / Default / Mobile / AR | 390×1200 | Vertical | 16px | 12px | Top | Mobile | RTL, single column |
| SCR / Dashboard / Empty / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL, no operational data |
| SCR / Dashboard / Super Admin Scoped / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL, with SchoolBrandingPanel |
| SCR / Dashboard / Classes Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL, modal overlay |
| SCR / Dashboard / Fee Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL, modal overlay |

**Child Components**:
- StatisticsCards (7 KPI cards)
- FinancialAnalysisPanel (charts, progress bars)
- ClassFeesTable (editable table)
- NotificationsPanel
- RecentActivityPanel
- RecentPaymentsPanel
- OverdueStudentsPanel
- SchoolBrandingPanel (super-admin only)
- ClassesModal
- FeeModal

**Responsive Notes**:
- KPI grid: xl:grid-cols-4, sm:grid-cols-2
- Panels: Stack vertically on mobile
- Charts: Resize gracefully

**RTL/LTR**: Full support

**Dark Mode**: Full support via CSS variables

**Prototyping Notes**:
- Dashboard → Classes Modal: Open overlay
- Dashboard → Fee Modal: Open overlay
- Dashboard → Student detail: Navigate to payments

---

### Page 10: Screens - Core App (Students, Teachers, Attendance)

**Purpose**: Academic management screens

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Students / Default / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL, Active tab default |
| SCR / Students / Default / Desktop / EN | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Students / Default / Tablet / AR | 768×1200 | Vertical | 24px | 16px | Top | Tablet | RTL, card layout |
| SCR / Students / Default / Mobile / AR | 390×1200 | Vertical | 16px | 12px | Top | Mobile | RTL, card layout |
| SCR / Students / Transferred Tab / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Students / Suspended Tab / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Students / Deleted Tab / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Students / Empty / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL, no results |
| SCR / Students / Add Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL, 3-step wizard |
| SCR / Students / Edit Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Students / Delete Confirm / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Students / Import Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL, Excel preview |
| SCR / Students / Account Card Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL, credentials display |
| SCR / Teachers / Default / Desktop / AR | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Teachers / Default / Desktop / EN | 1440×1400 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Teachers / Default / Tablet / AR | 768×1200 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Teachers / Default / Mobile / AR | 390×1200 | Vertical | 16px | 12px | Top | Mobile | RTL |
| SCR / Teachers / Add Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Teachers / Edit Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Teachers / Import Modal / Desktop / AR | 1440×1400 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Attendance / Default / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, spreadsheet table |
| SCR / Attendance / Default / Desktop / EN | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Attendance / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Attendance / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL, card layout |
| SCR / Attendance / Filtered / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, date/class filtered |

**Child Components**:
- StudentsTabs (4 tabs)
- StudentsToolbar
- StudentsTable (desktop) / mobile cards
- StudentsStats
- AddStudentModal (3-step wizard)
- EditStudentModal
- DeleteConfirmModal
- ImportExcelModal
- AccountCardModal
- TeachersTable
- TeacherFormModal
- TeacherImportModal
- TeachersStats
- AttendanceTable
- BulkStatusControls

**Responsive Notes**:
- Tables → Cards on mobile
- 4-column stats → 2-column on tablet, 1-column on mobile
- Modals → Full-screen sheets on mobile

**RTL/LTR**: Full support

**Dark Mode**: Full support

**Prototyping Notes**:
- Students tab switching
- Add student wizard flow
- Attendance bulk status assignment

---

### Page 11: Screens - Finance (Payments, Salaries, Expenses)

**Purpose**: Financial management screens

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Payments / Default / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, 4 stat cards + table |
| SCR / Payments / Default / Desktop / EN | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Payments / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Payments / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL, card layout |
| SCR / Payments / Detail Panel / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Right | Desktop | RTL, drawer overlay |
| SCR / Payments / Payment Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Payments / Archive Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Expenses / Invoices Tab / Desktop / AR | 1440×1500 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Expenses / Types Tab / Desktop / AR | 1440×1500 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Expenses / Default / Tablet / AR | 768×1300 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Expenses / Default / Mobile / AR | 390×1300 | Vertical | 16px | 12px | Top | Mobile | RTL |
| SCR / Salaries / Main / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, nested sidebar |
| SCR / Salaries / Schedule / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Deductions / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Calendar / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Reports / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Archive / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Settings / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Salaries / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL, sidebar → chips |
| SCR / Salaries / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL |
| SCR / Salaries / Pay Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Salaries / Teacher Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |

**Child Components**:
- PaymentsTable
- PaymentsFilters
- PaymentsStats
- PaymentModal
- StudentDetailPanel (drawer)
- ArchiveDetailModal
- PaymentsArchive
- ExpensesTable (Invoices/Types)
- ExpenseForm
- SalariesSidebar (7 sections)
- TeachersTable (Salaries)
- QuickAccessGrid
- PaySalaryModal
- TeacherModal
- DailyLogModal
- ExportModal
- PrintModal

**Responsive Notes**:
- Payments: Detail panel → full-screen overlay on mobile
- Salaries: Nested sidebar → tab chips on tablet/mobile
- Tables → card layouts

**RTL/LTR**: Full support

**Dark Mode**: Full support

**Prototyping Notes**:
- Payments → Student detail panel open
- Salaries sidebar section switching
- Payment modal flow

---

### Page 12: Screens - Reports (Reports, Monitoring, Fee Notifications)

**Purpose**: Reporting and notification screens

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Reports / Default / Desktop / AR | 1440×1500 | Vertical | 48px | 24px | Top | Desktop | RTL, 4 report cards |
| SCR / Reports / Default / Desktop / EN | 1440×1500 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Reports / Default / Tablet / AR | 768×1300 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Reports / Default / Mobile / AR | 390×1300 | Vertical | 16px | 12px | Top | Mobile | RTL |
| SCR / Monitoring / Messages / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Monitoring / Homework / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Monitoring / Detail Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL, edit mode |
| SCR / Monitoring / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Monitoring / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL |
| SCR / Fee Notifications / Composer / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, 2-column |
| SCR / Fee Notifications / History Modal / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Fee Notifications / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Fee Notifications / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL |

**Child Components**:
- Reports cards (Students, Payments, Expenses, Salaries)
- FinancialSummaryStrip
- MonitoringTable (Messages/Homework)
- DetailModal (with audit sidebar)
- FeeNotificationsComposer
- HistoryTable
- HistoryModal

**Responsive Notes**:
- Reports cards: 2-column on tablet, 1-column on mobile
- Monitoring: Detail modal → full-height sheet
- Fee Notifications: 2-column → stacked on tablet

**RTL/LTR**: Full support

**Dark Mode**: Full support

**Prototyping Notes**:
- Monitoring detail edit mode
- Fee notifications target mode switching

---

### Page 13: Screens - Admin (Schools, Subscriptions)

**Purpose**: Legacy admin pages

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Schools / Legacy / Desktop / AR | 1440×1200 | Vertical | 48px | 24px | Top | Desktop | RTL, older styling |
| SCR / Schools / Legacy / Desktop / EN | 1440×1200 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Subscriptions / Legacy / Desktop / AR | 1440×1200 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Subscriptions / Legacy / Desktop / EN | 1440×1200 | Vertical | 48px | 24px | Top | Desktop | LTR |

**Child Components**: Legacy list components

**Responsive Notes**: Minimal responsive support

**Prototyping Notes**: Static reference

---

### Page 14: Screens - Super Admin

**Purpose**: Platform administration console (10 tab panels)

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Target Device | Notes |
|------------|------|-----------|---------|-----|-----------|---------------|-------|
| SCR / Super Admin / Overview / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, diagnostics grid |
| SCR / Super Admin / Schools / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, schools list |
| SCR / Super Admin / Users / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, users list |
| SCR / Super Admin / Subscriptions / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Super Admin / Audit / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, audit log |
| SCR / Super Admin / Roles / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, custom roles |
| SCR / Super Admin / Trash / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL, soft-deleted items |
| SCR / Super Admin / Notifications / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Super Admin / Monitoring / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Super Admin / Branches / Desktop / AR | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | RTL |
| SCR / Super Admin / School Form / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL, modal |
| SCR / Super Admin / User Form / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL, modal |
| SCR / Super Admin / Delete School Dialog / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Super Admin / Delete User Dialog / Desktop / AR | 1440×1600 | Vertical | 0px | 0px | Center | Desktop | RTL |
| SCR / Super Admin / Overview / Desktop / EN | 1440×1600 | Vertical | 48px | 24px | Top | Desktop | LTR |
| SCR / Super Admin / Default / Tablet / AR | 768×1400 | Vertical | 24px | 16px | Top | Tablet | RTL |
| SCR / Super Admin / Default / Mobile / AR | 390×1400 | Vertical | 16px | 12px | Top | Mobile | RTL |

**Child Components**:
- Tab navigation rail (10 tabs)
- OverviewTab (diagnostics, KPIs)
- SchoolsTab + SchoolForm
- UsersTab + UserForm
- SubscriptionsTab
- AuditLogTab
- RolesTab + RoleForm
- TrashTab
- NotificationsTab
- MonitoringTab
- BranchesTab
- DeleteConfirmDialog

**Responsive Notes**:
- Tab rail → horizontal scroll on mobile
- Forms → responsive modals

**RTL/LTR**: Full support

**Dark Mode**: Full support

**Prototyping Notes**:
- Tab switching
- School/User form flows
- Delete confirmation flow

---

### Page 15: Prototypes / User Flows

**Purpose**: Interactive prototype demonstrations

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FLOW / Authentication | 1440×1024 | — | — | — | — | Login → Dashboard or Error |
| FLOW / Admin Daily | 1440×1400 | — | — | — | — | Dashboard → Students → Payments |
| FLOW / Employee Collection | 1440×1400 | — | — | — | — | Payments → Detail Panel → Modal |
| FLOW / Super Admin Operations | 1440×1600 | — | — | — | — | Overview → Schools → Form → Confirm |
| FLOW / School Scope Switching | 1440×1200 | — | — | — | — | Scope banner → Select → Content refresh |
| FLOW / Attendance Recording | 1440×1400 | — | — | — | — | Date → Bulk assign → Save |
| FLOW / Student CRUD | 1440×1400 | — | — | — | — | Tab → Filter → Add/Edit → Confirm |
| FLOW / Teacher Management | 1440×1400 | — | — | — | — | Filter → Edit → Import |
| FLOW / Salary Operations | 1440×1600 | — | — | — | — | Section → Modal → Pay |
| FLOW / Monitoring Moderation | 1440×1600 | — | — | — | — | List → Detail → Edit → Confirm |

**Hotspot Mappings**:
- Navigation links → Navigate to screen
- Modal triggers → Open overlay
- Form submits → Swap overlay or Navigate
- Cancel buttons → Close overlay

**Motion Specs**:
- Navigation transitions: 200ms Ease Out
- Modal open: 180ms Ease Out + backdrop fade
- Modal close: 150ms Ease In

---

### Page 16: Archive / Inferred

**Purpose**: Items not visually confirmed or requiring verification

#### Frames:

| Frame Name | Size | Direction | Padding | Gap | Alignment | Notes |
|------------|------|-----------|---------|-----|-----------|-------|
| FRA / Archive / Legacy Routes | 1440×900 | Vertical | 48px | 24px | Top-left | /users redirect, /schools legacy styling |
| FRA / Archive / Runtime States | 1440×1200 | Vertical | 48px | 24px | Top-left | Data-dependent states, scope variations |
| FRA / Archive / Verification Notes | 1440×800 | Vertical | 48px | 24px | Top-left | Confidence levels per screen |
| FRA / Archive / Gap Analysis | 1440×1000 | Vertical | 48px | 24px | Top-left | Known missing items |
| FRA / Archive / Deprecated Tokens | 1440×600 | Vertical | 48px | 24px | Top-left | Legacy 224px sidebar, purple button defaults |

**Categories**:
1. **Visually Confirmed**: Login (live screenshots)
2. **Code-Derived High Confidence**: Dashboard, Students, Teachers, Attendance (manual screenshots + code analysis)
3. **Code-Derived Low Confidence**: Payments, Monitoring, Fee Notifications, Reports, Salaries, Super Admin (live data dependent)
4. **Inferred**: Mobile variants without screenshots

---

## Frame Rules Summary

### Viewport Dimensions
- **Desktop**: 1440×[variable] (min 1024, max 1800 height)
- **Tablet**: 768×1024
- **Mobile**: 390×844

### Layout Constraints
- **Sidebar**: Fixed 280px width, fixed position (start/end)
- **Topbar**: Fixed 64px height, pinned top
- **Content**: Fill container, overflow scroll

### Auto Layout
- **Direction**: Vertical (most screens), Horizontal (split layouts)
- **Padding**: 48px desktop, 24px tablet, 16px mobile
- **Gap**: 24px desktop, 16px tablet, 12px mobile
- **Alignment**: Top-start for RTL, Top-left for LTR

### Resizing Behavior
- **Cards**: Fill container, hug contents vertically
- **Tables**: Fill container, fixed header
- **Pills/Badges**: Hug contents
- **Modals**: Fixed max-width, hug contents vertically

---

## Verification Status

| Screen | Live Screenshot | Manual Reference | Code-Derived | Status |
|--------|-----------------|------------------|--------------|--------|
| Login | ✅ Yes | ✅ Yes | ✅ Yes | **Confirmed** |
| Dashboard | ❌ No | ✅ Yes | ✅ Yes | High Confidence |
| Attendance | ❌ No | ✅ Yes | ✅ Yes | High Confidence |
| Students | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Teachers | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Payments | ❌ No | ❌ Blank | ✅ Yes | Code-Derived |
| Salaries | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Expenses | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Reports | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Monitoring | ❌ No | ❌ No | ✅ Yes | Code-Derived |
| Fee Notifications | ❌ No | ❌ Blank | ✅ Yes | Code-Derived |
| Super Admin | ❌ No | ❌ No | ✅ Yes | Code-Derived |

---

## Total Frame Count Estimate

| Page | Frames |
|------|--------|
| 01 Cover | 3 |
| 02 Foundations | 4 |
| 03 Tokens | 8 |
| 04 Icons & Assets | 6 |
| 05 Components | 13 |
| 06 Patterns | 8 |
| 07 Templates | 5 |
| 08 Screens - Auth | 13 |
| 09 Screens - Dashboard | 9 |
| 10 Screens - Core App | 26 |
| 11 Screens - Finance | 21 |
| 12 Screens - Reports | 13 |
| 13 Screens - Admin | 4 |
| 14 Screens - Super Admin | 17 |
| 15 Prototypes | 10 |
| 16 Archive | 5 |
| **Total** | **165 frames** |
