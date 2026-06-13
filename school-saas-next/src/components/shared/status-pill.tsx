"use client";

import clsx from "clsx";

import { useLanguage } from "@/hooks/useLanguage";
import { getStatusLabel } from "@/lib/i18n";

interface StatusPillProps {
  status: "active" | "suspended" | "blocked" | "archived";
}

export function StatusPill({ status }: StatusPillProps) {
  const { language } = useLanguage();

  return (
    <span
      className={clsx(
        "inline-flex items-center rounded-full px-2.5 py-1 text-xs font-semibold",
        status === "active" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-300",
        status === "suspended" && "bg-amber-100 text-amber-700 dark:bg-amber-950/40 dark:text-amber-300",
        status === "blocked" && "bg-rose-100 text-rose-700 dark:bg-rose-950/40 dark:text-rose-300",
        status === "archived" && "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
      )}
    >
      {getStatusLabel(status, language)}
    </span>
  );
}
