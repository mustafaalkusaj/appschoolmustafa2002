"use client";

import { LogOut } from "lucide-react";
import { useRouter } from "next/navigation";

import { useAuth } from "@/hooks/useAuth";
import { useLanguage } from "@/hooks/useLanguage";
import { getRoleLabel } from "@/lib/i18n";

import { LanguageToggle } from "@/components/shared/language-toggle";
import { ThemeToggle } from "@/components/shared/theme-toggle";

interface AppHeaderProps {
  title: string;
  subtitle: string;
}

export function AppHeader({ title, subtitle }: AppHeaderProps) {
  const { user, logout } = useAuth();
  const { language, t } = useLanguage();
  const router = useRouter();

  return (
    <header className="sticky top-0 z-30 border-b border-slate-200/70 bg-white/80 px-4 py-3 backdrop-blur-xl dark:border-slate-800 dark:bg-slate-950/70 sm:px-6">
      <div className="mx-auto flex max-w-[1400px] flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-lg font-semibold tracking-tight text-slate-900 dark:text-slate-100">{title}</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400">{subtitle}</p>
        </div>

        <div className="flex items-center gap-2">
          <LanguageToggle />
          <ThemeToggle />
          {user && (
            <div className="hidden rounded-xl border border-slate-300/70 px-3 py-2 text-end text-xs dark:border-slate-700 md:block">
              <p className="font-semibold text-slate-700 dark:text-slate-100">{user.name}</p>
              <p className="text-slate-500 dark:text-slate-400">{getRoleLabel(user.role, language)}</p>
            </div>
          )}
          <button
            type="button"
            onClick={async () => {
              await logout();
              router.push("/login");
            }}
            aria-label={t.common.logout}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-300 bg-white px-3 py-2 text-sm font-medium text-slate-700 transition hover:border-rose-300 hover:text-rose-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
          >
            <LogOut className="h-4 w-4" />
            {t.common.logout}
          </button>
        </div>
      </div>
    </header>
  );
}
