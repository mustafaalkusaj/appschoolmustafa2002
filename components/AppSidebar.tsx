"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { signOutClient, getRoleLabel } from "@/lib/auth";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { useRole } from "@/hooks/useRole";
import { getSidebarItemsForRole, isPathMatch } from "@/types/roles";
import {
  getIntlLocale,
  getLocaleFromPath,
  localizeAppPath,
} from "@/lib/locale-routing";
import { UltrathinkLogo } from "@/components/UltrathinkLogo";
import {
  SCHOOL_SCOPE_CHANGE_EVENT,
  buildPathWithSchoolScope,
  isSuperAdminSchoolScopedPath,
  readSchoolScopeFromWindow,
} from "@/lib/school-scope";
import { usePlatformBranding } from "@/components/PlatformBrandingProvider";
import { useSchoolBranding } from "@/components/SchoolBrandingProvider";
import {
  getPlatformBrandShortName,
  getPlatformBrandSubtitle,
} from "@/lib/platform-branding";
import {
  APP_NAV_GROUPS,
  getAppNavGroupLabel,
  getAppNavLabel,
  getShortModuleLabel,
  getSidebarRailIcon,
  getSidebarShellStrings,
} from "@/lib/app-navigation";

interface AppSidebarProps {
  currentPath: string;
  containerClassName?: string;
  navClassName?: string;
  separatorClassName?: string;
}

function cx(...classes: Array<string | null | undefined | false>) {
  return classes.filter(Boolean).join(" ");
}

