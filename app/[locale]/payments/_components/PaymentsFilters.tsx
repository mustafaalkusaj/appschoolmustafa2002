"use client";

import { useState } from "react";
import { useTranslations } from "next-intl";
import { motion, AnimatePresence } from "framer-motion";
import { Download, Plus, SlidersHorizontal, ChevronDown, Users, FileX, CheckCircle2, Tag, GraduationCap, PauseCircle, Trash2, GraduationCap as ClassIcon, ArrowUpDown, ArrowUp, ArrowDown, DollarSign, RotateCcw, School } from "lucide-react";
import { QUICK_FILTERS } from "../_types";

interface PaymentsFiltersProps {
  quickFilter: string;
  setQuickFilter: (filter: string) => void;
  filterClass: string;
  setFilterClass: (cls: string) => void;
  filterSort: string;
  setFilterSort: (sort: string) => void;
  filterDir: string;
  setFilterDir: (dir: string) => void;
  classes: string[];
  onExport: () => void;
  onAddPayment: () => void;
  exporting: boolean;
  resolvedSchoolId: boolean;
  canAddPayments: boolean;
  minFee: number | null;
  setMinFee: (v: number | null) => void;
  maxFee: number | null;
  setMaxFee: (v: number | null) => void;
  locale: "ar" | "en";
}

const FILTER_ICONS: Record<string, React.ElementType> = {
  all: Users,
  no_invoice: FileX,
  collected: CheckCircle2,
  discounted: Tag,
  graduated: GraduationCap,
  suspended: PauseCircle,
  deleted: Trash2,
};

const fieldClasses =
  "h-10 w-full rounded-xl border border-[var(--border)] bg-[var(--card-bg)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] focus:ring-2 focus:ring-[var(--primary)]/10 transition";

