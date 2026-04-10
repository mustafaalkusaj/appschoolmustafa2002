# Component Spec Sheets

## Use This File

- This file upgrades the inventory into Figma-ready component specs.
- Source of truth remains the codebase under `/Users/musatafa/school-app`.
- Use this together with `component-inventory.csv`, `design-tokens.json`, and `interaction-states.md`.

## Canonical vs Legacy

- Treat the current shell as canonical: `AppSidebar`, `AppShellTopbar`, `ProfileMenu`, `ThemeModeToggle`, `ui-input`, `ui-button`, glass surfaces, and the blue/cyan semantic tokens.
- Treat `components/ui/button.tsx` as active but partially legacy: it is still used in dashboard sections and keeps a purple default palette.
- Treat the current desktop shell width as `280px`, even though legacy CSS variables still expose `224px`.

## NAV / Sidebar / Shell

### AppSidebar

- Source: `/Users/musatafa/school-app/components/AppSidebar.tsx`
- Purpose: primary authenticated navigation rail with role-aware groups and school scope controls.
- Anatomy:
  - mobile floating toggle button
  - mobile backdrop
  - sidebar header with product lockup and close button
  - grouped navigation sections
  - nav item with icon, label, active chevron
  - footer status card with academic year + ping indicator
  - optional school selector for super admin school scope
  - embedded profile menu
- Dimensions:
  - desktop width: `280px`
  - mobile drawer width: `280px`
  - header height: `80px`
- Variants:
  - `viewport=desktop|mobile-drawer`
  - `role=employee|admin|super_admin`
  - `theme=light|dark`
  - `scopeSelector=hidden|visible`
- States:
  - `mobile=closed|open`
  - `navItem=default|hover|active`
  - `schoolSelector=default|focus|disabled`
- Figma recommendation:
  - component set `NAV / Sidebar / Shell`
  - nested components:
    - `NAV / Sidebar / Group Label`
    - `NAV / Sidebar / Item`
    - `NAV / Sidebar / Footer Card`
    - `FORM / School Scope Select`
  - expose boolean properties for `showFloatingToggle`, `showSchoolSelector`, `showProfileSummary`
- Notes:
  - active item uses filled brand background and white icon/text
  - mobile drawer uses backdrop blur and dismiss-on-backdrop
  - label copy changes for Arabic/English and chevrons flip with locale

### AppShellTopbar

- Source: `/Users/musatafa/school-app/components/AppShellTopbar.tsx`
- Purpose: persistent page title row above authenticated content.
- Anatomy:
  - mobile menu button
  - title block with title + subtitle
  - optional action slot
  - optional academic year pill
  - ping indicator
  - circular profile menu trigger
- Dimensions:
  - height: `80px`
  - desktop offset from left/right shell edge: `280px` sidebar footprint on desktop
- Variants:
  - `mode=fixed|static`
  - `showAcademicYear=true|false`
  - `actions=none|single|multi`
  - `theme=light|dark`
- States:
  - `menuButton=default|hover|pressed`
  - `actionSlot=empty|filled`
  - `profile=idle|open`
- Figma recommendation:
  - component set `NAV / Topbar / Shell`
  - properties:
    - `hasSubtitle`
    - `hasActions`
    - `showAcademicYear`
    - `viewport=desktop|tablet|mobile`

### ProfileMenu

- Source: `/Users/musatafa/school-app/components/ProfileMenu.tsx`
- Purpose: authenticated identity, locale switch, theme switch, logout.
- Anatomy:
  - pill trigger
  - avatar
  - name + role
  - caret
  - dropdown panel
  - identity summary row
  - language action row
  - theme switch group
  - sign-out danger action
- Dimensions:
  - trigger height: `46px`
  - trigger max width: `280px`
  - panel width: `288px`
- Variants:
  - `avatar=image|initials`
  - `locale=ar|en`
  - `theme=light|dark`
- States:
  - `menu=closed|open`
  - `action=default|hover|danger`
  - `themeSwitch=system|light|dark`
- Figma recommendation:
  - `NAV / Profile Menu / Trigger`
  - `NAV / Profile Menu / Panel`
  - slot component for embedded `ThemeModeToggle`

### ThemeModeToggle

- Source: `/Users/musatafa/school-app/components/ThemeModeToggle.tsx`
- Purpose: tri-state theme switch.
- Anatomy:
  - enclosing pill rail
  - three option chips
  - icon per option
  - optional label per option
- Variants:
  - `variant=floating|inline`
  - `compact=true|false`
  - `showLabels=true|false`
  - `theme=light|dark`
  - `locale=ar|en`
- States:
  - `selection=system|light|dark`
  - `option=default|hover|active`
- Figma recommendation:
  - `CTRL / Theme Switch / 3-way`
  - property groups:
    - `presentation=floating|inline`
    - `density=default|compact`
    - `language=ar|en`

## FORM / Inputs / Buttons

### Auth Input (`ui-input`)

