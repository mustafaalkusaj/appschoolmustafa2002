"use client";

import { useState } from "react";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import { formatNumber } from "@/lib/formatting";
import { fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { AddStudentModal } from "@/app/[locale]/students/_components/AddStudentModal";
import { DEFAULT_STUDENT_FORM } from "@/app/[locale]/students/_constants";
import type { StudentFormData } from "@/app/[locale]/students/_types";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import Link from "next/link";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Database, LayoutDashboard, Settings } from "@/lib/icons";
import { AnalysisSkeleton } from "@/components/skeleton";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { useDashboardData } from "../_hooks/useDashboardData";
import { useClassesSections } from "../_hooks/useClassesSections";
import { useFeeManagement } from "../_hooks/useFeeManagement";
import { useBranding } from "../_hooks/useBranding";
import { useNotifications } from "../_hooks/useNotifications";
import { useRecentActivity } from "../_hooks/useRecentActivity";
import { useDashboardLayout } from "@/hooks/useDashboardLayout";
import type { WidgetId } from "@/lib/dashboard-widgets";
import {
  DashboardActions,
  SchoolBrandingPanel,
  NotificationsPanel,
  RecentActivityPanel,
  ClassFeesTable,
  StatisticsCards,
  DailyFinancialAnalysis,
  FinancialAnalysisPanel,
  RecentPaymentsPanel,
  OverdueStudentsPanel,
  ClassesModal,
  FeeModal,
  QuickAccessPanel,
  DashboardPaymentModal,
  DashboardTeacherModal,
  DashboardExpenseModal,
  DashboardIncomeModal,
  DashboardKPICards,
  DashboardAlerts,
  DashboardBranchPerformance,
  DashboardInsights,
  DashboardOverdueNew,
  DashboardTransactions,
  DashboardFooterStats,
} from ".";


interface DashboardExperienceProps {
  currentPath?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  branchScoped?: boolean;
  schoolIdOverride?: string | null;
}

