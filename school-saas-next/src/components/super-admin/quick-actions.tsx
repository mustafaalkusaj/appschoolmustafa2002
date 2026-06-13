"use client";

import { School, Users, FileText } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";

interface QuickActionsProps {
  onAddSchool: () => void;
  onAddUser: () => void;
  onGenerateReport: () => void;
}

export function QuickActions({ onAddSchool, onAddUser, onGenerateReport }: QuickActionsProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.quickActions.title}</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        <button
          type="button"
          onClick={onAddSchool}
          className="inline-flex items-center gap-2 rounded-xl bg-sky-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-sky-500"
        >
          <School className="h-4 w-4" />
          {t.superAdmin.quickActions.addSchool}
        </button>
        <button
          type="button"
          onClick={onAddUser}
          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-3 py-2 text-sm font-semibold text-white transition hover:bg-emerald-500"
        >
          <Users className="h-4 w-4" />
          {t.superAdmin.quickActions.addUser}
        </button>
        <button
          type="button"
          onClick={onGenerateReport}
          className="inline-flex items-center gap-2 rounded-xl bg-amber-500 px-3 py-2 text-sm font-semibold text-white transition hover:bg-amber-400"
        >
          <FileText className="h-4 w-4" />
          {t.superAdmin.quickActions.viewReport}
        </button>
      </div>
      <p className="mt-3 text-xs text-slate-500 dark:text-slate-400">
        {t.superAdmin.quickActions.description}
      </p>
    </section>
  );
}
