<!-- Generated: 2026-04-08 (v2) — Phase 2: Figma Production Preparation -->
# Figma Build Checklist

## Phase 1: File & Foundation Setup

- [ ] Create new Figma file "School Admin Design System"
- [ ] Create page: 01_Cover
- [ ] Create page: 02_Foundations
- [ ] Create page: 03_Tokens
- [ ] Create page: 04_Icons_Assets
- [ ] Create page: 05_Components
- [ ] Create page: 06_Patterns
- [ ] Create page: 07_Templates
- [ ] Create page: 08_Screens_Auth
- [ ] Create page: 09_Screens_Dashboard
- [ ] Create page: 10_Screens_Core
- [ ] Create page: 11_Screens_Finance
- [ ] Create page: 12_Screens_Reports
- [ ] Create page: 13_Screens_Admin
- [ ] Create page: 14_Screens_SuperAdmin
- [ ] Create page: 15_Prototypes
- [ ] Create page: 16_Archive

---

## Phase 2: Variable Collections

- [ ] Create collection "Primitives"
  - [ ] Add color primitives (primary-50 through primary-700)
  - [ ] Add cyan primitives (cyan-400, cyan-500)
  - [ ] Add spacing scale (0, 4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 72, 80)
  - [ ] Add radius scale (xs=6, sm=10, md=14, lg=18, xl=24, 2xl=32, full=9999)

- [ ] Create collection "Semantic" with modes: Light, Dark
  - [ ] Add color/background
  - [ ] Add color/background-subtle
  - [ ] Add color/foreground
  - [ ] Add color/surface
  - [ ] Add color/surface-strong
  - [ ] Add color/surface-muted
  - [ ] Add color/surface-soft
  - [ ] Add color/surface-hover
  - [ ] Add color/surface-active
  - [ ] Add color/primary
  - [ ] Add color/primary-strong
  - [ ] Add color/primary-soft
  - [ ] Add color/secondary
  - [ ] Add color/text-primary
  - [ ] Add color/text-secondary
  - [ ] Add color/text-tertiary
  - [ ] Add color/text-on-primary
  - [ ] Add color/brand-text-strong
  - [ ] Add color/border
  - [ ] Add color/border-strong
  - [ ] Add color/border-focus
  - [ ] Add color/success
  - [ ] Add color/success-soft
  - [ ] Add color/warning
  - [ ] Add color/warning-soft
  - [ ] Add color/danger
  - [ ] Add color/danger-soft
  - [ ] Add color/info
  - [ ] Add color/info-soft
  - [ ] Add color/button-accent
  - [ ] Add color/button-accent-strong
  - [ ] Add color/focus-ring
  - [ ] Add color/focus-ring-solid
  - [ ] Add color/topbar-bg
  - [ ] Add color/sidebar-bg
  - [ ] Add color/sidebar-border
  - [ ] Add color/sidebar-item-hover
  - [ ] Add color/grid-line
  - [ ] Set Light mode values
  - [ ] Set Dark mode values

- [ ] Create collection "Brand" with modes per theme preset (14 modes)
  - [ ] blue-academic mode
  - [ ] blue-modern mode
  - [ ] blue-premium mode
  - [ ] green-growth mode
  - [ ] green-heritage mode
  - [ ] green-stem mode
  - [ ] warm-leadership mode
  - [ ] warm-desert mode
  - [ ] warm-scholars mode
  - [ ] purple-royal mode
  - [ ] purple-creative mode
  - [ ] purple-tech mode
  - [ ] classic-white mode
  - [ ] dark-professional mode

- [ ] Create collection "Layout"
  - [ ] layout/sidebar-width: 280px
  - [ ] layout/sidebar-width-collapsed: 64px
  - [ ] layout/topbar-height: 64px
  - [ ] layout/glass-blur: 22px
  - [ ] layout/breakpoint-sm: 640
  - [ ] layout/breakpoint-md: 768
  - [ ] layout/breakpoint-lg: 1024
  - [ ] layout/breakpoint-xl: 1280

- [ ] Create collection "Z-Index"
  - [ ] z-sidebar: 60
  - [ ] z-topbar: 40
  - [ ] z-modal: 200
  - [ ] z-toast: 300

- [ ] Create collection "Motion"
  - [ ] motion/fast: 120ms ease
  - [ ] motion/base: 200ms ease
  - [ ] motion/slow: 320ms ease
  - [ ] motion/spring: 300ms cubic-bezier(0.34, 1.56, 0.64, 1)

---

## Phase 3: Styles

