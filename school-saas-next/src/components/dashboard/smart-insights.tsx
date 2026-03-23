"use client";

import clsx from "clsx";
import { ArrowDownRight, ArrowRight, ArrowUpRight, Brain } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import type { SmartInsight } from "@/lib/types";

interface SmartInsightsProps {
  insights: SmartInsight[];
}

export function SmartInsights({ insights }: SmartInsightsProps) {
  const { t } = useLanguage();

  return (
    <section className="rounded-2xl border border-sky-200/70 bg-gradient-to-br from-sky-100 via-cyan-50 to-emerald-50 p-5 dark:border-sky-900/30 dark:from-slate-900 dark:via-slate-900 dark:to-sky-950/30">
      <div className="mb-4 flex items-center gap-2 text-slate-900 dark:text-slate-100">
        <Brain className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h2 className="text-lg font-semibold">{t.superAdmin.insights.title}</h2>
      </div>

      <div className="grid gap-3 md:grid-cols-2">
        {insights.map((insight) => (
          <div
            key={insight.id}
            className="rounded-xl border border-white/60 bg-white/80 p-4 backdrop-blur dark:border-slate-700 dark:bg-slate-900/70"
          >
            <div className="flex items-center justify-between gap-3">
              <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{insight.title}</p>
              <span
                className={clsx(
                  "inline-flex rounded-full p-1",
                  insight.trend === "up" && "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/40 dark:text-emerald-300",
                  insight.trend === "down" && "bg-rose-100 text-rose-700 dark:bg-rose-900/40 dark:text-rose-300",
                  insight.trend === "neutral" && "bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300",
                )}
              >
                {insight.trend === "up" && <ArrowUpRight className="h-4 w-4" />}
                {insight.trend === "down" && <ArrowDownRight className="h-4 w-4" />}
                {insight.trend === "neutral" && <ArrowRight className="h-4 w-4" />}
              </span>
            </div>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-300">{insight.detail}</p>
          </div>
        ))}
      </div>
    </section>
  );
}
