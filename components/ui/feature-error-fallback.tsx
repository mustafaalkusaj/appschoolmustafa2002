"use client";

import { AlertTriangle } from "@/lib/icons";
import { usePathname } from "next/navigation";
import { getLocaleFromPath } from "@/lib/locale-routing";

export function FeatureErrorFallback({
  reset,
  title = "تعذّر تحميل هذه الصفحة",
  description = "حدث خطأ غير متوقع. يمكنك المحاولة مجدداً أو الانتقال لصفحة أخرى.",
}: {
  reset: () => void;
  title?: string;
  description?: string;
}) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-6 px-4 text-center">
      <div className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--danger)]/10">
        <AlertTriangle className="h-7 w-7 text-[var(--danger)]" />
      </div>
      <div className="max-w-sm">
        <h2 className="text-lg font-black text-[var(--text-primary)]">{title}</h2>
        <p className="mt-2 text-sm text-[var(--text-muted)]">{description}</p>
      </div>
      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-full bg-[var(--primary)] px-6 py-2.5 text-sm font-black text-white transition hover:opacity-90"
        >
          إعادة المحاولة
        </button>
        <a
          href={`/${locale}/dashboard`}
          className="rounded-full border border-[var(--primary)] bg-transparent px-6 py-2.5 text-sm font-black text-[var(--primary)] transition hover:bg-[var(--primary)]/5"
        >
          العودة للرئيسية
        </a>
      </div>
    </div>
  );
}
