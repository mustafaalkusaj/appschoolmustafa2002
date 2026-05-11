"use client";

import { useTranslations } from "next-intl";
import { Banknote, School, Pencil, Trash2, Plus, Check, X } from "@/lib/icons";
import { formatNumber } from "@/lib/formatting";
import { ClassFee } from "./types";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { ErrorState } from "@/components/ui/error-state";
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

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]">
            <Banknote size={18} />
          </div>
          <CardTitle>{t("title")}</CardTitle>
        </div>
        {canManageClasses ? (
          <Button size="sm" onClick={onOpenNewFee} className="gap-2">
            <Plus size={16} strokeWidth={3} />
            <span>{t("addLabel")}</span>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={8} />
          </div>
        ) : error ? (
          <ErrorState
            title={dashboardT("errors.overviewTitle")}
            description={dashboardT("errors.overviewDescription")}
            onRetry={onRetry}
            retryLabel={commonT("retry")}
            className="min-h-[220px] py-8"
          />
        ) : classFees.length === 0 ? (
          <EmptyState
            icon={<School size={28} />}
            title={t("empty")}
          />
        ) : (
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
                      <td className="px-4 py-3">
                        <div className="flex flex-col gap-0.5">
                          <span className="text-[11px] font-semibold text-[var(--text-muted)]">
                            {t("installmentsCount", { count: cf.installments })}
                          </span>
                          <span className="text-[10px] font-medium text-[var(--success)] bg-[color-mix(in_srgb,var(--success)_10%,transparent)] px-1.5 py-0.5 rounded-md w-fit">
                            {t("perInstallment", { amount: formatNumber(cf.installment_amount) })}
                          </span>
                        </div>
                      </td>
                      {canManageClasses ? (
                        <td className="px-4 py-3">
                          <div className="flex items-center justify-center gap-2">
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                              onClick={() => onEditFee(cf)}
                            >
                              <Pencil size={14} />
                            </Button>

                            {deleteConfirm === cf.id ? (
                              <div className="flex gap-1 animate-in zoom-in-95 duration-200">
                                <Button
                                  variant="destructive"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={() => onConfirmDelete(cf.id)}
                                >
                                  <Check size={14} />
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  className="h-7 w-7 p-0"
                                  onClick={onCancelDelete}
                                >
                                  <X size={14} />
                                </Button>
                              </div>
                            ) : (
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onDeleteFee(cf.id)}
                              >
                                <Trash2 size={14} />
                              </Button>
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
        )}
      </CardContent>
    </Card>
  );
}
