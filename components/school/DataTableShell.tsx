"use client";

import { TableSkeleton } from "@/components/skeleton";
import { ListPagination } from "@/components/school/ListPagination";

export function DataTableShell({
  loading,
  error,
  empty,
  emptyMessage = "لا توجد بيانات",
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
  children: React.ReactNode;
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (p: number) => void;
}) {
  if (error) {
    return <div className="err">{error}</div>;
  }
  if (loading) {
    return <TableSkeleton rows={6} cols={6} />;
  }
  if (empty) {
    return <div className="empty">{emptyMessage}</div>;
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
