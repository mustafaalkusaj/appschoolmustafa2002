# Branch Dashboard Redesign Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the compact `branchScoped` view inside `DashboardExperience` with a dedicated `BranchDashboardExperience` component that uses the same hero banner + card pattern as the notifications and teacher-activities pages.

**Architecture:** Create a new standalone component `BranchDashboardExperience` that reuses existing hooks (`useDashboardData`, `useClassesSections`) and panels (`QuickAccessPanel`, `RecentPaymentsPanel`, `OverdueStudentsPanel`). Update `branch-overview/page.tsx` to render the new component instead of `DashboardExperience branchScoped`.

**Tech Stack:** Next.js App Router, React, next-intl, Tailwind CSS (CSS variables), existing dashboard hooks and panel components.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx` | **Create** | New dedicated branch view: hero, progress card, quick actions, panels |
| `app/[locale]/branch-overview/page.tsx` | **Modify** | Replace `DashboardExperience branchScoped` with `BranchDashboardExperience` |

---

## Task 1: Create `BranchDashboardExperience.tsx`

**Files:**
- Create: `app/[locale]/branch-overview/_components/BranchDashboardExperience.tsx`

- [ ] **Step 1: Create the `_components` directory and write the component file**

```tsx
"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Building2 } from "@/lib/icons";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useDashboardData } from "@/app/[locale]/dashboard/_hooks/useDashboardData";
import { useClassesSections } from "@/app/[locale]/dashboard/_hooks/useClassesSections";
import { useFeeManagement } from "@/app/[locale]/dashboard/_hooks/useFeeManagement";
import {
  QuickAccessPanel,
  RecentPaymentsPanel,
  OverdueStudentsPanel,
  ClassesModal,
  FeeModal,
  DashboardPaymentModal,
  DashboardTeacherModal,
  DashboardExpenseModal,
  DashboardIncomeModal,
} from "@/app/[locale]/dashboard/_components";
import { AddStudentModal } from "@/app/[locale]/students/_components/AddStudentModal";
import { DEFAULT_STUDENT_FORM } from "@/app/[locale]/students/_constants";
import type { StudentFormData } from "@/app/[locale]/students/_types";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";

interface BranchDashboardExperienceProps {
  titleOverride?: string;
}

