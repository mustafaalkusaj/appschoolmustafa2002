"use client";

import { useTranslations } from "next-intl";
import { formatNumber } from "@/lib/formatting";
import { Input } from "@/components/ui/input";
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
      <div className="relative flex-1 max-w-md">
        <Search className="absolute start-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[var(--text-tertiary)] pointer-events-none" />
        <Input
          placeholder={t("payments.toolbar.searchPlaceholder")}
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          className="ps-10"
        />
      </div>
      
      {/* Results count */}
      <span className="text-sm text-[var(--text-muted)] font-medium">
        {loading
          ? t("payments.toolbar.loadingResults")
          : t("payments.toolbar.resultsCount", { count: formatNumber(totalCount) })}
      </span>
    </div>
  );
}
