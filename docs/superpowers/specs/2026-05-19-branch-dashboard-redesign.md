# Branch Dashboard Redesign

**Date:** 2026-05-19
**Status:** Approved — ready for implementation

---

## Summary

Redesign the branch overview page (`/branch-overview`) from a compact header variant of `DashboardExperience` into a dedicated full-page experience that matches the design pattern used by the newer pages (notifications, teacher-activities, schedule).

---

## Current State

`app/[locale]/branch-overview/page.tsx` is a thin wrapper around `DashboardExperience` with `branchScoped=true`. The branchScoped branch renders:
- Compact horizontal header with 3 inline stats
- QuickAccessPanel (8 cards)
- DailyFinancialAnalysis
- ClassFeesTable
- RecentPaymentsPanel + OverdueStudentsPanel (2-col pair)
- RecentActivityPanel

The layout is embedded inside `DashboardExperience` (a 700+ line shared component), making it hard to customize.

---

## New Design

### Layout Pattern
Matches the exact structure of `NotificationsExperience` and `TeacherActivitiesPage`:

1. **Hero Banner** — `relative rounded-2xl overflow-hidden p-6 md:p-8`
   - Background: `linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)`
   - Two decorative circles (absolute, white, opacity 0.08 and 0.06)
   - Left: badge (branch name), title, subtitle
   - Right: icon box `w-20 h-20 rounded-2xl` with `rgba(255,255,255,0.15)` and `backdrop-filter:blur(8px)`

2. **Progress Card** — collection rate visualization
   - `rounded-2xl border border-[var(--border)] bg-[var(--card-bg)]`
   - Label: "نسبة تحصيل الرسوم الدراسية"
   - Progress bar (gradient: success → primary)
   - 4 KPI boxes in a row: طلاب / محصّل / متبقي / متأخر

3. **Quick Actions Grid** — 8 buttons in 4-col grid
   - نفس نمط `QuickAccessPanel` الحالي
   - الأزرار: طالب جديد، تسجيل دفعة، تقرير مالي، إدارة الصفوف، المتأخرون، قائمة الطلاب، المدفوعات، الإعدادات

4. **Two-column grid** (md:grid-cols-2)
   - Right: `RecentPaymentsPanel`
   - Left: `OverdueStudentsPanel`

---

## Architecture

### New component: `BranchDashboardExperience`
**File:** `app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx`

- Client component
- Receives: `schoolId`, `locale`, `profile`, `schoolScope`
- Uses existing hooks: `useDashboardData`, `useRecentActivity`
- Renders the 4 sections above
- Reuses existing panels: `RecentPaymentsPanel`, `OverdueStudentsPanel`, `QuickAccessPanel`

### Update: `branch-overview/page.tsx`
- Replace `DashboardExperience branchScoped` with `BranchDashboardExperience`
- Same `ProtectedRoute`, `AppSidebar`, `AppShellTopbar` wrapper

### Keep: `DashboardExperience` unchanged
- Remove the `branchScoped` conditional branches from `DashboardExperience` after new component is confirmed working

---

## Data Flow

- KPI data: `useDashboardData` → `dashboardTotals` (studentsCount, paidPct, totalFees, totalPaid, overdueStudents)
- Recent payments: `dashboardData.recentPayments`
- Overdue students: `dashboardData.overdueStudents`
- Branch name: `titleOverride` prop (passed from page.tsx)

---

## Files Affected

| File | Action |
|------|--------|
| `app/[locale]/branch-overview/page.tsx` | Update — replace `DashboardExperience` usage |
| `app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx` | Create new |
| `app/[locale]/dashboard/_components/DashboardExperience.tsx` | Later: remove branchScoped branches (optional cleanup) |

---

## i18n

Uses existing translation keys. No new keys needed:
- Hero text: hardcoded per locale (same pattern as other pages)
- Panel titles: reuse existing `RecentPaymentsPanel`/`OverdueStudentsPanel` translations

---

## Out of Scope

- Mobile layout changes beyond responsive grid
- New API endpoints
- Changes to DashboardExperience for non-branch routes