export function BranchDashboardExperience({ titleOverride }: BranchDashboardExperienceProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile, can, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const isEn = locale === "en";

  const dashboardData = useDashboardData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped: true,
  });

  const classesSections = useClassesSections({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped: true,
  });

  const availableClassNames = Array.isArray(classesSections.classes)
    ? classesSections.classes.map((c) => c?.name).filter(Boolean)
    : [];

  const feeManagement = useFeeManagement({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    classFees: dashboardData.classFees || [],
    studentCountByClass: dashboardData.studentCountByClass || {},
    availableClassNames,
    onRefetch: dashboardData.refetch,
    branchScoped: true,
  });

  // Modal state
  const [showClassesModal, setShowClassesModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showTeacherModal, setShowTeacherModal] = useState(false);
  const [showExpenseModal, setShowExpenseModal] = useState(false);
  const [showIncomeModal, setShowIncomeModal] = useState(false);
  const [showAddStudentModal, setShowAddStudentModal] = useState(false);
  const [addStudentStep, setAddStudentStep] = useState(1);
  const [addStudentForm, setAddStudentForm] = useState<StudentFormData>(DEFAULT_STUDENT_FORM);
  const [addStudentSaving, setAddStudentSaving] = useState(false);
  const [addStudentError, setAddStudentError] = useState("");

  const paymentsPageHref = schoolScope.buildLocalizedPath("/payments", locale);

  const { dashboardTotals, recentPayments, overdueStudents, loading, error, refetch } = dashboardData;

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!schoolScope.selectedSchoolId) return;
    setAddStudentSaving(true);
    setAddStudentError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/dashboard/users", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: schoolScope.selectedSchoolId,
          role: "student",
          full_name: addStudentForm.full_name,
          email: "",
          password: "",
          phone: addStudentForm.phone,
          is_active: true,
          student: {
            class_name: addStudentForm.class_name,
            section: addStudentForm.section,
            phone2: addStudentForm.phone2 || null,
            address: addStudentForm.address,
            total_fee: addStudentForm.total_fee,
            paid_fee: addStudentForm.paid_fee,
            discount_value: addStudentForm.discount_value,
            branch_id: addStudentForm.branch_id || null,
            registration_number: addStudentForm.registration_number || null,
            date_of_birth: addStudentForm.date_of_birth || null,
            parent_name: addStudentForm.parent_name || null,
            gender: addStudentForm.gender || null,
            photo_url: addStudentForm.photo_url || null,
          },
          teacher: null,
        }),
      });
      if (!res.ok) {
        const data = await res.json().catch(() => ({})) as { error?: { message?: string } };
        setAddStudentError(data?.error?.message || "فشل الحفظ");
      } else {
        setShowAddStudentModal(false);
        setAddStudentStep(1);
        setAddStudentForm(DEFAULT_STUDENT_FORM);
        refetch();
      }
    } catch {
      setAddStudentError("خطأ في الاتصال");
    } finally {
      setAddStudentSaving(false);
    }
  };

  const branchTitle = titleOverride ?? (isEn ? "Branch Control Panel" : "لوحة التحكم الرئيسية");

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* ① Hero Banner — same pattern as notifications / teacher-activities pages */}
      <div
        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)",
        }}
      >
        <div
          className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none"
          style={{ background: "white", transform: "translate(35%, -40%)" }}
        />
        <div
          className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none"
          style={{ background: "white", transform: "translateY(60%)" }}
        />
        <div className="relative flex items-center justify-between gap-4">
          <div>
            <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
              {isEn ? "Branch Panel · Overview" : "لوحة الفرع · نظرة عامة"}
            </p>
            <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
              {branchTitle}
            </h1>
            <p className="text-white/70 text-sm">
              {isEn
                ? "Comprehensive view of branch students, fees, and financials"
                : "نظرة شاملة على الطلاب والأقساط والوضع المالي للفرع"}
            </p>
          </div>
          <div
            className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0"
            style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
          >
            <Building2 size={38} className="text-white" />
          </div>
        </div>
      </div>

      {/* ② Progress Card — collection rate + 4 KPIs */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
          {isEn ? "Fee Collection Rate" : "نسبة تحصيل الرسوم الدراسية"}
        </p>
        <div className="flex items-center justify-between mb-2">
          <p
            className="text-2xl font-black tabular-nums"
            style={{ color: "var(--success)" }}
          >
            {dashboardTotals.paidPct}%
          </p>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {isEn ? "collected" : "محصّل"}
          </p>
        </div>
        {/* Progress bar */}
        <div className="h-2.5 rounded-full bg-[var(--surface-soft)] overflow-hidden mb-4">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(dashboardTotals.paidPct, 100)}%`,
              background: "linear-gradient(90deg, var(--success), var(--primary))",
            }}
          />
        </div>
        {/* 4 KPI boxes */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--primary)]">
              {dashboardTotals.studentsCount}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Students" : "طالب"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: "var(--success)" }}>
              {formatNumber(dashboardTotals.totalPaid)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Collected" : "محصّل"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--warning)]">
              {formatNumber(dashboardTotals.totalRemaining)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Remaining" : "متبقي"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--danger)]">
              {overdueStudents?.length ?? 0}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Overdue" : "متأخر"}
            </p>
          </div>
        </div>
      </div>

      {/* ③ Quick Access Panel */}
      <QuickAccessPanel
        locale={locale}
        buildLocalizedPath={schoolScope.buildLocalizedPath}
        can={can}
        canAny={canAny}
        schoolId={schoolScope.selectedSchoolId}
        availableClassNames={availableClassNames}
        onOpenClassesModal={() => setShowClassesModal(true)}
        onOpenAddStudentModal={() => {
          setAddStudentForm(DEFAULT_STUDENT_FORM);
          setAddStudentStep(1);
          setAddStudentError("");
          setShowAddStudentModal(true);
        }}
        onOpenPaymentModal={() => setShowPaymentModal(true)}
        onOpenTeacherModal={() => setShowTeacherModal(true)}
        onOpenExpenseModal={() => setShowExpenseModal(true)}
        onOpenIncomeModal={() => setShowIncomeModal(true)}
        onOpenFeeModal={() => feeManagement.openNewFee()}
      />

      {/* ④ Two-col: Recent Payments + Overdue Students */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <RecentPaymentsPanel
          recentPayments={recentPayments}
          paymentsPageHref={paymentsPageHref}
          locale={locale}
          loading={loading}
          error={error}
          onRetry={refetch}
        />
        <OverdueStudentsPanel
          overdueStudents={overdueStudents ?? []}
          paymentsPageHref={paymentsPageHref}
          locale={locale}
          loading={loading}
          error={error}
          onRetry={refetch}
        />
      </div>

      {/* Modals */}
      {showClassesModal && (
        <ClassesModal
          schoolId={schoolScope.selectedSchoolId ?? ""}
          onClose={() => setShowClassesModal(false)}
        />
      )}
      {feeManagement.feeModal && (
        <FeeModal
          mode={feeManagement.feeModal.mode}
          form={feeManagement.feeModal.form}
          saving={feeManagement.feeModal.saving}
          error={feeManagement.feeModal.error}
          onChange={feeManagement.feeModal.onChange}
          onClose={feeManagement.feeModal.onClose}
          onSubmit={feeManagement.feeModal.onSubmit}
        />
      )}
      {showPaymentModal && (
        <DashboardPaymentModal
          schoolId={schoolScope.selectedSchoolId ?? ""}
          locale={locale}
          availableClassNames={availableClassNames}
          onClose={() => setShowPaymentModal(false)}
          onSuccess={refetch}
        />
      )}
      {showTeacherModal && (
        <DashboardTeacherModal
          schoolId={schoolScope.selectedSchoolId ?? ""}
          locale={locale}
          onClose={() => setShowTeacherModal(false)}
          onSuccess={refetch}
        />
      )}
      {showExpenseModal && (
        <DashboardExpenseModal
          schoolId={schoolScope.selectedSchoolId ?? ""}
          locale={locale}
          onClose={() => setShowExpenseModal(false)}
          onSuccess={refetch}
        />
      )}
      {showIncomeModal && (
        <DashboardIncomeModal
          schoolId={schoolScope.selectedSchoolId ?? ""}
          locale={locale}
          onClose={() => setShowIncomeModal(false)}
          onSuccess={refetch}
        />
      )}
      {showAddStudentModal && (
        <AddStudentModal
          open={showAddStudentModal}
          step={addStudentStep}
          form={addStudentForm}
          saving={addStudentSaving}
          error={addStudentError}
          availableClassNames={availableClassNames}
          onClose={() => setShowAddStudentModal(false)}
          onStepChange={setAddStudentStep}
          onFormChange={(updates) => setAddStudentForm((prev) => ({ ...prev, ...updates }))}
          onSubmit={handleAddStudentSubmit}
        />
      )}

    </div>
  );
}
```

