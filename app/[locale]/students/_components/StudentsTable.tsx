"use client";

import { useTranslations } from "next-intl";
import { MoreHorizontal, Loader2 } from "lucide-react";
import { formatNumber } from "@/lib/formatting";
import { Badge } from "@/components/ui/badge";
import { Button, IconButton } from "@/components/ui/button";
import { Pagination } from "@/components/ui/pagination";
import { EmptyState } from "@/components/ui/empty-state";
import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/brand/brand-utils";
import type { StudentWithFees, StudentActionItem } from "../_types";

interface StudentsTableProps {
  pagedStudents: StudentWithFees[];
  pagedLoading: boolean;
  pagedError: string | null;
  totalCount: number;
  page: number;
  pageSize: number;
  totalPages: number;
  activeTab: string;
  error: string;
  canManageStudentAccounts: boolean;
  getActions: (s: StudentWithFees) => StudentActionItem[];
  openMenu: (e: React.MouseEvent, student: StudentWithFees) => void;
  onPageChange: (page: number) => void;
}

// Status badge variant mapping
const statusVariantMap: Record<string, "success" | "warning" | "danger" | "info" | "neutral"> = {
  active: "success",
  transferred: "warning",
  graduated: "info",
  withdrawn: "danger",
  archived: "neutral",
  suspended: "warning",
  deleted: "neutral",
};

export function StudentsTable({
  pagedStudents,
  pagedLoading,
  pagedError,
  totalCount,
  page,
  pageSize,
  totalPages,
  activeTab,
  error,
  canManageStudentAccounts,
  getActions,
  openMenu,
  onPageChange,
}: StudentsTableProps) {
  const t = useTranslations("students.table");
  const commonT = useTranslations("common");
  const tabsT = useTranslations("students.tabs");

  // Loading state
  if (pagedLoading) {
    return (
      <div className="flex items-center justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-[var(--primary)]" />
      </div>
    );
  }

  // Error state
  if (error || pagedError) {
    return (
      <EmptyState
        title={t("errorLoading", { error: error || pagedError || "???" })}
        className="text-[var(--danger)]"
      />
    );
  }

  // Empty state
  if (pagedStudents.length === 0) {
    const emptyTitle =
      totalCount === 0
        ? activeTab === "active" && canManageStudentAccounts
          ? t("empty.noStudents")
          : t("empty.noStudentsTab", { tab: tabsT(activeTab as any) })
        : t("empty.noResults");

    return <EmptyState title={emptyTitle} />;
  }

  return (
    <div className="space-y-4">
      {/* Mobile Cards View */}
      <div className="grid gap-4 md:hidden">
        {pagedStudents.map((s, i) => {
          const actions = getActions(s);
          return (
            <Card key={s.id} className="overflow-hidden">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-3 mb-4">
                  <div className="flex-1 min-w-0">
                    <button
                      type="button"
                      className="text-base font-bold text-[var(--primary)] hover:underline text-start truncate"
                      onClick={(e) => openMenu(e, s)}
                    >
                      {s.full_name}
                    </button>
                    <p className="text-sm text-[var(--text-muted)] mt-1">
                      #{(page - 1) * pageSize + i + 1} • {s.class_name} • {s.section || t("noSection")}
                    </p>
                  </div>
                  <Badge variant={statusVariantMap[s.status] || "neutral"} size="sm">
                    {commonT(`studentStatus.${s.status}`)}
                  </Badge>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("phone")}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-1">
                      {s.phone || "—"}
                    </p>
                  </div>
                  <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("paid")}</p>
                    <p className="text-sm font-semibold text-[var(--success)] mt-1">
                      {commonT("currency")} {formatNumber(s.paid_fee)}
                    </p>
                  </div>
                  <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("balance")}</p>
                    <p
                      className={cn(
                        "text-sm font-semibold mt-1",
                        s.remaining_fee > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                      )}
                    >
                      {commonT("currency")} {formatNumber(s.remaining_fee)}
                    </p>
                  </div>
                  <div className="bg-[var(--surface-soft)] rounded-[var(--radius-md)] p-3">
                    <p className="text-xs text-[var(--text-muted)]">{t("address")}</p>
                    <p className="text-sm font-semibold text-[var(--text-primary)] mt-1 truncate">
                      {s.address || "—"}
                    </p>
                  </div>
                </div>

                {actions.length > 0 && (
                  <Button
                    variant="outline"
                    size="sm"
                    className="w-full mt-4"
                    onClick={(e) => openMenu(e, s)}
                  >
                    {t("studentOptions")}
                  </Button>
                )}
              </CardContent>
            </Card>
          );
        })}
      </div>

      {/* Desktop Table View */}
      <div className="hidden md:block overflow-x-auto rounded-[var(--card-radius)] border border-[var(--card-border)] bg-[var(--card-bg)]">
        <table className="w-full">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--surface-soft)]">
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                #
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("name")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("class")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("section")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("address")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("phone")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("fees")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("paid")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("balance")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("status")}
              </th>
              <th className="px-4 py-3 text-start text-xs font-semibold text-[var(--text-muted)] uppercase tracking-wider">
                {t("actions")}
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--border)]">
            {pagedStudents.map((s, i) => {
              const actions = getActions(s);
              return (
                <tr
                  key={s.id}
                  className="hover:bg-[var(--surface-hover)] transition-colors"
                >
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {(page - 1) * pageSize + i + 1}
                  </td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      className="text-sm font-semibold text-[var(--primary)] hover:underline text-start"
                      onClick={(e) => openMenu(e, s)}
                    >
                      {s.full_name}
                    </button>
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                    {s.class_name}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {s.section || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {s.address || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-muted)]">
                    {s.phone || "—"}
                  </td>
                  <td className="px-4 py-3 text-sm text-[var(--text-primary)]">
                    {commonT("currency")} {formatNumber(s.total_fee)}
                  </td>
                  <td className="px-4 py-3 text-sm font-semibold text-[var(--success)]">
                    {commonT("currency")} {formatNumber(s.paid_fee)}
                  </td>
                  <td
                    className={cn(
                      "px-4 py-3 text-sm font-semibold",
                      s.remaining_fee > 0 ? "text-[var(--danger)]" : "text-[var(--success)]"
                    )}
                  >
                    {commonT("currency")} {formatNumber(s.remaining_fee)}
                  </td>
                  <td className="px-4 py-3">
                    <Badge variant={statusVariantMap[s.status] || "neutral"} size="sm">
                      {commonT(`studentStatus.${s.status}`)}
                    </Badge>
                  </td>
                  <td className="px-4 py-3">
                    {actions.length > 0 && (
                      <IconButton
                        variant="ghost"
                        size="sm"
                        aria-label={t("options")}
                        onClick={(e) => openMenu(e, s)}
                      >
                        <MoreHorizontal className="h-4 w-4" />
                      </IconButton>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
          <p className="text-sm text-[var(--text-muted)]">
            {t("pagination.info", { count: totalCount })}
          </p>
          <Pagination
            currentPage={page}
            totalPages={totalPages}
            onPageChange={onPageChange}
          />
        </div>
      )}
    </div>
  );
}