export function AppSidebar({
  currentPath,
  containerClassName = "sidebar",
  navClassName = "nav",
  separatorClassName = "sep",
}: AppSidebarProps) {
  const { role, profile } = useRole();
  const { branding: platformBranding } = usePlatformBranding();
  const { branding: schoolBranding, schoolId } = useSchoolBranding();
  const pathname = usePathname();
  const router = useRouter();
  const locale = getLocaleFromPath(pathname);
  const shellStrings = getSidebarShellStrings(locale);
  const [scopedSchoolId, setScopedSchoolId] = useState<string | null>(() => readSchoolScopeFromWindow());

  const navItems = useMemo(() => getSidebarItemsForRole(role), [role]);
  const groupedNavItems = useMemo(
    () =>
      APP_NAV_GROUPS.map((group) => ({
        ...group,
        label: getAppNavGroupLabel(group.id, locale),
        items: navItems
          .filter((item) => group.itemIds.includes(item.id as never))
          .map((item) => ({
            ...item,
            label: getAppNavLabel(item.id, locale, item.label),
          })),
      })).filter((group) => group.items.length > 0),
    [locale, navItems],
  );
  const todayLabel = useMemo(
    () =>
      new Intl.DateTimeFormat(getIntlLocale(locale), {
        day: "numeric",
        month: "long",
        year: "numeric",
      }).format(new Date()),
    [locale],
  );

  const displayName = profile?.full_name?.trim() || shellStrings.defaultDisplayName;
  const roleLabel = role ? getRoleLabel(role, locale) : shellStrings.defaultWorkspace;
  const workspaceTitle = profile?.school?.name?.trim() || shellStrings.defaultWorkspace;
  const workspaceDescription =
    role === "super_admin"
      ? scopedSchoolId
        ? shellStrings.scopedSchoolDescription
        : shellStrings.superAdminDescription
      : shellStrings.workspaceDescription;
  const platformTitle = getPlatformBrandShortName(platformBranding, locale);
  const platformSubtitle = getPlatformBrandSubtitle(platformBranding, locale);
  const logoSrc =
    schoolId && schoolBranding.logoUrl?.trim()
      ? schoolBranding.logoUrl
      : platformBranding.logoUrl;

  useEffect(() => {
    const syncScopedSchool = () => {
      setScopedSchoolId(readSchoolScopeFromWindow());
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
    router.replace(localizeAppPath("/login", locale));
  }

  return (
    <>
      <aside className={cx("app-sidebar-desktop", containerClassName)} data-testid="app-sidebar">
        <div className="min-h-0 flex-1 overflow-y-auto">
          <div className="logo">
            <UltrathinkLogo
              size={42}
              title={platformTitle}
              subtitle={platformSubtitle}
              logoSrc={logoSrc}
            />
          </div>

          <section className="sidebar-intro" aria-label={shellStrings.workspaceEyebrow}>
            <div className="sidebar-intro__eyebrow">{shellStrings.workspaceEyebrow}</div>
            <div className="sidebar-intro__title">{workspaceTitle}</div>
            <div className="sidebar-intro__text">{workspaceDescription}</div>
          </section>

          <div className="sidebar-status">
            <div className="sidebar-status__block">
              <div className="sidebar-status__label">{shellStrings.currentRole}</div>
              <div className="sidebar-status__value">{roleLabel}</div>
            </div>
            <div className="sidebar-status__divider" />
            <div className="sidebar-status__block">
              <div className="sidebar-status__label">{shellStrings.today}</div>
              <div className="sidebar-status__value">{todayLabel}</div>
            </div>
          </div>

          <nav className="space-y-3 pb-3" aria-label={shellStrings.mainNavigation}>
            {groupedNavItems.map((group) => (
              <div key={group.id}>
                <div className="sidebar-section-label">{group.label}</div>
                <div className="space-y-1">
                  {group.items.map((item) => {
                    const Icon = getSidebarRailIcon(item.id);
                    const href =
                      role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)
                        ? buildPathWithSchoolScope(localizeAppPath(item.href, locale), scopedSchoolId)
                        : localizeAppPath(item.href, locale);
                    const isActive = isPathMatch(currentPath, item.href);

                    return (
                      <Link
                        key={item.id}
                        href={href}
                        className={`${navClassName}${isActive ? " active" : ""}`}
                        data-testid={`sidebar-nav-${item.id}`}
                        aria-current={isActive ? "page" : undefined}
                      >
                        <span className="nav__icon" aria-hidden="true">
                          <Icon size={16} />
                        </span>
                        <span className="nav__copy">
                          <span className="nav__label">{item.label}</span>
                          <span className="nav__meta">{group.label}</span>
                        </span>
                      </Link>
                    );
                  })}
                </div>
              </div>
            ))}
          </nav>
        </div>

        <div className="mt-auto shrink-0 pt-3">
          <div className={separatorClassName} />
          <div className="sidebar-footer-label">{shellStrings.currentSession}</div>
          <div className="user-chip sidebar-user-chip">
            <div className="avatar">{displayName.slice(0, 2).toUpperCase()}</div>
            <div className="sidebar-user-chip__copy">
              <div className="sidebar-user-chip__name">{displayName}</div>
              <div className="sidebar-user-chip__role">{roleLabel}</div>
            </div>
          </div>
          <div className="mt-3 rounded-[18px] border border-[var(--border)] bg-[var(--surface-soft)] p-2">
            <button type="button" className={`${navClassName} danger w-full justify-center`} onClick={handleLogout}>
              {shellStrings.signOut}
            </button>
            <ThemeModeToggle variant="inline" className="sidebar-theme-switch mt-2 w-full" />
          </div>
        </div>
      </aside>

      {navItems.length > 0 ? (
        <nav className="app-mobile-dock" aria-label={shellStrings.quickNavigation}>
          <div className="app-mobile-dock__track">
            {navItems.map((item) => {
              const Icon = getSidebarRailIcon(item.id);
              const href =
                role === "super_admin" && scopedSchoolId && isSuperAdminSchoolScopedPath(item.href)
                  ? buildPathWithSchoolScope(localizeAppPath(item.href, locale), scopedSchoolId)
                  : localizeAppPath(item.href, locale);
              const isActive = isPathMatch(currentPath, item.href);

              return (
                <Link
                  key={`mobile-${item.id}`}
                  href={href}
                  className={cx("app-mobile-dock__item", isActive && "is-active")}
                  data-testid={`mobile-nav-${item.id}`}
                  aria-current={isActive ? "page" : undefined}
                >
                  <span className="app-mobile-dock__icon" aria-hidden="true">
                    <Icon size={18} />
                  </span>
                  <span className="app-mobile-dock__label">
                    {getShortModuleLabel(item.id as never, locale)}
                  </span>
                </Link>
              );
            })}
          </div>
        </nav>
      ) : null}
    </>
  );
}
