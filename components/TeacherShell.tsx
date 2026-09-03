"use client";

import { usePathname } from "next/navigation";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { getLocaleFromPath } from "@/lib/locale-routing";

interface TeacherShellProps {
  children: React.ReactNode;
  currentPath: string;
  titleAr: string;
  titleEn: string;
  subtitleAr?: string;
  subtitleEn?: string;
  actions?: React.ReactNode;
}

export function TeacherShell({
  children,
  currentPath,
  titleAr,
  titleEn,
  subtitleAr,
  subtitleEn,
  actions,
}: TeacherShellProps) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isAr = locale === "ar";

  return (
    <ProtectedRoute roles={["teacher"]}>
      <div className="flex min-h-screen">
        <AppSidebar currentPath={currentPath} />
        <div className="flex-1 min-w-0">
          <AppShellTopbar
            title={isAr ? titleAr : titleEn}
            subtitle={isAr ? subtitleAr : subtitleEn}
            actions={actions}
          />
          <main className="p-4 md:p-6">{children}</main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
