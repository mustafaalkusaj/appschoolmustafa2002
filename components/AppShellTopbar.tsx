"use client";

import { Menu } from "lucide-react";
import { usePathname } from "next/navigation";

import { ProfileMenu } from "@/components/ProfileMenu";
import { SchoolLogo } from "@/components/SchoolLogo";
import type { SchoolScopeState } from "@/hooks/useSchoolScope";
import { useRuntimeBranding } from "@/hooks/useRuntimeBranding";
import { useRole } from "@/hooks/useRole";
import { getAcademicYearLabel } from "@/lib/academic-year";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { PingIndicator } from "@/components/PingIndicator";

function cx(...classes: Array<string | false | null | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export function AppShellTopbar({
  title,
  subtitle,
  scope,
  className,
  showAcademicYear = true,
  actions,
}: {
  title: string;
  subtitle?: string;
  scope?: SchoolScopeState;
  className?: string;
  showAcademicYear?: boolean;
  actions?: React.ReactNode;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const currentSchoolName =
    scope?.selectedSchool?.name ||
    profile?.school?.name ||
    runtimeBranding.schoolName ||
    (locale === "en" ? "School context" : "سياق المدرسة");
  const currentSchoolMeta =
    [scope?.selectedSchool?.city, subtitle].filter(Boolean).join(" • ") ||
    (locale === "en" ? "Current school context" : "السياق الحالي للمدرسة");
  const selectorLabel = locale === "en" ? "School" : "المدرسة";
  const academicYearLabel = getAcademicYearLabel(new Date(), locale);
  const selectionState = scope?.scopeLoading
    ? locale === "en"
      ? "Loading"
      : "تحميل"
    : scope?.selectedSchool
      ? scope.selectedSchool.is_active
        ? locale === "en"
          ? "Active school"
          : "مدرسة نشطة"
        : locale === "en"
          ? "Paused school"
          : "مدرسة موقوفة"
      : scope?.isSuperAdminScope
        ? locale === "en"
          ? "Selection required"
          : "الاختيار مطلوب"
        : null;

  return (
    <header className={cx("app-shell-topbar ui-glass", className)}>
      <div className="app-shell-topbar__row">
        <div className="app-shell-topbar__primary">
          <button
            type="button"
            className="app-shell-topbar__menu"
            onClick={() => window.dispatchEvent(new Event("app-sidebar-toggle"))}
            aria-label={locale === "en" ? "Open navigation" : "فتح التنقل"}
          >
            <Menu size={18} aria-hidden="true" />
          </button>

          <div className="app-shell-topbar__school">
            <SchoolLogo
              src={runtimeBranding.logoUrl}
              alt={currentSchoolName}
              label={currentSchoolName}
              size={46}
              className="app-shell-topbar__school-logo"
            />
            <div className="app-shell-topbar__copy">
              <div className="app-shell-topbar__eyebrow">{title}</div>
              <div className="app-shell-topbar__school-name">{currentSchoolName}</div>
              <div className="app-shell-topbar__school-meta">{currentSchoolMeta}</div>
            </div>
          </div>
        </div>

        <div className="app-shell-topbar__actions">
          {scope?.isSuperAdminScope ? (
            <label className="app-shell-topbar__select">
              <span>{selectorLabel}</span>
              <select
                value={scope.selectedSchoolId ?? ""}
                onChange={(event) => scope.setSelectedSchoolId(event.target.value || null)}
                disabled={scope.scopeLoading}
                aria-label={selectorLabel}
              >
                <option value="">{locale === "en" ? "Choose a school" : "اختر مدرسة"}</option>
                {scope.schools.map((school) => (
                  <option key={school.id} value={school.id}>
                    {school.name}
                  </option>
                ))}
              </select>
            </label>
          ) : null}

          {selectionState ? <div className="app-shell-topbar__pill">{selectionState}</div> : null}
          {showAcademicYear ? (
            <div className="app-shell-topbar__pill">
              <span>{locale === "en" ? "Academic year" : "العام الدراسي"}</span>
              <strong>{academicYearLabel}</strong>
            </div>
          ) : null}
          {actions}
          <div className="app-shell-topbar__ping">
            <PingIndicator />
          </div>
          <ProfileMenu />
        </div>
      </div>
    </header>
  );
}
