<!-- Generated: 2026-04-08 (v2) -->

# Missing Or Ambiguous Items

## Overview

This document categorizes all items by their verification status: visually confirmed, code-derived (high/low confidence), missing, or inconsistent. It serves as a risk assessment for the Figma reconstruction process.

---

## Category 1: Visually Confirmed Items

These items have been verified through live screenshots or manual local screenshots.

### Auth Screens (CONFIRMED)

| Item | Evidence | Confidence |
|------|----------|------------|
| Login Desktop RTL | Live screenshot `login--desktop--rtl--default.png` | ✅ HIGH |
| Login Desktop LTR | Live screenshot `login--desktop--ltr--default.png` | ✅ HIGH |
| Login Desktop Dark | Live screenshot `login--desktop--rtl--dark.png` | ✅ HIGH |
| Login Mobile RTL | Live screenshot `login--mobile--rtl--scaled-sim.png` | ✅ HIGH |
| Login Mobile LTR | Live screenshot `login--mobile--ltr--scaled-sim.png` | ✅ HIGH |
| Login Tablet RTL | Live screenshot `login--tablet--rtl--scaled-sim.png` | ✅ HIGH |
| Login Tablet LTR | Live screenshot `login--tablet--ltr--scaled-sim.png` | ✅ HIGH |
| Login Error State | Live screenshot `login--desktop--ltr--error.png` | ✅ HIGH |
| Login Loading State | Inferred from code + live form structure | ⚠️ MEDIUM |
| Forgot Password | Code analysis + form pattern from Login | ⚠️ MEDIUM |
| Access Denied | Code analysis + gate screen pattern | ⚠️ MEDIUM |
| Subscription Expired | Code analysis + gate screen pattern | ⚠️ MEDIUM |

### Dashboard (CONFIRMED - Partial)

| Item | Evidence | Confidence |
|------|----------|------------|
| Dashboard Structure | Manual local screenshot + code | ✅ HIGH |
| StatisticsCards layout | Code analysis | ✅ HIGH |
| FinancialAnalysisPanel | Code analysis | ⚠️ MEDIUM |
| ClassFeesTable | Code analysis | ⚠️ MEDIUM |
| NotificationsPanel | Code analysis | ⚠️ MEDIUM |
| SchoolBrandingPanel (super-admin) | Code analysis | ⚠️ MEDIUM |

### Attendance (CONFIRMED - Partial)

| Item | Evidence | Confidence |
|------|----------|------------|
| Attendance Table Structure | Manual local screenshot + code | ✅ HIGH |
| Status Buttons | Code analysis | ⚠️ MEDIUM |
| Bulk Controls | Code analysis | ⚠️ MEDIUM |
| History Section | Code analysis | ⚠️ MEDIUM |

---

## Category 2: Code-Derived with High Confidence

These items are not visually confirmed but have clear, well-documented code implementations with minimal ambiguity.

### App Shell Components

| Item | Source | Confidence |
|------|--------|------------|
| AppSidebar structure | `components/AppSidebar.tsx` | ✅ HIGH |
| AppSidebar nav items | `components/AppSidebar.tsx` | ✅ HIGH |
| AppShellTopbar | `components/AppShellTopbar.tsx` | ✅ HIGH |
| ProfileMenu | `components/ProfileMenu.tsx` | ✅ HIGH |
| ThemeModeToggle | `components/ThemeModeToggle.tsx` | ✅ HIGH |
| LanguageToggle | `components/LanguageToggle.tsx` | ✅ HIGH |
| SchoolScopeBanner | `components/SchoolScopeBanner.tsx` | ✅ HIGH |

### Core UI Components

| Item | Source | Confidence |
|------|--------|------------|
| Button variants | `components/ui/button.tsx` | ✅ HIGH |
| Input states | `components/ui/input.tsx` | ✅ HIGH |
| Card family | `components/ui/card.tsx` | ✅ HIGH |
| StatsCard | `components/ui/stats-card.tsx` | ✅ HIGH |
| DataTableShell | `components/school/DataTableShell.tsx` | ✅ HIGH |
| ListPagination | `components/school/ListPagination.tsx` | ✅ HIGH |
| Breadcrumb | `components/school/Breadcrumb.tsx` | ✅ HIGH |
| ConfirmDialog | `components/ConfirmDialog.tsx` | ✅ HIGH |
| Toast | `components/toast.tsx` | ✅ HIGH |
| Skeleton variants | `components/skeleton.tsx` | ✅ HIGH |

### Students Module

