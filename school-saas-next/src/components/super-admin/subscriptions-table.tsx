"use client";

import { AlertTriangle } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { daysUntil, formatUtcDate } from "@/lib/date";
import { formatDaysRemaining, getPlanLabel } from "@/lib/i18n";
import type { School } from "@/lib/types";

interface SubscriptionsTableProps {
  schools: School[];
}

export function SubscriptionsTable({ schools }: SubscriptionsTableProps) {
  const { language, t } = useLanguage();
  const activeSchools = schools.filter((school) => !school.deletedAt);

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <h2 className="mb-4 text-sm font-semibold text-slate-800 dark:text-slate-100">
        {t.superAdmin.subscriptions.title}
      </h2>
      <div className="space-y-3">
        {activeSchools.map((school) => {
          const remaining = daysUntil(school.subscription.expiresAt);
          const isWarning = remaining >= 0 && remaining <= 7;
          const isExpired = remaining < 0;

          return (
            <article
              key={school.id}
              className="rounded-xl border border-slate-200/70 bg-slate-50 p-3 dark:border-slate-800 dark:bg-slate-950"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-sm font-semibold text-slate-800 dark:text-slate-100">{school.name}</p>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    {t.common.plan}: {getPlanLabel(school.subscription.plan, language)} | {t.common.expires}:{" "}
                    {formatUtcDate(school.subscription.expiresAt, language)}
                  </p>
                </div>
                <div className="flex items-center gap-2 text-xs font-semibold">
                  {(isWarning || isExpired) && <AlertTriangle className="h-4 w-4 text-amber-500" />}
                  <span
                    className={
                      isExpired
                        ? "text-rose-600 dark:text-rose-300"
                        : isWarning
                          ? "text-amber-600 dark:text-amber-300"
                        : "text-emerald-600 dark:text-emerald-300"
                    }
                  >
                    {formatDaysRemaining(remaining, language)}
                  </span>
                </div>
              </div>
            </article>
          );
        })}
      </div>
    </section>
  );
}