- [ ] Create Text Styles
  - [ ] text/display-xl (Cairo/Inter 56px/900/1.1)
  - [ ] text/heading-xl (Cairo/Inter 32px/900/1.2)
  - [ ] text/heading-lg (Cairo/Inter 24px/900/1.25)
  - [ ] text/heading-md (Cairo/Inter 20px/800/1.3)
  - [ ] text/heading-sm (Cairo/Inter 18px/800/1.35)
  - [ ] text/body-lg (Cairo/Inter 16px/500/1.7)
  - [ ] text/body-md (Cairo/Inter 14px/500/1.6)
  - [ ] text/body-sm (Cairo/Inter 12px/500/1.5)
  - [ ] text/label-lg (Cairo/Inter 14px/800/1.4)
  - [ ] text/label-md (Cairo/Inter 12px/800/1.35)
  - [ ] text/label-sm (Cairo/Inter 11px/800/1.3)
  - [ ] text/overline (Cairo/Inter 10px/900/1.2, letter-spacing 0.15em)

- [ ] Create Color Styles
  - [ ] semantic/primary
  - [ ] semantic/primary-strong
  - [ ] semantic/secondary
  - [ ] semantic/background
  - [ ] semantic/foreground
  - [ ] semantic/surface
  - [ ] semantic/surface-strong
  - [ ] semantic/text-primary
  - [ ] semantic/text-secondary
  - [ ] semantic/border
  - [ ] semantic/success
  - [ ] semantic/warning
  - [ ] semantic/danger
  - [ ] semantic/info

- [ ] Create Effect Styles
  - [ ] effect/shadow-xs
  - [ ] effect/shadow-sm
  - [ ] effect/shadow-md
  - [ ] effect/shadow-lg
  - [ ] effect/shadow-xl
  - [ ] effect/shadow-primary
  - [ ] effect/shadow-inset

---

## Phase 4: Core Components

### UI Primitives

- [ ] Build CMP / UI / Button
  - [ ] Add variant properties: tone, size, state
  - [ ] Create all variant combinations
  - [ ] Apply auto layout
  - [ ] Bind to variables

- [ ] Build CMP / UI / Input
  - [ ] Add variant properties: state, hasLeadingIcon, hasTrailingAction
  - [ ] Create variants

- [ ] Build CMP / UI / Card
  - [ ] Card base component
  - [ ] CardHeader subcomponent
  - [ ] CardContent subcomponent
  - [ ] CardFooter subcomponent

- [ ] Build CMP / UI / StatsCard
  - [ ] Add variant properties: tone, hasTrend
  - [ ] Create variants

### Shell Components

- [ ] Build CMP / Shell / AppSidebar
  - [ ] Desktop variant (280px, sticky)
  - [ ] Mobile variant (overlay, toggleable)
  - [ ] RTL variant (right-aligned)
  - [ ] Navigation items with active/hover states
  - [ ] School scope selector
  - [ ] Profile menu trigger

- [ ] Build CMP / Shell / AppShellTopbar
  - [ ] Title area
  - [ ] Academic year badge
  - [ ] Ping indicator
  - [ ] Profile menu integration

- [ ] Build CMP / Shell / ProfileMenu
  - [ ] Trigger button
  - [ ] Expandable panel (288px width)
  - [ ] Theme/language controls
  - [ ] Sign-out action

### Navigation Components

- [ ] Build CMP / Navigation / Breadcrumb
  - [ ] Link variant
  - [ ] Current page variant
  - [ ] RTL/LTR support

- [ ] Build CMP / Navigation / ListPagination
  - [ ] Page buttons
  - [ ] Active state
  - [ ] Disabled state (prev/next at edges)

- [ ] Build CMP / Navigation / StudentsTabs
  - [ ] Active tab
  - [ ] Transferred tab
  - [ ] Suspended tab
  - [ ] Deleted tab

### Feedback Components

- [ ] Build CMP / Feedback / ConfirmDialog
  - [ ] Danger tone variant
  - [ ] Primary tone variant
  - [ ] Busy state

- [ ] Build CMP / Feedback / Toast
  - [ ] Success variant
  - [ ] Error variant
  - [ ] Warning variant
  - [ ] Info variant

- [ ] Build CMP / Feedback / Skeleton
  - [ ] SkBox
  - [ ] StatCardSkeleton
  - [ ] TableSkeleton
  - [ ] DashboardSkeleton

### Data Display Components

- [ ] Build CMP / Data / DataTableShell
  - [ ] Loading state
  - [ ] Error state
  - [ ] Empty state
  - [ ] Data state

### Brand Components

- [ ] Build CMP / Brand / SchoolLogo
  - [ ] Image variant
  - [ ] Initials fallback variant

- [ ] Build CMP / Brand / BrandLockup
  - [ ] With text variant
  - [ ] Logo only variant

### Control Components

