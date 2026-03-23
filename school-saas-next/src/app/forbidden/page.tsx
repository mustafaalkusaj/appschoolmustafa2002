"use client";

import Link from "next/link";

import { useLanguage } from "@/hooks/useLanguage";

export default function ForbiddenPage() {
  const { t } = useLanguage();

  return (
    <main className="flex min-h-screen items-center justify-center bg-slate-100 p-4 dark:bg-slate-950">
      <section className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 text-center dark:border-slate-800 dark:bg-slate-900">
        <h1 className="text-2xl font-semibold text-slate-900 dark:text-slate-100">{t.pages.forbidden.title}</h1>
        <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{t.pages.forbidden.description}</p>
        <Link
          href="/portal"
          className="mt-4 inline-flex rounded-xl bg-sky-600 px-4 py-2 text-sm font-semibold text-white hover:bg-sky-500"
        >
          {t.common.backToDashboard}
        </Link>
      </section>
    </main>
  );
}
