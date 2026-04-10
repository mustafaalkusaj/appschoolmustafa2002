"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { useEffect } from "react";

/**
 * Locale-level error boundary.
 * Catches unhandled errors thrown inside any page under app/[locale]/.
 * Rendered only on the client — must be a Client Component.
 */
export default function LocaleError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    // TODO: forward to a monitoring service (e.g. Sentry) in production
    console.error("[LocaleError]", error);
  }, [error]);

  return (
    <div
      className="flex min-h-screen flex-col items-center justify-center gap-6 p-6 text-center"
      dir="rtl"
    >
      <div
        className="flex h-16 w-16 items-center justify-center rounded-full bg-red-100 text-2xl text-red-600"
        aria-hidden="true"
      >
        ⚠
      </div>

      <div className="max-w-sm">
        <h1 className="mb-2 text-xl font-semibold text-[var(--text-primary)]">
          حدث خطأ غير متوقع
        </h1>
        <p className="text-sm leading-relaxed text-[var(--text-secondary)]">
          نعتذر عن هذا الخطأ. يمكنك المحاولة مجدداً أو العودة للصفحة الرئيسية.
        </p>
        {error.digest && (
          <p className="mt-2 font-mono text-xs text-[var(--text-muted)]">
            رمز الخطأ: {error.digest}
          </p>
        )}
      </div>

      <div className="flex gap-3">
        <button
          type="button"
          onClick={reset}
          className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-violet-700 focus:outline-none focus:ring-2 focus:ring-violet-500 focus:ring-offset-2"
        >
          حاول مجدداً
        </button>
        <Link
          href={`/${(useParams() as { locale?: string }).locale ?? "ar"}/dashboard`}
          className="rounded-lg border border-[var(--border)] px-4 py-2 text-sm font-medium text-[var(--text-secondary)] transition hover:bg-[var(--surface-hover)] focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:ring-offset-2"
        >
          الصفحة الرئيسية
        </Link>
      </div>
    </div>
  );
}
