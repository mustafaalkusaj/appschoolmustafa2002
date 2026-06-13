"use client";

import { useEffect } from "react";

export default function IncomesError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("[IncomesPage] Error:", error);
  }, [error]);

  return (
    <div className="flex min-h-screen items-center justify-center bg-[var(--surface-muted)] p-8">
      <div className="max-w-md rounded-3xl border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg text-center space-y-4">
        <h2 className="text-xl font-black text-[var(--danger)]">حدث خطأ غير متوقع</h2>
        <p className="text-sm text-[var(--text-secondary)]">
          {error.message || "تعذر تحميل صفحة الإيرادات."}
        </p>
        <button
          onClick={reset}
          className="h-10 px-6 rounded-xl bg-[var(--primary)] text-white text-xs font-black shadow-lg"
        >
          إعادة المحاولة
        </button>
      </div>
    </div>
  );
}