- [ ] **Step 2: Check `Building2` is exported from `@/lib/icons`**

```bash
grep -n "Building2" /Users/musatafa/school-app/lib/icons.ts
```

If not found, open `lib/icons.ts` and add:
```ts
export { Building2 } from "lucide-react";
```

- [ ] **Step 3: Verify modal prop signatures match actual components**

Check each modal's actual props:
```bash
grep -n "interface.*Props\|export function Dashboard.*Modal\|export function ClassesModal\|export function FeeModal" \
  app/\[locale\]/dashboard/_components/DashboardPaymentModal.tsx \
  app/\[locale\]/dashboard/_components/DashboardTeacherModal.tsx \
  app/\[locale\]/dashboard/_components/DashboardExpenseModal.tsx \
  app/\[locale\]/dashboard/_components/DashboardIncomeModal.tsx \
  app/\[locale\]/dashboard/_components/ClassesModal.tsx \
  app/\[locale\]/dashboard/_components/FeeModal.tsx \
  2>/dev/null | head -60
```

Adjust any prop names in `BranchDashboardExperience.tsx` to match what you find.

- [ ] **Step 4: Check `useFeeManagement` return shape for `feeModal`**

```bash
grep -n "feeModal\|openNewFee\|return {" app/\[locale\]/dashboard/_hooks/useFeeManagement.ts | head -30
```

If `feeManagement.feeModal` doesn't exist, adjust the FeeModal rendering block to match the actual API.

- [ ] **Step 5: Check `useClassesSections` export**

```bash
grep -n "export function useClassesSections" app/\[locale\]/dashboard/_hooks/useClassesSections.ts
```

Confirm the hook accepts `{ profile, selectedSchoolId, scopeLoading, branchScoped? }` — if `branchScoped` isn't a param, remove it from the call.

---

## Task 2: Update `branch-overview/page.tsx`

**Files:**
- Modify: `app/[locale]/branch-overview/page.tsx`

- [ ] **Step 1: Replace the file contents**

```tsx
"use client";

import { usePathname } from "next/navigation";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { BranchDashboardExperience } from "./_components/BranchDashboardExperience";

export default function BranchOverviewPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEn = locale === "en";

  return (
    <ProtectedRoute roles={["admin", "employee"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/branch-overview" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={isEn ? "Branch Control Panel" : "لوحة التحكم الرئيسية"}
            subtitle={isEn ? "Branch overview — students, fees, and financials" : "نظرة شاملة على الفرع — الطلاب والأقساط والمالية"}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState scope={schoolScope} />
              ) : (
                <BranchDashboardExperience
                  titleOverride={isEn ? "Branch Control Panel" : "لوحة التحكم الرئيسية"}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
```

---

## Task 3: Smoke Test

- [ ] **Step 1: Run the dev server (if not already running)**

```bash
pnpm dev
```

- [ ] **Step 2: Open the branch overview page**

Navigate to: `http://localhost:3000/ar/branch-overview`

Expected:
- Hero gradient banner with title "لوحة التحكم الرئيسية" and building icon
- Progress bar showing collection percentage with 4 KPI boxes below
- Quick access grid (same cards as before)
- Two-column grid: recent payments on right, overdue students on left

- [ ] **Step 3: Verify no TypeScript errors**

```bash
pnpm tsc --noEmit 2>&1 | grep "branch-overview" | head -20
```

Fix any type errors reported.

- [ ] **Step 4: Commit**

```bash
git add app/\[locale\]/branch-overview/
git commit -m "feat: redesign branch overview with hero banner and progress card"
```

---

## Self-Review Notes

- `Building2` icon existence must be verified (Task 1 Step 2) before assuming it works
- Modal prop signatures are inferred from usage in `DashboardExperience` — Task 1 Step 3 verifies them
- `feeManagement.feeModal` shape is inferred — Task 1 Step 4 verifies it
- No new API endpoints needed — all data comes from existing `useDashboardData`
- `useSchoolScope` is called in both `page.tsx` and `BranchDashboardExperience` — this is intentional since the component needs its own scope access. If double-fetching becomes a concern, pass `schoolScope` as a prop.
