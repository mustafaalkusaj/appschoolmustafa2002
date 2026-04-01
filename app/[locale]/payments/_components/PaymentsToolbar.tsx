"use client";

import { formatNumber } from "@/lib/formatting";

interface PaymentsToolbarProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  totalCount: number;
  loading: boolean;
}

export function PaymentsToolbar({ searchInput, setSearchInput, totalCount, loading }: PaymentsToolbarProps) {
  return (
    <div className="toolbar">
      <div className="srch">
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
          <circle cx="11" cy="11" r="8" />
          <line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          placeholder="بحث باسم الطالب أو الصف..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
        />
      </div>
      <span className="results-count">{loading ? "جارٍ التحميل..." : `${formatNumber(totalCount)} نتيجة`}</span>
    </div>
  );
}
