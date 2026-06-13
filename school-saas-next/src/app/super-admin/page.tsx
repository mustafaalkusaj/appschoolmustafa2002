"use client";

import dynamic from "next/dynamic";
import { useEffect, useMemo, useState } from "react";
import { Building2, CircleDollarSign, Users2, XCircle } from "lucide-react";

import { SmartInsights } from "@/components/dashboard/smart-insights";
import { StatCard } from "@/components/dashboard/stat-card";
import { ProtectedRoute } from "@/components/permissions/protected-route";
import { LoadingSkeleton } from "@/components/shared/loading-skeleton";
import { AppHeader } from "@/components/shared/app-header";
import { AuditLogPanel } from "@/components/super-admin/audit-log-panel";
import { NotificationsPanel } from "@/components/super-admin/notifications-panel";
import { QuickActions } from "@/components/super-admin/quick-actions";
import { RolesPanel } from "@/components/super-admin/roles-panel";
import { SchoolsTable } from "@/components/super-admin/schools-table";
import { SettingsPanel } from "@/components/super-admin/settings-panel";
import { SubscriptionsTable } from "@/components/super-admin/subscriptions-table";
import { UsersPanel } from "@/components/super-admin/users-panel";
import { useAppData } from "@/hooks/useAppData";
import { useLanguage } from "@/hooks/useLanguage";
import { formatCurrency, formatNumber, interpolate } from "@/lib/i18n";
import { currency } from "@/lib/saas";

const ChartsGrid = dynamic(
  () => import("@/components/dashboard/charts-grid").then((module) => module.ChartsGrid),
  {
    ssr: false,
    loading: () => <LoadingSkeleton rows={4} />,
  },
);

type NoticeState =
  | { type: "school-created" }
  | { type: "report-summary"; schools: number; users: number; revenue: number }
  | null;

type AdminTab = "overview" | "schools" | "roles" | "users" | "notifications" | "audit" | "settings";

