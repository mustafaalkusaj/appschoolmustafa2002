"use client";

export function ListPagination({
  page,
  pageSize,
  totalCount,
  onPageChange,
  disabled,
}: {
  page: number;
  pageSize: number;
  totalCount: number;
  onPageChange: (next: number) => void;
  disabled?: boolean;
}) {
  const totalPages = Math.max(1, Math.ceil(totalCount / pageSize));
  const safePage = Math.min(page, totalPages);
  const from = totalCount === 0 ? 0 : (safePage - 1) * pageSize + 1;
  const to = Math.min(totalCount, safePage * pageSize);

  return (
    <div className="pager">
      <span className="pager-info">
        {totalCount === 0 ? "لا توجد نتائج" : `عرض ${from}–${to} من ${totalCount}`}
      </span>
      <button
        type="button"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
      >
        السابق
      </button>
      <span className="pager-info">
        صفحة {safePage} / {totalPages}
      </span>
      <button
        type="button"
        disabled={disabled || safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
      >
        التالي
      </button>
    </div>
  );
}