| Item | Source | Confidence |
|------|--------|------------|
| StudentsTabs (4 tabs) | `app/[locale]/students/page.tsx` | ✅ HIGH |
| StudentsTable columns | `components/students/StudentsTable.tsx` | ✅ HIGH |
| StudentsToolbar actions | `components/students/StudentsToolbar.tsx` | ✅ HIGH |
| StudentsStats | `components/students/StudentsStats.tsx` | ✅ HIGH |
| AddStudentModal (3-step) | `components/students/AddStudentModal.tsx` | ✅ HIGH |
| EditStudentModal | `components/students/EditStudentModal.tsx` | ✅ HIGH |
| DeleteConfirmModal | `components/students/DeleteConfirmModal.tsx` | ✅ HIGH |
| ImportExcelModal | `components/students/ImportExcelModal.tsx` | ✅ HIGH |
| AccountCardModal | `components/students/AccountCardModal.tsx` | ✅ HIGH |

### Teachers Module

| Item | Source | Confidence |
|------|--------|------------|
| TeachersTable columns | `components/teachers/TeachersTable.tsx` | ✅ HIGH |
| TeacherFormModal | `components/teachers/TeacherFormModal.tsx` | ✅ HIGH |
| TeacherImportModal | `components/teachers/TeacherImportModal.tsx` | ✅ HIGH |
| TeachersStats | `components/teachers/TeachersStats.tsx` | ✅ HIGH |

---

## Category 3: Code-Derived with Low Confidence (Inferred)

These items are documented from code but require verification due to runtime dependencies, complex data interactions, or lack of visual reference.

### Payments Module

| Item | Issue | Confidence |
|------|-------|------------|
| PaymentsTable layout | No screenshot; live data dependent | ⚠️ MEDIUM |
| StudentDetailPanel drawer | Inferred from code | ⚠️ MEDIUM |
| PaymentModal form | Inferred from code | ⚠️ MEDIUM |
| ArchiveDetailModal | Inferred from code | ⚠️ MEDIUM |
| PaymentsArchive section | Inferred from code | ⚠️ MEDIUM |
| Progress bar colors | Code defines but runtime values vary | ⚠️ MEDIUM |

### Salaries Module

| Item | Issue | Confidence |
|------|-------|------------|
| SalariesSidebar (7 sections) | Complex nested navigation | ⚠️ MEDIUM |
| QuickAccessGrid | Inferred from code | ⚠️ MEDIUM |
| PaySalaryModal calculation modes | Multiple conditional fields | ⚠️ MEDIUM |
| DailyLogModal | Inferred from code | ⚠️ MEDIUM |
| TeacherDetailPanel | Inferred from code | ⚠️ MEDIUM |
| Schedule section | Inferred from code | ⚠️ MEDIUM |
| Deductions section | Inferred from code | ⚠️ MEDIUM |
| Calendar section | Inferred from code | ⚠️ MEDIUM |
| Reports section (summary/details) | Inferred from code | ⚠️ MEDIUM |
| Archive section | Inferred from code | ⚠️ MEDIUM |
| Settings section | Inferred from code | ⚠️ MEDIUM |
| ExportModal | Inferred from code | ⚠️ MEDIUM |
| PrintModal | Inferred from code | ⚠️ MEDIUM |
| ManagerModals (8 modals) | Complex modal management | ⚠️ MEDIUM |

### Expenses Module

| Item | Issue | Confidence |
|------|-------|------------|
| ExpensesTable (Invoices) | Inferred from code | ⚠️ MEDIUM |
| TypesTable | Inferred from code | ⚠️ MEDIUM |
| ExpenseForm | Inferred from code | ⚠️ MEDIUM |
| ExpenseTypeForm | Inferred from code | ⚠️ MEDIUM |

### Reports Module

| Item | Issue | Confidence |
|------|-------|------------|
| Report cards grid | Inferred from code | ⚠️ MEDIUM |
| Financial summary strip | Inferred from code | ⚠️ MEDIUM |
| Export buttons | Inferred from code | ⚠️ MEDIUM |

### Monitoring Module

| Item | Issue | Confidence |
|------|-------|------------|
| MonitoringTable (Messages) | Inferred from code | ⚠️ MEDIUM |
| MonitoringTable (Homework) | Inferred from code | ⚠️ MEDIUM |
| DetailModal edit mode | Complex state transitions | ⚠️ LOW |
| Audit trail sidebar | Inferred from code | ⚠️ MEDIUM |
| Status badges (active/edited/deleted) | Inferred from code | ⚠️ MEDIUM |

### Fee Notifications Module

