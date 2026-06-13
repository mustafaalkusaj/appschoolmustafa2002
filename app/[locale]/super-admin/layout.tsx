"use client";

import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { useTranslations } from "next-intl";
import { SuperAdminProvider } from "./_hooks/useSuperAdminData";
import { SuperAdminNav } from "./_components/SuperAdminNav";

export default function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const t = useTranslations("superAdmin");

  return (
    <ProtectedRoute roles={["super_admin"]}>
      <SuperAdminProvider>
        <div className="flex min-h-screen bg-[var(--surface-muted)]">
          <AppSidebar currentPath="/super-admin" />

          <div className="flex-1 flex flex-col min-w-0">
            <AppShellTopbar title={t("title")} fixed />

            <main className="app-shell-frame--with-fixed-topbar flex-1 min-h-0 overflow-y-auto custom-scrollbar">
              <SuperAdminNav />
              <div className="p-4">{children}</div>
            </main>
          </div>
        </div>
      </SuperAdminProvider>
    </ProtectedRoute>
  );
}
