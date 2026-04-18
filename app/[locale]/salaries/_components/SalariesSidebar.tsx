"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { cn } from "@/lib/brand/brand-utils";
import { SIDEBAR_ITEMS } from "../_types";

interface SalariesSidebarProps {
  activeSection: string;
  onSectionChange: (section: string) => void;
  onDeductionsLoad: () => void;
  onCalendarLoad: () => void;
}

export function SalariesSidebar({
  activeSection,
  onSectionChange,
  onDeductionsLoad,
  onCalendarLoad,
}: SalariesSidebarProps) {
  const t = useTranslations();

  const handleClick = (id: string) => {
    const resolvedSection = id === "teachers" ? "main" : id;
    onSectionChange(resolvedSection);
    if (id === "deductions") onDeductionsLoad();
    if (id === "calendar") onCalendarLoad();
  };

  return (
    <nav className="flex flex-col p-4 gap-1">
      <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-3 py-2 border-b border-[var(--border)] mb-2">
        {t("salaries.sidebar.sectionTitle")}
      </div>
      {(() => {
        const mainSectionActive = activeSection === "main";
        return SIDEBAR_ITEMS.map((item) => {
          const isActive = item.id === "teachers" ? mainSectionActive : activeSection === item.id;
          return (
            <button
              key={item.id}
              className={cn(
                "flex items-center gap-2.5 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all",
                "w-full text-start",
                isActive
                  ? "bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
                  : "text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--text-primary)]"
              )}
              onClick={() => handleClick(item.id)}
            >
              <AppIcon token={item.icon} size={16} />
              <span>{t(`salaries.sidebar.items.${item.id}`)}</span>
            </button>
          );
        });
      })()}
    </nav>
  );
}
