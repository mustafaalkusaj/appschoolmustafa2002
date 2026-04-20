"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { Menu, X, ChevronRight, ChevronLeft, School, ChevronDown } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { SchoolLogo } from "@/components/brand";
import { getAcademicYearLabel } from "@/lib/academic-year";
import { useRuntimeBranding } from "@/hooks/brand";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { getSidebarItemsForRole, isPathMatch, type SidebarItem } from "@/types/roles";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import {
  hasAssignedPageScope,
  isGroupOverviewOnlyProfile,
  shouldUseSinglePageShell,
} from "@/lib/auth";
import {
  SCHOOL_SCOPE_CHANGE_EVENT,
  buildPathWithSchoolScope,
  isSuperAdminSchoolScopedPath,
  readSchoolScopeFromWindow,
} from "@/lib/school/scope";
import { cn } from "@/lib/brand/brand-utils";

interface AppSidebarProps {
  currentPath: string;
  showFloatingToggle?: boolean;
}

const SIDEBAR_MODE_STORAGE_KEY = "app-sidebar-mode:v1";
const SIDEBAR_WIDTH_BY_MODE = {
  default: "224px",
  wide: "320px",
} as const;

type SidebarMode = keyof typeof SIDEBAR_WIDTH_BY_MODE;

const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  general: { ar: "العامة", en: "General" },
  academic: { ar: "الشؤون الأكاديمية", en: "Academic" },
  finance: { ar: "الحسابات والمالية", en: "Finance" },
  system: { ar: "النظام والمراقبة", en: "System" },
  admin: { ar: "الإدارة العليا", en: "Administration" },
};

const ITEM_LABELS: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  students: { ar: "الطلاب", en: "Students" },
  teachers: { ar: "الأساتذة", en: "Teachers" },
  attendance: { ar: "الحضور", en: "Attendance" },
  payments: { ar: "الحسابات", en: "Payments" },
  expenses: { ar: "المصروفات", en: "Expenses" },
  salaries: { ar: "الرواتب", en: "Salaries" },
  monitoring: { ar: "مراقبة الأساتذة", en: "Monitoring" },
  "fee-notifications": { ar: "تنبيهات الأقساط", en: "Fee Alerts" },
  reports: { ar: "التقارير", en: "Reports" },
  "super-admin": { ar: "الإدارة العامة", en: "Super Admin" },
  schools: { ar: "المدارس", en: "Schools" },
  subscriptions: { ar: "الاشتراكات", en: "Subscriptions" },
  group: { ar: "لوحة المجموعة", en: "Group Dashboard" },
};

