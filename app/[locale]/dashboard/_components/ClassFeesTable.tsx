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
    totalExpected: number;
    totalPaid: number;
    totalRemaining: number;
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
      <CardHeader className="flex flex-row items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div
            className="p-2 rounded-xl bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] text-[var(--primary)]"
            aria-hidden="true"
          >
            <Banknote size={18} />
          </div>
          <CardTitle>{t("title")}</CardTitle>
        </div>
        {canManageClasses ? (
          <Button
            size="sm"
            onClick={onOpenNewFee}
            className="gap-2"
            aria-label={t("addLabel")}
          >
            <Plus size={16} strokeWidth={3} aria-hidden="true" />
            <span className="hidden sm:inline">{t("addLabel")}</span>
            <span className="sm:hidden">{t("addLabelShort") ?? t("addLabel")}</span>
          </Button>
        ) : null}
      </CardHeader>

      <CardContent className="p-0">
        {loading ? (
          <div className="p-4">
            <TableSkeleton rows={5} cols={7} />
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
            icon={<School size={28} aria-hidden="true" />}
            title={t("empty")}
          />
        ) : (
          <>
            {/* Desktop table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full" role="table" aria-label={t("title")}>
                <thead>
                  <tr className="bg-[var(--surface-muted)]/50 border-y border-[var(--border)]">
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("className")}</th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">{t("students")}</th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("totalAmount")}</th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("installments")}</th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("collected")}</th>
                    <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-start">{t("remaining")}</th>
                    {canManageClasses ? (
                      <th scope="col" className="px-4 py-3 text-xs font-bold text-[var(--text-muted)] uppercase tracking-wider text-center">{t("actions")}</th>
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
                            <div className="w-7 h-7 rounded-lg bg-[var(--surface-muted)] flex items-center justify-center text-[var(--text-muted)] group-hover:bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] group-hover:text-[var(--primary)] transition-colors" aria-hidden="true">
                              <School size={14} />
                            </div>
                            <span className="font-semibold text-[var(--text-primary)] text-sm">{cf.class_name}</span>
                          </div>
                        </td>
                        <td className="px-4 py-3 text-center">
                          <span className="inline-flex items-center justify-center w-7 h-7 rounded-full bg-[var(--surface-muted)] text-xs font-bold text-[var(--text-secondary)]">
                            {stats.count}
                          </span>
                        </td>
                        <td className="px-4 py-3 font-bold text-[var(--primary)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(cf.total_fee)}
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
                        <td className="px-4 py-3 font-semibold text-[var(--success)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.totalPaid)}
                        </td>
                        <td className="px-4 py-3 font-semibold text-[var(--danger)] text-sm whitespace-nowrap">
                          {commonT("currency")} {formatNumber(stats.totalRemaining)}
                        </td>
                        {canManageClasses ? (
                          <td className="px-4 py-3">
                            <div className="flex items-center justify-center gap-2" role="group" aria-label={`${t("actions")} — ${cf.class_name}`}>
                              <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 w-7 p-0 opacity-0 group-hover:opacity-100 transition-opacity"
                                onClick={() => onEditFee(cf)}
                                aria-label={`${t("editFee") ?? "تعديل"} ${cf.class_name}`}
                              >
                                <Pencil size={14} aria-hidden="true" />
                              </Button>

                              {deleteConfirm === cf.id ? (
                                <div className="flex gap-1 animate-in zoom-in-95 duration-200" role="group" aria-label={t("confirmDeleteGroup") ?? "تأكيد الحذف"}>
                                  <Button
                                    variant="destructive"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={() => onConfirmDelete(cf.id)}
                                    aria-label={`${t("confirmDelete") ?? "تأكيد حذف"} ${cf.class_name}`}
                                  >
                                    <Check size={14} aria-hidden="true" />
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    className="h-7 w-7 p-0"
                                    onClick={onCancelDelete}
                                    aria-label={t("cancelDelete") ?? "إلغاء الحذف"}
                                  >
                                    <X size={14} aria-hidden="true" />
                                  </Button>
                                </div>
                              ) : (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="h-7 w-7 p-0 text-[var(--danger)] hover:bg-[color-mix(in_srgb,var(--danger)_10%,transparent)] opacity-0 group-hover:opacity-100 transition-opacity"
                                  onClick={() => onDeleteFee(cf.id)}
                                  aria-label={`${t("deleteFee") ?? "حذف"} ${cf.class_name}`}
                                >
                                  <Trash2 size={14} aria-hidden="true" />
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

            {/* Mobile cards */}
            <div className="md:hidden divide-y divide-[var(--border)]">
              {classFees.map((cf) => {
                const stats = getClassStats(cf);
                return (
                  <div key={cf.id} className="p-4 space-y-3">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <div className="w-8 h-8 rounded-lg bg-[color-mix(in_srgb,var(--primary)_10%,transparent)] flex items-center justify-center text-[var(--primary)]" aria-hidden="true">
                          <School size={16} />
                        </div>
                        <span className="font-bold text-[var(--text-primary)] text-sm">{cf.class_name}</span>
                        <span className="text-xs text-[var(--text-muted)] bg-[var(--surface-muted)] px-2 py-0.5 rounded-full">
                          {stats.count} {t("students")}
                        </span>
                      </div>
                      {canManageClasses ? (
                        <div className="flex items-center gap-1" role="group" aria-label={`${t("actions")} — ${cf.class_name}`}>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-8 w-8 p-0"
                            onClick={() => onEditFee(cf)}
                            aria-label={`${t("editFee") ?? "تعديل"} ${cf.class_name}`}
                          >
                            <Pencil size={14} aria-hidden="true" />
                          </Button>
                          {deleteConfirm === cf.id ? (
                            <div className="flex gap-1">
                              <Button
                                variant="destructive"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={() => onConfirmDelete(cf.id)}
                                aria-label={`${t("confirmDelete") ?? "تأكيد حذف"} ${cf.class_name}`}
                              >
                                <Check size={14} aria-hidden="true" />
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                className="h-8 w-8 p-0"
                                onClick={onCancelDelete}
                                aria-label={t("cancelDelete") ?? "إلغاء الحذف"}
                              >
                                <X size={14} aria-hidden="true" />
                              </Button>
                            </div>
                          ) : (
                            <Button
                              variant="ghost"
                              size="sm"
                              className="h-8 w-8 p-0 text-[var(--danger)]"
                              onClick={() => onDeleteFee(cf.id)}
                              aria-label={`${t("deleteFee") ?? "حذف"} ${cf.class_name}`}
                            >
                              <Trash2 size={14} aria-hidden="true" />
                            </Button>
                          )}
                        </div>
                      ) : null}
                    </div>

                    <div className="grid grid-cols-2 gap-2 text-xs">
                      <div className="rounded-lg bg-[var(--surface-muted)] p-2">
                        <div className="text-[var(--text-muted)] mb-0.5">{t("totalAmount")}</div>
                        <div className="font-bold text-[var(--primary)]">{commonT("currency")} {formatNumber(cf.total_fee)}</div>
                      </div>
                      <div className="rounded-lg bg-[var(--surface-muted)] p-2">
                        <div className="text-[var(--text-muted)] mb-0.5">{t("installments")}</div>
                        <div className="font-semibold">{t("installmentsCount", { count: cf.installments })}</div>
                        <div className="text-[var(--success)]">{t("perInstallment", { amount: formatNumber(cf.installment_amount) })}</div>
                      </div>
                      <div className="rounded-lg bg-[color-mix(in_srgb,var(--success)_8%,transparent)] p-2">
                        <div className="text-[var(--text-muted)] mb-0.5">{t("collected")}</div>
                        <div className="font-bold text-[var(--success)]">{commonT("currency")} {formatNumber(stats.totalPaid)}</div>
                      </div>
                      <div className="rounded-lg bg-[color-mix(in_srgb,var(--danger)_8%,transparent)] p-2">
                        <div className="text-[var(--text-muted)] mb-0.5">{t("remaining")}</div>
                        <div className="font-bold text-[var(--danger)]">{commonT("currency")} {formatNumber(stats.totalRemaining)}</div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
