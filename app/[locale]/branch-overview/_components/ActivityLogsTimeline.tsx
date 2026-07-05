"use client";

import {
  Plus,
  Pencil,
  Trash2,
  KeyRound,
  Upload,
  RefreshCw,
  ClipboardList,
} from "@/lib/icons";

export type ActivityLog = {
  id: string;
  created_at: string;
  actor_name: string | null;
  actor_role: string | null;
  action_type: string;
  entity_type: string | null;
  entity_id: string | null;
  summary: string | null;
};

interface ActivityLogsTimelineProps {
  isEn: boolean;
  activityLogs: ActivityLog[];
  activityLoading: boolean;
  activityLoaded: boolean;
  onRefresh: () => void;
}

export function ActivityLogsTimeline({
  isEn,
  activityLogs,
  activityLoading,
  activityLoaded,
  onRefresh,
}: ActivityLogsTimelineProps) {
  return (
    <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
      <div className="px-5 py-4 border-b border-[var(--border)] flex items-center justify-between gap-3">
        <div className="flex items-center gap-2.5">
          <span
            className="w-8 h-8 rounded-xl flex items-center justify-center shrink-0"
            style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
          >
            <ClipboardList size={16} />
          </span>
          <div>
            <h3 className="text-sm font-black text-[var(--text-primary)]">
              {isEn ? "Operation Logs" : "سجل العمليات"}
            </h3>
            <p className="text-[11px] text-[var(--text-muted)]">
              {isEn ? "Who did what in this branch" : "ما فعله مستخدمو الفرع"}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          {activityLogs.length > 0 && (
            <span
              className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] font-black"
              style={{ background: "color-mix(in srgb, var(--primary) 12%, transparent)", color: "var(--primary)" }}
            >
              {activityLogs.length}
            </span>
          )}
          <button
            onClick={onRefresh}
            disabled={activityLoading}
            className="w-8 h-8 rounded-lg flex items-center justify-center transition-colors hover:bg-[var(--surface-soft)] disabled:opacity-40"
            style={{ color: "var(--text-muted)" }}
            title={isEn ? "Refresh" : "تحديث"}
          >
            <RefreshCw size={14} className={activityLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {activityLoading && !activityLoaded ? (
        <div className="divide-y divide-[var(--border)]">
          {Array.from({ length: 5 }).map((_, i) => (
            <div key={i} className="px-5 py-3.5 flex items-center gap-3 animate-pulse">
              <div className="w-7 h-7 rounded-lg bg-[var(--surface-soft)] shrink-0" />
              <div className="flex-1 space-y-1.5">
                <div className="h-3 bg-[var(--surface-soft)] rounded w-1/3" />
                <div className="h-2.5 bg-[var(--surface-soft)] rounded w-2/3" />
              </div>
              <div className="h-2.5 bg-[var(--surface-soft)] rounded w-16 shrink-0" />
            </div>
          ))}
        </div>
      ) : activityLoaded && activityLogs.length === 0 ? (
        <div className="px-5 py-10 text-center">
          <ClipboardList size={28} className="mx-auto mb-2 opacity-30" style={{ color: "var(--text-muted)" }} />
          <p className="text-sm text-[var(--text-muted)]">
            {isEn ? "No operations recorded yet" : "لا توجد عمليات مسجلة بعد"}
          </p>
        </div>
      ) : (
        <div className="relative px-5 py-2">
          {/* Timeline spine */}
          <div
            className="absolute top-0 bottom-0 start-[34px] w-px"
            style={{ background: "var(--border)" }}
          />
          <div className="divide-y divide-[var(--border)]">
          {activityLogs.map((log, i) => {
            const actionConfig: Record<string, { icon: React.ReactNode; color: string; label: string; labelEn: string }> = {
              create: { icon: <Plus size={13} />, color: "var(--success)", label: "إضافة", labelEn: "Create" },
              insert: { icon: <Plus size={13} />, color: "var(--success)", label: "إضافة", labelEn: "Insert" },
              update: { icon: <Pencil size={13} />, color: "var(--primary)", label: "تعديل", labelEn: "Update" },
              edit: { icon: <Pencil size={13} />, color: "var(--primary)", label: "تعديل", labelEn: "Edit" },
              delete: { icon: <Trash2 size={13} />, color: "var(--danger)", label: "حذف", labelEn: "Delete" },
              login: { icon: <KeyRound size={13} />, color: "var(--text-muted)", label: "تسجيل دخول", labelEn: "Login" },
              export: { icon: <Upload size={13} />, color: "#f97316", label: "تصدير", labelEn: "Export" },
            };
            const actionKey = log.action_type?.toLowerCase() ?? "";
            const cfg = actionConfig[actionKey] ?? { icon: <ClipboardList size={13} />, color: "var(--text-muted)", label: log.action_type, labelEn: log.action_type };

            const entityLabels: Record<string, { ar: string; en: string }> = {
              student: { ar: "طالب", en: "Student" },
              payment: { ar: "دفعة", en: "Payment" },
              expense: { ar: "مصروف", en: "Expense" },
              income: { ar: "إيراد", en: "Income" },
              teacher: { ar: "أستاذ", en: "Teacher" },
              class: { ar: "صف", en: "Class" },
              user: { ar: "مستخدم", en: "User" },
            };
            const entityKey = log.entity_type?.toLowerCase() ?? "";
            const entityLabel = entityLabels[entityKey]
              ? (isEn ? entityLabels[entityKey].en : entityLabels[entityKey].ar)
              : log.entity_type ?? "";

            const roleColors: Record<string, string> = {
              admin: "#8b5cf6",
              super_admin: "#ef4444",
              employee: "#3b82f6",
            };
            const roleColor = roleColors[log.actor_role ?? ""] ?? "var(--text-muted)";
            const roleLabel = log.actor_role === "admin"
              ? (isEn ? "Admin" : "مدير")
              : log.actor_role === "super_admin"
                ? (isEn ? "Super Admin" : "مدير عام")
                : log.actor_role === "employee"
                  ? (isEn ? "Employee" : "موظف")
                  : log.actor_role ?? "";

            const now = Date.now();
            const ts = new Date(log.created_at).getTime();
            const diff = Math.floor((now - ts) / 1000);
            const relativeTime = diff < 60
              ? (isEn ? `${diff}s ago` : `منذ ${diff} ث`)
              : diff < 3600
                ? (isEn ? `${Math.floor(diff / 60)}m ago` : `منذ ${Math.floor(diff / 60)} د`)
                : diff < 86400
                  ? (isEn ? `${Math.floor(diff / 3600)}h ago` : `منذ ${Math.floor(diff / 3600)} س`)
                  : new Date(log.created_at).toLocaleDateString(isEn ? "en-US" : "ar-IQ");

            return (
              <div
                key={log.id}
                className="relative py-3 flex items-start gap-3 hover:bg-[var(--surface-soft)] transition-colors rounded-lg"
                style={{ background: i % 2 === 0 ? undefined : "color-mix(in srgb, var(--surface-soft) 40%, transparent)" }}
              >
                {/* Action icon (timeline node) */}
                <span
                  className="relative z-10 w-7 h-7 rounded-full flex items-center justify-center shrink-0 mt-0.5 ring-4"
                  style={{
                    background: cfg.color,
                    color: "white",
                    boxShadow: `0 0 0 4px var(--card-bg)`,
                  }}
                >
                  {cfg.icon}
                </span>

                {/* Main content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center flex-wrap gap-1.5 mb-0.5">
                    {/* Actor name */}
                    <span className="text-sm font-bold text-[var(--text-primary)] truncate">
                      {log.actor_name ?? (isEn ? "Unknown" : "غير معروف")}
                    </span>
                    {/* Role badge */}
                    {roleLabel && (
                      <span
                        className="inline-flex items-center px-1.5 py-px rounded text-[10px] font-black"
                        style={{
                          background: `color-mix(in srgb, ${roleColor} 12%, transparent)`,
                          color: roleColor,
                        }}
                      >
                        {roleLabel}
                      </span>
                    )}
                    {/* Action label */}
                    <span
                      className="inline-flex items-center gap-0.5 px-1.5 py-px rounded text-[10px] font-black"
                      style={{
                        background: `color-mix(in srgb, ${cfg.color} 10%, transparent)`,
                        color: cfg.color,
                      }}
                    >
                      {isEn ? cfg.labelEn : cfg.label}
                    </span>
                    {/* Entity label */}
                    {entityLabel && (
                      <span className="text-[11px] text-[var(--text-muted)]">
                        {entityLabel}
                      </span>
                    )}
                  </div>
                  {log.summary && (
                    <p className="text-xs text-[var(--text-secondary)] truncate">{log.summary}</p>
                  )}
                </div>

                {/* Time */}
                <span
                  className="text-[11px] text-[var(--text-muted)] shrink-0 mt-0.5 tabular-nums"
                  title={new Date(log.created_at).toLocaleString(isEn ? "en-US" : "ar-IQ")}
                >
                  {relativeTime}
                </span>
              </div>
            );
          })}
          </div>
        </div>
      )}
    </div>
  );
}