export function PaymentsFilters({
  quickFilter,
  setQuickFilter,
  filterClass,
  setFilterClass,
  filterSort,
  setFilterSort,
  filterDir,
  setFilterDir,
  classes,
  onExport,
  onAddPayment,
  exporting,
  resolvedSchoolId,
  canAddPayments,
  minFee,
  setMinFee,
  maxFee,
  setMaxFee,
  locale,
}: PaymentsFiltersProps) {
  const t = useTranslations();
  const [filtersOpen, setFiltersOpen] = useState(false);

  const hasActiveFilters = filterClass !== "" || minFee !== null || maxFee !== null;

  return (
    <div className="space-y-4">

      {/* Top bar: title + actions */}
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <div className="h-9 w-9 rounded-xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
            <SlidersHorizontal size={16} />
          </div>
          <div>
            <p className="text-sm font-black text-[var(--text-primary)]">{t("payments.filters.operations")}</p>
            <p className="text-[10px] text-[var(--text-muted)]">{t(`payments.quickFilters.${quickFilter}`)}</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {/* Export pill */}
          <div className="flex items-center gap-0.5 p-1 rounded-2xl border border-[var(--border)]" style={{ background: "var(--surface-soft)" }}>
            <button
              onClick={onExport}
              disabled={exporting || !resolvedSchoolId}
              className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--success)] hover:shadow-sm disabled:opacity-40 disabled:cursor-not-allowed"
            >
              <Download size={14} />
              <span className="hidden sm:inline">{exporting ? "..." : t("payments.filters.exportExcel")}</span>
            </button>
          </div>

          {/* Filters toggle */}
          <button
            onClick={() => setFiltersOpen(v => !v)}
            className={`inline-flex items-center gap-1.5 h-10 px-4 rounded-xl text-sm font-bold border transition-all ${
              hasActiveFilters || filtersOpen
                ? "bg-[var(--primary)]/10 text-[var(--primary)] border-[var(--primary)]/20"
                : "bg-[var(--surface-soft)] text-[var(--text-secondary)] border-[var(--border)] hover:bg-[var(--surface-muted)]"
            }`}
          >
            <SlidersHorizontal size={14} />
            <span className="hidden sm:inline">{t("payments.filters.advanced")}</span>
            {hasActiveFilters && (
              <span className="h-2 w-2 rounded-full bg-[var(--primary)]" />
            )}
            <motion.span animate={{ rotate: filtersOpen ? 180 : 0 }} transition={{ duration: 0.2 }}>
              <ChevronDown size={14} />
            </motion.span>
          </button>

          {/* Add button */}
          {canAddPayments && (
            <motion.button
              whileHover={{ scale: 1.03 }}
              whileTap={{ scale: 0.97 }}
              onClick={onAddPayment}
              className="inline-flex items-center gap-2 h-10 px-5 rounded-xl text-sm font-black text-white cursor-pointer bg-[var(--primary)] shadow-lg shadow-[var(--primary)]/25"
            >
              <Plus size={16} />
              <span className="hidden sm:inline">{t("payments.filters.addInvoice")}</span>
              <span className="sm:hidden">+</span>
            </motion.button>
          )}
        </div>
      </div>

      {/* Quick filters */}
      <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex flex-wrap gap-1">
        {QUICK_FILTERS.map((f) => {
          const isActive = quickFilter === f.id;
          const Icon = FILTER_ICONS[f.id] ?? Users;
          return (
            <button
              key={f.id}
              type="button"
              onClick={() => setQuickFilter(f.id)}
              className={`relative flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition-colors duration-150 z-10 ${
                isActive
                  ? "text-white"
                  : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]"
              }`}
            >
              {isActive && (
                <motion.div
                  layoutId="payments-qf-pill"
                  className="absolute inset-0 rounded-xl bg-[var(--primary)]"
                  transition={{ type: "spring", stiffness: 400, damping: 30 }}
                />
              )}
              <span className="relative z-10 flex items-center gap-1.5">
                <Icon size={13} />
                {t(`payments.quickFilters.${f.id}`)}
              </span>
            </button>
          );
        })}
      </div>

      {/* Collapsible advanced filters */}
      <AnimatePresence>
        {filtersOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
            className="overflow-hidden"
          >
            <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">

              {/* Row 1: Class + Sort */}
              <div className="grid sm:grid-cols-2 divide-y sm:divide-y-0 sm:divide-x sm:divide-x-reverse divide-[var(--border)]">

                {/* Class filter */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <School size={12} className="text-[var(--primary)]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {t("payments.filters.classAndSection")}
                    </span>
                  </div>
                  <select
                    className={fieldClasses}
                    value={filterClass}
                    onChange={(e) => setFilterClass(e.target.value)}
                  >
                    <option value="">{t("payments.filters.allClasses")}</option>
                    {classes.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>

                {/* Sort by + direction */}
                <div className="p-4 flex flex-col gap-2">
                  <div className="flex items-center gap-1.5">
                    <ArrowUpDown size={12} className="text-[var(--primary)]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {t("payments.filters.sortBy")}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <select
                      className={fieldClasses}
                      value={filterSort}
                      onChange={(e) => setFilterSort(e.target.value)}
                    >
                      <option value="name">{t("payments.filters.sortName")}</option>
                      <option value="remaining">{t("payments.filters.sortRemaining")}</option>
                      <option value="total">{t("payments.filters.sortTotalFees")}</option>
                    </select>
                    {/* Direction toggle */}
                    <div className="flex rounded-xl border border-[var(--border)] overflow-hidden flex-shrink-0">
                      <button
                        type="button"
                        onClick={() => setFilterDir("asc")}
                        className={`flex items-center gap-1 px-3 h-10 text-xs font-bold transition-colors ${
                          filterDir === "asc"
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                        }`}
                      >
                        <ArrowUp size={12} />
                        {t("payments.filters.sortAsc")}
                      </button>
                      <div className="w-px bg-[var(--border)]" />
                      <button
                        type="button"
                        onClick={() => setFilterDir("desc")}
                        className={`flex items-center gap-1 px-3 h-10 text-xs font-bold transition-colors ${
                          filterDir === "desc"
                            ? "bg-[var(--primary)] text-white"
                            : "bg-[var(--card-bg)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                        }`}
                      >
                        <ArrowDown size={12} />
                        {t("payments.filters.sortDesc")}
                      </button>
                    </div>
                  </div>
                </div>
              </div>

              {/* Row 2: Fee range */}
              <div className="border-t border-[var(--border)] p-4 flex flex-col gap-2">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <DollarSign size={12} className="text-[var(--primary)]" />
                    <span className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">
                      {locale === "en" ? "Fee Range (Remaining)" : "نطاق المبلغ المتبقي"}
                    </span>
                  </div>
                  {hasActiveFilters && (
                    <button
                      onClick={() => { setFilterClass(""); setMinFee(null); setMaxFee(null); }}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-[var(--danger)] hover:bg-[var(--danger)]/10 px-2 py-1 rounded-lg transition-colors"
                    >
                      <RotateCcw size={10} />
                      {locale === "en" ? "Reset" : "إعادة ضبط"}
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="number" min="0"
                    value={minFee ?? ""}
                    onChange={(e) => setMinFee(e.target.value ? Number(e.target.value) : null)}
                    placeholder={locale === "en" ? "Min" : "الحد الأدنى"}
                    className={fieldClasses}
                    dir="ltr"
                  />
                  <div className="h-px w-4 bg-[var(--border)] flex-shrink-0" />
                  <input
                    type="number" min="0"
                    value={maxFee ?? ""}
                    onChange={(e) => setMaxFee(e.target.value ? Number(e.target.value) : null)}
                    placeholder={locale === "en" ? "Max" : "الحد الأقصى"}
                    className={fieldClasses}
                    dir="ltr"
                  />
                </div>
              </div>

            </div>
          </motion.div>
        )}
      </AnimatePresence>

    </div>
  );
}
