"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { X } from "lucide-react";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
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
  containerClassName,
  navClassName,
  separatorClassName,
}: AppSidebarProps) {
  const { role } = useRole();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const [scopedSchoolId, setScopedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());
  const [mobileOpen, setMobileOpen] = useState(false);

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

  useEffect(() => {
    function openSidebar() {
      setMobileOpen(true);
    }

    function closeSidebar() {
      setMobileOpen(false);
    }

    window.addEventListener("app-sidebar-toggle", openSidebar);
    window.addEventListener("app-sidebar-close", closeSidebar);

    return () => {
      window.removeEventListener("app-sidebar-toggle", openSidebar);
      window.removeEventListener("app-sidebar-close", closeSidebar);
    };
  }, []);

  useEffect(() => {
    setMobileOpen(false);
  }, [pathname]);

  return (
    <>
      {mobileOpen ? <button type="button" className="app-sidebar__backdrop" onClick={() => setMobileOpen(false)} /> : null}
      <aside
        className={[
          "app-sidebar",
          mobileOpen ? "is-open" : "",
          containerClassName || "",
        ]
          .filter(Boolean)
          .join(" ")}
      >
        <div className="app-sidebar__header">
          <Link
            href={
              role === "super_admin" && scopedSchoolId
                ? buildPathWithSchoolScope(localizeAppPath("/dashboard", locale), scopedSchoolId)
                : localizeAppPath("/dashboard", locale)
            }
            className="app-sidebar__brand"
          >
            <UltrathinkLogo size={38} showText={false} />
            <span className="app-sidebar__brand-copy">
              <strong>{locale === "en" ? "School" : "المدرسة"}</strong>
              <span>{locale === "en" ? "Navigation" : "التنقل"}</span>
            </span>
          </Link>

          <button
            type="button"
            className="app-sidebar__close"
            onClick={() => setMobileOpen(false)}
            aria-label={locale === "en" ? "Close navigation" : "إغلاق التنقل"}
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="app-sidebar__body">
          {navItems.map((item) => (
            <Link
              key={item.id}
              href={
                role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)
                  ? buildPathWithSchoolScope(localizeAppPath(item.href, locale), scopedSchoolId)
                  : localizeAppPath(item.href, locale)
              }
              className={[
                "app-sidebar__link",
                isPathMatch(currentPath, item.href) ? "is-active" : "",
                navClassName || "",
              ]
                .filter(Boolean)
                .join(" ")}
            >
              <span className="app-sidebar__icon" aria-hidden="true">
                <AppIcon token={item.iconToken} size={16} />
              </span>
              {localizedLabels?.[item.id as keyof typeof localizedLabels] ?? item.label}
            </Link>
          ))}
        </div>

        <div className={["app-sidebar__footer", separatorClassName || ""].filter(Boolean).join(" ")}>
          <div className="app-sidebar__footer-copy">
            <span>{locale === "en" ? "Web workspace" : "مساحة العمل"}</span>
            <strong>{locale === "en" ? "Clean, compact, responsive" : "أخف وأكثر اتساقاً"}</strong>
          </div>
        </div>
      </aside>
    </>
  );
}