export function AppSidebar({
  currentPath,
  showFloatingToggle = true,
}: AppSidebarProps) {
  const { role, profile } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isRTL = locale === "ar";
  const schoolScope = useSchoolScope(profile);
  const [scopedSchoolId, setScopedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "default";
    const stored = window.localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
    return stored === "wide" ? "wide" : "default";
  });
  const academicYearLabel = getAcademicYearLabel(new Date(), locale);
  const schoolName =
    runtimeBranding.schoolName ||
    schoolScope.selectedSchool?.name ||
    profile?.school?.name ||
    (locale === "en" ? "Current school" : "المدرسة الحالية");
  const schoolLogoUrl = runtimeBranding.logoUrl;

  const navItems = useMemo(() => {
    if (shouldUseSinglePageShell(profile) || isGroupOverviewOnlyProfile(profile)) {
      return [];
    }

    const baseItems = getSidebarItemsForRole(role);
    if (!hasAssignedPageScope(profile)) {
      return baseItems;
    }

    const allowedPages = profile?.allowed_pages ?? [];
    return baseItems.filter((item) => allowedPages.includes(item.id));
  }, [profile, role]);
  
  const groupedItems = useMemo(() => {
    const groups: Record<string, SidebarItem[]> = {};
    navItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [navItems]);

  const groupOrder = ["general", "academic", "finance", "system", "admin"];

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
    setMobileOpen(false);
  }, [pathname]);

  useEffect(() => {
    const handleSidebarToggle = () => setMobileOpen(true);
    window.addEventListener("app-sidebar-toggle", handleSidebarToggle);
    return () => {
      window.removeEventListener("app-sidebar-toggle", handleSidebarToggle);
    };
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const width = SIDEBAR_WIDTH_BY_MODE[sidebarMode];
    document.documentElement.style.setProperty("--sidebar-width", width);
    window.localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, sidebarMode);
  }, [sidebarMode]);

  if (shouldUseSinglePageShell(profile) || isGroupOverviewOnlyProfile(profile)) {
    return null;
  }

  return (
    <>
      {showFloatingToggle && !mobileOpen ? (
        <button
          type="button"
          className="fixed top-4 start-4 z-[var(--z-topbar)] lg:hidden flex h-11 w-11 items-center justify-center rounded-[var(--button-radius)] border border-[var(--border)] bg-[var(--surface-strong)] shadow-[var(--shadow-sm)] text-[var(--text-secondary)]"
          onClick={() => setMobileOpen(true)}
          aria-label={locale === "en" ? "Open navigation" : "فتح التنقل"}
        >
          <Menu size={20} />
        </button>
      ) : null}

      {mobileOpen && (
        <div 
          className="fixed inset-0 z-[calc(var(--z-sidebar)-1)] bg-[var(--text-primary)]/20 backdrop-blur-sm lg:hidden transition-opacity"
          onClick={() => setMobileOpen(false)}
        />
      )}

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-[var(--z-sidebar)] flex w-[var(--sidebar-width)] flex-col border-e border-[var(--border)] bg-[var(--surface-strong)] transition-transform duration-200 ease-out lg:sticky lg:top-0 lg:h-screen lg:!translate-x-0",
          isRTL && "start-auto end-0 border-e-0 border-s",
          mobileOpen ? "translate-x-0" : isRTL ? "translate-x-[100vw]" : "-translate-x-[100vw]"
        )}
      >
        <div className="flex h-[var(--topbar-height)] items-center justify-between px-6 border-b border-[var(--border)]">
          <Link
            href={
              role === "super_admin" && scopedSchoolId
                ? buildPathWithSchoolScope(localizeAppPath("/dashboard", locale), scopedSchoolId)
                : localizeAppPath("/dashboard", locale)
            }
            className="flex min-w-0 items-center gap-3"
          >
            <SchoolLogo
              src={schoolLogoUrl}
              alt={schoolName}
              label={schoolName}
              size={48}
              className="rounded-[18px]"
              imageClassName=""
              fallbackClassName="text-[1rem] font-black text-white"
            />
            <div className="flex min-w-0 flex-col leading-tight">
              <span className="truncate text-sm font-black text-[var(--text-primary)] tracking-tight">
                {schoolName}
              </span>
              <span className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-[0.18em]">
                {locale === "en" ? "SCHOOL WORKSPACE" : "مساحة المدرسة"}
              </span>
            </div>
          </Link>

          <div className="flex items-center gap-2">
            <button
              type="button"
              className="hidden lg:flex h-9 w-9 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-tertiary)] transition hover:text-[var(--text-primary)]"
              onClick={() => setSidebarMode((current) => (current === "wide" ? "default" : "wide"))}
              aria-label={locale === "en" ? "Resize sidebar" : "تغيير عرض القائمة الجانبية"}
              title={locale === "en" ? "Resize sidebar" : "تغيير عرض القائمة الجانبية"}
            >
              {sidebarMode === "wide" ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
            </button>
            <button
              type="button"
              className="lg:hidden h-8 w-8 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-tertiary)]"
              onClick={() => setMobileOpen(false)}
              aria-label={locale === "en" ? "Close navigation" : "إغلاق التنقل"}
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar px-4 py-6">
          <nav className="space-y-8" aria-label="Main navigation">
            {groupOrder.map((groupKey) => {
              const items = groupedItems[groupKey];
              if (!items || items.length === 0) return null;

              return (
                <div key={groupKey} className="space-y-3">
                  <h3 className="px-3 text-xs font-semibold uppercase tracking-wider text-[var(--text-muted)]">
                    {GROUP_LABELS[groupKey][locale]}
                  </h3>
                  <div className="space-y-1">
                    {items.map((item) => {
                      const isActive = isPathMatch(currentPath, item.href);
                      const label = ITEM_LABELS[item.id]?.[locale] || item.label;

                      return (
                        <Link
                          key={item.id}
                          href={
                            role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)
                              ? buildPathWithSchoolScope(localizeAppPath(item.href, locale), scopedSchoolId)
                              : localizeAppPath(item.href, locale)
                          }
                          className={cn(
                            "flex items-center gap-3 px-3 h-11 rounded-[var(--button-radius)] transition-all duration-150 group relative",
                            isActive 
                              ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)] font-semibold" 
                              : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
                          )}
                        >
                          <span className={cn(
                            "shrink-0 transition-transform group-hover:scale-110", 
                            isActive ? "text-white" : "text-[var(--text-tertiary)] group-hover:text-[var(--primary)]"
                          )}>
                            <AppIcon token={item.iconToken} size={20} />
                          </span>
                          <span className="flex-1 text-sm leading-5 whitespace-normal">{label}</span>
                          {isActive && (
                            <span className="shrink-0 opacity-60">
                              {locale === "en" ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                            </span>
                          )}
                        </Link>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </nav>
        </div>

        <div className="p-4 border-t border-[var(--border)] bg-[var(--surface-soft)]">
          <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] p-3 shadow-[var(--shadow-sm)] space-y-3">
            <div className="flex items-center justify-between gap-2 px-1">
              <div className="flex flex-col">
                <span className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                  {locale === "en" ? "Academic Year" : "العام الدراسي"}
                </span>
                <span className="text-sm font-semibold text-[var(--text-primary)]">{academicYearLabel}</span>
              </div>
            </div>

            {schoolScope.isSuperAdminScope ? (
              <div className="space-y-1.5">
                <span className="px-1 text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                  {locale === "en" ? "Active school" : "المدرسة النشطة"}
                </span>
                <div className="relative flex items-center">
                  <School size={14} className="absolute start-3 text-[var(--text-tertiary)] pointer-events-none" />
                  <select
                    className="w-full h-10 ps-9 pe-8 text-sm font-semibold bg-[var(--surface-muted)] border-none rounded-lg appearance-none cursor-pointer outline-none ring-1 ring-[var(--border)] focus:ring-[var(--primary)] text-[var(--text-primary)]"
                    value={schoolScope.selectedSchoolId ?? ""}
                    onChange={(event) => schoolScope.setSelectedSchoolId(event.target.value || null)}
                    disabled={schoolScope.scopeLoading}
                  >
                    <option value="">{locale === "en" ? "Select school" : "اختر مدرسة"}</option>
                    {schoolScope.schools.map((school) => (
                      <option key={school.id} value={school.id}>
                        {school.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown size={12} className="absolute end-3 text-[var(--text-tertiary)] pointer-events-none" />
                </div>
              </div>
            ) : (
              <div className="flex items-start gap-3 px-1 py-1">
                <SchoolLogo
                  src={schoolLogoUrl}
                  alt={schoolName}
                  label={schoolName}
                  size={40}
                  className="rounded-[15px]"
                  imageClassName=""
                />
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                    {locale === "en" ? "Current School" : "المدرسة الحالية"}
                  </span>
                  <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-normal leading-5 break-words">
                    {schoolName}
                  </span>
                </div>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
}