- [ ] Build CMP / Toggle / ThemeModeToggle
  - [ ] Floating variant
  - [ ] Inline variant
  - [ ] Compact variant

- [ ] Build CMP / Toggle / LanguageToggle
  - [ ] Compact mode
  - [ ] Full mode

---

## Phase 5: App Shell Assembly

- [ ] Create template: TPL / AppShell / Desktop / LTR
- [ ] Create template: TPL / AppShell / Desktop / RTL
- [ ] Create template: TPL / AppShell / Tablet
- [ ] Create template: TPL / AppShell / Mobile
- [ ] Verify sidebar + topbar + content area layout
- [ ] Test dark mode on shell

---

## Phase 6: Auth Screens

- [ ] SCR / Login / Default / Desktop / AR
- [ ] SCR / Login / Default / Desktop / EN
- [ ] SCR / Login / Error / Desktop / AR
- [ ] SCR / Login / Loading / Desktop / AR
- [ ] SCR / Login / Dark / Desktop / AR
- [ ] SCR / Login / Default / Tablet / AR
- [ ] SCR / Login / Default / Mobile / AR
- [ ] SCR / ForgotPassword / Default / Desktop / AR
- [ ] SCR / ForgotPassword / Default / Desktop / EN
- [ ] SCR / AccessDenied / Default / Desktop / AR
- [ ] SCR / AccessDenied / Default / Desktop / EN
- [ ] SCR / SubscriptionExpired / Default / Desktop / AR
- [ ] SCR / SubscriptionExpired / Default / Desktop / EN
- [ ] SCR / NotFound / Default / Desktop / AR
- [ ] SCR / Error / Default / Desktop / AR

---

## Phase 7: Dashboard Screen

- [ ] SCR / Dashboard / Default / Desktop / AR
- [ ] SCR / Dashboard / Default / Desktop / EN
- [ ] SCR / Dashboard / Loading / Desktop / AR
- [ ] SCR / Dashboard / Empty / Desktop / AR
- [ ] SCR / Dashboard / SuperAdminScoped / Desktop / AR
- [ ] SCR / Dashboard / Default / Tablet / AR
- [ ] SCR / Dashboard / Default / Mobile / AR
- [ ] OVL / Dashboard / ClassesModal
- [ ] OVL / Dashboard / FeeModal

---

## Phase 8: Students Screens

- [ ] SCR / Students / ActiveTab / Desktop / AR
- [ ] SCR / Students / TransferredTab / Desktop / AR
- [ ] SCR / Students / SuspendedTab / Desktop / AR
- [ ] SCR / Students / DeletedTab / Desktop / AR
- [ ] SCR / Students / Default / Desktop / EN
- [ ] SCR / Students / Default / Tablet / AR
- [ ] SCR / Students / Default / Mobile / AR
- [ ] SCR / Students / Empty / Desktop / AR
- [ ] OVL / Students / AddStudentModal
- [ ] OVL / Students / EditStudentModal
- [ ] OVL / Students / DeleteConfirmModal
- [ ] OVL / Students / ImportExcelModal
- [ ] OVL / Students / AccountCardModal

---

## Phase 9: Teachers Screens

- [ ] SCR / Teachers / Default / Desktop / AR
- [ ] SCR / Teachers / Default / Desktop / EN
- [ ] SCR / Teachers / Default / Tablet / AR
- [ ] SCR / Teachers / Default / Mobile / AR
- [ ] OVL / Teachers / TeacherFormModal
- [ ] OVL / Teachers / TeacherImportModal
- [ ] OVL / Teachers / AccountCardModal

---

## Phase 10: Attendance Screen

- [ ] SCR / Attendance / Default / Desktop / AR
- [ ] SCR / Attendance / Default / Desktop / EN
- [ ] SCR / Attendance / Default / Tablet / AR
- [ ] SCR / Attendance / Default / Mobile / AR
- [ ] SCR / Attendance / Filtered / Desktop / AR

---

## Phase 11: Payments Screens

- [ ] SCR / Payments / Default / Desktop / AR
- [ ] SCR / Payments / Default / Desktop / EN
- [ ] SCR / Payments / Filtered / Desktop / AR
- [ ] SCR / Payments / Default / Tablet / AR
- [ ] SCR / Payments / Default / Mobile / AR
- [ ] OVL / Payments / PaymentModal
- [ ] OVL / Payments / StudentDetailPanel
- [ ] OVL / Payments / ArchiveDetailModal

---

## Phase 12: Salaries Screens

