"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { Search } from "lucide-react";

interface PaymentsToolbarProps {
  searchInput: string;
  setSearchInput: (value: string) => void;
  totalCount: number;
  loading: boolean;
}

export function PaymentsToolbar({ searchInput, setSearchInput, totalCount, loading }: PaymentsToolbarProps) {
  const t = useTranslations();

  return (
    <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
      {/* Search input with icon */}
      <div className="relative w-full flex-1 sm:max-w-md">
        <Search
          size={15}
          className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)] pointer-events-none"
        />
        <input
          placeholder={t("payments.toolbar.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] ps-9 pe-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition"
        />
      </div>

      {/* Results count */}
      <span className="text-sm text-[var(--text-muted)] font-medium sm:text-end">
        {loading
          ? t("payments.toolbar.loadingResults")
          : t("payments.toolbar.resultsCount", { count: formatNumber(totalCount) })}
      </span>
    </div>
  );
}
