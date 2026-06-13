"use client";

import { useTranslations } from "next-intl";
import { QUICK_ACCESS } from "../_types";
import { motion, useReducedMotion, type Variants } from "framer-motion";
import {
  GraduationCap, Tag, BookOpen, Briefcase, Printer,
  FileDown, Wallet, BarChart3, ClipboardList, ChevronLeft,
} from "@/lib/icons";

interface QuickAccessGridProps {
  showAll: boolean;
  onToggleShowAll: () => void;
  onAction: (id: string) => void;
}

const ITEM_CONFIG: Record<string, { icon: React.ElementType; color: string }> = {
  add_teacher:     { icon: GraduationCap, color: "var(--primary)" },
  prices:          { icon: Tag,           color: "var(--warning)"  },
  subjects:        { icon: BookOpen,      color: "var(--success)"  },
  titles:          { icon: Briefcase,     color: "var(--info)"     },
  print:           { icon: Printer,       color: "var(--primary)"  },
  export:          { icon: FileDown,      color: "var(--success)"  },
  deductions:      { icon: Wallet,        color: "var(--danger)"   },
  detailed_report: { icon: BarChart3,     color: "var(--warning)"  },
  daily_log:       { icon: ClipboardList, color: "var(--info)"     },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.055, delayChildren: 0.05 } },
};

const rowVariants = {
  hidden:  { opacity: 0, x: 16, filter: "blur(4px)" },
  visible: {
    opacity: 1, x: 0, filter: "blur(0px)",
    transition: { type: "spring", stiffness: 260, damping: 22 },
  },
};

export function QuickAccessGrid({
  showAll,
  onToggleShowAll,
  onAction,
}: QuickAccessGridProps) {
  const t = useTranslations();
  const reduce = useReducedMotion();
  const visibleItems = showAll ? QUICK_ACCESS : QUICK_ACCESS.slice(0, 6);
  const left  = visibleItems.filter((_, i) => i % 2 === 0);
  const right = visibleItems.filter((_, i) => i % 2 === 1);

  const renderRow = (qa: (typeof QUICK_ACCESS)[0]) => {
    const cfg  = ITEM_CONFIG[qa.id];
    const Icon = cfg?.icon;
    return (
      <motion.button
        key={qa.id}
        variants={(reduce ? undefined : rowVariants) as Variants | undefined}
        whileHover={reduce ? undefined : { x: -3, backgroundColor: "var(--surface-soft)" }}
        whileTap={reduce ? undefined : { scale: 0.97 }}
        onClick={() => onAction(qa.id)}
        className="group w-full flex items-center gap-3 px-4 py-3.5 transition-colors duration-150 cursor-pointer focus:outline-none"
        style={{ willChange: "transform" }}
      >
        {/* Icon */}
        <motion.div
          whileHover={reduce ? undefined : { scale: 1.18, rotate: -6 }}
          transition={{ type: "spring", stiffness: 400, damping: 18 }}
          className="w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 shadow-sm"
          style={{
            background: cfg ? `color-mix(in srgb, ${cfg.color} 14%, transparent)` : "var(--surface-soft)",
            color: cfg?.color ?? "var(--text-muted)",
          }}
        >
          {Icon && <Icon size={16} strokeWidth={2} />}
        </motion.div>

        {/* Label */}
        <span className="flex-1 text-sm font-medium text-[var(--text-secondary)] group-hover:text-[var(--text-primary)] transition-colors duration-150 text-start truncate">
          {t(`salaries.quickAccess.items.${qa.id}`)}
        </span>

        {/* Arrow */}
        <motion.span
          whileHover={reduce ? undefined : { x: -3 }}
          transition={{ type: "spring", stiffness: 400, damping: 20 }}
        >
          <ChevronLeft
            size={13}
            className="flex-shrink-0 text-[var(--border)] group-hover:text-[var(--primary)] transition-colors duration-150"
          />
        </motion.span>
      </motion.button>
    );
  };

  return (
    <div className="space-y-3">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -6 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.2 }}
        className="flex items-center justify-between px-1"
      >
        <p className="text-xs font-bold text-[var(--text-muted)] uppercase tracking-widest">
          {t("salaries.quickAccess.title")}
        </p>
        <button
          onClick={onToggleShowAll}
          className="text-[11px] font-semibold text-[var(--primary)] hover:underline underline-offset-2"
        >
          {showAll ? t("salaries.quickAccess.showLess") : t("salaries.quickAccess.showAll")}
        </button>
      </motion.div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 10, scale: 0.99 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.25, ease: "easeOut" }}
        className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden shadow-sm"
      >
        <div className="grid grid-cols-1 sm:grid-cols-2 divide-y sm:divide-y-0 divide-[var(--border)]">
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-[var(--border)]"
          >
            {left.map((qa) => renderRow(qa))}
          </motion.div>
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="visible"
            className="divide-y divide-[var(--border)] sm:border-s sm:border-s-[var(--border)]"
          >
            {right.map((qa) => renderRow(qa))}
          </motion.div>
        </div>
      </motion.div>
    </div>
  );
}