- [ ] SCR / Salaries / Main / Desktop / AR
- [ ] SCR / Salaries / Schedule / Desktop / AR
- [ ] SCR / Salaries / Deductions / Desktop / AR
- [ ] SCR / Salaries / Calendar / Desktop / AR
- [ ] SCR / Salaries / Reports / Desktop / AR
- [ ] SCR / Salaries / Archive / Desktop / AR
- [ ] SCR / Salaries / Settings / Desktop / AR
- [ ] SCR / Salaries / Default / Tablet / AR
- [ ] SCR / Salaries / Default / Mobile / AR
- [ ] OVL / Salaries / TeacherModal
- [ ] OVL / Salaries / PaySalaryModal
- [ ] OVL / Salaries / DailyLogModal
- [ ] OVL / Salaries / ExportModal
- [ ] OVL / Salaries / PrintModal
- [ ] OVL / Salaries / LessonTimesModal
- [ ] OVL / Salaries / PricesModal
- [ ] OVL / Salaries / TeacherDetailPanel

---

## Phase 13: Expenses Screens

- [ ] SCR / Expenses / InvoicesTab / Desktop / AR
- [ ] SCR / Expenses / TypesTab / Desktop / AR
- [ ] SCR / Expenses / Default / Tablet / AR
- [ ] SCR / Expenses / Default / Mobile / AR

---

## Phase 14: Reports Screen

- [ ] SCR / Reports / Default / Desktop / AR
- [ ] SCR / Reports / Default / Desktop / EN
- [ ] SCR / Reports / Default / Tablet / AR
- [ ] SCR / Reports / Default / Mobile / AR

---

## Phase 15: Monitoring Screens

- [ ] SCR / Monitoring / MessagesTab / Desktop / AR
- [ ] SCR / Monitoring / HomeworkTab / Desktop / AR
- [ ] SCR / Monitoring / Default / Tablet / AR
- [ ] SCR / Monitoring / Default / Mobile / AR
- [ ] OVL / Monitoring / DetailModal

---

## Phase 16: Fee Notifications Screens

- [ ] SCR / FeeNotifications / Composer / Desktop / AR
- [ ] SCR / FeeNotifications / Default / Tablet / AR
- [ ] SCR / FeeNotifications / Default / Mobile / AR
- [ ] OVL / FeeNotifications / HistoryModal

---

## Phase 17: Super Admin Screens

- [ ] SCR / SuperAdmin / OverviewTab / Desktop / AR
- [ ] SCR / SuperAdmin / SchoolsTab / Desktop / AR
- [ ] SCR / SuperAdmin / UsersTab / Desktop / AR
- [ ] SCR / SuperAdmin / SubscriptionsTab / Desktop / AR
- [ ] SCR / SuperAdmin / AuditTab / Desktop / AR
- [ ] SCR / SuperAdmin / RolesTab / Desktop / AR
- [ ] SCR / SuperAdmin / TrashTab / Desktop / AR
- [ ] SCR / SuperAdmin / NotificationsTab / Desktop / AR
- [ ] SCR / SuperAdmin / MonitoringTab / Desktop / AR
- [ ] SCR / SuperAdmin / BranchesTab / Desktop / AR
- [ ] SCR / SuperAdmin / Default / Desktop / EN
- [ ] SCR / SuperAdmin / Default / Tablet / AR
- [ ] SCR / SuperAdmin / Default / Mobile / AR
- [ ] OVL / SuperAdmin / SchoolFormModal
- [ ] OVL / SuperAdmin / UserFormModal
- [ ] OVL / SuperAdmin / DeleteSchoolDialog
- [ ] OVL / SuperAdmin / DeleteUserDialog

---

## Phase 18: Legacy Screens

- [ ] SCR / Schools / Legacy / Desktop / AR
- [ ] SCR / Subscriptions / Legacy / Desktop / AR

---

## Phase 19: Prototype Wiring

- [ ] Wire auth flow (Login → Dashboard)
- [ ] Wire dashboard navigation flow
- [ ] Wire student CRUD flow
- [ ] Wire teacher management flow
- [ ] Wire attendance recording flow
- [ ] Wire payments collection flow
- [ ] Wire salary operations flow
- [ ] Wire expenses management flow
- [ ] Wire reports export flow
- [ ] Wire monitoring moderation flow
- [ ] Wire fee notifications sending flow
- [ ] Wire super admin operations flow
- [ ] Wire school scope switching flow
- [ ] Wire settings configuration flow

---

## Phase 20: Review & Polish

- [ ] Cross-check all component bindings to variables
- [ ] Verify RTL mirrors for all desktop screens
- [ ] Verify dark mode variants
- [ ] Verify tablet/mobile responsive variants
- [ ] Final naming convention audit
- [ ] Check all 14 theme preset applications
- [ ] Verify all interaction states documented
- [ ] Add developer handoff notes to cover page
