"use client";

import { useMemo, useState } from "react";

import { Archive, Ban, CheckCircle2, Undo2 } from "lucide-react";

import { useLanguage } from "@/hooks/useLanguage";
import { formatDaysRemaining, formatNumber } from "@/lib/i18n";
import { daysUntil } from "@/lib/saas";
import type { School } from "@/lib/types";

import { StatusPill } from "@/components/shared/status-pill";

interface SchoolsTableProps {
  schools: School[];
  onToggleStatus: (schoolId: string) => void;
  onArchive: (schoolId: string) => void;
  onRestore: (schoolId: string) => void;
}

export function SchoolsTable({ schools, onToggleStatus, onArchive, onRestore }: SchoolsTableProps) {
  const { language, t } = useLanguage();
  const [showArchived, setShowArchived] = useState(false);

  const visibleSchools = useMemo(
    () => schools.filter((school) => (showArchived ? true : !school.deletedAt)),
    [schools, showArchived],
  );

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center justify-between gap-3">
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.schools.title}</h2>
        <label className="inline-flex items-center gap-2 text-sm text-slate-600 dark:text-slate-300">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
            className="h-4 w-4 rounded border-slate-300 text-sky-600"
          />
          {t.superAdmin.schools.showArchived}
        </label>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.schools.school}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.schools.status}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.schools.students}</th>
              <th className="pb-2 pe-3 font-medium">{t.superAdmin.schools.expiry}</th>
              <th className="pb-2 font-medium">{t.superAdmin.schools.action}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {visibleSchools.map((school) => {
              const remaining = daysUntil(school.subscription.expiresAt);
              const status = formatDaysRemaining(remaining, language);

              return (
                <tr key={school.id}>
                  <td className="py-3 pe-3">
                    <p className="font-medium text-slate-800 dark:text-slate-100">{school.name}</p>
                    <p className="text-xs text-slate-500 dark:text-slate-400">{school.code}</p>
                  </td>
                  <td className="py-3 pe-3">
                    <StatusPill status={school.deletedAt ? "archived" : school.status} />
                  </td>
                  <td className="py-3 pe-3 text-slate-700 dark:text-slate-200">
                    {formatNumber(school.studentCount, language)}
                  </td>
                  <td className="py-3 pe-3 text-slate-700 dark:text-slate-200">{status}</td>
                  <td className="py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      {school.deletedAt ? (
                        <button
                          type="button"
                          onClick={() => onRestore(school.id)}
                          className="inline-flex items-center gap-1 rounded-lg border border-emerald-300 px-2 py-1 text-xs font-semibold text-emerald-700 hover:border-emerald-400 dark:border-emerald-800 dark:text-emerald-300"
                        >
                          <Undo2 className="h-3.5 w-3.5" />
                          {t.common.restore}
                        </button>
                      ) : (
                        <>
                          <button
                            type="button"
                            onClick={() => onToggleStatus(school.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-700 hover:border-slate-400 dark:border-slate-700 dark:text-slate-200"
                          >
                            {school.status === "active" ? (
                              <>
                                <Ban className="h-3.5 w-3.5" />
                                {t.common.suspend}
                              </>
                            ) : (
                              <>
                                <CheckCircle2 className="h-3.5 w-3.5" />
                                {t.common.activate}
                              </>
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => onArchive(school.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-300 px-2 py-1 text-xs font-semibold text-rose-700 hover:border-rose-400 dark:border-rose-800 dark:text-rose-300"
                          >
                            <Archive className="h-3.5 w-3.5" />
                            {t.common.archive}
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </section>
  );
}