export function DashboardExperience({
  currentPath = "/dashboard",
  titleOverride,
  subtitleOverride,
  branchScoped = false,
  schoolIdOverride,
}: DashboardExperienceProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("dashboard");
  const commonT = useTranslations("common");
  const { profile, canAny, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const effectiveSchoolId = schoolIdOverride ?? schoolScope.selectedSchoolId;

  // Check if a dashboard section is enabled. Defaults to true when sections map is null/undefined
  // (admins and super_admins without a school_role_id see everything).
  const ds = profile?.dashboardSections ?? null;
  const sectionEnabled = (key: string) =>
    ds == null || ds[key] !== false;

  // User-controlled layout (order + hidden widgets from localStorage)
  const dashboardLayout = useDashboardLayout();
  const widgetVisible = (id: WidgetId) =>
    dashboardLayout.order.includes(id) && !dashboardLayout.hidden.includes(id);
  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);
  const archiveMode = useArchiveMode();

  const dashboardData = useDashboardData({
    profile,
    selectedSchoolId: effectiveSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const recentActivity = useRecentActivity({
    profile,
    selectedSchoolId: effectiveSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const classesSections = useClassesSections({
    profile,
    selectedSchoolId: effectiveSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const availableClassNames = Array.isArray(classesSections.classes)
    ? classesSections.classes.map((item) => item?.name).filter(Boolean)
    : [];

  const feeManagement = useFeeManagement({
    profile,
    selectedSchoolId: effectiveSchoolId,
    classFees: dashboardData.classFees || [],
    studentCountByClass: dashboardData.studentCountByClass || {},
    availableClassNames,
    onRefetch: dashboardData.refetch,
    branchScoped,
  });

  const branding = useBranding({
    profile,
    selectedSchoolId: effectiveSchoolId,
    scopeLoading: schoolScope.scopeLoading,
  });

  const notifications = useNotifications({
    profile,
    scopeLoading: schoolScope.scopeLoading,
  });

  const [showFeesTable, setShowFeesTable] = useState(branchScoped);
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

  const handleAddStudentSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!effectiveSchoolId) return;
    setAddStudentSaving(true);
    setAddStudentError("");
    try {
      const res = await fetchWithAuthorizedSession("/api/dashboard/users", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: effectiveSchoolId,
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
        dashboardData.refetch();
      }
    } catch {
      setAddStudentError("خطأ في الاتصال");
    } finally {
      setAddStudentSaving(false);
    }
  };

  const paymentsPageHref = schoolScope.buildLocalizedPath("/payments", locale);
  const canCustomizeBranding = profile?.role === "super_admin";
  const canManageStudentAccounts = profile?.role === "super_admin" || profile?.role === "admin";

  const dashboardSummary = schoolScope.shouldBlockContent
    ? t("summary.empty")
    : schoolScope.isSuperAdminScope
      ? t("summary.superAdmin")
      : t("summary.default");

  return (
    <div className="flex min-h-screen">
      <AppSidebar currentPath={currentPath} />

      <div className="flex-1 flex flex-col min-w-0">
        <AppShellTopbar
          title={titleOverride ?? t("title")}
          subtitle={subtitleOverride ?? dashboardSummary}
          scope={schoolScope}
          fixed
        />

        <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
          <div className="p-4 sm:p-6 space-y-6">
            <SchoolScopeBanner scope={schoolScope} showSelector={false} />

            {/* Archive mode summary card */}
            {archiveMode.isArchiveMode && archiveMode.archiveData && (
              <div
                className="rounded-2xl p-5 space-y-4"
                style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 100%)" }}
              >
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Database size={18} className="text-indigo-200" />
                  </div>
                  <div>
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">لوحة التحكم · وضع الأرشيف</p>
                    <p className="text-base font-black text-white">إحصائيات أرشيف سنة {archiveMode.archiveData.year}</p>
                  </div>
                </div>
                <div className="grid grid-cols-3 gap-3">
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="text-2xl font-black text-white">{archiveMode.archiveData.students.length}</p>
                    <p className="text-[11px] text-indigo-300 mt-0.5">طالب مؤرشف</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="text-2xl font-black text-white">{archiveMode.archiveData.payments.length}</p>
                    <p className="text-[11px] text-indigo-300 mt-0.5">دفعة مؤرشفة</p>
                  </div>
                  <div className="rounded-xl bg-white/10 p-3 text-center">
                    <p className="text-lg font-black text-emerald-300">
                      {formatNumber(archiveMode.archiveData.totalAmount)}
                    </p>
                    <p className="text-[11px] text-indigo-300 mt-0.5">إجمالي د.ع</p>
                  </div>
                </div>
                <p className="text-[11px] text-indigo-400 text-center">
                  البيانات الحية لا تزال متاحة في الأسفل · وضع الأرشيف للقراءة فقط
                </p>
              </div>
            )}

            {!branchScoped && schoolScope.shouldBlockContent ? (
              <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] py-16 text-center">
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title={t("emptyState.title")}
                  description={t("emptyState.description")}
                />
              </div>
            ) : (
              <>{(() => {
                // ── widget renderers ──────────────────────────────────────────
                const renderWidgetById = (id: WidgetId): React.ReactNode => {
                  if (!sectionEnabled(id)) return null;
                  switch (id) {
                    case "stats":
                      return branchScoped ? (
                        <DailyFinancialAnalysis
                          dashboardTotals={dashboardData.dashboardTotals}
                          recentPayments={dashboardData.recentPayments}
                          locale={locale}
                        />
                      ) : (
                        <StatisticsCards
                          dashboardTotals={dashboardData.dashboardTotals}
                          loading={dashboardData.loading}
                          error={dashboardData.error}
                          onRetry={dashboardData.refetch}
                        />
                      );

                    case "financial":
                      return (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                          {dashboardData.loading ? (
                            <AnalysisSkeleton />
                          ) : dashboardData.error ? (
                            <div className="flex flex-col items-center justify-center min-h-[320px] text-center gap-3">
                              <div className="h-12 w-12 rounded-2xl bg-[var(--danger)]/10 text-[var(--danger)] flex items-center justify-center">
                                <Database size={22} />
                              </div>
                              <p className="text-sm font-bold text-[var(--text-primary)]">{t("errors.overviewTitle")}</p>
                              <p className="text-xs text-[var(--text-muted)]">{t("errors.overviewDescription")}</p>
                              <button onClick={dashboardData.refetch} className="inline-flex items-center h-8 px-3 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-secondary)] hover:bg-[var(--surface-soft)] transition-colors">
                                {commonT("retry")}
                              </button>
                            </div>
                          ) : (
                            <FinancialAnalysisPanel dashboardTotals={dashboardData.dashboardTotals} />
                          )}
                        </div>
                      );

                    case "branding":
                      return canCustomizeBranding ? (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-6">
                          <SchoolBrandingPanel
                            brandingSchoolId={branding.brandingSchoolId}
                            brandingForm={branding.brandingForm}
                            setBrandingForm={branding.setBrandingForm}
                            brandingSaving={branding.brandingSaving}
                            brandingDeriving={branding.brandingDeriving}
                            brandingNotice={branding.brandingNotice}
                            selectedBrandTheme={branding.selectedBrandTheme}
                            onSave={branding.saveBrandingFromDashboard}
                            onApplyTheme={branding.applyBrandThemePreset}
                            onDeriveFromLogo={branding.deriveDashboardBrandingFromLogo}
                          />
                        </div>
                      ) : null;

                    case "activity":
                      return (
                        <RecentActivityPanel
                          activities={recentActivity.activities}
                          loading={recentActivity.loading}
                          error={recentActivity.error}
                          onRetry={recentActivity.refresh}
                          locale={locale}
                        />
                      );

                    case "notifications":
                      return (
                        <NotificationsPanel
                          notifications={notifications.notifications}
                          notificationsEnabled={notifications.notificationsEnabled}
                          notificationsLoading={notifications.notificationsLoading}
                          error={notifications.error}
                          unreadNotifications={notifications.unreadNotifications}
                          onRefresh={notifications.fetchDashboardNotifications}
                          onMarkAsRead={notifications.markNotificationAsRead}
                        />
                      );

                    case "fees_table":
                      return (
                        <ClassFeesTable
                          classFees={dashboardData.classFees}
                          showFeesTable={showFeesTable}
                          canManageClasses={canManageClasses}
                          loading={dashboardData.loading}
                          error={dashboardData.error}
                          onRetry={dashboardData.refetch}
                          deleteConfirm={feeManagement.deleteConfirm}
                          getClassStats={feeManagement.getClassStats}
                          onOpenNewFee={() => { setShowFeesTable(true); feeManagement.openNewFee(); }}
                          onEditFee={feeManagement.openEditFee}
                          onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
                          onCancelDelete={() => feeManagement.setDeleteConfirm(null)}
                          onConfirmDelete={feeManagement.handleDeleteFee}
                        />
                      );

                    case "payments_list":
                      return (
                        <RecentPaymentsPanel
                          recentPayments={dashboardData.recentPayments}
                          paymentsPageHref={paymentsPageHref}
                          locale={locale}
                          loading={dashboardData.loading}
                          error={dashboardData.error}
                          onRetry={dashboardData.refetch}
                        />
                      );

                    case "overdue_students":
                      return (
                        <OverdueStudentsPanel
                          overdueStudents={dashboardData.overdueStudents}
                          paymentsPageHref={paymentsPageHref}
                          locale={locale}
                          loading={dashboardData.loading}
                          error={dashboardData.error}
                          onRetry={dashboardData.refetch}
                        />
                      );

                    default:
                      return null;
                  }
                };

                // ── build render list — collapse payments+overdue into a 2-col pair ──
                const visibleIds = dashboardLayout.order.filter(id => widgetVisible(id as WidgetId)) as WidgetId[];

                type RenderItem =
                  | { type: "single"; id: WidgetId }
                  | { type: "pair"; ids: [WidgetId, WidgetId] };

                const renderItems: RenderItem[] = [];
                const PAIR: [WidgetId, WidgetId] = ["payments_list", "overdue_students"];
                let pairEmitted = false;

                for (const id of visibleIds) {
                  if (PAIR.includes(id)) {
                    if (!pairEmitted) {
                      const bothVisible = PAIR.every(p => visibleIds.includes(p));
                      if (bothVisible) {
                        // Emit pair in the order of the first member encountered
                        const ordered: [WidgetId, WidgetId] = visibleIds.indexOf("payments_list") < visibleIds.indexOf("overdue_students")
                          ? ["payments_list", "overdue_students"]
                          : ["overdue_students", "payments_list"];
                        renderItems.push({ type: "pair", ids: ordered });
                      } else {
                        renderItems.push({ type: "single", id });
                      }
                      pairEmitted = true;
                    }
                  } else {
                    renderItems.push({ type: "single", id });
                  }
                }

                return (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">

                    {/* Hero Banner — only on main dashboard, not branch-overview */}
                    {!branchScoped && (
                      <div
                        className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                        style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                      >
                        <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                        <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                        <div className="relative flex items-center justify-between gap-4">
                          <div>
                            <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                              {locale === "en" ? "Administration · Overview" : "لوحة الإدارة · نظرة عامة"}
                            </p>
                            <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                              {titleOverride ?? (locale === "en" ? "Dashboard" : "لوحة التحكم")}
                            </h1>
                            <p className="text-white/70 text-sm">
                              {locale === "en" ? "School performance and financial overview" : "نظرة شاملة على أداء المدرسة والوضع المالي"}
                            </p>
                          </div>
                          <div className="flex items-center gap-3 flex-shrink-0">
                            {(profile?.role === "super_admin" || profile?.role === "admin") && (
                              <Link
                                href={localizeAppPath("/dashboard/settings", locale)}
                                className="hidden md:flex items-center justify-center w-10 h-10 rounded-xl transition-colors"
                                style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}
                                title={locale === "en" ? "Dashboard Settings" : "إعدادات لوحة التحكم"}
                                aria-label={locale === "en" ? "Dashboard Settings" : "إعدادات لوحة التحكم"}
                              >
                                <Settings size={20} className="text-white" />
                              </Link>
                            )}
                            <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                              <LayoutDashboard size={38} className="text-white" />
                            </div>
                          </div>
                        </div>
                      </div>
                    )}

                    {dashboardData.warning && (
                      <div className="rounded-xl border border-amber-200 bg-amber-50/80 px-4 py-3 text-sm text-amber-900">
                        {t("errors.degradedWarning")}
                      </div>
                    )}

                    {/* New Dashboard Layout — main dashboard */}
                    {!branchScoped && (
                      <>
                        <DashboardKPICards dashboardTotals={dashboardData.dashboardTotals} loading={dashboardData.loading} />
                        <DashboardAlerts dashboardTotals={dashboardData.dashboardTotals} overdueStudents={dashboardData.overdueStudents} />
                        <DashboardBranchPerformance classFees={dashboardData.classFees} dashboardTotals={dashboardData.dashboardTotals} loading={dashboardData.loading} />
                        <DashboardInsights dashboardTotals={dashboardData.dashboardTotals} classFees={dashboardData.classFees} loading={dashboardData.loading} />
                        <DashboardOverdueNew overdueStudents={dashboardData.overdueStudents} classFees={dashboardData.classFees} loading={dashboardData.loading} />
                        <DashboardTransactions recentPayments={dashboardData.recentPayments} loading={dashboardData.loading} />
                        <DashboardFooterStats dashboardTotals={dashboardData.dashboardTotals} />

                        <DashboardActions
                          canManageClasses={canManageClasses}
                          showFeesTable={showFeesTable}
                          onToggleFeesTable={() => setShowFeesTable(v => !v)}
                          onOpenNewFee={() => { setShowFeesTable(true); feeManagement.openNewFee(); }}
                          onOpenClassesModal={() => setShowClassesModal(true)}
                        />
                      </>
                    )}

                    {/* Branch Summary Header — compact data-rich banner for branch-overview */}
                    {branchScoped && (
                      <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                        <div className="flex items-center justify-between gap-4 px-5 py-4">
                          {/* Left: title */}
                          <div className="min-w-0">
                            <p className="text-[10px] font-black text-[var(--primary)] uppercase tracking-widest mb-0.5">
                              {locale === "ar" ? "لوحة الفرع" : "Branch Panel"}
                            </p>
                            <h1 className="text-base font-black text-[var(--text-primary)] leading-tight truncate">
                              {titleOverride ?? (locale === "ar" ? "لوحة التحكم" : "Dashboard")}
                            </h1>
                          </div>

                          {/* Right: key branch stats + settings */}
                          <div className="flex items-center gap-3 flex-shrink-0">
                            <div className="text-center hidden sm:block">
                              <p className="text-xl font-black text-[var(--text-primary)] tabular-nums leading-none">
                                {dashboardData.dashboardTotals.studentsCount}
                              </p>
                              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-0.5">
                                {locale === "ar" ? "طالب" : "Students"}
                              </p>
                            </div>
                            <div className="w-px h-8 bg-[var(--border)] hidden sm:block" />
                            <div className="text-center hidden sm:block">
                              <p className="text-xl font-black text-[var(--success)] tabular-nums leading-none">
                                {dashboardData.dashboardTotals.paidPct}%
                              </p>
                              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-0.5">
                                {locale === "ar" ? "محصّل" : "Collected"}
                              </p>
                            </div>
                            <div className="w-px h-8 bg-[var(--border)] hidden sm:block" />
                            <div className="text-center hidden sm:block">
                              <p className="text-xl font-black text-[var(--danger)] tabular-nums leading-none">
                                {dashboardData.overdueStudents?.length ?? 0}
                              </p>
                              <p className="text-[9px] text-[var(--text-muted)] font-bold uppercase mt-0.5">
                                {locale === "ar" ? "متأخر" : "Overdue"}
                              </p>
                            </div>
                            {(profile?.role === "super_admin" || profile?.role === "admin") && (
                              <>
                                <div className="w-px h-8 bg-[var(--border)]" />
                                <Link
                                  href={localizeAppPath("/dashboard/settings", locale)}
                                  className="h-9 w-9 rounded-xl border border-[var(--border)] flex items-center justify-center text-[var(--text-muted)] hover:bg-[var(--surface-soft)] hover:text-[var(--text-primary)] transition-colors"
                                  title={locale === "en" ? "Settings" : "الإعدادات"}
                                >
                                  <Settings size={16} />
                                </Link>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Mobile: compact 3-stat strip */}
                        <div className="sm:hidden border-t border-[var(--border)] grid grid-cols-3 divide-x divide-[var(--border)] text-center">
                          <div className="px-3 py-2.5">
                            <p className="text-base font-black text-[var(--text-primary)] tabular-nums">{dashboardData.dashboardTotals.studentsCount}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold">{locale === "ar" ? "طالب" : "Students"}</p>
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-base font-black text-[var(--success)] tabular-nums">{dashboardData.dashboardTotals.paidPct}%</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold">{locale === "ar" ? "محصّل" : "Collected"}</p>
                          </div>
                          <div className="px-3 py-2.5">
                            <p className="text-base font-black text-[var(--danger)] tabular-nums">{dashboardData.overdueStudents?.length ?? 0}</p>
                            <p className="text-[9px] text-[var(--text-muted)] font-bold">{locale === "ar" ? "متأخر" : "Overdue"}</p>
                          </div>
                        </div>
                      </div>
                    )}

                    {branchScoped && (
                      <QuickAccessPanel
                        locale={locale}
                        buildLocalizedPath={schoolScope.buildLocalizedPath}
                        can={can}
                        canAny={canAny}
                        schoolId={effectiveSchoolId}
                        availableClassNames={availableClassNames}
                        onOpenClassesModal={() => setShowClassesModal(true)}
                        onOpenAddStudentModal={() => { setAddStudentForm(DEFAULT_STUDENT_FORM); setAddStudentStep(1); setAddStudentError(""); setShowAddStudentModal(true); }}
                        onOpenPaymentModal={() => setShowPaymentModal(true)}
                        onOpenTeacherModal={() => setShowTeacherModal(true)}
                        onOpenExpenseModal={() => setShowExpenseModal(true)}
                        onOpenIncomeModal={() => setShowIncomeModal(true)}
                        onOpenFeeModal={() => { setShowFeesTable(true); feeManagement.openNewFee(); }}
                      />
                    )}

                    {/* Order-driven widget list — only for branch-scoped views */}
                    {branchScoped && renderItems.map((item, idx) => {
                      if (item.type === "pair") {
                        return (
                          <div key={`pair-${idx}`} className="grid gap-6 md:grid-cols-2">
                            {item.ids.map(id => {
                              const content = renderWidgetById(id);
                              return content ? <div key={id}>{content}</div> : null;
                            })}
                          </div>
                        );
                      }
                      const content = renderWidgetById(item.id);
                      return content ? <div key={item.id}>{content}</div> : null;
                    })}

                    {/* Empty state */}
                    {!dashboardData.loading &&
                      !dashboardData.error &&
                      !dashboardData.warning &&
                      dashboardData.dashboardTotals.studentsCount === 0 &&
                      dashboardData.classFees.length === 0 &&
                      dashboardData.recentPayments.length === 0 &&
                      dashboardData.overdueStudents.length === 0 && (
                        <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] flex flex-col items-center justify-center py-16 text-center gap-4">
                          <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                            <Database size={32} />
                          </div>
                          <div>
                            <p className="text-base font-bold text-[var(--text-primary)]">{t("emptyTitle")}</p>
                            <p className="text-sm text-[var(--text-muted)] mt-1">{t("emptyDescription")}</p>
                          </div>
                        </div>
                      )}
                  </div>
                );
              })()}</>
            )}
          </div>
        </main>
      </div>

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
        onOpenNewFee={() => { setShowClassesModal(false); setShowFeesTable(true); feeManagement.openNewFee(); }}
        onEditFee={feeManagement.openEditFee}
        onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
        onCancelDelete={() => feeManagement.setDeleteConfirm(null)}
        onConfirmDelete={feeManagement.handleDeleteFee}
      />

      <DashboardPaymentModal
        show={showPaymentModal}
        schoolId={effectiveSchoolId}
        onClose={() => setShowPaymentModal(false)}
        onSuccess={() => { setShowPaymentModal(false); dashboardData.refetch(); }}
      />

      <DashboardTeacherModal
        show={showTeacherModal}
        schoolId={effectiveSchoolId}
        locale={locale}
        onClose={() => setShowTeacherModal(false)}
        onSuccess={() => setShowTeacherModal(false)}
      />

      <DashboardExpenseModal
        show={showExpenseModal}
        schoolId={effectiveSchoolId}
        locale={locale}
        onClose={() => setShowExpenseModal(false)}
        onSuccess={() => { setShowExpenseModal(false); dashboardData.refetch(); }}
      />

      <DashboardIncomeModal
        show={showIncomeModal}
        schoolId={effectiveSchoolId}
        locale={locale}
        onClose={() => setShowIncomeModal(false)}
        onSuccess={() => { setShowIncomeModal(false); dashboardData.refetch(); }}
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
        schoolId={effectiveSchoolId}
      />

      <FeeModal
        show={feeManagement.showFeeModal}
        editingFee={feeManagement.editingFee}
        feeForm={feeManagement.feeForm}
        feeLoading={feeManagement.feeLoading}
        feeError={feeManagement.feeError}
        feeSuccess={feeManagement.feeSuccess}
        studentCountByClass={dashboardData.studentCountByClass}
        availableClassNames={classesSections.classes.map((item) => item.name)}
        onClose={feeManagement.closeFeeModal}
        onSave={feeManagement.handleSaveFee}
        onFormChange={feeManagement.setFeeForm}
      />
    </div>
  );
}