- Source: `/Users/musatafa/school-app/app/[locale]/globals.css`
- Purpose: auth-first glass input style also reusable in form-heavy overlays.
- Anatomy:
  - rounded field shell
  - optional leading icon
  - optional trailing action
  - placeholder/helper/error text outside component frame
- Dimensions:
  - min height: `56px`
  - border radius: `var(--radius-input)` currently `18px`
- States:
  - `default`
  - `hover`
  - `focus`
  - `disabled`
  - `error` using external message container
- Figma recommendation:
  - `FORM / Input / Filled Glass`
  - properties:
    - `leadingIcon=true|false`
    - `trailingAction=true|false`
    - `state=default|hover|focus|disabled|error`

### Shell Button (`ui-button`)

- Source: `/Users/musatafa/school-app/app/[locale]/globals.css`
- Purpose: modern shell button system used in login and some shell actions.
- Variants:
  - `primary`
  - `secondary`
  - `ghost`
  - `danger`
- Dimensions:
  - min height: `52px`
  - radius: `var(--radius-button)` currently `16px`
- States:
  - `default`
  - `hover`
  - `disabled`
  - `loading` via spinner/icon swap in consuming screen
- Figma recommendation:
  - `ACT / Button / Shell`
  - properties:
    - `tone=primary|secondary|ghost|danger`
    - `icon=none|leading|trailing`
    - `state=default|hover|disabled|loading`

### Legacy Button Primitive (`Button`)

- Source: `/Users/musatafa/school-app/components/ui/button.tsx`
- Purpose: dashboard primitive still used in analytics/action clusters.
- Variants:
  - `default`
  - `outline`
  - `secondary`
- Sizes:
  - `default`
  - `sm`
- States:
  - `default`
  - `hover`
  - `focus`
  - `disabled`
- Figma recommendation:
  - `ACT / Button / Legacy Dashboard`
- Notes:
  - primary/outline variants use hardcoded purple values and should remain separated from shell-blue tokens in Figma

## CARD / Summary / Feedback

### Card Family

- Source: `/Users/musatafa/school-app/components/ui/card.tsx`
- Members:
  - `Card`
  - `CardHeader`
  - `CardTitle`
  - `CardDescription`
  - `CardContent`
  - `CardFooter`
- Purpose: generic container for dashboard modules and stacked content blocks.
- Figma recommendation:
  - `SURF / Card / Base`
  - use slot-based subcomponents rather than separate freehand frames for header/content/footer

### StatsCard

- Source: `/Users/musatafa/school-app/components/ui/stats-card.tsx`
- Purpose: KPI card with icon capsule, value, optional trend, optional description.
- Variants:
  - `primary`
  - `info`
  - `success`
  - `warning`
  - `danger`
  - `neutral`
- States:
  - `default`
  - `hover`
  - `loading` via skeleton replacement
- Anatomy:
  - overline label
  - large metric
  - optional trend pill + caption
  - optional description
  - icon capsule
  - decorative blur gradient
- Figma recommendation:
  - `DATA / KPI Card / Stat`
  - properties:
    - `tone`
    - `hasTrend`
    - `hasDescription`
    - `theme`

### Skeleton Family

- Source: `/Users/musatafa/school-app/components/skeleton.tsx`
- Members:
  - `StatCardSkeleton`
  - `TableSkeleton`
  - `AnalysisSkeleton`
  - `StudentCardSkeleton`
  - `DashboardSkeleton`
  - `StudentsPageSkeleton`
  - `PaymentsPageSkeleton`
- Purpose: loading placeholders with blue/cyan shimmer.
- Figma recommendation:
  - keep as separate page `Patterns / Loading`
  - create reusable shimmer fill style plus frame-level skeleton compositions

### ConfirmDialog

- Source: `/Users/musatafa/school-app/components/ConfirmDialog.tsx`
- Purpose: destructive or primary confirmation modal.
- Variants:
  - `tone=danger|primary`
- States:
  - `open`
  - `busy`
  - `dismissable`
  - `nondismissable while busy`
- Anatomy:
  - backdrop
  - icon tile
  - title
  - optional description
  - close icon button
  - confirm button
  - cancel button
- Figma recommendation:
  - `OVL / Dialog / Confirm`
  - properties:
    - `tone`
    - `hasDescription`
    - `busy`

## DATA / Tables / Pagination

### DataTableShell

- Source: `/Users/musatafa/school-app/components/school/DataTableShell.tsx`
- Purpose: normalized switch between error, loading, empty, and content states.
- States:
  - `error`
  - `loading`
  - `empty`
  - `ready`
- Anatomy:
  - state container
  - optional retry action
  - optional empty icon + empty detail + empty action
  - table content slot
  - pagination footer
- Figma recommendation:
  - `DATA / Table Shell / State Wrapper`
  - property `state=error|loading|empty|ready`

### ListPagination

- Source: `/Users/musatafa/school-app/components/school/ListPagination.tsx`
- Purpose: page navigation with first/prev/window/next/last.
- Anatomy:
  - summary label
  - first button
  - previous button
  - page window buttons
  - ellipsis marker
  - next button
  - last button
