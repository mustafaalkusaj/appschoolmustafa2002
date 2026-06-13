"use client";

import { useTranslations } from "next-intl";
import { Banknote, School, Pencil, Trash2, Plus, Check, X, AlertTriangle } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { ClassFee } from "./types";
import { TableSkeleton } from "@/components/skeleton";

interface ClassFeesTableProps {
  classFees: ClassFee[];
  showFeesTable: boolean;
  canManageClasses: boolean;
  loading?: boolean;
  error?: string | null;
  onRetry?: () => void;
  deleteConfirm: string | null;
  getClassStats: (cf: ClassFee) => {
    count: number;
    activeCount: number;
    transferredCount: number;
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
    transferredPaid: number;
    paidPct: number;
  };
  onOpenNewFee: () => void;
  onEditFee: (cf: ClassFee) => void;
  onDeleteFee: (id: string) => void;
  onCancelDelete: () => void;
  onConfirmDelete: (id: string) => void;
}

export function ClassFeesTable({
  classFees,
  showFeesTable,
  canManageClasses,
  loading,
  error,
  onRetry,
  deleteConfirm,
  getClassStats,
  onOpenNewFee,
  onEditFee,
  onDeleteFee,
  onCancelDelete,
  onConfirmDelete,
}: ClassFeesTableProps) {
  const t = useTranslations("dashboard.feesTable");
  const dashboardT = useTranslations("dashboard");
  const commonT = useTranslations("common");

  if (!showFeesTable) return null;

  const totalStudents = classFees.reduce((sum, cf) => sum + getClassStats(cf).activeCount, 0);
  const totalCollected = classFees.reduce((sum, cf) => sum + getClassStats(cf).totalPaid, 0);
  const avgPct =
    classFees.length > 0
      ? Math.round(
          classFees.reduce((sum, cf) => sum + getClassStats(cf).paidPct, 0) / classFees.length
        )
      : 0;

  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
        <h3 className="flex items-center gap-2 text-sm font-black text-[var(--text-primary)]">
          <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <Banknote size={18} />
          </div>
          {t("title")}
        </h3>
        {canManageClasses ? (
          <button
            onClick={onOpenNewFee}
            className="inline-flex items-center gap-1.5 h-8 px-3 rounded-xl bg-[var(--primary)] text-white text-xs font-bold hover:opacity-90 transition-opacity"
          >
            <Plus size={16} strokeWidth={3} />
            <span>{t("addLabel")}</span>
          </button>
        ) : null}
      </div>

      <div>
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : error ? (
          <div className="flex flex-col items-center justify-center min-h-[220px] py-8 gap-3">
            <div className="h-11 w-11 rounded-2xl bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] flex items-center justify-center text-[var(--danger)]">
              <AlertTriangle size={20} />
            </div>
            <div className="text-center">
              <p className="text-sm font-bold text-[var(--text-primary)]">{dashboardT("errors.overviewTitle")}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">{dashboardT("errors.overviewDescription")}</p>
            </div>
            {onRetry && (
              <button
                onClick={onRetry}
                className="h-8 px-4 rounded-xl border border-[var(--border)] text-xs font-bold text-[var(--text-muted)] hover:bg-[var(--surface-soft)] transition-colors"
              >
                {commonT("retry")}
              </button>
            )}
          </div>
        ) : classFees.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 gap-3">
            <div className="h-14 w-14 rounded-2xl bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)]">
              <School size={28} />
            </div>
            <p className="text-sm text-[var(--text-muted)]">{t("empty")}</p>
          </div>
        ) : (
          <>
            {/* Summary stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 p-4 border-b border-[var(--border)]">
              <div className="rounded-xl bg-[var(--surface-soft)] p-3 text-center">
                <div className="text-lg font-black text-[var(--text-primary)]">{classFees.length}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  {t("className")}s
                </div>
              </div>
              <div className="rounded-xl bg-[color-mix(in_srgb,var(--primary)_8%,transparent)] p-3 text-center">
                <div className="text-lg font-black text-[var(--primary)]">{totalStudents}</div>
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  {t("activeStudents")}
                </div>
              </div>
              <div className="rounded-xl bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-3 text-center">
                <div className="text-sm font-black text-[var(--success)]">
                  {commonT("currency")} {formatNumber(totalCollected)}
                </div>
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  {t("grandTotal")}
                </div>
              </div>
              <div className="rounded-xl bg-[color-mix(in_srgb,var(--warning)_8%,transparent)] p-3 text-center">
                <div className="text-sm font-black text-[var(--warning)]">{avgPct}%</div>
                <div className="text-[10px] text-[var(--text-muted)] font-bold uppercase tracking-wider mt-0.5">
                  {t("collectionRate")}
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="bg-[var(--surface-muted)]/50 border-y border-[var(--border)]">
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("className")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">{t("activeStudents")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">{t("transferredStudents")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("totalAmount")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("transferredAmount")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("grandTotal")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("totalFeesWithTransferred")}</th>
                    <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("installments")}</th>
                    {canManageClasses ? (
                      <th className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">{t("actions")}</th>
                    ) : null}
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border)]">
                  {classFees.map((cf) => {
                    const stats = getClassStats(cf);
                    return (
                      <tr key={cf.id} className="group hover:bg-[var(--surface-muted)]/30 transition-colors">
                        <td className="px-4 py-3">
                          <div className="flex items-center gap-3">
                            <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] group-hover:text-[var(--primary)] transition-colors">
                              <School size={14} />
                            </div>
                            <span className="font-semibold text-[var(--text-primary)] text-sm">{cf.class_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--success)_10%,transparent)] text-xs font-bold text-[var(--success)]">
                            {stats.activeCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[color-mix(in_srgb,var(--warning)_10%,transparent)] text-xs font-bold text-[var(--warning)]">
                            {stats.transferredCount}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--primary)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.totalPaid)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--warning)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.transferredPaid)}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--success)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.totalPaid + stats.transferredPaid)}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--info)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.activeCount * cf.total_fee + stats.transferredPaid)}
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--text-primary)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(cf.total_fee)}
                        </td>
                        {canManageClasses ? (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2">
                              <button
                                className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--text-muted)] hover:bg-[var(--surface-soft)] opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onEditFee(cf)}
                              >
                                <Pencil size={14} />
                              </button>

                              {deleteConfirm === cf.id ? (
                                <div className="flex gap-1 animate-in zoom-in-95 duration-200">
                                  <button
                                    className="h-7 w-7 flex items-center justify-center rounded-lg bg-[var(--danger)] text-white hover:opacity-90"
                                    onClick={() => onConfirmDelete(cf.id)}
                                  >
                                    <Check size={14} />
                                  </button>
                                  <button
                                    className="h-7 w-7 flex items-center justify-center rounded-lg border border-[var(--border)] text-[var(--text-muted)] hover:bg-[var(--surface-soft)]"
                                    onClick={onCancelDelete}
                                  >
                                    <X size={14} />
                                  </button>
                                </div>
                              ) : (
                                <button
                                  className="h-7 w-7 flex items-center justify-center rounded-lg text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => onDeleteFee(cf.id)}
                                >
                                  <Trash2 size={14} />
                                </button>
                              )}
                            </div>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>
    </div>
  );
}
