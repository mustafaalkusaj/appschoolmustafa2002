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
