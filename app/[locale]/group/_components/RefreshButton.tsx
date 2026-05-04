"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";

export function RefreshButton({ locale }: { locale: "ar" | "en" }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleRefresh = async () => {
    setIsLoading(true);
    try {
      router.refresh();
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <button
      onClick={handleRefresh}
      disabled={isLoading}
      className="inline-flex items-center gap-2 rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-2 text-sm font-black transition hover:bg-[var(--surface)] disabled:opacity-60"
      title={locale === "ar" ? "تحديث البيانات" : "Refresh data"}
    >
      <svg
        className={`h-4 w-4 transition ${isLoading ? "animate-spin" : ""}`}
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeWidth={2}
          d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
        />
      </svg>
      {locale === "ar" ? "تحديث" : "Refresh"}
    </button>
  );
}
