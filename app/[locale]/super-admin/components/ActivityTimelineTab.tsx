"use client";

import { useCallback, useEffect, useState } from "react";
import { RefreshCw, Search, Loader2, Activity, User } from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface ActivityLog {
  id: string;
  action: string;
  target: string;
  targetName: string;
  actor: string;
  timestamp: string;
  details: string;
}

const ACTION_COLORS: Record<string, string> = {
  create:  "bg-emerald-500/10 text-emerald-700 border-emerald-500/20",
  update:  "bg-sky-500/10 text-sky-700 border-sky-500/20",
  delete:  "bg-red-500/10 text-red-700 border-red-500/20",
  login:   "bg-violet-500/10 text-violet-700 border-violet-500/20",
  logout:  "bg-gray-500/10 text-gray-600 border-gray-400/20",
  archive: "bg-amber-500/10 text-amber-700 border-amber-500/20",
};

const ACTION_LABELS: Record<string, string> = {
  create:  "إنشاء",
  update:  "تعديل",
  delete:  "حذف",
  login:   "دخول",
  logout:  "خروج",
  archive: "أرشفة",
};

function fmt(ts: string) {
  try {
    return new Date(ts).toLocaleString("ar-IQ-u-nu-latn", {
      timeZone: "Asia/Baghdad",
      day: "2-digit",
      month: "short",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function ActionBadge({ action }: { action: string }) {
  const cls = ACTION_COLORS[action] ?? "bg-[var(--surface-muted)] text-[var(--text-muted)] border-[var(--border)]";
  return (
    <span className={`inline-flex items-center rounded border px-1.5 py-0.5 text-[9px] font-black ${cls}`}>
      {ACTION_LABELS[action] ?? action}
    </span>
  );
}

export function ActivityTimelineTab() {
  const [logs, setLogs] = useState<ActivityLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [actionFilter, setActionFilter] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const fetchLogs = useCallback(async (silent = false) => {
    if (!silent) setLoading(true);
    else setRefreshing(true);
    setError(null);
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        logs?: ActivityLog[];
        error?: { message?: string };
      }>("/api/web/super-admin/activity-logs");
      if (!response.ok) {
        setError(payload?.error?.message ?? "تعذر تحميل السجل.");
      } else {
        setLogs(payload?.logs ?? []);
      }
    } catch {
      setError("تعذر الاتصال بالخادم.");
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, []);

  useEffect(() => { void fetchLogs(); }, [fetchLogs]);

  const filtered = logs.filter((log) => {
    if (actionFilter && log.action !== actionFilter) return false;
    if (!query) return true;
    const q = query.toLowerCase();
    return (
      log.actor.toLowerCase().includes(q) ||
      log.target.toLowerCase().includes(q) ||
      log.targetName.toLowerCase().includes(q) ||
      log.details.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-3">
      {/* Header */}
      <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
        <Activity size={13} className="text-[var(--text-muted)]" />
        <span className="text-xs font-black text-[var(--text-primary)]">
          سجل النشاط ({filtered.length})
        </span>
        <div className="ms-auto flex items-center gap-2">
          {/* Action filter */}
          <select
            value={actionFilter}
            onChange={(e) => setActionFilter(e.target.value)}
            className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-[11px] text-[var(--text-secondary)] outline-none"
          >
            <option value="">كل الإجراءات</option>
            {Object.entries(ACTION_LABELS).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
          {/* Search */}
          <div className="relative">
            <Search size={11} className="absolute start-2 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="بحث..."
              className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-6 pe-2 text-[11px] outline-none focus:border-[var(--primary)] w-28"
            />
          </div>
          {/* Refresh */}
          <button
            onClick={() => void fetchLogs(true)}
            disabled={refreshing}
            className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)] disabled:opacity-50"
          >
            <RefreshCw size={11} className={refreshing ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={24} className="animate-spin text-[var(--primary)] opacity-40" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-xs font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : filtered.length === 0 ? (
        <p className="py-8 text-center text-xs text-[var(--text-muted)]">
          {query || actionFilter ? "لا توجد نتائج مطابقة." : "لا يوجد سجل نشاط بعد."}
        </p>
      ) : (
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <div className="max-h-[60dvh] overflow-y-auto">
            <table className="ui-table">
              <thead>
                <tr>
                  <th>الإجراء</th>
                  <th>المنفذ</th>
                  <th>الهدف</th>
                  <th>التفاصيل</th>
                  <th>التوقيت</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((log) => (
                  <tr key={log.id}>
                    <td><ActionBadge action={log.action} /></td>
                    <td>
                      <div className="flex items-center gap-1">
                        <User size={10} className="text-[var(--text-muted)] shrink-0" />
                        <span className="text-xs font-bold text-[var(--text-primary)] max-w-[100px] truncate">
                          {log.actor}
                        </span>
                      </div>
                    </td>
                    <td>
                      <div>
                        <span className="text-[10px] font-black text-[var(--text-secondary)]">{log.target}</span>
                        {log.targetName && log.targetName !== "unknown" && (
                          <div className="text-[10px] text-[var(--text-muted)] max-w-[120px] truncate">{log.targetName}</div>
                        )}
                      </div>
                    </td>
                    <td className="max-w-[160px]">
                      <span className="text-[10px] text-[var(--text-muted)] line-clamp-2">{log.details}</span>
                    </td>
                    <td className="whitespace-nowrap text-[10px] text-[var(--text-muted)]">
                      {fmt(log.timestamp)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
