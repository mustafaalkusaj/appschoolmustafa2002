"use client";

import { getLocaleFromPath } from "@/lib/locale-routing";
import { TableSkeleton } from "@/components/skeleton";
import { ListPagination } from "@/components/school/ListPagination";
import { usePathname } from "next/navigation";

export function DataTableShell({
  loading,
  error,
  empty,
  emptyMessage = "لا توجد بيانات",
  emptyDetail,
  emptyIcon = "📭",
  emptyAction,
  onRetry,
  children,
  page,
  pageSize,
  totalCount,
  onPageChange,
}: {
  loading: boolean;
  error: string | null;
  empty: boolean;
  emptyMessage?: string;
  emptyDetail?: string;
  emptyIcon?: string;
  emptyAction?: React.ReactNode;
  onRetry?: () => void;
  children: React.ReactNode;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (p: number) => void;
}) {
  const locale = getLocaleFromPath(usePathname()) as "ar" | "en";
  const retryLabel = locale === "en" ? "Try again" : "إعادة المحاولة";
  const resolvedEmptyMessage =
    emptyMessage === "لا توجد بيانات" && locale === "en" ? "No data available" : emptyMessage;

  if (error) {
    return (
      <div
        className="err"
        style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: ".6rem" }}
      >
        <span>{error}</span>
        {onRetry ? (
          <button
            type="button"
            onClick={onRetry}
            style={{
              flexShrink: 0,
              padding: ".28rem .75rem",
              borderRadius: 7,
              border: "1px solid currentColor",
              background: "transparent",
              color: "inherit",
              fontFamily: "inherit",
              fontSize: ".76rem",
              fontWeight: 700,
              cursor: "pointer",
              opacity: 0.82,
            }}
          >
            {retryLabel}
          </button>
        ) : null}
      </div>
    );
  }
  if (loading) {
    return <TableSkeleton rows={6} cols={6} />;
  }
  if (empty) {
    return (
      <div
        className="empty"
        style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: ".5rem" }}
      >
        <div style={{ fontSize: "2rem", lineHeight: 1 }}>{emptyIcon}</div>
        <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>{resolvedEmptyMessage}</div>
        {emptyDetail ? (
          <div style={{ fontSize: ".78rem", color: "var(--text-tertiary)", maxWidth: 280, textAlign: "center" }}>
            {emptyDetail}
          </div>
        ) : null}
        {emptyAction ? <div style={{ marginTop: ".5rem" }}>{emptyAction}</div> : null}
      </div>
    );
  }
  return (
    <>
      <div className="tbl-wrap">{children}</div>
      <ListPagination
        page={page}
        pageSize={pageSize}
        totalCount={totalCount}
        onPageChange={onPageChange}
      />
    </>
  );
}
