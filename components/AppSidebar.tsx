"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronRight, ChevronLeft, School, ChevronDown } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { AppIcon } from "@/components/AppIcon";
import { SchoolLogo } from "@/components/brand";
import { getAcademicYearLabel } from "@/lib/academic-year";
import { useRuntimeBranding } from "@/hooks/brand";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useBranchScope } from "@/hooks/useBranchScope";
import { getSidebarItemsForRole, isPathMatch, type SidebarItem } from "@/types/roles";
import { getLocaleFromPath, localizeAppPath } from "@/lib/locale-routing";
import {
  hasAssignedPageScope,
  isBranchUserProfile,
  isGroupOverviewOnlyProfile,
  shouldUseSinglePageShell,
} from "@/lib/auth";
import {
  SCHOOL_SCOPE_CHANGE_EVENT,
  buildPathWithBranchScope,
  buildPathWithSchoolScope,
  isSuperAdminSchoolScopedPath,
  readSchoolScopeFromEvent,
  readSchoolScopeFromWindow,
} from "@/lib/school/scope";
import { cn } from "@/lib/brand/brand-utils";
import { useArchiveMode } from "@/hooks/useArchiveMode";

interface AppSidebarProps {
  currentPath: string;
  showFloatingToggle?: boolean;
}

const SIDEBAR_MODE_STORAGE_KEY = "app-sidebar-mode:v1";
const SIDEBAR_COLLAPSED_KEY = "app-sidebar-collapsed:v1";
const SIDEBAR_WIDTH_BY_MODE = {
  default: "260px",
  wide: "320px",
} as const;
const SIDEBAR_COLLAPSED_WIDTH = "72px";

type SidebarMode = keyof typeof SIDEBAR_WIDTH_BY_MODE;

const GROUP_LABELS: Record<string, { ar: string; en: string }> = {
  general: { ar: "العامة", en: "General" },
  academic: { ar: "الشؤون الأكاديمية", en: "Academic" },
  finance: { ar: "الحسابات والمالية", en: "Finance" },
  system: { ar: "النظام والمراقبة", en: "System" },
  admin: { ar: "الإدارة العليا", en: "Administration" },
  student: { ar: "بوابة الطالب", en: "Student Portal" },
  teacher: { ar: "بوابة الأستاذ", en: "Teacher Portal" },
};

