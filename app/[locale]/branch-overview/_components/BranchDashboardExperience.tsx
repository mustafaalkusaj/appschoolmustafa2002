"use client";

import { useState, useEffect, useCallback } from "react";
import { usePathname } from "next/navigation";
import {
  Building2,
  TrendingUp,
  Wallet,
  Landmark,
  ReceiptText,
  Users,
  ArrowLeftRight,
  AlertTriangle,
  GraduationCap,
  BookOpen,
  Layers,
  Bell,
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Upload,
  RefreshCw,
  ClipboardList,
} from "@/lib/icons";
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
import { motion } from "framer-motion";
import { containerVariants, cardVariants, usePrefersReducedMotion, getVariants } from "@/lib/motion-variants";

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

  // Activity logs
  type ActivityLog = {
    id: string;
    created_at: string;
    actor_name: string | null;
    actor_role: string | null;
    action_type: string;
    entity_type: string | null;
    entity_id: string | null;
    summary: string | null;
  };
  const [activityLogs, setActivityLogs] = useState<ActivityLog[]>([]);
  const [activityLoading, setActivityLoading] = useState(false);
  const [activityLoaded, setActivityLoaded] = useState(false);

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

  // branchId from profile (employees) or undefined for admin (server derives from JWT)
  const branchId = (profile?.branch_id as string | undefined) ?? undefined;

  const fetchActivityLogs = useCallback(async () => {
    setActivityLoading(true);
    try {
      const url = branchId
        ? `/api/web/branch/activity-logs?branchId=${branchId}&limit=50`
        : `/api/web/branch/activity-logs?limit=50`;
      const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; logs: ActivityLog[] }>(url);
      if (payload?.ok) setActivityLogs(payload.logs ?? []);
    } catch {
      // ignore
    } finally {
      setActivityLoading(false);
      setActivityLoaded(true);
    }
  }, [branchId]);

  useEffect(() => {
    if (!activityLoaded) {
      void fetchActivityLogs();
    }
  }, [activityLoaded, fetchActivityLogs]);

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

  const reduced = usePrefersReducedMotion();

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
    <div className="space-y-6">

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
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Financials" : "الماليات"}
        </p>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-4">
          {[
            {
              label: isEn ? "Collected" : "محصّل",
              value: formatNumber(dashboardTotals.totalPaid),
              color: "var(--success)",
              icon: <TrendingUp size={15} />,
            },
            {
              label: isEn ? "Remaining" : "متبقي",
              value: formatNumber(dashboardTotals.totalRemaining),
              color: "var(--warning)",
              icon: <Wallet size={15} />,
            },
            {
              label: isEn ? "Today Income" : "إيرادات اليوم",
              value: formatNumber(dashboardTotals.todayIncomes),
              color: "var(--success)",
              icon: <Landmark size={15} />,
            },
            {
              label: isEn ? "Today Expenses" : "مصروفات اليوم",
              value: formatNumber(dashboardTotals.todayExpenses),
              color: "var(--danger)",
              icon: <ReceiptText size={15} />,
            },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-2.5"
              style={{
                background: i % 2 === 0 ? "var(--card-bg)" : "var(--surface-soft)",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Row 2: Students & Staff KPIs */}
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Students & Staff" : "الطلاب والهيئة"}
        </p>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden mb-4">
          {[
            {
              label: isEn ? "Students" : "الطلاب",
              value: dashboardTotals.studentsCount,
              color: "var(--primary)",
              icon: <Users size={15} />,
            },
            {
              label: isEn ? "Transferred" : "منقولون",
              value: dashboardTotals.transferredCount,
              color: "var(--text-secondary)",
              icon: <ArrowLeftRight size={15} />,
            },
            {
              label: isEn ? "Overdue" : "متأخرون",
              value: overdueStudents?.length ?? 0,
              color: "var(--danger)",
              icon: <AlertTriangle size={15} />,
            },
            {
              label: isEn ? "Teachers" : "الأساتذة",
              value: teachersCount ?? "—",
              color: "#8b5cf6",
              icon: <GraduationCap size={15} />,
            },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-2.5"
              style={{
                background: i % 2 === 0 ? "var(--card-bg)" : "var(--surface-soft)",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>

        {/* Row 3: Structure & Notifications */}
        <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-2">
          {isEn ? "Structure" : "الهيكل"}
        </p>
        <div className="rounded-xl border border-[var(--border)] overflow-hidden">
          {[
            {
              label: isEn ? "Classes" : "الصفوف",
              value: classesSections.classes?.length ?? 0,
              color: "#0ea5e9",
              icon: <BookOpen size={15} />,
            },
            {
              label: isEn ? "Sections" : "الشعب",
              value: classesSections.sections?.length ?? 0,
              color: "#f97316",
              icon: <Layers size={15} />,
            },
            {
              label: isEn ? "Notifications" : "الإشعارات",
              value: notificationsCount ?? "—",
              color: "#ec4899",
              icon: <Bell size={15} />,
            },
          ].map((item, i, arr) => (
            <div
              key={item.label}
              className="flex items-center justify-between px-4 py-2.5"
              style={{
                background: i % 2 === 0 ? "var(--card-bg)" : "var(--surface-soft)",
                borderBottom: i < arr.length - 1 ? "1px solid var(--border)" : "none",
              }}
            >
              <div className="flex items-center gap-2.5">
                <span
                  className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: `color-mix(in srgb, ${item.color} 12%, transparent)`, color: item.color }}
                >
                  {item.icon}
                </span>
                <span className="text-sm font-medium text-[var(--text-secondary)]">{item.label}</span>
              </div>
              <span className="text-sm font-black tabular-nums" style={{ color: item.color }}>
                {item.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Two-col: Recent Payments + Overdue Students */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-6"
        variants={getVariants(reduced, containerVariants(0.06))}
        initial="hidden"
        animate="visible"
      >
        <motion.div variants={getVariants(reduced, cardVariants)}>
          <RecentPaymentsPanel
            recentPayments={recentPayments}
            paymentsPageHref={paymentsPageHref}
            locale={locale}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
        </motion.div>
        <motion.div variants={getVariants(reduced, cardVariants)}>
          <OverdueStudentsPanel
            overdueStudents={overdueStudents ?? []}
            paymentsPageHref={paymentsPageHref}
            locale={locale}
            loading={loading}
            error={error}
            onRetry={refetch}
          />
        </motion.div>
      </motion.div>

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

      {/* Activity Logs Section */}
      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
          <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
            <div className="flex items-center gap-2.5">
              <span
                className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
              >
                <ClipboardList size={16} />
              </span>
              <div>
                <h3 className="text-sm font-black text-[var(--text-primary)]">
                  {isEn ? "Operation Logs" : "سجل العمليات"}
                </h3>
                <p className="text-[11px] text-[var(--text-muted)]">
                  {isEn ? "Who did what in this branch" : "ما فعله مستخدمو الفرع"}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              {activityLogs.length > 0 && (
                <span
                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
                >
                  {activityLogs.length}
                </span>
              )}
              <button
                onClick={() => { setActivityLoaded(false); }}
                disabled={activityLoading}
                className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-40"
                style={{ color: "var(--text-muted)" }}
                title={isEn ? "Refresh" : "تحديث"}
              >
                <RefreshCw size={14} className={activityLoading ? "animate-spin" : ""} />
              </button>
            </div>
          </div>

          {activityLoading && !activityLoaded ? (
            <div className="divide-y divide-[var(--border)]">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
                  <div className="w-7 h-7 rounded-lg bg-[var(--surface-soft)] shrink-0" />
                  <div className="flex-1 space-y-1.5">
                    <div className="h-3 bg-[var(--surface-soft)] rounded w-1/3" />
                    <div className="h-2.5 bg-[var(--surface-soft)] rounded w-2/3" />
                  </div>
                  <div className="h-2.5 bg-[var(--surface-soft)] rounded w-16 shrink-0" />
                </div>
              ))}
            </div>
          ) : activityLoaded && activityLogs.length === 0 ? (
            <div className="px-5 py-10 text-center">
              <ClipboardList size={28} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
              <p className="text-sm text-[var(--text-muted)]">
                {isEn ? "No operations recorded yet" : "لا توجد عمليات مسجلة بعد"}
              </p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {activityLogs.map((log, i) => {
                const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string; labelEn: string }> = {
                  create: { icon: <Plus size={13} />, color: "var(--success)", label: "إضافة", labelEn: "Create" },
                  insert: { icon: <Plus size={13} />, color: "var(--success)", label: "إضافة", labelEn: "Insert" },
                  update: { icon: <Pencil size={13} />, color: "var(--primary)", label: "تعديل", labelEn: "Update" },
                  edit: { icon: <Pencil size={13} />, color: "var(--primary)", label: "تعديل", labelEn: "Edit" },
                  delete: { icon: <Trash2 size={13} />, color: "var(--danger)", label: "حذف", labelEn: "Delete" },
                  login: { icon: <KeyRound size={13} />, color: "var(--text-muted)", label: "تسجيل دخول", labelEn: "Login" },
                  export: { icon: <Upload size={13} />, color: "#f97316", label: "تصدير", labelEn: "Export" },
                };
                const actionKey = log.action_type?.toLowerCase() ?? "";
                const cfg = actionConfig[actionKey] ?? { icon: <ClipboardList size={13} />, color: "var(--text-muted)", label: log.action_type, labelEn: log.action_type };

                const entityLabels: Record<string, { ar: string; en: string }> = {
                  student: { ar: "طالب", en: "Student" },
                  payment: { ar: "دفعة", en: "Payment" },
                  expense: { ar: "مصروف", en: "Expense" },
                  income: { ar: "إيراد", en: "Income" },
                  teacher: { ar: "أستاذ", en: "Teacher" },
                  class: { ar: "صف", en: "Class" },
                  user: { ar: "مستخدم", en: "User" },
                };
                const entityKey = log.entity_type?.toLowerCase() ?? "";
                const entityLabel = entityLabels[entityKey]
                  ? (isEn ? entityLabels[entityKey].en : entityLabels[entityKey].ar)
                  : log.entity_type ?? "";

                const roleColors: Record<string, string> = {
                  admin: "#8b5cf6",
                  super_admin: "#ef4444",
                  employee: "#3b82f6",
                };
                const roleColor = roleColors[log.actor_role ?? ""] ?? "var(--text-muted)";
                const roleLabel = log.actor_role === "admin"
                  ? (isEn ? "Admin" : "مدير")
                  : log.actor_role === "super_admin"
                    ? (isEn ? "Super Admin" : "مدير عام")
                    : log.actor_role === "employee"
                      ? (isEn ? "Employee" : "موظف")
                      : log.actor_role ?? "";

                const now = Date.now();
                const ts = new Date(log.created_at).getTime();
                const diff = Math.floor((now - ts) / 1000);
                const relativeTime = diff < 60
                  ? (isEn ? `${diff}s ago` : `منذ ${diff} ث`)
                  : diff < 3600
                    ? (isEn ? `${Math.floor(diff / 60)}m ago` : `منذ ${Math.floor(diff / 60)} د`)
                    : diff < 86400
                      ? (isEn ? `${Math.floor(diff / 3600)}h ago` : `منذ ${Math.floor(diff / 3600)} س`)
                      : new Date(log.created_at).toLocaleDateString(isEn ? "en-US" : "ar-IQ");

                return (
                  <div
                    key={log.id}
                    className="px-5 py-3 flex items-start gap-3 hover:bg-[var(--surface-soft)] transition-colors"
                    style={{ background: i % 2 === 0 ? "var(--card-bg)" : undefined }}
                  >
                    {/* Action icon */}
                    <span
                      className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0 mt-0.5"
                      style={{
                        background: `color-mix(in srgb, ${cfg.color} 12%, transparent)`,
                        color: cfg.color,
                      }}
                    >
                      {cfg.icon}
                    </span>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                        {/* Actor name */}
                        <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                          {log.actor_name ?? (isEn ? "Unknown" : "غير معروف")}
                        </span>
                        {/* Role badge */}
                        {roleLabel && (
                          <span
                            className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-black"
                            style={{
                              background: `color-mix(in srgb, ${roleColor} 12%, transparent)`,
                              color: roleColor,
                            }}
                          >
                            {roleLabel}
                          </span>
                        )}
                        {/* Action label */}
                        <span
                          className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-black"
                          style={{
                            background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
                            color: cfg.color,
                          }}
                        >
                          {isEn ? cfg.labelEn : cfg.label}
                        </span>
                        {/* Entity label */}
                        {entityLabel && (
                          <span className="text-[11px] text-[var(--text-muted)]">
                            {entityLabel}
                          </span>
                        )}
                      </div>
                      {log.summary && (
                        <p className="text-xs text-[var(--text-secondary)] truncate">{log.summary}</p>
                      )}
                    </div>

                    {/* Time */}
                    <span
                      className="text-[11px] text-[var(--text-muted)] shrink-0 mt-0.5 tabular-nums"
                      title={new Date(log.created_at).toLocaleString(isEn ? "en-US" : "ar-IQ")}
                    >
                      {relativeTime}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>

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