- States:
  - `default`
  - `active page`
  - `disabled edge`
- Figma recommendation:
  - `DATA / Pagination / Windowed`
  - properties:
    - `pageWindow=short|long`
    - `edgeState=start|middle|end`

## FEATURE PATTERNS / Students

### StudentsTabs

- Source: `/Users/musatafa/school-app/app/[locale]/students/_components/StudentsTabs.tsx`
- Purpose: status bucket switcher for active/transferred/suspended/deleted students.
- Anatomy:
  - icon
  - localized label
  - count pill
- States:
  - `default`
  - `hover`
  - `active`
- Figma recommendation:
  - `PAT / Students / Status Tabs`
  - properties:
    - `tab=active|transferred|suspended|deleted`
    - `state=default|hover|active`
    - `count=0|1-9|10+`

### StudentsToolbar

- Source: `/Users/musatafa/school-app/app/[locale]/students/_components/StudentsToolbar.tsx`
- Purpose: search + filters + export/print/add actions.
- Anatomy:
  - search field
  - class filter
  - section filter
  - export current button
  - export all button
  - print filtered button
  - print all cards button
  - add student button
- Variants:
  - `role=employee|admin|super_admin`
  - `activeTab=active|other`
  - `accounts=true|false`
- States:
  - `datasetLoading`
  - `printingCards`
  - `readOnly`
- Figma recommendation:
  - `PAT / Students / Toolbar`
  - use booleans for optional action visibility

### StudentsTable

- Source: `/Users/musatafa/school-app/app/[locale]/students/_components/StudentsTable.tsx`
- Purpose: desktop table and mobile stacked-card representation.
- Variants:
  - `viewport=desktop|mobile`
  - `state=loading|empty|ready`
  - `tab=active|transferred|suspended|deleted`
- Figma recommendation:
  - `DATA / Students / Table`
  - separate mobile set `DATA / Students / Card List`

## FEATURE PATTERNS / Payments

### PaymentsToolbar

- Source: `/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsToolbar.tsx`
- Purpose: compact search bar + results count.
- States:
  - `default`
  - `typing`
  - `loading`
- Figma recommendation:
  - `PAT / Payments / Search Toolbar`

### PaymentsFilters

- Source: `/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsFilters.tsx`
- Purpose: quick filters, export, add invoice, advanced sort/filter cluster.
- Anatomy:
  - operations header
  - export button
  - add invoice button
  - quick filter chips
  - advanced filter select grid
- States:
  - `exporting`
  - `schoolResolved|noSchool`
  - `canAddPayments=true|false`
- Figma recommendation:
  - `PAT / Payments / Filters`
  - property groups:
    - `exportState=idle|busy|disabled`
    - `quickFilter=all|overdue|paid|partial|discounted`

### PaymentsTable

- Source: `/Users/musatafa/school-app/app/[locale]/payments/_components/PaymentsTable.tsx`
- Purpose: student fee ledger list with desktop rows and mobile finance cards.
- Variants:
  - `viewport=desktop|mobile`
  - `state=loading|empty|ready`
  - `pagination=single|multi`
- Anatomy:
  - desktop row with values and action buttons
  - mobile card with amount emphasis and progress bar
  - footer pagination
- Figma recommendation:
  - `DATA / Payments / Table`
  - `DATA / Payments / Mobile Card`

### StudentDetailPanel

- Source: `/Users/musatafa/school-app/app/[locale]/payments/_components/StudentDetailPanel.tsx`
- Purpose: right-side detail drawer for one student's payment history.
- Anatomy:
  - overlay
  - drawer panel
  - header title + close
  - student info card
  - financial summary card
  - progress block
  - transactions header + add payment action
  - payment rows with print/delete
- States:
  - `hidden`
  - `loading payments`
  - `empty history`
  - `ready`
- Figma recommendation:
  - `OVL / Drawer / Student Finance Detail`
  - properties:
    - `state=loading|empty|ready`
    - `actions=read-only|manage`

## FEATURE PATTERNS / Dashboard

### Dashboard Action Cluster

- Source: `/Users/musatafa/school-app/app/[locale]/dashboard/_components/DashboardActions.tsx`
- Purpose: add fee, toggle class fees table, open classes modal.
- Note:
  - currently uses the legacy purple `Button` primitive for primary action styling
- Figma recommendation:
  - keep as `PAT / Dashboard / Action Cluster`
  - preserve current appearance in one frame
  - also create a normalized blue/cyan exploratory variant in Archive if redesign is desired later

### NotificationsPanel

- Source: `/Users/musatafa/school-app/app/[locale]/dashboard/_components/NotificationsPanel.tsx`
- Purpose: compact notification feed card with refresh and unread state.
- States:
  - `notifications disabled`
  - `loading`
  - `empty`
  - `feed`
  - `item read|unread`
- Figma recommendation:
  - `DATA / Notifications / Panel`
  - nested `Notification Row` with read/unread property

