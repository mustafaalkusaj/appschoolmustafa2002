"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname } from "next/navigation";
import { signOutClient } from "@/lib/auth";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRole } from "@/hooks/useRole";
import { getSidebarItemsForRole, isPathMatch } from "@/types/roles";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import { UltrathinkLogo } from "@/components/UltrathinkLogo";
import {
  SCHOOL_SCOPE_CHANGE_EVENT,
  buildPathWithSchoolScope,
  isSuperAdminSchoolScopedPath,
  readSchoolScopeFromWindow,
} from "@/lib/school-scope";

interface AppSidebarProps {
  currentPath: string;
  containerClassName?: string;
  navClassName?: string;
  separatorClassName?: string;
}

export function AppSidebar({
  currentPath,
  containerClassName = "sidebar",
  navClassName = "nav",
  separatorClassName = "sep",
}: AppSidebarProps) {
  const { role } = useRole();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [scopedSchoolId, setScopedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());

  const navItems = useMemo(() => getSidebarItemsForRole(role), [role]);
  const localizedLabels =
    locale === "en"
      ? {
          dashboard: "Dashboard",
          "super-admin": "Super Admin",
          schools: "Schools",
          teachers: "Teachers",
          students: "Students",
          payments: "Finance",
          expenses: "Expenses",
          salaries: "Salaries",
          attendance: "Attendance",
          reports: "Reports",
          subscriptions: "Subscriptions",
        }
      : null;

  useEffect(() => {
    const syncScopedSchool = () => {
      const nextSchoolId = readSchoolScopeFromWindow();
      setScopedSchoolId(nextSchoolId);
    };

    syncScopedSchool();
    window.addEventListener("popstate", syncScopedSchool);
    window.addEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncScopedSchool);
    return () => {
      window.removeEventListener("popstate", syncScopedSchool);
      window.removeEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncScopedSchool);
    };
  }, [pathname]);

  async function handleLogout() {
    await signOutClient();
    window.location.href = localizeAppPath("/login", locale);
  }

  return (
    <div className={containerClassName}>
      <div className="min-h-0 flex-1 overflow-y-auto">
        <div className="logo">
          <UltrathinkLogo size={34} showText={false} />
        </div>

        <div className="space-y-1 pb-3">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={
                role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)
                  ? buildPathWithSchoolScope(localizeAppPath(item.href, locale), scopedSchoolId)
                  : localizeAppPath(item.href, locale)
              }
              className={`${navClassName}${isPathMatch(currentPath, item.href) ? " active" : ""}`}
            >
              {localizedLabels?.[item.id as keyof typeof localizedLabels] ?? item.label}
            </Link>
          ))}
        </div>
      </div>

      <div className="mt-auto shrink-0 pt-3">
        <div className={separatorClassName} />
        <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-2">
          <button type="button" className={`${navClassName} danger w-full justify-center`} onClick={handleLogout}>
            {locale === "en" ? "Sign out" : "تسجيل الخروج"}
          </button>
          <LanguageToggle className={`${navClassName} mt-2 w-full justify-center`} />
          <ThemeModeToggle variant="inline" className="sidebar-theme-switch mt-2 w-full" />
        </div>
      </div>
    </div>
  );
}
