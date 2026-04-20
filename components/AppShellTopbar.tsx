"use client";

import { useEffect, useRef } from "react";
import { CalendarDays, Menu } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";
import { useRole } from "@/hooks/useRole";
import { getAcademicYearLabel } from "@/lib/academic-year";
import { translateLegacyText } from "@/lib/legacy-locale";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";

export function AppShellTopbar({
  title,
  subtitle,
  className,
  fixed = false,
  showAcademicYear = true,
  actions,
  scope: _scope,
}: {
  title: string;
  subtitle?: string;
  className?: string;
  fixed?: boolean;
  showAcademicYear?: boolean;
  actions?: React.ReactNode;
  scope?: unknown;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const { profile } = useRole();
  const academicYearLabel = getAcademicYearLabel(new Date(), locale);
  const resolvedTitle = translateLegacyText(title, locale);
  const resolvedSubtitle = subtitle ? translateLegacyText(subtitle, locale) : subtitle;
  const isFocusedUser = Boolean(profile?.is_single_page_user || profile?.scope_level === "group_admin");

  
  const topbarRef = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!fixed) return;
    const element = topbarRef.current;
    if (!element) return;

    const root = document.documentElement;
    const updateTopbarFootprint = () => {
      const rect = element.getBoundingClientRect();
      root.style.setProperty("--app-shell-topbar-footprint", `${Math.ceil(rect.top + rect.height)}px`);
    };

    updateTopbarFootprint();
    const resizeObserver = new ResizeObserver(updateTopbarFootprint);
    resizeObserver.observe(element);
    window.addEventListener("resize", updateTopbarFootprint);

    return () => {
      resizeObserver.disconnect();
      window.removeEventListener("resize", updateTopbarFootprint);
      root.style.removeProperty("--app-shell-topbar-footprint");
    };
  }, [fixed]);

  return (
    <header
      ref={topbarRef}
      className={cn(
        "app-shell-topbar transition-all duration-300",
        fixed && "app-shell-topbar--fixed",
        className
      )}
    >
      <div className="app-shell-topbar__row w-full">
        {/* Left Section: Menu & Title */}
        <div className="app-shell-topbar__primary">
          {!isFocusedUser ? (
            <button
              type="button"
              className="app-shell-topbar__menu flex h-10 w-10 items-center justify-center rounded-[var(--button-radius)] bg-[var(--surface-muted)] text-[var(--text-secondary)] transition-all hover:bg-[var(--surface-hover)] active:scale-95"
              onClick={() => window.dispatchEvent(new Event("app-sidebar-toggle"))}
              aria-label={locale === "en" ? "Open navigation" : "فتح التنقل"}
            >
              <Menu size={20} />
            </button>
          ) : null}

          <div className="flex min-w-0 flex-1 flex-col">
            <h1 className="text-base font-bold leading-tight text-[var(--text-primary)] sm:text-lg">
              {resolvedTitle}
            </h1>
            {resolvedSubtitle && !isFocusedUser && (
              <p className="text-xs font-medium leading-relaxed text-[var(--text-muted)] sm:truncate">
                {resolvedSubtitle}
              </p>
            )}
          </div>
        </div>

        {/* Right Section: Actions & Context */}
        <div className="app-shell-topbar__actions">
          {/* Custom Actions */}
          <div className="flex max-w-full flex-wrap items-center gap-2">
            {actions}
          </div>

          {actions && !isFocusedUser ? <div className="h-6 w-[1px] bg-[var(--border)] mx-1 hidden sm:block" /> : null}

          {/* Academic Year Pill (Compact on Mobile) */}
          {showAcademicYear && !isFocusedUser && (
            <div className="hidden md:flex items-center gap-2 px-3 py-1.5 rounded-[var(--button-radius)] bg-[var(--warning)]/10 border border-[var(--warning)]/20 text-[var(--warning)]">
              <CalendarDays size={14} />
              <span className="text-xs font-semibold uppercase tracking-wider">{academicYearLabel}</span>
            </div>
          )}

          <div className="flex flex-wrap items-center gap-2">
            <LanguageToggle className="shell-utility-button hidden md:inline-flex" />
            <ThemeModeToggle
              variant="inline"
              className="app-shell-topbar__theme-switch hidden lg:inline-flex"
              compact
            />
          </div>

          {/* Profile & Menu */}
          <div className="flex items-center gap-2 sm:gap-4">
            <ProfileMenu className="app-shell-topbar__profile-menu" />
          </div>
        </div>
      </div>
    </header>
  );
}
