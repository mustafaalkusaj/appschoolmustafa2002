"use client";

import { useRuntimeBranding } from "@/hooks/brand";
import { SchoolLogo } from "@/components/brand";
import { signOutClient } from "@/lib/auth";
import { useRouter } from "next/navigation";
import { LogOut } from "@/lib/icons";

export function RestrictedLayout({ children }: { children: React.ReactNode }) {
  const branding = useRuntimeBranding();
  const router = useRouter();

  const handleLogout = async () => {
    await signOutClient();
    router.push("/login");
  };

  return (
    <div className="min-h-screen bg-[var(--background)]" dir="rtl">
      <header className="h-14 border-b border-[var(--border)] bg-[var(--surface)] flex items-center px-5 gap-3 sticky top-0 z-30">
        <SchoolLogo
          src={branding.logoUrl}
          alt={branding.schoolName || "المدرسة"}
          label={branding.schoolName}
          size={36}
          className="rounded-[12px]"
        />
        <span className="font-bold text-sm text-[var(--text-primary)] truncate">
          {branding.schoolName || "المدرسة"}
        </span>
        <button
          onClick={() => void handleLogout()}
          className="ms-auto flex items-center gap-2 text-xs font-bold text-[var(--text-muted)] hover:text-[var(--danger)] transition-colors"
        >
          <LogOut size={15} />
          <span>خروج</span>
        </button>
      </header>
      <main className="max-w-6xl mx-auto p-6">
        {children}
      </main>
    </div>
  );
}
