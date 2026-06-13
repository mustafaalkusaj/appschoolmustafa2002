"use client";

import dynamic from "next/dynamic";
import { useEffect, useRef } from "react";
import { CalendarDays, Menu } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { ProfileMenu } from "@/components/ProfileMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { useRole } from "@/hooks/useRole";
import { getAcademicYearLabel } from "@/lib/academic-year";
import { translateLegacyText } from "@/lib/legacy-locale";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { cn } from "@/lib/brand/brand-utils";
import { isGroupOverviewOnlyProfile, shouldUseSinglePageShell } from "@/lib/auth";
import { NotificationBell } from "@/components/NotificationBell";
import { GlobalArchiveBanner } from "./GlobalArchiveBanner";

const ThemeModeToggle = dynamic(
  () => import("@/components/ThemeModeToggle").then((mod) => mod.ThemeModeToggle),
  { ssr: false },
);

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
  const isFocusedUser = Boolean(shouldUseSinglePageShell(profile) || isGroupOverviewOnlyProfile(profile));

  
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
      <GlobalArchiveBanner />
      <div className="app-shell-topbar__row w-full">

        {/* Start: Menu + School identity */}
        <div className="app-shell-topbar__primary flex items-center gap-3">
          {!isFocusedUser && (
            <button
              type="button"
              className="flex h-8 w-8 flex-shrink-0 items-center justify-center rounded-xl text-[var(--text-tertiary)] transition-all hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] active:scale-95"
              onClick={() => window.dispatchEvent(new Event("app-sidebar-toggle"))}
              aria-label={locale === "en" ? "Open navigation" : "فتح التنقل"}
            >
              <Menu size={17} />
            </button>
          )}

          {profile?.school?.name && !isFocusedUser && (
            <div className="hidden sm:flex items-center gap-2 min-w-0">
              <div
                className="w-2 h-2 rounded-full flex-shrink-0"
                style={{ background: "linear-gradient(135deg, var(--primary), var(--success))" }}
              />
              <span
                className="text-[13px] font-black leading-none truncate max-w-[200px]"
                style={{
                  background: "linear-gradient(120deg, var(--primary) 30%, var(--success))",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                  backgroundClip: "text",
                }}
              >
                {profile.school.name}
              </span>
            </div>
          )}
        </div>

        {/* End: Controls */}
        <div className="app-shell-topbar__actions gap-2">

          {actions && (
            <>
              <div className="flex max-w-full flex-wrap items-center gap-2">{actions}</div>
              <div className="h-4 w-[1px] bg-[var(--border)] hidden sm:block" />
            </>
          )}

          {/* Academic Year chip */}
          {showAcademicYear && !isFocusedUser && (
            <div className="hidden lg:flex items-center gap-1.5 h-7 px-2.5 rounded-full border border-[var(--warning)]/25 bg-[var(--warning)]/8 text-[var(--warning)]">
              <CalendarDays size={11} />
              <span className="text-[10.5px] font-bold tabular-nums leading-none whitespace-nowrap">{academicYearLabel}</span>
            </div>
          )}

          {/* Icon controls group */}
          <div className="flex items-center gap-0.5 p-1 rounded-xl bg-[var(--surface-soft)] border border-[var(--border)]">
            {!isFocusedUser && profile?.id && (
              <div className="notification-bell-wrapper">
                <NotificationBell
                  userId={profile.id}
                  schoolId={profile.school?.id ?? profile.school_id ?? ""}
                  locale={locale}
                />
              </div>
            )}
            <div className="hidden md:flex items-center gap-0.5">
              <LanguageToggle className="shell-utility-button" />
              <ThemeModeToggle
                variant="inline"
                className="app-shell-topbar__theme-switch hidden lg:inline-flex"
                compact
              />
            </div>
          </div>

          {/* Profile */}
          <ProfileMenu className="app-shell-topbar__profile-menu" />
        </div>
      </div>
    </header>
  );
}
