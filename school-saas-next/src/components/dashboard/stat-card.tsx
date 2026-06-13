import type { ReactNode } from "react";

interface StatCardProps {
  title: string;
  value: string;
  icon: ReactNode;
  subtitle: string;
}

export function StatCard({ title, value, icon, subtitle }: StatCardProps) {
  return (
    <div className="group rounded-2xl border border-slate-200/80 bg-white/90 p-5 shadow-sm transition hover:-translate-y-1 hover:shadow-lg dark:border-slate-800 dark:bg-slate-900/70">
      <div className="flex items-center justify-between">
        <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{title}</p>
        <div className="rounded-xl bg-sky-100 p-2 text-sky-700 dark:bg-sky-900/40 dark:text-sky-300">{icon}</div>
      </div>
      <p className="mt-3 text-3xl font-semibold tracking-tight text-slate-900 dark:text-slate-50">{value}</p>
      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{subtitle}</p>
    </div>
  );
}
