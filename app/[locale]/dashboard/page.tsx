"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Database } from "@/lib/icons";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { useDashboardData } from "./_hooks/useDashboardData";
import { useClassesSections } from "./_hooks/useClassesSections";
import { useFeeManagement } from "./_hooks/useFeeManagement";
import { useBranding } from "./_hooks/useBranding";
import { useNotifications } from "./_hooks/useNotifications";
import {
  DashboardActions,
  SchoolBrandingPanel,
  NotificationsPanel,
  ClassFeesTable,
  StatisticsCards,
  FinancialAnalysisPanel,
  RecentPaymentsPanel,
  OverdueStudentsPanel,
  ClassesModal,
  FeeModal,
} from "./_components";

export default function DashboardPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations();
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);

  const dashboardData = useDashboardData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
  });

  const classesSections = useClassesSections({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
  });

  const feeManagement = useFeeManagement({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    classFees: dashboardData.classFees,
    studentCountByClass: dashboardData.studentCountByClass,
    onRefetch: dashboardData.refetch,
  });

  const branding = useBranding({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
  });

  const notifications = useNotifications({
    profile,
    scopeLoading: schoolScope.scopeLoading,
  });

  const [showFeesTable, setShowFeesTable] = useState(false);
  const [showClassesModal, setShowClassesModal] = useState(false);

  const paymentsPageHref = schoolScope.buildLocalizedPath("/payments", locale);
  const canCustomizeBranding = profile?.role === "super_admin";
  const hasOperationalData =
    dashboardData.dashboardTotals.studentsCount > 0 ||
    dashboardData.classFees.length > 0 ||
    dashboardData.recentPayments.length > 0 ||
    dashboardData.overdueStudents.length > 0;
  const dashboardSummary = schoolScope.shouldBlockContent
    ? "اختر مدرسة أولاً حتى تصبح بيانات الهيدر والإحصائيات مرتبطة بسياق واضح."
    : schoolScope.isSuperAdminScope
      ? "عرض مركّز حسب المدرسة المحددة حالياً مع الحفاظ على نفس البيانات والعمليات."
      : "نظرة سريعة على الرسوم والمدفوعات والطلاب ضمن المدرسة الحالية.";

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <>
        <div className="layout">
          <AppSidebar currentPath="/dashboard" />
          <div className="main">
            <AppShellTopbar title="لوحة التحكم" subtitle={dashboardSummary} scope={schoolScope} fixed />
            <div className="content app-shell-content app-shell-content--with-fixed-topbar">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />
              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="لوحة التحكم"
                  description="اختر مدرسة أولاً لعرض الإحصائيات والرسوم الدراسية والبيانات المالية الخاصة بها."
                />
              ) : dashboardData.loading ? (
                <div className="spin" />
              ) : (
                <>
                  <DashboardActions
                    canManageClasses={canManageClasses}
                    showFeesTable={showFeesTable}
                    onToggleFeesTable={() => setShowFeesTable(v => !v)}
                    onOpenNewFee={feeManagement.openNewFee}
                    onOpenClassesModal={() => setShowClassesModal(true)}
                  />

                  {(canCustomizeBranding || profile?.role === "admin" || profile?.role === "super_admin") && (
                    <div style={{ display: "grid", gap: ".8rem", gridTemplateColumns: "repeat(auto-fit,minmax(280px,1fr))", marginBottom: "1rem" }}>
                      {canCustomizeBranding && (
                        <SchoolBrandingPanel
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
                      )}
                      <NotificationsPanel
                        notifications={notifications.notifications}
                        notificationsEnabled={notifications.notificationsEnabled}
                        notificationsLoading={notifications.notificationsLoading}
                        unreadNotifications={notifications.unreadNotifications}
                        onRefresh={notifications.fetchDashboardNotifications}
                        onMarkAsRead={notifications.markNotificationAsRead}
                      />
                    </div>
                  )}

                  {hasOperationalData ? (
                    <>
                      <ClassFeesTable
                        classFees={dashboardData.classFees}
                        showFeesTable={showFeesTable}
                        canManageClasses={canManageClasses}
                        deleteConfirm={feeManagement.deleteConfirm}
                        getClassStats={feeManagement.getClassStats}
                        onOpenNewFee={feeManagement.openNewFee}
                        onEditFee={feeManagement.openEditFee}
                        onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
                        onCancelDelete={() => feeManagement.setDeleteConfirm(null)}
                        onConfirmDelete={feeManagement.handleDeleteFee}
                      />

                      <StatisticsCards dashboardTotals={dashboardData.dashboardTotals} />
                      <FinancialAnalysisPanel dashboardTotals={dashboardData.dashboardTotals} />

                      <div className="bottom-grid">
                        <RecentPaymentsPanel recentPayments={dashboardData.recentPayments} paymentsPageHref={paymentsPageHref} />
                        <OverdueStudentsPanel overdueStudents={dashboardData.overdueStudents} paymentsPageHref={paymentsPageHref} />
                      </div>
                    </>
                  ) : (
                    <div className="card" style={{ textAlign: "center", padding: "2rem 1.5rem" }}>
                      <div
                        style={{
                          width: 64,
                          height: 64,
                          margin: "0 auto 1rem",
                          borderRadius: 20,
                          display: "inline-flex",
                          alignItems: "center",
                          justifyContent: "center",
                          background: "rgba(79,140,255,0.12)",
                          color: "var(--primary)",
                        }}
                      >
                        <Database size={28} />
                      </div>
                      <h3 style={{ marginBottom: ".45rem", fontSize: "1rem", color: "var(--text-primary)" }}>
                        {t("dashboard.emptyTitle")}
                      </h3>
                      <p className="muted" style={{ maxWidth: 460, margin: "0 auto", lineHeight: 1.9 }}>
                        {t("dashboard.emptyDescription")}
                      </p>
                    </div>
                  )}
                </>
              )}
            </div>
          </div>
        </div>

        <ClassesModal
          show={showClassesModal}
          classes={classesSections.classes}
          sections={classesSections.sections}
          onClose={() => setShowClassesModal(false)}
          onSaveClass={classesSections.handleSaveClass}
          onDeleteClass={classesSections.handleDeleteClass}
          onSaveSection={classesSections.handleSaveSection}
          onDeleteSection={classesSections.handleDeleteSection}
        />

        <FeeModal
          show={feeManagement.showFeeModal}
          editingFee={feeManagement.editingFee}
          feeForm={feeManagement.feeForm}
          feeLoading={feeManagement.feeLoading}
          feeError={feeManagement.feeError}
          feeSuccess={feeManagement.feeSuccess}
          studentCountByClass={dashboardData.studentCountByClass}
          onClose={feeManagement.closeFeeModal}
          onSave={feeManagement.handleSaveFee}
          onFormChange={feeManagement.setFeeForm}
        />
      </>
    </ProtectedRoute>
  );
}
