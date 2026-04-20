"use client";

import { useRuntimeBranding } from "@/hooks/brand";
import { SchoolLogo } from "@/components/brand";
import { signOutClient } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "@/lib/icons";

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
      <main className={isGroupOnly ? "mx-auto max-w-7xl p-6 lg:p-10" : "mx-auto max-w-6xl p-6"}>
        {children}
      </main>
    </div>
  );
}
