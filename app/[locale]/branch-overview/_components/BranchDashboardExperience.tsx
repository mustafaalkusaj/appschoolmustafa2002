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
import { ActivityLogsTimeline, type ActivityLog } from "./ActivityLogsTimeline";

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

  // Collection-rate ring geometry (SVG donut in hero)
  const ringRadius = 40;
  const ringCircumference = 2 * Math.PI * ringRadius;
  const ringOffset = ringCircumference * (1 - Math.min(dashboardTotals.paidPct, 100) / 100);

  const kpiCards = [
    {
      label: isEn ? "Collected" : "محصّل",
      value: formatNumber(dashboardTotals.totalPaid),
      color: "var(--success)",
      bg: "var(--success-soft)",
      icon: <TrendingUp size={18} />,
      span: "md:col-span-2 md:row-span-2",
      big: true,
    },
    {
      label: isEn ? "Remaining" : "متبقي",
      value: formatNumber(dashboardTotals.totalRemaining),
      color: "var(--warning)",
      bg: "var(--warning-soft)",
      icon: <Wallet size={16} />,
    },
    {
      label: isEn ? "Other Income" : "إيرادات أخرى",
      value: formatNumber(dashboardTotals.totalIncomes),
      color: "var(--success)",
      bg: "var(--success-soft)",
      icon: <Landmark size={16} />,
    },
    {
      label: isEn ? "Monthly Salaries" : "الرواتب الشهرية",
      value: formatNumber(dashboardTotals.monthlySalaries),
      color: "var(--danger)",
      bg: "var(--danger-soft)",
      icon: <ReceiptText size={16} />,
    },
    {
      label: isEn ? "Students" : "الطلاب",
      value: dashboardTotals.studentsCount,
      color: "var(--info)",
      bg: "color-mix(in srgb, var(--info) 12%, transparent)",
      icon: <Users size={16} />,
    },
  ];

  const miniStats = [
    {
      label: isEn ? "Teachers" : "الأساتذة",
      value: teachersCount ?? "—",
      color: "#8b5cf6",
      icon: <GraduationCap size={15} />,
    },
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
  ];

  return (
    <div className="space-y-5">

      {/* Row 1: Hero banner — compact glass gradient + collection ring */}
      <div
        className="relative rounded-3xl overflow-hidden p-5 md:p-7"
        style={{
          background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 55%, var(--success)) 100%)",
        }}
      >
        <div
          className="absolute top-0 end-0 w-64 h-64 rounded-full opacity-[0.10] pointer-events-none"
          style={{ background: "white", transform: "translate(30%, -35%)" }}
        />
        <div
          className="absolute bottom-0 start-8 w-40 h-40 rounded-full opacity-[0.08] pointer-events-none"
          style={{ background: "white", transform: "translateY(50%)" }}
        />
        <div className="relative flex flex-wrap items-center justify-between gap-6">
          <div className="flex items-center gap-4 min-w-0">
            <div
              className="hidden sm:flex items-center justify-center w-14 h-14 rounded-2xl flex-shrink-0"
              style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(12px)" }}
            >
              <Building2 size={26} className="text-white" />
            </div>
            <div className="min-w-0">
              <p className="text-white/60 text-[10px] font-black mb-1 tracking-[0.2em] uppercase">
                {isEn ? "Branch Panel · Overview" : "لوحة الفرع · نظرة عامة"}
              </p>
              <h1 className="text-xl md:text-2xl font-black text-white mb-1 leading-tight truncate">
                {branchTitle}
              </h1>
              <p className="text-white/70 text-xs hidden md:block">
                {isEn
                  ? "Comprehensive view of branch students, fees, and financials"
                  : "نظرة شاملة على الطلاب والأقساط والوضع المالي للفرع"}
              </p>
            </div>
          </div>

          {/* Collection rate donut ring — hero metric */}
          <div
            className="flex items-center gap-4 rounded-2xl px-5 py-3 shrink-0"
            style={{ background: "rgba(255,255,255,0.12)", backdropFilter: "blur(12px)" }}
          >
            <svg width="92" height="92" viewBox="0 0 96 96" className="-rotate-90">
              <circle cx="48" cy="48" r={ringRadius} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth="8" />
              <circle
                cx="48"
                cy="48"
                r={ringRadius}
                fill="none"
                stroke="white"
                strokeWidth="8"
                strokeLinecap="round"
                strokeDasharray={ringCircumference}
                strokeDashoffset={ringOffset}
                style={{ transition: "stroke-dashoffset 700ms cubic-bezier(0.16,1,0.3,1)" }}
              />
              <text
                x="48"
                y="54"
                textAnchor="middle"
                fontSize="22"
                fontWeight="900"
                fill="white"
                className="rotate-90"
                style={{ transformOrigin: "48px 48px" }}
              >
                {dashboardTotals.paidPct}%
              </text>
            </svg>
            <div>
              <p className="text-white text-sm font-black leading-tight">
                {isEn ? "Collection" : "نسبة التحصيل"}
              </p>
              <p className="text-white/60 text-[11px]">{isEn ? "Rate" : "معدل التحصيل"}</p>
            </div>
          </div>
        </div>
      </div>

      {warning && (
        <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
          {isEn ? "Some data may be unavailable. Showing partial results." : "بعض البيانات قد تكون غير متاحة. تعرض نتائج جزئية."}
        </div>
      )}

      {/* Row 2: Bento KPI grid — varied sizes, big typography */}
      <motion.div
        className="grid grid-cols-2 md:grid-cols-4 gap-4 md:auto-rows-[100px]"
        variants={getVariants(reduced, containerVariants(0.05))}
        initial="hidden"
        animate="visible"
      >
        {kpiCards.map((item) => (
          <motion.div
            key={item.label}
            variants={getVariants(reduced, cardVariants)}
            className={`group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4 overflow-hidden transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg ${item.span ?? ""}`}
            style={{ willChange: "transform" }}
          >
            <div
              className="absolute -top-6 -end-6 w-24 h-24 rounded-full opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
              style={{ background: item.bg }}
            />
            <div className="relative flex items-start justify-between mb-2">
              <span
                className="w-9 h-9 rounded-xl flex items-center justify-center shrink-0"
                style={{ background: item.bg, color: item.color }}
              >
                {item.icon}
              </span>
            </div>
            <p
              className={`relative font-black tabular-nums leading-none mb-1.5 ${item.big ? "text-3xl md:text-4xl" : "text-xl md:text-2xl"}`}
              style={{ color: item.color }}
            >
              {item.value}
            </p>
            <p className="relative text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-wide">
              {item.label}
            </p>
          </motion.div>
        ))}
      </motion.div>

      {/* Row 3: Bento 2-col — QuickAccessPanel + mini stat cards */}
      <div className="grid grid-cols-1 lg:grid-cols-[1.3fr_1fr] gap-5">
        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1">
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
        </div>

        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
          <p className="text-[10px] font-black text-[var(--text-muted)] uppercase tracking-widest mb-3">
            {isEn ? "Structure & Staff" : "الهيكل والهيئة"}
          </p>
          <div className="grid grid-cols-2 gap-3">
            {miniStats.map((item) => (
              <div
                key={item.label}
                className="rounded-xl p-3 transition-all duration-200 hover:-translate-y-0.5"
                style={{ background: "var(--surface-soft)" }}
              >
                <div className="flex items-center gap-2 mb-1.5">
                  <span
                    className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                    style={{ background: `color-mix(in srgb, ${item.color} 14%, transparent)`, color: item.color }}
                  >
                    {item.icon}
                  </span>
                  <span className="text-[10px] font-semibold text-[var(--text-secondary)] truncate">
                    {item.label}
                  </span>
                </div>
                <p className="text-lg font-black tabular-nums" style={{ color: item.color }}>
                  {item.value}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Row 4: Recent Payments + Overdue Students */}
      <motion.div
        className="grid grid-cols-1 md:grid-cols-2 gap-5"
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

      {/* Row 5: Classes Table */}
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
                  <th className="px-4 py-3 text-start text-[10px] font-black text-[var(--text-muted)] uppercase tracking-wide">
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

      {/* Row 6: Activity Logs — styled as timeline */}
      <ActivityLogsTimeline
        isEn={isEn}
        activityLogs={activityLogs}
        activityLoading={activityLoading}
        activityLoaded={activityLoaded}
        onRefresh={() => setActivityLoaded(false)}
      />

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
