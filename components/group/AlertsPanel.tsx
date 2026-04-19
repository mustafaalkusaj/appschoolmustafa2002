"use client";
import { useState } from "react";
import { AlertTriangle, X } from "lucide-react";

interface Alert { id: string; branch_id: string; type: string; message: string; is_read: boolean; created_at: string; }

export function AlertsPanel({ alerts: initial, branchMap, groupId }: { alerts: Alert[]; branchMap: Record<string, string>; groupId: string }) {
  const [alerts, setAlerts] = useState(initial);

  const dismiss = async (id: string) => {
    await fetch(`/api/group/alerts`, { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ id }) });
    setAlerts((prev) => prev.filter((a) => a.id !== id));
  };

  if (alerts.length === 0) return null;

  return (
    <div className="rounded-2xl border border-amber-200 bg-amber-50 dark:bg-amber-900/10 dark:border-amber-800 p-5 print:hidden">
      <div className="flex items-center gap-2 mb-4">
        <AlertTriangle size={18} className="text-amber-600" />
        <h3 className="font-bold text-amber-800 dark:text-amber-400">{alerts.length} تنبيه يحتاج متابعة</h3>
      </div>
      <div className="space-y-3">
        {alerts.map((alert) => (
          <div key={alert.id} className="flex items-start justify-between gap-3 p-3 rounded-xl bg-white dark:bg-[var(--surface-strong)] border border-amber-100 dark:border-amber-800">
            <div>
              <p className="text-sm font-medium text-[var(--text-primary)]">{alert.message}</p>
              <p className="text-xs text-[var(--text-muted)] mt-1">
                {branchMap[alert.branch_id] ?? "فرع"} · {new Date(alert.created_at).toLocaleDateString("ar-IQ")}
              </p>
            </div>
            <button onClick={() => dismiss(alert.id)} className="shrink-0 text-[var(--text-muted)] hover:text-rose-500 transition-colors">
              <X size={16} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