export default function SuperAdminPage() {
  const {
    source,
    isSyncing,
    errorMessage,
    clearError,
    schools,
    notifications,
    auditLogs,
    settings,
    globalStats,
    monthlyMetrics,
    topSchools,
    insights,
    createSchool,
    toggleSchoolStatus,
    archiveSchool,
    restoreSchool,
    markNotificationRead,
    updateSettings,
  } = useAppData();
  const { language, t } = useLanguage();

  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<NoticeState>(null);
  const [activeTab, setActiveTab] = useState<AdminTab>("overview");

  useEffect(() => {
    const timer = window.setTimeout(() => setIsLoading(false), 650);
    return () => window.clearTimeout(timer);
  }, []);

  const reportSnapshot = useMemo(
    () => ({
      schools: globalStats.totalSchools,
      users: globalStats.totalUsers,
      revenue: globalStats.totalRevenue,
    }),
    [globalStats],
  );

  const noticeMessage = useMemo(() => {
    if (!notice) {
      return null;
    }

    if (notice.type === "school-created") {
      return t.notices.schoolCreated;
    }

    return interpolate(t.notices.reportSummary, {
      schools: formatNumber(notice.schools, language),
      users: formatNumber(notice.users, language),
      revenue: formatCurrency(notice.revenue, language, settings.currency),
    });
  }, [language, notice, settings.currency, t.notices.reportSummary, t.notices.schoolCreated]);

  const tabs = useMemo(
    () =>
      [
        { key: "overview", label: t.superAdmin.tabs.overview },
        { key: "schools", label: t.superAdmin.tabs.schools },
        { key: "roles", label: t.superAdmin.tabs.roles },
        { key: "users", label: t.superAdmin.tabs.users },
        { key: "notifications", label: t.superAdmin.tabs.notifications },
        { key: "audit", label: t.superAdmin.tabs.audit },
        { key: "settings", label: t.superAdmin.tabs.settings },
      ] as Array<{ key: AdminTab; label: string }>,
    [t.superAdmin.tabs],
  );

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <div className="min-h-screen bg-slate-100 dark:bg-slate-950">
        <AppHeader title={t.superAdmin.title} subtitle={t.superAdmin.subtitle} />

        <main className="mx-auto flex w-full max-w-[1400px] flex-col gap-4 px-4 py-5 sm:px-6">
          <QuickActions
            onAddSchool={() => {
              setActiveTab("schools");
              createSchool();
              setNotice({ type: "school-created" });
            }}
            onAddUser={() => {
              setActiveTab("users");
            }}
            onGenerateReport={() => {
              setActiveTab("overview");
              setNotice({
                type: "report-summary",
                schools: reportSnapshot.schools,
                users: reportSnapshot.users,
                revenue: reportSnapshot.revenue,
              });
            }}
          />

          {noticeMessage && (
            <div className="rounded-xl border border-sky-200 bg-sky-50 px-3 py-2 text-sm text-sky-700 dark:border-sky-900/50 dark:bg-sky-900/20 dark:text-sky-300">
              {noticeMessage}
            </div>
          )}

          {errorMessage && (
            <div className="flex items-center justify-between gap-3 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-sm text-rose-700 dark:border-rose-900/40 dark:bg-rose-900/20 dark:text-rose-300">
              <span>{errorMessage}</span>
              <button type="button" onClick={clearError} className="text-xs font-semibold underline">
                {t.common.cancel}
              </button>
            </div>
          )}

          <div
            className={
              source === "supabase"
                ? "rounded-xl border border-emerald-200 bg-emerald-50 px-3 py-2 text-sm text-emerald-700 dark:border-emerald-900/40 dark:bg-emerald-900/20 dark:text-emerald-300"
                : "rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-sm text-amber-700 dark:border-amber-900/40 dark:bg-amber-900/20 dark:text-amber-300"
            }
          >
            {source === "supabase" ? t.superAdmin.dataSource.supabase : t.superAdmin.dataSource.mock}
            {isSyncing && (
              <span className="ms-2 text-xs opacity-80">
                {language === "ar" ? "جارٍ المزامنة..." : "Syncing..."}
              </span>
            )}
          </div>

          <nav className="flex flex-wrap gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setActiveTab(tab.key)}
                className={
                  activeTab === tab.key
                    ? "rounded-full bg-slate-900 px-4 py-2 text-sm font-semibold text-white dark:bg-slate-100 dark:text-slate-900"
                    : "rounded-full border border-slate-300 px-4 py-2 text-sm font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                }
              >
                {tab.label}
              </button>
            ))}
          </nav>

          {isLoading ? (
            <LoadingSkeleton rows={8} />
          ) : (
            <>
              {activeTab === "overview" && (
                <>
                  <section className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
                    <StatCard
                      title={t.superAdmin.stats.totalSchools}
                      value={formatNumber(globalStats.totalSchools, language)}
                      subtitle={t.superAdmin.stats.totalSchoolsHint}
                      icon={<Building2 className="h-4 w-4" />}
                    />
                    <StatCard
                      title={t.superAdmin.stats.totalUsers}
                      value={formatNumber(globalStats.totalUsers, language)}
                      subtitle={t.superAdmin.stats.totalUsersHint}
                      icon={<Users2 className="h-4 w-4" />}
                    />
                    <StatCard
                      title={t.superAdmin.stats.totalRevenue}
                      value={currency(globalStats.totalRevenue, language, settings.currency)}
                      subtitle={t.superAdmin.stats.totalRevenueHint}
                      icon={<CircleDollarSign className="h-4 w-4" />}
                    />
                    <StatCard
                      title={t.superAdmin.stats.expiredSubscriptions}
                      value={formatNumber(globalStats.expiredSubscriptions, language)}
                      subtitle={t.superAdmin.stats.expiredSubscriptionsHint}
                      icon={<XCircle className="h-4 w-4" />}
                    />
                  </section>

                  <SmartInsights insights={insights} />

                  <ChartsGrid monthlyMetrics={monthlyMetrics} topSchools={topSchools} />
                </>
              )}

              {activeTab === "schools" && (
                <section className="grid gap-4 xl:grid-cols-2">
                  <SchoolsTable
                    schools={schools}
                    onToggleStatus={toggleSchoolStatus}
                    onArchive={archiveSchool}
                    onRestore={restoreSchool}
                  />
                  <SubscriptionsTable schools={schools} />
                </section>
              )}

              {activeTab === "roles" && <RolesPanel />}

              {activeTab === "users" && (
                <section id="users-section">
                  <UsersPanel />
                </section>
              )}

              {activeTab === "notifications" && (
                <NotificationsPanel notifications={notifications} onRead={markNotificationRead} />
              )}

              {activeTab === "audit" && <AuditLogPanel auditLogs={auditLogs} />}

              {activeTab === "settings" && <SettingsPanel settings={settings} onSave={updateSettings} />}
            </>
          )}
        </main>
      </div>
    </ProtectedRoute>
  );
}
