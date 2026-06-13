"use client";

import { motion } from "framer-motion";
import { Users, ArrowLeftRight, PauseCircle, Trash2 } from "lucide-react";
import { TABS } from "../_constants";
import type { StudentsMetaPayload } from "../_types";
import { cn } from "@/lib/brand/brand-utils";

const TAB_ICONS = {
  active: Users,
  transferred: ArrowLeftRight,
  suspended: PauseCircle,
  deleted: Trash2,
} as const;

const TAB_COLORS = {
  active: "var(--primary)",
  transferred: "var(--warning)",
  suspended: "var(--danger)",
  deleted: "var(--text-muted)",
} as const;

interface StudentsTabsProps {
  activeTab: string;
  setActiveTab: (tab: string) => void;
  studentsMeta: StudentsMetaPayload;
}

export function StudentsTabs({ activeTab, setActiveTab, studentsMeta }: StudentsTabsProps) {
  return (
    <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
      {TABS.map((tab) => {
        const Icon = TAB_ICONS[tab.id as keyof typeof TAB_ICONS];
        const color = TAB_COLORS[tab.id as keyof typeof TAB_COLORS];
        const isActive = activeTab === tab.id;
        const count = studentsMeta.tabCounts[tab.id] ?? 0;
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={cn(
              "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
              isActive
                ? "text-white"
                : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
            )}
          >
            {isActive && (
              <motion.div
                layoutId="students-tab-pill"
                className="absolute inset-0 rounded-xl"
                style={{ background: color }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
              />
            )}
            <Icon size={15} className="relative z-10 flex-shrink-0" />
            <span className="relative z-10 hidden sm:block">{tab.label}</span>
            {count > 0 && (
              <span
                className={cn(
                  "relative z-10 text-[10px] font-black px-1.5 py-0.5 rounded-full min-w-[18px] text-center",
                  isActive
                    ? "bg-white/20 text-white"
                    : "bg-[var(--surface-soft)] text-[var(--text-muted)]",
                )}
              >
                {count}
              </span>
            )}
          </button>
        );
      })}
    </div>
  );
}