const ITEM_LABELS: Record<string, { ar: string; en: string }> = {
  dashboard: { ar: "لوحة التحكم", en: "Dashboard" },
  students: { ar: "الطلاب", en: "Students" },
  "student-accounts": { ar: "حسابات الطلبة", en: "Student Accounts" },
  classes: { ar: "الصفوف والشعب", en: "Classes" },
  teachers: { ar: "الأساتذة", en: "Teachers" },
  attendance: { ar: "الحضور", en: "Attendance" },
  "teacher-attendance": { ar: "حضور الأساتذة", en: "Teacher Attendance" },
  schedule: { ar: "جدول الحصص", en: "Schedule" },
  calendar: { ar: "التقويم الذكي", en: "Smart Calendar" },
  "teacher-activities": { ar: "متابعة نشاط الأساتذة", en: "Teacher Activities" },
  grades: { ar: "درجات الطلاب", en: "Student Grades" },
  exams: { ar: "الامتحانات", en: "Exams" },
  behavior: { ar: "سجل السلوك", en: "Behavior" },
  messaging: { ar: "الرسائل", en: "Messages" },
  payments: { ar: "إيرادات أجور دراسية", en: "Tuition Payments" },
  expenses: { ar: "المصروفات", en: "Expenses" },
  incomes: { ar: "إيرادات أخرى", en: "Other Incomes" },
  salaries: { ar: "الرواتب", en: "Salaries" },
  notifications: { ar: "الإشعارات", en: "Notifications" },
  monitoring: { ar: "مراقبة الأساتذة", en: "Monitoring" },
  "fee-notifications": { ar: "تنبيهات الأقساط", en: "Fee Alerts" },
  reports: { ar: "التقارير", en: "Reports" },
  "roles-settings": { ar: "إدارة الأدوار", en: "Roles & Permissions" },
  profile: { ar: "الملف الشخصي", en: "Profile" },
  "super-admin": { ar: "الإدارة العامة", en: "Super Admin" },
  schools: { ar: "المدارس", en: "Schools" },
  subscriptions: { ar: "الاشتراكات", en: "Subscriptions" },
  group: { ar: "لوحة المجموعة", en: "Group Dashboard" },
  "branch-overview": { ar: "لوحة الفرع", en: "Branch Dashboard" },
  "teacher-dashboard": { ar: "الرئيسية", en: "Home" },
  "teacher-schedule": { ar: "جدول حصصي", en: "My Schedule" },
  "teacher-classes": { ar: "صفوفي", en: "My Classes" },
  "teacher-students": { ar: "طلابي", en: "My Students" },
  "my-attendance": { ar: "الحضور", en: "Attendance" },
  "teacher-grades": { ar: "الدرجات", en: "Grades" },
  assignments: { ar: "الواجبات", en: "Assignments" },
  "teacher-assignments": { ar: "الواجبات", en: "Assignments" },
  "teacher-exams": { ar: "الامتحانات", en: "Exams" },
  "teacher-messages": { ar: "الرسائل", en: "Messages" },
  "teacher-notifications": { ar: "الإشعارات", en: "Notifications" },
  "teacher-salary": { ar: "راتبي", en: "My Salary" },
  "teacher-materials": { ar: "المواد التعليمية", en: "Materials" },
  "teacher-reports": { ar: "التقارير", en: "Reports" },
  "teacher-profile": { ar: "ملفي الشخصي", en: "My Profile" },
};

