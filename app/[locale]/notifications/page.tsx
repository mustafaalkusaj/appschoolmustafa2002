"use client";

import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { NotificationsExperience } from "./_components/NotificationsExperience";
import { ProtectedRoute } from "@/components/ProtectedRoute";

export default function NotificationsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("notifications");
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);

  const schoolId =
    schoolScope.selectedSchoolId ?? profile?.school_id ?? profile?.school?.id ?? "";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/notifications" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={t("subtitle")}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState scope={schoolScope} />
              ) : (
                <NotificationsExperience
                  schoolId={schoolId}
                  branchId={profile?.branch_id ?? undefined}
                  locale={locale}
                />
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
