"use client";

import { History } from "lucide-react";

import { formatUtcDateTime } from "@/lib/date";
import { useLanguage } from "@/hooks/useLanguage";
import { getAuditActionLabel, getEntityLabel } from "@/lib/i18n";
import type { AuditLogEntry } from "@/lib/types";

interface AuditLogPanelProps {
  auditLogs: AuditLogEntry[];
}

export function AuditLogPanel({ auditLogs }: AuditLogPanelProps) {
  const { language, t } = useLanguage();

  return (
    <section className="rounded-2xl border border-slate-200/80 bg-white/90 p-5 dark:border-slate-800 dark:bg-slate-900/70">
      <div className="mb-4 flex items-center gap-2">
        <History className="h-5 w-5 text-sky-600 dark:text-sky-400" />
        <h2 className="text-sm font-semibold text-slate-800 dark:text-slate-100">{t.superAdmin.audit.title}</h2>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-start text-sm">
          <thead>
            <tr className="text-slate-500 dark:text-slate-400">
              <th className="pb-2 pe-3 font-medium">{t.common.actor}</th>
              <th className="pb-2 pe-3 font-medium">{t.common.action}</th>
              <th className="pb-2 pe-3 font-medium">{t.common.entity}</th>
              <th className="pb-2 font-medium">{t.common.date}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200 dark:divide-slate-800">
            {auditLogs.slice(0, 10).map((entry) => (
              <tr key={entry.id}>
                <td className="py-2 pe-3 text-slate-700 dark:text-slate-200">
                  {entry.actorId === "system" ? getEntityLabel("system", language) : entry.actorName}
                </td>
                <td className="py-2 pe-3 text-slate-700 dark:text-slate-200">
                  {getAuditActionLabel(entry.action, language)}
                </td>
                <td className="py-2 pe-3 text-slate-600 dark:text-slate-300">
                  {getEntityLabel(entry.entity, language)}
                </td>
                <td className="py-2 text-slate-500 dark:text-slate-400">
                  {formatUtcDateTime(entry.createdAt, language)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </section>
  );
}
