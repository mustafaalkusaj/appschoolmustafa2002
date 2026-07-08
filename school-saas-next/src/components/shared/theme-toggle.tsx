"use client";

import { useSyncExternalStore } from "react";
import { Moon, Sun } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { useTheme } from "next-themes";

const subscribe = () => () => {};

export function ThemeToggle() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const isHydrated = useSyncExternalStore(subscribe, () => true, () => false);

  const icon = !isHydrated ? <Moon className="h-4 w-4" /> : theme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />;
  const label = !isHydrated ? t.theme.label : theme === "dark" ? t.theme.light : t.theme.dark;

  return (
    <button
      type="button"
      onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
      aria-label={label}
      className="inline-flex items-center gap-2 rounded-xl border border-slate-300/70 bg-white px-3 py-2 text-sm font-medium text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-sky-300 hover:text-sky-700 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200 dark:hover:border-sky-600 dark:hover:text-sky-300"
    >
      {icon}
      <span>{label}</span>
    </button>
  );
}
