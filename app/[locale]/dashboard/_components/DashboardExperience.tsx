"use client";

import { useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { Database } from "@/lib/icons";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
import { AnalysisSkeleton } from "@/components/skeleton";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { useDashboardData } from "../_hooks/useDashboardData";
import { useClassesSections } from "../_hooks/useClassesSections";
import { useFeeManagement } from "../_hooks/useFeeManagement";
import { useBranding } from "../_hooks/useBranding";
import { useNotifications } from "../_hooks/useNotifications";
import { useRecentActivity } from "../_hooks/useRecentActivity";
import {
  DashboardActions,
  SchoolBrandingPanel,
  NotificationsPanel,
  RecentActivityPanel,
  ClassFeesTable,
  StatisticsCards,
  FinancialAnalysisPanel,
  RecentPaymentsPanel,
  OverdueStudentsPanel,
  ClassesModal,
  FeeModal,
} from ".";

interface DashboardExperienceProps {
  currentPath?: string;
  titleOverride?: string;
  subtitleOverride?: string;
  branchScoped?: boolean;
}

export function DashboardExperience({
  currentPath = "/dashboard",
  titleOverride,
  subtitleOverride,
  branchScoped = false,
}: DashboardExperienceProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("dashboard");
  const commonT = useTranslations("common");
  const { profile, canAny } = useRole();
  const schoolScope = useSchoolScope(profile);
  const canManageClasses = canAny(["add_students", "edit_students", "delete_students"]);

  const dashboardData = useDashboardData({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const recentActivity = useRecentActivity({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const classesSections = useClassesSections({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    scopeLoading: schoolScope.scopeLoading,
    branchScoped,
  });

  const feeManagement = useFeeManagement({
    profile,
    selectedSchoolId: schoolScope.selectedSchoolId,
    classFees: dashboardData.classFees,
    studentCountByClass: dashboardData.studentCountByClass,
    onRefetch: dashboardData.refetch,
    branchScoped,
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
    !dashboardData.error &&
    (dashboardData.dashboardTotals.studentsCount > 0 ||
      dashboardData.classFees.length > 0 ||
      dashboardData.recentPayments.length > 0 ||
      dashboardData.overdueStudents.length > 0);

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
          <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-6">
            <SchoolScopeBanner scope={schoolScope} showSelector={false} />

            {schoolScope.shouldBlockContent ? (
              <Card className="text-center">
                <CardContent className="py-12">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("emptyState.title")}
                    description={t("emptyState.description")}
                  />
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-700">
                <DashboardActions
                  canManageClasses={canManageClasses}
                  showFeesTable={showFeesTable}
                  onToggleFeesTable={() => setShowFeesTable((value) => !value)}
                  onOpenNewFee={feeManagement.openNewFee}
                  onOpenClassesModal={() => setShowClassesModal(true)}
                />

                <StatisticsCards
                  dashboardTotals={dashboardData.dashboardTotals}
                  loading={dashboardData.loading}
                  error={dashboardData.error}
                  onRetry={dashboardData.refetch}
                />

                <div className="grid gap-6 lg:grid-cols-[1fr_400px]">
                  <div className="space-y-6">
                    <Card>
                      <CardContent className="p-6">
                        {dashboardData.loading ? (
                          <AnalysisSkeleton />
                        ) : dashboardData.error ? (
                          <ErrorState
                            title={t("errors.overviewTitle")}
                            description={t("errors.overviewDescription")}
                            onRetry={dashboardData.refetch}
                            retryLabel={commonT("retry")}
                            className="min-h-[320px] px-0 py-8"
                          />
                        ) : (
                          <FinancialAnalysisPanel dashboardTotals={dashboardData.dashboardTotals} />
                        )}
                      </CardContent>
                    </Card>

                    {canCustomizeBranding ? (
                      <Card>
                        <CardContent className="p-6">
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
                        </CardContent>
                      </Card>
                    ) : null}
                  </div>

                  <div className="space-y-6">
                    <RecentActivityPanel
                      activities={recentActivity.activities}
                      loading={recentActivity.loading}
                      error={recentActivity.error}
                      onRetry={recentActivity.refresh}
                      locale={locale}
                    />
                    <NotificationsPanel
                      notifications={notifications.notifications}
                      notificationsEnabled={notifications.notificationsEnabled}
                      notificationsLoading={notifications.notificationsLoading}
                      error={notifications.error}
                      unreadNotifications={notifications.unreadNotifications}
                      onRefresh={notifications.fetchDashboardNotifications}
                      onMarkAsRead={notifications.markNotificationAsRead}
                    />
                  </div>
                </div>

                {dashboardData.loading || dashboardData.error || hasOperationalData ? (
                  <div className="space-y-6 animate-in fade-in slide-in-from-bottom-6 duration-1000">
                    <ClassFeesTable
                      classFees={dashboardData.classFees}
                      showFeesTable={showFeesTable}
                      canManageClasses={canManageClasses}
                      loading={dashboardData.loading}
                      error={dashboardData.error}
                      onRetry={dashboardData.refetch}
                      deleteConfirm={feeManagement.deleteConfirm}
                      getClassStats={feeManagement.getClassStats}
                      onOpenNewFee={feeManagement.openNewFee}
                      onEditFee={feeManagement.openEditFee}
                      onDeleteFee={(id) => feeManagement.setDeleteConfirm(id)}
                      onCancelDelete={() => feeManagement.setDeleteConfirm(null)}
                      onConfirmDelete={feeManagement.handleDeleteFee}
                    />

                    <div className="grid gap-6 md:grid-cols-2">
                      <RecentPaymentsPanel
                        recentPayments={dashboardData.recentPayments}
                        paymentsPageHref={paymentsPageHref}
                        locale={locale}
                        loading={dashboardData.loading}
                        error={dashboardData.error}
                        onRetry={dashboardData.refetch}
                      />
                      <OverdueStudentsPanel
                        overdueStudents={dashboardData.overdueStudents}
                        paymentsPageHref={paymentsPageHref}
                        locale={locale}
                        loading={dashboardData.loading}
                        error={dashboardData.error}
                        onRetry={dashboardData.refetch}
                      />
                    </div>
                  </div>
                ) : (
                  <EmptyState
                    icon={
                      <div className="h-16 w-16 flex items-center justify-center rounded-2xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
                        <Database size={32} />
                      </div>
                    }
                    title={t("emptyTitle")}
                    description={t("emptyDescription")}
                  />
                )}
              </div>
            )}
          </div>
        </main>
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
    </div>
  );
}
