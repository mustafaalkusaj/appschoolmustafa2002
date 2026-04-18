"use client";

import { useTranslations } from "next-intl";
import { AppIcon } from "@/components/AppIcon";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
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
  resolvedSchoolId: string | null;
  canAddPayments: boolean;
}

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
}: PaymentsFiltersProps) {
  const t = useTranslations();

  return (
    <div className="space-y-6">
      {/* Header with actions */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <AppIcon token="⚙️" size={16} />
          <span className="text-sm font-bold text-[var(--text-primary)]">{t("payments.filters.operations")}</span>
        </div>
        <div className="grid w-full grid-cols-1 gap-3 sm:flex sm:w-auto sm:flex-wrap sm:items-center">
          <Button
            variant="outline"
            size="sm"
            onClick={onExport}
            disabled={exporting || !resolvedSchoolId}
            loading={exporting}
            className="w-full justify-center sm:w-auto"
          >
            <AppIcon token="⬇️" size={14} />
            {t("payments.filters.exportExcel")}
          </Button>
          {canAddPayments && (
            <Button variant="primary" size="sm" onClick={onAddPayment} className="w-full justify-center sm:w-auto">
              {t("payments.filters.addInvoice")}
            </Button>
          )}
        </div>
      </div>

      {/* Quick filters */}
      <div className="flex flex-wrap gap-2">
        {QUICK_FILTERS.map((f) => (
          <button
            key={f.id}
            onClick={() => setQuickFilter(f.id)}
            className={`
              inline-flex items-center gap-1.5 px-3 py-1.5
              text-sm font-semibold rounded-full
              transition-all duration-150
              ${
                quickFilter === f.id
                  ? "bg-[var(--primary)] text-white shadow-[var(--shadow-primary)]"
                  : "bg-[var(--surface-muted)] text-[var(--text-secondary)] hover:bg-[var(--surface-hover)]"
              }
            `}
          >
            <AppIcon token="📋" size={12} />
            {t(`payments.quickFilters.${f.id}`)}
          </button>
        ))}
      </div>

      {/* Advanced filters */}
      <div className="bg-[var(--surface-soft)] rounded-[var(--radius-lg)] p-4">
        <div className="flex items-center gap-2 mb-4">
          <AppIcon token="🔍" size={14} />
          <span className="text-sm font-bold text-[var(--text-primary)]">{t("payments.filters.advanced")}</span>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              {t("payments.filters.classAndSection")}
            </label>
            <Select value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
              <option value="">{t("payments.filters.allClasses")}</option>
              {classes.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">{t("payments.filters.sortBy")}</label>
            <Select value={filterSort} onChange={(e) => setFilterSort(e.target.value)}>
              <option value="name">{t("payments.filters.sortName")}</option>
              <option value="remaining">{t("payments.filters.sortRemaining")}</option>
              <option value="total">{t("payments.filters.sortTotalFees")}</option>
            </Select>
          </div>
          <div className="flex flex-col gap-2">
            <label className="text-xs font-semibold text-[var(--text-muted)]">
              {t("payments.filters.sortDirection")}
            </label>
            <Select value={filterDir} onChange={(e) => setFilterDir(e.target.value)}>
              <option value="asc">{t("payments.filters.sortAsc")}</option>
              <option value="desc">{t("payments.filters.sortDesc")}</option>
            </Select>
          </div>
        </div>
      </div>
    </div>
  );
}
