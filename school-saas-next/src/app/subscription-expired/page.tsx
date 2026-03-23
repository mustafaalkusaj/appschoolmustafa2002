"use client";

import Link from "next/link";

import { useLanguage } from "@/hooks/useLanguage";

export default function SubscriptionExpiredPage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-amber-200 bg-amber-50 p-6 text-center dark:border-amber-900/40 dark:bg-amber-950/20">
        <h1 className="text-2xl font-semibold text-amber-900 dark:text-amber-200">
          {t.pages.subscriptionExpired.title}
        </h1>
        <p className="mt-2 text-sm text-amber-800 dark:text-amber-300">{t.pages.subscriptionExpired.description}</p>
        <Link
          href="/login"
          className="mt-4 inline-flex rounded-xl bg-amber-500 px-4 py-2 text-sm font-semibold text-white hover:bg-amber-400"
        >
          {t.common.backToLogin}
        </Link>
      </section>
    </main>
  );
}
