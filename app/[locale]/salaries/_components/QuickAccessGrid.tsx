"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { cn } from "@/lib/brand/brand-utils";
import { QUICK_ACCESS } from "../_types";

interface QuickAccessGridProps {
  showAll: boolean;
  onToggleShowAll: () => void;
  onAction: (id: string) => void;
}

export function QuickAccessGrid({
  showAll,
  onToggleShowAll,
  onAction,
}: QuickAccessGridProps) {
  const t = useTranslations();
  const visibleItems = showAll ? QUICK_ACCESS : QUICK_ACCESS.slice(0, 7);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2 text-sm font-bold text-[var(--text-primary)]">
          <AppIcon token="📌" size={14} />
          {t("salaries.quickAccess.title")}
        </div>
        <button
          onClick={onToggleShowAll}
          className={cn(
            "px-3 py-1.5 rounded-[var(--button-radius)] shadow-sm",
            "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)]",
            "text-[var(--primary)]",
            "border border-[color-mix(in_srgb,var(--primary)_20%,transparent)]",
            "text-xs font-semibold",
            "hover:bg-[color-mix(in_srgb,var(--primary)_16%,transparent)] hover:-translate-y-0.5",
            "transition-all"
          )}
        >
          {showAll ? t("salaries.quickAccess.showLess") : t("salaries.quickAccess.showAll")}
        </button>
      </div>
      
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 xl:grid-cols-7 gap-3">
        {visibleItems.map((qa) => (
          <button
            key={qa.id}
            onClick={() => onAction(qa.id)}
            className={cn(
              "flex flex-col items-center gap-2 p-4",
              "rounded-[var(--card-radius)]",
              "bg-[var(--surface-strong)]",
              "border border-[var(--border)]",
              "shadow-sm",
              "hover:bg-[var(--surface-soft)] hover:border-[var(--primary)]",
              "hover:-translate-y-0.5 hover:shadow-[var(--shadow-md)]",
              "transition-all duration-150",
              "focus:outline-none focus:ring-2 focus:ring-[var(--primary)]/30"
            )}
            >
            <div
              className={cn(
                "w-12 h-12 rounded-xl flex items-center justify-center text-xl shadow-sm",
                // Quick-access icon backgrounds are intentionally light even in dark mode.
                // Force a dark icon color for contrast.
                "text-slate-900 ring-1 ring-black/10"
              )}
              style={{ background: qa.bg }}
            >
              <AppIcon token={qa.icon} size={20} />
            </div>
            <span className="text-xs font-semibold text-[var(--text-primary)] opacity-80 text-center leading-tight">
              {t(`salaries.quickAccess.items.${qa.id}`)}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}
