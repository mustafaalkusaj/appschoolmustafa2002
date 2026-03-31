"use client";

function pageWindow(current: number, total: number): Array<number | "…"> {
  if (total <= 7) return Array.from({ length: total }, (_, i) => i + 1);
  const pages: Array<number | "…"> = [];
  // always show first, last, current ±1
  const visible = new Set([1, total, current - 1, current, current + 1].filter(n => n >= 1 && n <= total));
  let prev: number | null = null;
  for (const n of Array.from(visible).sort((a, b) => a - b)) {
    if (prev !== null && n - prev > 1) pages.push("…");
    pages.push(n);
    prev = n;
  }
  return pages;
}

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
  const pages = pageWindow(safePage, totalPages);

  return (
    <div className="pager">
      <span className="pager-info">
        {totalCount === 0 ? "لا توجد نتائج" : `عرض ${from}–${to} من ${totalCount}`}
      </span>

      <button
        type="button"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(1)}
        aria-label="الصفحة الأولى"
        title="الأولى"
      >
        ««
      </button>
      <button
        type="button"
        disabled={disabled || safePage <= 1}
        onClick={() => onPageChange(safePage - 1)}
        aria-label="الصفحة السابقة"
      >
        السابق
      </button>

      {pages.map((p, i) =>
        p === "…" ? (
          <span key={`gap-${i}`} className="pager-info" style={{ padding: "0 .1rem" }}>…</span>
        ) : (
          <button
            key={p}
            type="button"
            disabled={disabled || p === safePage}
            onClick={() => onPageChange(p as number)}
            aria-label={`صفحة ${p}`}
            aria-current={p === safePage ? "page" : undefined}
            style={p === safePage ? {
              background: "linear-gradient(135deg,var(--p3),var(--p2))",
              color: "white",
              borderColor: "transparent",
              fontWeight: 800,
            } : undefined}
          >
            {p}
          </button>
        )
      )}

      <button
        type="button"
        disabled={disabled || safePage >= totalPages}
        onClick={() => onPageChange(safePage + 1)}
        aria-label="الصفحة التالية"
      >
        التالي
      </button>
      <button
        type="button"
        disabled={disabled || safePage >= totalPages}
        onClick={() => onPageChange(totalPages)}
        aria-label="الصفحة الأخيرة"
        title="الأخيرة"
      >
        »»
      </button>
    </div>
  );
}
