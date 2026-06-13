"use client";

import { useRuntimeBranding } from "@/hooks/brand";
import { SchoolLogo } from "@/components/brand";
import { signOutClient } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "@/lib/icons";
import { ProfileMenu } from "@/components/ProfileMenu";
import { LanguageToggle } from "@/components/LanguageToggle";
import { ThemeModeToggle } from "@/components/ThemeModeToggle";

export function RestrictedLayout({
  children,
  variant = "focused",
}: {
  children: React.ReactNode;
  variant?: "focused" | "group-only";
}) {
  const branding = useRuntimeBranding();
  const router = useRouter();
  const isGroupOnly = variant === "group-only";

  const handleLogout = async () => {
    await signOutClient();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]" dir="rtl">
      {isGroupOnly ? (
        <header className="sticky top-0 z-30 border-b border-[var(--border)] bg-[var(--surface)]/92 px-4 py-3 backdrop-blur sm:px-6">
          <div className="mx-auto flex max-w-7xl items-center gap-3">
            <SchoolLogo
              src={branding.logoUrl}
              alt={branding.schoolName || "المدرسة"}
              label={branding.schoolName}
              size={38}
              className="rounded-[12px]"
            />
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-black text-[var(--text-primary)]">
                {branding.schoolName || "المدرسة"}
              </div>
              <div className="truncate text-xs font-bold text-[var(--text-tertiary)]">
                صفحة المدير على مستوى المدرسة
              </div>
            </div>

            <div className="flex items-center gap-2">
              <LanguageToggle className="shell-utility-button" compact />
              <ThemeModeToggle variant="inline" compact className="shell-utility-button" />
            </div>

            <ProfileMenu className="app-shell-topbar__profile-menu" />
          </div>
        </header>
      ) : null}
      {!isGroupOnly ? (
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-[var(--border)] bg-[var(--surface)] px-5">
          <SchoolLogo
            src={branding.logoUrl}
            alt={branding.schoolName || "المدرسة"}
            label={branding.schoolName}
            size={36}
            className="rounded-[12px]"
          />
          <span className="truncate text-sm font-bold text-[var(--text-primary)]">
            {branding.schoolName || "المدرسة"}
          </span>
          <button
            onClick={() => void handleLogout()}
            className="ms-auto flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] transition-colors hover:text-[var(--danger)]"
          >
            <LogOut size={15} />
            <span>خروج</span>
          </button>
        </header>
      ) : null}
      <main className={isGroupOnly ? "mx-auto px-6 py-6 lg:px-8" : "mx-auto max-w-6xl p-6"}>
        {children}
      </main>
    </div>
  );
}
