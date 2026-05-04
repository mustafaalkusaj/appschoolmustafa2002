"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Plus,
  Edit2,
  Trash2,
  Shield,
  MessageSquare,
  Activity,
  Search,
  AlertTriangle,
} from "@/lib/icons";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface ActivityLog {
  id: string;
  action: "create" | "update" | "delete" | "toggle" | "message";
  target: "school" | "user" | "subscription";
  targetName: string;
  actor: string;
  timestamp: Date;
  details: string;
}

interface ActivityTimelineTabProps {
  initialLogs?: ActivityLog[];
}

export function ActivityTimelineTab({ initialLogs = [] }: ActivityTimelineTabProps) {
  const [logs, setLogs] = useState<ActivityLog[]>(initialLogs);
  const [searchQuery, setSearchQuery] = useState("");
  const [filterAction, setFilterAction] = useState<string | null>(null);
  const [filterTarget, setFilterTarget] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchLogs = async () => {
      setError(null);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          logs?: Array<{
            id: string;
            action: "create" | "update" | "delete" | "toggle" | "message";
            target: "school" | "user" | "subscription";
            targetName: string;
            actor: string;
            timestamp: string;
            details: string;
          }>;
          error?: { message?: string };
        }>("/api/web/super-admin/activity-logs");

        if (!response.ok) {
          setError(payload?.error?.message || "تعذر تحميل السجلات");
          setLogs([]);
          return;
        }

        if (Array.isArray(payload?.logs)) {
          const parsed = payload.logs
            .map((log) => {
              try {
                const timestamp = typeof log.timestamp === "string" ? new Date(log.timestamp) : new Date();
                if (isNaN(timestamp.getTime())) {
                  return null;
                }
                return {
                  ...log,
                  timestamp,
                };
              } catch {
                return null;
              }
            })
            .filter((log): log is ActivityLog => log !== null);
          setLogs(parsed);
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : "خطأ في الاتصال بالخادم");
        setLogs([]);
      } finally {
        setLoading(false);
      }
    };

    fetchLogs();
    const interval = setInterval(fetchLogs, 60000); // Refresh every 60s
    return () => clearInterval(interval);
  }, []);

  const filteredLogs = useMemo(() => {
    return logs.filter((log) => {
      if (
        searchQuery &&
        !log.targetName.toLowerCase().includes(searchQuery.toLowerCase()) &&
        !log.actor.toLowerCase().includes(searchQuery.toLowerCase())
      ) {
        return false;
      }
      if (filterAction && log.action !== filterAction) return false;
      if (filterTarget && log.target !== filterTarget) return false;
      return true;
    });
  }, [logs, searchQuery, filterAction, filterTarget]);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "create":
        return <Plus size={16} className="text-green-600" />;
      case "update":
        return <Edit2 size={16} className="text-blue-600" />;
      case "delete":
        return <Trash2 size={16} className="text-red-600" />;
      case "toggle":
        return <Shield size={16} className="text-yellow-600" />;
      case "message":
        return <MessageSquare size={16} className="text-purple-600" />;
      default:
        return <Activity size={16} />;
    }
  };

  const getActionLabel = (action: string) => {
    switch (action) {
      case "create":
        return "إنشاء";
      case "update":
        return "تحديث";
      case "delete":
        return "حذف";
      case "toggle":
        return "تفعيل/تعطيل";
      case "message":
        return "رسالة";
      default:
        return action;
    }
  };

  const getTargetLabel = (target: string) => {
    switch (target) {
      case "school":
        return "مدرسة";
      case "user":
        return "مستخدم";
      case "subscription":
        return "اشتراك";
      default:
        return target;
    }
  };

  const actions = ["create", "update", "delete", "toggle", "message"];
  const targets = ["school", "user", "subscription"];

  return (
    <div className="space-y-6 p-6">
      {/* Search and Filters */}
      <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
        <div className="space-y-4">
          {/* Search */}
          <div className="relative">
            <Search className="absolute ltr:left-4 rtl:right-4 top-1/2 -translate-y-1/2 text-[var(--text-tertiary)]" size={18} />
            <input
              type="text"
              placeholder="ابحث عن المدرسة أو المستخدم..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full rounded-[18px] border border-[var(--border)] bg-[var(--surface-muted)] py-3 ltr:pl-12 ltr:pr-4 rtl:pr-12 rtl:pl-4 text-sm outline-none transition focus:border-[var(--primary)]"
            />
          </div>

          {/* Filter Buttons */}
          <div className="flex flex-wrap gap-2">
            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--text-tertiary)]">
                الإجراء:
              </span>
              {actions.map((action) => (
                <button
                  key={action}
                  onClick={() =>
                    setFilterAction(filterAction === action ? null : action)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    filterAction === action
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {getActionLabel(action)}
                </button>
              ))}
            </div>

            <div className="w-full border-t border-[var(--border)]"></div>

            <div className="flex gap-2 flex-wrap">
              <span className="text-xs font-bold text-[var(--text-tertiary)]">
                الهدف:
              </span>
              {targets.map((target) => (
                <button
                  key={target}
                  onClick={() =>
                    setFilterTarget(filterTarget === target ? null : target)
                  }
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    filterTarget === target
                      ? "bg-[var(--primary)] text-white"
                      : "border border-[var(--border)] text-[var(--text-secondary)] hover:bg-[var(--surface-muted)]"
                  }`}
                >
                  {getTargetLabel(target)}
                </button>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Timeline */}
      <div className="space-y-4">
        {loading ? (
          <div className="text-center py-12">
            <div className="mb-4 h-8 w-8 animate-spin rounded-full border-4 border-[var(--primary)] border-t-transparent mx-auto" />
            <p className="text-[var(--text-secondary)]">جاري تحميل السجلات...</p>
          </div>
        ) : error ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 p-6">
            <div className="flex items-start gap-3">
              <AlertTriangle className="mt-1 text-red-600 flex-shrink-0" size={20} />
              <div>
                <h3 className="font-bold text-red-900">{error}</h3>
              </div>
            </div>
          </div>
        ) : filteredLogs.length === 0 ? (
          <div className="text-center py-12">
            <Activity className="mx-auto mb-4 text-[var(--text-tertiary)]" size={32} />
            <p className="text-[var(--text-tertiary)]">لا توجد سجلات نشاط</p>
          </div>
        ) : (
          filteredLogs.map((log, index) => (
            <div key={log.id} className="relative">
              {/* Timeline Line */}
              {index < filteredLogs.length - 1 && (
                <div className="absolute ltr:left-6 rtl:right-6 top-10 w-0.5 h-12 bg-[var(--border)]"></div>
              )}

              {/* Timeline Item */}
              <div className="flex gap-4">
                <div className="mt-1 flex h-12 w-12 flex-shrink-0 items-center justify-center rounded-full border-2 border-[var(--border)] bg-[var(--surface)]">
                  {getActionIcon(log.action)}
                </div>

                <div className="flex-1 rounded-[18px] border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div className="flex items-start justify-between">
                    <div>
                      <p className="font-bold text-[var(--text-primary)]">
                        {getActionLabel(log.action)} {getTargetLabel(log.target)}
                      </p>
                      <p className="mt-1 text-sm font-bold text-[var(--text-secondary)]">
                        {log.targetName}
                      </p>
                      <p className="mt-2 text-xs text-[var(--text-tertiary)]">
                        {log.details}
                      </p>
                    </div>

                    <div className="text-right">
                      <p className="text-xs font-bold text-[var(--text-tertiary)]">
                        {log.actor}
                      </p>
                      <p className="mt-1 text-xs text-[var(--text-tertiary)]">
                        {log.timestamp.toLocaleTimeString("ar-IQ")}
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))
        )}
      </div>

      {/* Summary Stats */}
      {logs.length > 0 && (
        <div className="rounded-[24px] border border-[var(--border)] bg-[var(--surface)] p-6">
          <h3 className="text-lg font-bold text-[var(--text-primary)] mb-4">
            ملخص النشاط
          </h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
            <div className="text-center">
              <p className="text-xs text-[var(--text-tertiary)]">إجمالي</p>
              <p className="text-2xl font-black text-[var(--text-primary)]">
                {logs.length}
              </p>
            </div>
            {actions.map((action) => {
              const count = logs.filter((l) => l.action === action).length;
              return count > 0 ? (
                <div key={action} className="text-center">
                  <p className="text-xs text-[var(--text-tertiary)]">
                    {getActionLabel(action)}
                  </p>
                  <p className="text-2xl font-black text-[var(--text-primary)]">
                    {count}
                  </p>
                </div>
              ) : null;
            })}
          </div>
        </div>
      )}
    </div>
  );
}