| Item | Issue | Confidence |
|------|-------|------------|
| History table | Local screenshot blank | ⚠️ LOW |
| Composer form | Inferred from code | ⚠️ MEDIUM |
| Target mode conditional fields | Multiple visibility rules | ⚠️ LOW |
| Student selection grid | Inferred from code | ⚠️ MEDIUM |
| HistoryModal | Inferred from code | ⚠️ MEDIUM |

### Super Admin Module

| Item | Issue | Confidence |
|------|-------|------------|
| OverviewTab diagnostics | Inferred from code | ⚠️ MEDIUM |
| SchoolsTab | Inferred from code | ⚠️ MEDIUM |
| UsersTab | Inferred from code | ⚠️ MEDIUM |
| SubscriptionsTab | Inferred from code | ⚠️ MEDIUM |
| AuditLogTab | Conditional on infrastructure | ⚠️ LOW |
| RolesTab | Conditional on infrastructure | ⚠️ LOW |
| TrashTab | Conditional on infrastructure | ⚠️ LOW |
| NotificationsTab | Conditional on infrastructure | ⚠️ LOW |
| MonitoringTab | Conditional on infrastructure | ⚠️ LOW |
| BranchesTab | Conditional on infrastructure | ⚠️ LOW |
| SchoolFormModal | Inferred from code | ⚠️ MEDIUM |
| UserFormModal | Inferred from code | ⚠️ MEDIUM |
| Delete confirm dialogs | Inferred from code | ⚠️ MEDIUM |

---

## Category 4: Known Gaps in Documentation

### Missing Visual Verification

| Screen | Gap | Impact |
|--------|-----|--------|
| Payments | No live screenshot; blank local reference | HIGH |
| Fee Notifications | Blank local screenshot | HIGH |
| Reports | No visual reference | MEDIUM |
| Expenses | No visual reference | MEDIUM |
| Salaries | No visual reference | MEDIUM |
| Monitoring | No visual reference | MEDIUM |
| Super Admin | No visual reference | MEDIUM |

### Missing Non-Routable Surfaces

The following pseudo-screens are documented inline but lack dedicated frame specifications:

**Students (4 tab variants)**:
- Active Tab
- Transferred Tab
- Suspended Tab
- Deleted Tab

**Expenses (2 tab variants)**:
- Invoices Tab
- Types Tab

**Monitoring (2 tab variants)**:
- Messages Tab
- Homework Tab

**Salaries (7 section variants)**:
- Main
- Schedule
- Deductions
- Calendar
- Reports
- Archive
- Settings

**Super Admin (10 tab variants)**:
- Overview
- Schools
- Users
- Subscriptions
- Audit
- Roles
- Trash
- Notifications
- Monitoring
- Branches

### Missing Modal Specifications

| Module | Missing Modals |
|--------|----------------|
| Dashboard | ClassesModal full anatomy, FeeModal full anatomy |
| Salaries | 8 modals individually specified |
| Super Admin | SchoolForm, UserForm, delete dialogs |
| Monitoring | DetailModal edit mode transitions |
| Fee Notifications | HistoryModal recipient list |

---

## Category 5: Legacy/Deprecated Items Found

### Inconsistent Styling

| Area | Issue | Legacy Token | Current Token |
|------|-------|--------------|---------------|
| Sidebar width | Token mismatch | `--sidebar-width: 224px` | 280px in code |
| Button colors | Purple vs blue | Dashboard buttons use purple | Shell buttons use blue/cyan |
| `/schools` route | Older styling | Legacy layout | Not migrated to modern shell |
| `/subscriptions` route | Older styling | Legacy layout | Not migrated to modern shell |
| `/users` route | Redirect only | N/A | Redirects to super-admin |

### Deprecated Code Patterns

| Pattern | Location | Note |
|---------|----------|------|
| Legacy button variant | `components/ui/button.tsx` | Purple gradient still used in dashboard |
| Old sidebar token | `globals.css` | `--sidebar-width: 224px` legacy value |
| Emoji icon tokens | `lib/icons.ts` | Should be replaced with Lucide vectors in Figma |

---

## Category 6: Responsive Behavior Assumptions

### Inferred Breakpoints

| Assumption | Source | Risk |
|------------|--------|------|
| Tailwind default breakpoints | No custom config found | LOW |
| Sidebar → drawer at md | Common pattern in code | MEDIUM |
| Table → cards on mobile | Pattern in StudentsTable | MEDIUM |
| Modal → fullscreen on mobile | Assumed pattern | HIGH |

### Unverified Mobile Behaviors