export function AppSidebar({
  currentPath,
  showFloatingToggle = true,
}: AppSidebarProps) {
  const { role, profile, canAccessPath } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { isArchiveMode, archiveData, exitArchiveMode } = useArchiveMode();
  const isRTL = locale === "ar";
  const schoolScope = useSchoolScope(profile);
  const branchScope = useBranchScope(profile);
  const [scopedSchoolId, setScopedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sidebarMode, setSidebarMode] = useState<SidebarMode>(() => {
    if (typeof window === "undefined") return "default";
    const stored = window.localStorage.getItem(SIDEBAR_MODE_STORAGE_KEY);
    return stored === "wide" ? "wide" : "default";
  });
  const [collapsed, setCollapsed] = useState<boolean>(() => {
    if (typeof window === "undefined") return false;
    return window.localStorage.getItem(SIDEBAR_COLLAPSED_KEY) === "true";
  });

  const academicYearLabel = getAcademicYearLabel(new Date(), locale);
  const branchName = runtimeBranding.branchName;
  const displayName =
    branchName ||
    runtimeBranding.schoolName ||
    schoolScope.selectedSchool?.name ||
    profile?.school?.name ||
    (locale === "en" ? "Current school" : "المدرسة الحالية");
  const displayLogoUrl = runtimeBranding.branchLogoUrl || runtimeBranding.logoUrl;
  const isBranchBranding = Boolean(branchName);
  const workspaceLabel = isBranchBranding
    ? locale === "en" ? "BRANCH WORKSPACE" : "مساحة الفرع"
    : locale === "en" ? "SCHOOL WORKSPACE" : "مساحة المدرسة";
  const currentEntityLabel = isBranchBranding
    ? locale === "en" ? "Current Branch" : "الفرع الحالي"
    : locale === "en" ? "Current School" : "المدرسة الحالية";

  const navItems = useMemo(() => {
    if (shouldUseSinglePageShell(profile) || isGroupOverviewOnlyProfile(profile)) return [];
    const baseItems = getSidebarItemsForRole(role);
    const scopedItems = isBranchUserProfile(profile)
      ? baseItems.filter((item) => item.id !== "dashboard")
      : baseItems;
    const permittedItems = scopedItems.filter((item) => canAccessPath(item.href));
    if (!hasAssignedPageScope(profile)) return permittedItems;
    const allowedPages = profile?.allowed_pages ?? [];
    return permittedItems.filter((item) => allowedPages.includes(item.id));
  }, [profile, role, canAccessPath]);

  const groupedItems = useMemo(() => {
    const groups: Record<string, SidebarItem[]> = {};
    navItems.forEach((item) => {
      if (!groups[item.group]) groups[item.group] = [];
      groups[item.group].push(item);
    });
    return groups;
  }, [navItems]);

  const groupOrder = ["general", "academic", "finance", "system", "admin", "student", "teacher"];

  useEffect(() => {
    const syncScopedSchool = (event?: Event) => setScopedSchoolId(readSchoolScopeFromEvent(event));
    syncScopedSchool();
    window.addEventListener("popstate", syncScopedSchool);
    window.addEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncScopedSchool);
    return () => {
      window.removeEventListener("popstate", syncScopedSchool);
      window.removeEventListener(SCHOOL_SCOPE_CHANGE_EVENT, syncScopedSchool);
    };
  }, [pathname]);

  useEffect(() => { setMobileOpen(false); }, [pathname]);

  useEffect(() => {
    const handleSidebarToggle = () => setMobileOpen(true);
    window.addEventListener("app-sidebar-toggle", handleSidebarToggle);
    return () => window.removeEventListener("app-sidebar-toggle", handleSidebarToggle);
  }, []);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const width = collapsed ? "72px" : SIDEBAR_WIDTH_BY_MODE[sidebarMode];
    document.documentElement.style.setProperty("--sidebar-width", width);
    document.documentElement.dataset.sidebarCollapsed = String(collapsed);
    window.localStorage.setItem(SIDEBAR_MODE_STORAGE_KEY, sidebarMode);
    window.localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(collapsed));
  }, [sidebarMode, collapsed]);

  if (shouldUseSinglePageShell(profile) || isGroupOverviewOnlyProfile(profile)) return null;

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

      <AnimatePresence>
        {mobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-[calc(var(--z-sidebar)-1)] bg-[var(--text-primary)]/20 backdrop-blur-sm lg:hidden"
            onClick={() => setMobileOpen(false)}
          />
        )}
      </AnimatePresence>

      <aside
        className={cn(
          "fixed inset-y-0 start-0 z-[var(--z-sidebar)] flex flex-col border-e border-[var(--border)] bg-[var(--surface-strong)] transition-all duration-150 ease-out lg:sticky lg:top-0 lg:h-screen lg:!translate-x-0",
          mobileOpen ? "translate-x-0" : isRTL ? "translate-x-[100vw]" : "-translate-x-[100vw]",
          collapsed ? "w-[72px]" : "w-[var(--sidebar-width)]",
        )}
      >
        {/* Header */}
        <div className={cn(
          "flex h-[var(--topbar-height)] items-center border-b border-[var(--border)]",
          collapsed ? "justify-center px-2" : "justify-between px-4 gap-3"
        )}>
          {!collapsed && (
            <Link
              href={(() => {
                const dashPath = localizeAppPath("/dashboard", locale);
                if (role === "super_admin" && scopedSchoolId) {
                  return buildPathWithSchoolScope(dashPath, scopedSchoolId);
                }
                if (branchScope.isMultiBranchScope && branchScope.selectedBranchId) {
                  return buildPathWithBranchScope(dashPath, branchScope.selectedBranchId);
                }
                return dashPath;
              })()}
              className="flex min-w-0 items-center gap-3"
            >
              <SchoolLogo src={displayLogoUrl} alt={displayName} label={displayName} size={48}
                className="rounded-[18px]" imageClassName="" fallbackClassName="text-[1rem] font-black text-white" />
              <div className="flex min-w-0 flex-col leading-tight">
                <span className="truncate text-sm font-black text-[var(--text-primary)] tracking-tight">{displayName}</span>
                <span className="text-[11px] font-bold text-[var(--text-tertiary)] tracking-[0.18em]">{workspaceLabel}</span>
              </div>
            </Link>
          )}

          <div className="flex items-center gap-1 flex-shrink-0">
            {/* Desktop collapse toggle */}
            <button
              type="button"
              className="hidden lg:flex h-8 w-8 items-center justify-center rounded-lg border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-tertiary)] transition hover:text-[var(--primary)] hover:border-[var(--primary)]/30 hover:bg-[var(--primary)]/5"
              onClick={() => setCollapsed(v => !v)}
              aria-label={collapsed
                ? (locale === "en" ? "Expand sidebar" : "توسيع القائمة")
                : (locale === "en" ? "Collapse sidebar" : "طي القائمة")}
              title={collapsed
                ? (locale === "en" ? "Expand sidebar" : "توسيع القائمة")
                : (locale === "en" ? "Collapse sidebar" : "طي القائمة")}
            >
              <motion.div
                animate={{ rotate: collapsed ? 180 : 0 }}
                transition={{ duration: 0.2 }}
              >
                {isRTL ? <ChevronRight size={15} /> : <ChevronLeft size={15} />}
              </motion.div>
            </button>
            {/* Mobile close */}
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

        {/* Nav */}
        <div className="flex-1 overflow-y-auto custom-scrollbar py-4 px-2">
          <nav className={cn("space-y-5", collapsed && "space-y-0")} aria-label="Main navigation">
            {groupOrder.map((groupKey, groupIdx) => {
              const items = groupedItems[groupKey];
              if (!items || items.length === 0) return null;
              return (
                <div key={groupKey} className={cn(collapsed ? "py-0.5" : "space-y-0.5")}>
                  {!collapsed && (
                    <div className="flex items-center gap-2 px-3 pt-2 pb-1.5">
                      <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: "var(--primary)", opacity: 0.5 }} />
                      <span className="text-[10px] font-black uppercase tracking-[0.18em] text-[var(--text-muted)]">
                        {GROUP_LABELS[groupKey][locale]}
                      </span>
                    </div>
                  )}
                  {collapsed && groupIdx > 0 && (
                    <div className="h-px bg-[var(--border)]/60 mx-3 my-1" />
                  )}
                  <div className={cn(collapsed && "flex flex-col items-center gap-0.5 px-1")}>
                    {items.map((item) => {
                      const isActive = isPathMatch(currentPath, item.href);
                      const label = ITEM_LABELS[item.id]?.[locale] || item.label;
                      return (
                        <Link
                          key={item.id}
                          href={(() => {
                            const localizedPath = localizeAppPath(item.href, locale);
                            if (role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)) {
                              return buildPathWithSchoolScope(localizedPath, scopedSchoolId);
                            }
                            if (branchScope.isMultiBranchScope && branchScope.selectedBranchId) {
                              return buildPathWithBranchScope(localizedPath, branchScope.selectedBranchId);
                            }
                            return localizedPath;
                          })()}
                          className={cn(
                            "flex items-center transition-colors duration-100 group relative",
                            collapsed
                              ? "justify-center w-11 h-10 rounded-xl"
                              : "gap-3 px-2.5 h-11 rounded-2xl",
                            collapsed && isActive && "bg-[var(--primary)] shadow-[var(--shadow-primary)]",
                            collapsed && !isActive && "hover:bg-[var(--surface-muted)]",
                            !collapsed && isActive && "text-white font-semibold",
                            !collapsed && !isActive && "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
                          )}
                        >
                          {isActive && !collapsed && (
                            <motion.span
                              layoutId="sidebar-active-indicator"
                              className="absolute inset-0 z-0 rounded-[var(--radius-lg)] bg-[var(--primary)] shadow-[var(--shadow-primary)]"
                              transition={{ type: "spring", stiffness: 350, damping: 30 }}
                            />
                          )}
                          {/* Fast CSS tooltip for collapsed mode */}
                          {collapsed && (
                            <span className={cn(
                              "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100",
                              isRTL ? "end-full me-2" : "start-full ms-2",
                            )}
                              style={{ background: "var(--text-primary)" }}
                            >
                              {label}
                            </span>
                          )}
                          <span className={cn(
                            "relative z-[1] shrink-0 flex items-center justify-center",
                            collapsed ? "w-6 h-6" : "w-8 h-8 rounded-xl transition-transform group-hover:scale-110",
                            isActive
                              ? "text-white"
                              : "text-[var(--text-tertiary)] group-hover:text-[var(--primary)]",
                            !collapsed && !isActive && "bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-muted))]",
                          )}>
                            <AppIcon token={item.iconToken} size={collapsed ? 18 : 17} />
                          </span>
                          {!collapsed && (
                            <>
                              <span className="relative z-[1] flex-1 text-sm leading-5 whitespace-normal">{label}</span>
                              {isActive && (
                                <span className="shrink-0 opacity-60">
                                  {locale === "en" ? <ChevronRight size={12} /> : <ChevronLeft size={12} />}
                                </span>
                              )}
                            </>
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

        {/* Pinned super-admin link */}
        {role === "super_admin" && (
          <div className={cn("px-2 pb-2", collapsed && "flex justify-center")}>
            <Link
              href={localizeAppPath("/super-admin", locale)}
              className={cn(
                "flex items-center transition-colors duration-100 group relative",
                collapsed
                  ? "justify-center w-11 h-10 rounded-xl"
                  : "gap-3 px-2.5 h-11 rounded-2xl w-full",
                isPathMatch(currentPath, "/super-admin")
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]",
              )}
            >
              {collapsed && (
                <span className={cn(
                  "pointer-events-none absolute z-50 whitespace-nowrap rounded-lg px-2.5 py-1.5 text-xs font-bold text-white shadow-lg opacity-0 group-hover:opacity-100 transition-opacity duration-100",
                  isRTL ? "end-full me-2" : "start-full ms-2",
                )} style={{ background: "var(--text-primary)" }}>
                  {locale === "en" ? "Super Admin" : "الإدارة العامة"}
                </span>
              )}
              <span className={cn(
                "shrink-0 flex items-center justify-center text-base",
                collapsed ? "w-6 h-6" : "w-8 h-8 rounded-xl",
                isPathMatch(currentPath, "/super-admin")
                  ? "text-white"
                  : "text-[var(--text-tertiary)] group-hover:text-[var(--primary)] bg-[color-mix(in_srgb,var(--primary)_10%,var(--surface-muted))]",
              )}>
                👑
              </span>
              {!collapsed && (
                <span className="flex-1 text-sm font-semibold leading-5">
                  {locale === "en" ? "Super Admin" : "الإدارة العامة"}
                </span>
              )}
            </Link>
          </div>
        )}

        {/* Footer */}
        {!collapsed && (
          <div className="p-3 border-t border-[var(--border)] space-y-2">
            {/* Archive mode indicator */}
            {isArchiveMode && archiveData && (
              <div
                className="rounded-xl px-3 py-2.5 flex items-center justify-between gap-2"
                style={{ background: "linear-gradient(135deg, #1e1b4b, #312e81)" }}
              >
                <div className="min-w-0">
                  <p className="text-[9px] font-black text-indigo-400 uppercase tracking-widest">أرشيف</p>
                  <p className="text-xs font-black text-white truncate">سنة {archiveData.year}</p>
                  <p className="text-[10px] text-indigo-300 font-semibold">{archiveData.students.length} طالب</p>
                </div>
                <button
                  onClick={exitArchiveMode}
                  className="w-6 h-6 rounded-lg bg-white/10 hover:bg-red-500/40 flex items-center justify-center transition flex-shrink-0"
                  title="خروج من وضع الأرشيف"
                >
                  <X size={11} className="text-white" />
                </button>
              </div>
            )}
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--surface-strong)] overflow-hidden shadow-[var(--shadow-sm)]">
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ background: "linear-gradient(135deg, color-mix(in srgb, var(--primary) 8%, transparent), transparent)" }}>
                <div className="flex flex-col">
                  <span className="text-[10px] font-black uppercase tracking-[0.15em] text-[var(--text-muted)]">
                    {locale === "en" ? "Academic Year" : "العام الدراسي"}
                  </span>
                  <span className="text-sm font-bold text-[var(--text-primary)]">{academicYearLabel}</span>
                </div>
                <div className="h-7 w-7 rounded-lg flex items-center justify-center"
                  style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)" }}>
                  <span className="text-[10px] font-black" style={{ color: "var(--primary)" }}>
                    {new Date().getFullYear().toString().slice(-2)}
                  </span>
                </div>
              </div>
              <div className="h-px bg-[var(--border)]" />
              <div className="p-3">
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
                        onChange={(e) => schoolScope.setSelectedSchoolId(e.target.value || null)}
                        disabled={schoolScope.scopeLoading}
                      >
                        <option value="">{locale === "en" ? "Select school" : "اختر مدرسة"}</option>
                        {schoolScope.schools.map((school) => (
                          <option key={school.id} value={school.id}>{school.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute end-3 text-[var(--text-tertiary)] pointer-events-none" />
                    </div>
                  </div>
                ) : branchScope.isMultiBranchScope ? (
                  <div className="space-y-1.5">
                    <span className="px-1 text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">
                      {locale === "en" ? "Active branch" : "الفرع النشط"}
                    </span>
                    <div className="relative flex items-center">
                      <School size={14} className="absolute start-3 text-[var(--text-tertiary)] pointer-events-none" />
                      <select
                        className="w-full h-10 ps-9 pe-8 text-sm font-semibold bg-[var(--surface-muted)] border-none rounded-lg appearance-none cursor-pointer outline-none ring-1 ring-[var(--border)] focus:ring-[var(--primary)] text-[var(--text-primary)] disabled:opacity-50"
                        value={branchScope.selectedBranchId ?? ""}
                        onChange={(e) => branchScope.setSelectedBranchId(e.target.value || null)}
                        disabled={branchScope.scopeLoading || branchScope.branches.length === 0}
                      >
                        <option value="">{locale === "en" ? "Select branch" : "اختر فرع"}</option>
                        {branchScope.branches.map((branch) => (
                          <option key={branch.id} value={branch.id}>{branch.name}</option>
                        ))}
                      </select>
                      <ChevronDown size={12} className="absolute end-3 text-[var(--text-tertiary)] pointer-events-none" />
                    </div>
                    {branchScope.needsSelection && (
                      <p className="text-xs text-[var(--text-warning)] px-1">
                        {locale === "en" ? "Select a branch to continue" : "اختر فرع للمتابعة"}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="flex items-start gap-3 px-1 py-1">
                    <SchoolLogo src={displayLogoUrl} alt={displayName} label={displayName} size={40}
                      className="rounded-[15px]" imageClassName="" />
                    <div className="flex min-w-0 flex-1 flex-col">
                      <span className="text-xs font-semibold uppercase text-[var(--text-muted)] tracking-wider">{currentEntityLabel}</span>
                      <span className="text-sm font-semibold text-[var(--text-primary)] whitespace-normal leading-5 break-words">{displayName}</span>
                    </div>
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </aside>
    </>
  );
}
