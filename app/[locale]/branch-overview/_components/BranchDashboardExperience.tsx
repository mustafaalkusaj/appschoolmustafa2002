"use client";

import { useState, useEffect } from "react";
import { usePathname } from "next/navigation";
import { Building2 } from "@/lib/icons";
import { getLocaleFromPath } from "@/lib/locale-routing";
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
import { fetchWithAuthorizedSession, withJsonHeaders, fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { formatNumber } from "@/lib/formatting";
import { SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";

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

  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);
  const canManageStudentAccounts = profile?.role === "super_admin" || profile?.role === "admin";

  // Extra counts
  const [teachersCount, setTeachersCount] = useState<number | null>(null);
  const [notificationsCount, setNotificationsCount] = useState<number | null>(null);

  useEffect(() => {
    const sid = schoolScope.selectedSchoolId;
    if (!sid || schoolScope.scopeLoading) return;

    fetchJsonWithAuthorizedSession<{ ok: boolean; total: number }>(
      `/api/web/teachers?schoolId=${sid}&pageSize=1`
    ).then(({ payload }) => {
      if (payload?.ok) setTeachersCount(payload.total ?? 0);
    }).catch(() => {});

    fetchJsonWithAuthorizedSession<{ ok: boolean; count: number }>(
      `/api/web/notifications/insite/unread?schoolId=${sid}`
    ).then(({ payload }) => {
      if (payload?.ok) setNotificationsCount(payload.count ?? 0);
    }).catch(() => {});
  }, [schoolScope.selectedSchoolId, schoolScope.scopeLoading]);

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

  const { dashboardTotals, recentPayments, overdueStudents, loading, error, warning, refetch } = dashboardData;

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
        void refetch();
      }
    } catch {
      setAddStudentError("خطأ في الاتصال");
    } finally {
      setAddStudentSaving(false);
    }
  };

  const branchTitle = titleOverride ?? (isEn ? "Branch Control Panel" : "لوحة التحكم الرئيسية");

  if (schoolScope.shouldBlockContent) {
    return <SchoolScopeEmptyState scope={schoolScope} />;
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

      {/* Hero Banner */}
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

      {warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {isEn ? "Some data may be unavailable. Showing partial results." : "بعض البيانات قد تكون غير متاحة. تعرض نتائج جزئية."}
        </div>
      )}

      {/* ② Progress Card — collection rate + expanded KPIs */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5">
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
          {isEn ? "Fee Collection Rate" : "نسبة تحصيل الرسوم الدراسية"}
        </p>
        <div className="flex items-center justify-between mb-2">
          <p className="text-2xl font-black tabular-nums" style={{ color: "var(--success)" }}>
            {dashboardTotals.paidPct}%
          </p>
          <p className="text-sm font-semibold text-[var(--text-secondary)]">
            {isEn ? "collected" : "محصّل"}
          </p>
        </div>
        <div className="h-2.5 rounded-full bg-[var(--surface-soft)] overflow-hidden mb-5">
          <div
            className="h-full rounded-full transition-all duration-700"
            style={{
              width: `${Math.min(dashboardTotals.paidPct, 100)}%`,
              background: "linear-gradient(90deg, var(--success), var(--primary))",
            }}
          />
        </div>

        {/* Row 1: Financial KPIs */}
        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Financials" : "الماليات"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
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
            <p className="text-xl font-black tabular-nums" style={{ color: "var(--success)" }}>
              {formatNumber(dashboardTotals.todayIncomes)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Today Income" : "إيرادات اليوم"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--danger)]">
              {formatNumber(dashboardTotals.todayExpenses)}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Today Expenses" : "مصروفات اليوم"}
            </p>
          </div>
        </div>

        {/* Row 2: People & Structure KPIs */}
        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Students & Staff" : "الطلاب والهيئة"}
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-4">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--primary)]">
              {dashboardTotals.studentsCount}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Students" : "الطلاب"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--text-secondary)]">
              {dashboardTotals.transferredCount}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Transferred" : "منقولون"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums text-[var(--danger)]">
              {overdueStudents?.length ?? 0}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Overdue" : "متأخرون"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: "#8b5cf6" }}>
              {teachersCount ?? "—"}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Teachers" : "الأساتذة"}
            </p>
          </div>
        </div>

        {/* Row 3: Structure & Notifications */}
        <p className="text-[9px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Structure" : "الهيكل"}
        </p>
        <div className="grid grid-cols-3 sm:grid-cols-3 gap-3">
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: "#0ea5e9" }}>
              {classesSections.classes?.length ?? 0}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Classes" : "الصفوف"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: "#f97316" }}>
              {classesSections.sections?.length ?? 0}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Sections" : "الشعب"}
            </p>
          </div>
          <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
            <p className="text-xl font-black tabular-nums" style={{ color: "#ec4899" }}>
              {notificationsCount ?? "—"}
            </p>
            <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-1">
              {isEn ? "Notifications" : "الإشعارات"}
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Panel */}
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

      {/* Two-col: Recent Payments + Overdue Students */}
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

      {/* ⑤ Classes Table */}
      {dashboardData.classFees && dashboardData.classFees.length > 0 && (
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)]">
            <h3 className="text-sm font-black text-[var(--text-primary)]">
              {isEn ? "Classes Overview" : "نظرة على الصفوف"}
            </h3>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
                  <th className="px-4 py-3 text-right text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Class" : "الصف"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Sections" : "الشعب"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Students" : "الطلاب"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Fee" : "القسط"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Required" : "المطلوب"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Collected" : "محصّل"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Remaining" : "متبقي"}
                  </th>
                  <th className="px-4 py-3 text-center text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
                    {isEn ? "Rate" : "التحصيل"}
                  </th>
                </tr>
              </thead>
              <tbody>
                {dashboardData.classFees.map((cf) => {
                  const sectionsForClass = classesSections.sections?.filter(
                    (s) => {
                      const cls = classesSections.classes?.find((c) => c.name === cf.class_name);
                      return cls ? s.class_id === cls.id : false;
                    }
                  ) ?? [];
                  const studentCount = dashboardData.studentCountByClass?.[cf.class_name] ?? cf.stats?.count ?? 0;
                  const paidPct = cf.stats?.paidPct ?? 0;
                  return (
                    <tr key={cf.id} className="border-b border-[var(--border)] last:border-0 hover:bg-[var(--surface-soft)] transition-colors">
                      <td className="px-4 py-3 font-bold text-[var(--text-primary)]">{cf.class_name}</td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-[var(--text-secondary)]">
                        {sectionsForClass.length || "—"}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold" style={{ color: "var(--primary)" }}>
                        {studentCount}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-[var(--text-secondary)]">
                        {formatNumber(cf.total_fee)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-[var(--text-secondary)]">
                        {formatNumber(cf.stats?.totalExpected ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-bold" style={{ color: "var(--success)" }}>
                        {formatNumber(cf.stats?.totalPaid ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-semibold text-[var(--warning)]">
                        {formatNumber(cf.stats?.totalRemaining ?? 0)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            background: paidPct >= 80
                              ? "color-mix(in srgb, var(--success) 15%, transparent)"
                              : paidPct >= 50
                                ? "color-mix(in srgb, var(--warning) 15%, transparent)"
                                : "color-mix(in srgb, var(--danger) 15%, transparent)",
                            color: paidPct >= 80
                              ? "var(--success)"
                              : paidPct >= 50
                                ? "var(--warning)"
                                : "var(--danger)",
                          }}
                        >
                          {paidPct}%
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
              {/* Totals row */}
              {(() => {
                const totalExpected = dashboardData.classFees.reduce((s, cf) => s + (cf.stats?.totalExpected ?? 0), 0);
                const totalPaid = dashboardData.classFees.reduce((s, cf) => s + (cf.stats?.totalPaid ?? 0), 0);
                const totalRemaining = dashboardData.classFees.reduce((s, cf) => s + (cf.stats?.totalRemaining ?? 0), 0);
                const overallPct = totalExpected > 0 ? Math.round((totalPaid / totalExpected) * 100) : 0;
                return (
                  <tfoot>
                    <tr className="bg-[var(--surface-soft)] border-t-2 border-[var(--border)]">
                      <td className="px-4 py-3 font-black text-[var(--text-primary)]">
                        {isEn ? "Total" : "المجموع"}
                      </td>
                      <td className="px-4 py-3 text-center font-black text-[var(--text-secondary)]">
                        {classesSections.sections?.length ?? 0}
                      </td>
                      <td className="px-4 py-3 text-center font-black" style={{ color: "var(--primary)" }}>
                        {dashboardTotals.studentsCount}
                      </td>
                      <td className="px-4 py-3" />
                      <td className="px-4 py-3 text-center tabular-nums font-black text-[var(--text-primary)]">
                        {formatNumber(totalExpected)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-black" style={{ color: "var(--success)" }}>
                        {formatNumber(totalPaid)}
                      </td>
                      <td className="px-4 py-3 text-center tabular-nums font-black text-[var(--warning)]">
                        {formatNumber(totalRemaining)}
                      </td>
                      <td className="px-4 py-3 text-center">
                        <span
                          className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-black"
                          style={{
                            background: overallPct >= 80
                              ? "color-mix(in srgb, var(--success) 15%, transparent)"
                              : overallPct >= 50
                                ? "color-mix(in srgb, var(--warning) 15%, transparent)"
                                : "color-mix(in srgb, var(--danger) 15%, transparent)",
                            color: overallPct >= 80 ? "var(--success)" : overallPct >= 50 ? "var(--warning)" : "var(--danger)",
                          }}
                        >
                          {overallPct}%
                        </span>
                      </td>
                    </tr>
                  </tfoot>
                );
              })()}
            </table>
          </div>
        </div>
      )}

      {/* Modals */}
      <ClassesModal
        show={showClassesModal}
        classes={classesSections.classes}
        sections={classesSections.sections}
        saveError={classesSections.mutationError}
        saveSuccess={classesSections.mutationSuccess}
        saving={classesSections.mutationLoading}
        onClose={() => setShowClassesModal(false)}
        onClearFeedback={classesSections.clearMutationFeedback}
        onSaveClass={classesSections.handleSaveClass}
        onDeleteClass={classesSections.handleDeleteClass}
        onSaveSection={classesSections.handleSaveSection}
        onDeleteSection={classesSections.handleDeleteSection}
        locale={locale}
        classFees={dashboardData.classFees}
        canManageClasses={canManageClasses}
        deleteConfirm={feeManagement.deleteConfirm}
        getClassStats={feeManagement.getClassStats}
        onOpenNewFee={() => { setShowClassesModal(false); feeManagement.openNewFee(); }}
        onEditFee={feeManagement.openEditFee}
        onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
        onCancelDelete={() => feeManagement.setDeleteConfirm(null)}
        onConfirmDelete={feeManagement.handleDeleteFee}
      />

      <FeeModal
        show={feeManagement.showFeeModal}
        editingFee={feeManagement.editingFee}
        feeForm={feeManagement.feeForm}
        feeLoading={feeManagement.feeLoading}
        feeError={feeManagement.feeError}
        feeSuccess={feeManagement.feeSuccess}
        studentCountByClass={dashboardData.studentCountByClass}
        availableClassNames={availableClassNames}
        onClose={feeManagement.closeFeeModal}
        onSave={feeManagement.handleSaveFee}
        onFormChange={feeManagement.setFeeForm}
      />

      <DashboardPaymentModal
        show={showPaymentModal}
        schoolId={schoolScope.selectedSchoolId}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => { setShowPaymentModal(false); void refetch(); }}
      />

      <DashboardTeacherModal
        show={showTeacherModal}
        schoolId={schoolScope.selectedSchoolId}
        locale={locale}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => setShowTeacherModal(false)}
      />

      <DashboardExpenseModal
        show={showExpenseModal}
        schoolId={schoolScope.selectedSchoolId}
        locale={locale}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => { setShowExpenseModal(false); void refetch(); }}
      />

      <DashboardIncomeModal
        show={showIncomeModal}
        schoolId={schoolScope.selectedSchoolId}
        locale={locale}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={() => { setShowIncomeModal(false); void refetch(); }}
      />

      <AddStudentModal
        show={showAddStudentModal}
        isReadOnlyView={false}
        canManageStudentAccounts={canManageStudentAccounts}
        addStep={addStudentStep}
        setAddStep={setAddStudentStep}
        form={addStudentForm}
        setForm={setAddStudentForm}
        classFees={dashboardData.classFees}
        saving={addStudentSaving}
        error={addStudentError}
        onClose={() => { setShowAddStudentModal(false); setAddStudentStep(1); setAddStudentForm(DEFAULT_STUDENT_FORM); }}
        onSubmit={handleAddStudentSubmit}
        schoolId={schoolScope.selectedSchoolId}
      />

    </div>
  );
}