| Screen | Assumed Behavior | Verification Needed |
|--------|------------------|---------------------|
| Dashboard | Stacked KPIs, panels | Screenshot |
| Students | Card layout | Screenshot |
| Payments | Full-screen drawer | Screenshot |
| Salaries | Tab chips instead of sidebar | Screenshot |
| Super Admin | Scroll tabs | Screenshot |
| Monitoring | Full-height modal | Screenshot |

---

## Category 7: Dark Mode Assumptions

### Dark Mode Coverage

| Component | Dark Mode Support | Verification |
|-----------|-------------------|--------------|
| App shell | ✅ Full | Code verified |
| Login | ✅ Full | Screenshot verified |
| Dashboard panels | ✅ Full | Code verified |
| Tables | ✅ Full | Code verified |
| Modals | ✅ Full | Code verified |
| Charts | ⚠️ Partial | Colors need verification |

### Dark Mode Token Overrides

All semantic color tokens have dark mode overrides defined in `globals.css`. Theme presets also define dark mode values where applicable.

**Unverified**:
- Chart colors in dark mode
- Image assets on dark backgrounds
- Brand logo contrast on dark

---

## Category 8: RTL Assumptions

### RTL Coverage

| Component | RTL Support | Notes |
|-----------|-------------|-------|
| Layout direction | ✅ Full | `dir="rtl"` attribute |
| Sidebar position | ✅ Full | Fixed right in RTL |
| Text alignment | ✅ Full | Logical properties |
| Icon positioning | ✅ Full | start/end insets |
| Breadcrumb | ✅ Full | Separator reversed |
| Numbers in Arabic | ⚠️ Partial | LTR within RTL for financial values |

### Unverified RTL Behaviors

| Screen | Potential Issue |
|--------|-----------------|
| Charts | Axis label positioning |
| Tables with numbers | Number directionality |
| Form validation | Error message positioning |
| Toast notifications | Position (currently left regardless of direction) |

---

## Category 9: Theme Preset Assumptions

### Theme Preset Coverage

| Preset Family | Documentation Status |
|---------------|----------------------|
| Blue (3 presets) | ✅ Documented |
| Green (3 presets) | ✅ Documented |
| Warm (3 presets) | ✅ Documented |
| Purple (3 presets) | ✅ Documented |
| Classic White | ✅ Documented |
| Dark Professional | ✅ Documented |

### Unverified Theme Behaviors

| Aspect | Issue |
|--------|-------|
| Sidebar gradient per theme | Formula defined but not visually verified |
| Accent color usage | Where exactly applied in UI unclear |
| Dark mode per preset | Overrides not fully specified |
| Chart colors per theme | Not specified |

### Runtime Branding

The system supports runtime school branding with:
- Primary color from DB or derived from logo
- Secondary color from DB or derived
- Theme preset selection
- Local storage overrides

**Gap**: How these interact with the 14 presets is not fully specified.

---

## Summary Matrix

| Category | Items | Confidence Level | Action Required |
|----------|-------|------------------|-----------------|
| 1. Visually Confirmed | 15 | ✅ HIGH | None |
| 2. Code-Derived High | 30+ | ✅ HIGH | Minor verification |
| 3. Code-Derived Low | 60+ | ⚠️ MEDIUM/LOW | Screenshot pass recommended |
| 4. Missing Documentation | 26 surfaces | ❌ GAP | Add dedicated specs |
| 5. Legacy/Deprecated | 5 items | ⚠️ INCONSISTENT | Normalize during rebuild |
| 6. Responsive Assumptions | 10+ | ⚠️ MEDIUM | Mobile screenshot pass |
| 7. Dark Mode Assumptions | 3 items | ⚠️ MEDIUM | Verify charts |
| 8. RTL Assumptions | 4 items | ⚠️ MEDIUM | Verify complex layouts |
| 9. Theme Preset Assumptions | 5 items | ⚠️ MEDIUM | Document usage rules |

---

## Recommended Actions

### High Priority

1. **Capture screenshots** for Payments, Fee Notifications, Salaries, Monitoring, Reports, Expenses, Super Admin
2. **Add dedicated frame specs** for 26 non-routable surfaces (tabs, sections)
3. **Resolve sidebar width token conflict** (224px vs 280px)

### Medium Priority

4. **Verify mobile responsive behaviors** for all major screens
5. **Document theme preset application rules** (sidebar, accent usage)
6. **Normalize button color inconsistency** (purple vs blue/cyan)

### Low Priority

7. **Replace emoji tokens** with Lucide vector icons in Figma
8. **Verify dark mode chart colors**
9. **Document RTL number handling** in financial tables
