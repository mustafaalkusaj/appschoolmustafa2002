"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { CreditCard, RefreshCw, History, PencilLine, Loader2 } from "@/lib/icons";
import { DatePicker } from "@/components/ui/date-picker";
import { ModalFrame } from "./ui";
import { formatDate, calculateDaysLeft, isSubscriptionExpired, relationName } from "./utils";
import type { SubscriptionRecord } from "./types";
import { PLAN_LABELS, SUBSCRIPTION_STATUS_LABELS } from "./types";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

interface SubscriptionsTabProps {
  subscriptions: SubscriptionRecord[];
  filteredSubscriptions: SubscriptionRecord[];
  onExtendSubscription: (schoolId: string) => void;
  onEditPlan?: (schoolId: string, plan: string, endDate: string, status: string) => Promise<void>;
  onBulkRenew?: (schoolIds: string[]) => Promise<void>;
}

interface HistoryEntry {
  id: string;
  plan: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  created_at: string | null;
}

// ── Mini progress bar for days remaining ────────────────────────────────────
function DaysBar({ days }: { days: number | null }) {
  if (days === null)
    return <span className="text-[10px] text-[var(--text-muted)]">بلا تاريخ</span>;
  if (days < 0)
    return (
      <span className="text-[10px] font-black text-[var(--danger)]">
        منتهي ({Math.abs(days)} يوم)
      </span>
    );
  const pct = Math.min(100, (days / 365) * 100);
  const color =
    days < 30 ? "bg-[var(--danger)]" : days < 90 ? "bg-[var(--warning)]" : "bg-[var(--success)]";
  const textColor =
    days < 30
      ? "text-[var(--danger)]"
      : days < 90
        ? "text-[var(--warning)]"
        : "text-[var(--success)]";
  return (
    <div className="flex items-center gap-1.5">
      <span className={`text-[10px] font-black ${textColor} w-8 shrink-0`}>{days}</span>
      <div className="w-14 h-1.5 rounded-full bg-[var(--surface-muted)] overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

// ── EditPlanModal ────────────────────────────────────────────────────────────
function EditPlanModal({
  subscription,
  onClose,
  onSave,
}: {
  subscription: SubscriptionRecord;
  onClose: () => void;
  onSave: (plan: string, endDate: string, status: string) => Promise<void>;
}) {
  const [plan, setPlan] = useState<string>(subscription.plan);
  const [endDate, setEndDate] = useState(subscription.end_date ?? "");
  const [status, setStatus] = useState<string>(subscription.status);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSave = useCallback(async () => {
    setSaving(true);
    setError(null);
    try {
      await onSave(plan, endDate, status);
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "تعذر الحفظ.");
    } finally {
      setSaving(false);
    }
  }, [plan, endDate, status, onSave, onClose]);

  const schoolName = relationName(subscription.schools) || "—";

  return (
    <ModalFrame title="تعديل الاشتراك" subtitle={schoolName} onClose={onClose}>
      <div className="space-y-4">
        {error && (
          <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-3 text-sm font-bold text-[var(--danger)]">
            {error}
          </div>
        )}

        <div className="space-y-1">
          <label className="text-sm font-black text-[var(--text-secondary)]">الباقة</label>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            value={plan}
            onChange={(e) => setPlan(e.target.value)}
          >
            <option value="basic">أساسية</option>
            <option value="premium">مميزة</option>
            <option value="enterprise">مؤسسية</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-black text-[var(--text-secondary)]">الحالة</label>
          <select
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            value={status}
            onChange={(e) => setStatus(e.target.value)}
          >
            <option value="active">نشط</option>
            <option value="suspended">موقوف</option>
            <option value="inactive">غير نشط</option>
            <option value="expired">منتهي</option>
          </select>
        </div>

        <div className="space-y-1">
          <label className="text-sm font-black text-[var(--text-secondary)]">تاريخ الانتهاء</label>
          <DatePicker value={endDate || undefined} onChange={(v) => setEndDate(v ?? "")} />
        </div>

        <div className="flex gap-3 pt-2">
          <button
            type="button"
            className="ui-button ui-button--secondary flex-1"
            onClick={onClose}
            disabled={saving}
          >
            إلغاء
          </button>
          <button
            type="button"
            className="ui-button ui-button--primary flex-1 inline-flex items-center justify-center gap-2"
            onClick={() => void handleSave()}
            disabled={saving}
          >
            {saving ? <Loader2 size={16} className="animate-spin" /> : null}
            حفظ التغييرات
          </button>
        </div>
      </div>
    </ModalFrame>
  );
}

// ── HistoryModal ─────────────────────────────────────────────────────────────
function HistoryModal({
  schoolId,
  schoolName,
  onClose,
}: {
  schoolId: string;
  schoolName: string;
  onClose: () => void;
}) {
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void (async () => {
      setLoading(true);
      setError(null);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          ok: boolean;
          subscriptions?: HistoryEntry[];
          error?: { message?: string };
        }>(`/api/web/super-admin/subscriptions/${schoolId}/history`);
        if (!response.ok || !payload?.ok) {
          setError(payload?.error?.message ?? "تعذر تحميل السجل.");
          return;
        }
        setHistory(payload.subscriptions ?? []);
      } catch {
        setError("تعذر تحميل السجل.");
      } finally {
        setLoading(false);
      }
    })();
  }, [schoolId]);

  return (
    <ModalFrame title="سجل الاشتراكات" subtitle={schoolName} onClose={onClose}>
      {loading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 size={28} className="animate-spin text-[var(--primary)] opacity-40" />
        </div>
      ) : error ? (
        <div className="rounded-xl border border-[var(--danger)]/20 bg-[var(--danger)]/5 p-4 text-sm font-bold text-[var(--danger)]">
          {error}
        </div>
      ) : history.length === 0 ? (
        <p className="py-8 text-center text-sm font-bold text-[var(--text-muted)]">لا يوجد سجل اشتراكات لهذه المدرسة.</p>
      ) : (
        <div className="overflow-hidden rounded-2xl border border-[var(--border)]">
          <table className="ui-table">
            <thead>
              <tr>
                <th>الباقة</th>
                <th>الحالة</th>
                <th>البداية</th>
                <th>الانتهاء</th>
                <th>تاريخ الإنشاء</th>
              </tr>
            </thead>
            <tbody>
              {history.map((entry) => (
                <tr key={entry.id}>
                  <td><span className="ui-pill">{PLAN_LABELS[entry.plan as keyof typeof PLAN_LABELS] ?? entry.plan}</span></td>
                  <td><span className={`ui-pill ${entry.status === "active" ? "ui-pill--success" : entry.status === "expired" || entry.status === "suspended" ? "ui-pill--danger" : ""}`}>{SUBSCRIPTION_STATUS_LABELS[entry.status as keyof typeof SUBSCRIPTION_STATUS_LABELS] ?? entry.status}</span></td>
                  <td className="text-[var(--text-secondary)]">{formatDate(entry.start_date)}</td>
                  <td className="text-[var(--text-secondary)]">{formatDate(entry.end_date)}</td>
                  <td className="text-[var(--text-secondary)]">{formatDate(entry.created_at)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </ModalFrame>
  );
}

// ── Main component ───────────────────────────────────────────────────────────
export function SubscriptionsTab({
  subscriptions: _subscriptions,
  filteredSubscriptions,
  onExtendSubscription,
  onEditPlan,
  onBulkRenew,
}: SubscriptionsTabProps) {
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [sortDir, setSortDir] = useState<"asc" | "desc" | null>(null);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
  const [historySchool, setHistorySchool] = useState<{ id: string; name: string } | null>(null);
  const [bulkRenewing, setBulkRenewing] = useState(false);

  const displayedSubscriptions = useMemo(() => {
    let list = filteredSubscriptions;

    // Status filter dropdown
    list = list.filter((s) => {
      if (statusFilter === "all") return true;
      if (statusFilter === "expiring") {
        const days = s.end_date
          ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000)
          : null;
        return days !== null && days >= 0 && days <= 30;
      }
      if (statusFilter === "expired") {
        const days = s.end_date
          ? Math.ceil((new Date(s.end_date).getTime() - Date.now()) / 86400000)
          : null;
        return days !== null && days < 0;
      }
      return s.status === statusFilter;
    });

    // Sort by days remaining
    if (sortDir) {
      list = [...list].sort((a, b) => {
        const daysA = a.end_date
          ? Math.ceil((new Date(a.end_date).getTime() - Date.now()) / 86400000)
          : 9999;
        const daysB = b.end_date
          ? Math.ceil((new Date(b.end_date).getTime() - Date.now()) / 86400000)
          : 9999;
        return sortDir === "asc" ? daysA - daysB : daysB - daysA;
      });
    }

    return list;
  }, [filteredSubscriptions, statusFilter, sortDir]);

  const handleEditSave = useCallback(async (plan: string, endDate: string, status: string) => {
    if (!editingSubscription || !onEditPlan) return;
    await onEditPlan(editingSubscription.school_id, plan, endDate, status);
  }, [editingSubscription, onEditPlan]);

  const expiringSchoolIds = useMemo(() => {
    return filteredSubscriptions
      .filter((s) => {
        const daysLeft = calculateDaysLeft(s.end_date);
        return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
      })
      .map((s) => s.school_id);
  }, [filteredSubscriptions]);

  const handleBulkRenew = useCallback(async () => {
    if (!onBulkRenew || expiringSchoolIds.length === 0) return;
    setBulkRenewing(true);
    try {
      await onBulkRenew(expiringSchoolIds);
    } finally {
      setBulkRenewing(false);
    }
  }, [onBulkRenew, expiringSchoolIds]);

  return (
    <>
      <div className="space-y-3">
        {/* Inline compact header */}
        <div className="flex items-center gap-2 border-b border-[var(--border)] pb-2">
          <span className="text-xs font-black text-[var(--text-primary)]">
            الاشتراكات ({displayedSubscriptions.length})
          </span>
          <div className="ms-auto flex items-center gap-2">
            {/* Status filter */}
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="h-6 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-1 text-[11px] text-[var(--text-secondary)] outline-none"
            >
              <option value="all">كل الحالات</option>
              <option value="active">نشط</option>
              <option value="expiring">ينتهي قريباً</option>
              <option value="expired">منتهي</option>
              <option value="suspended">معلق</option>
            </select>
            {/* Bulk renew */}
            {onBulkRenew && expiringSchoolIds.length > 0 && (
              <button
                onClick={() => void handleBulkRenew()}
                disabled={bulkRenewing}
                className="flex items-center gap-1 rounded border border-[var(--primary)] bg-[var(--primary)]/10 px-2 py-1 text-[11px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/20 disabled:opacity-50"
              >
                {bulkRenewing ? <Loader2 size={11} className="animate-spin" /> : <RefreshCw size={11} />}
                تجديد ({expiringSchoolIds.length})
              </button>
            )}
          </div>
        </div>

        {/* Table or empty */}
        {displayedSubscriptions.length === 0 ? (
          <p className="py-8 text-center text-xs text-[var(--text-muted)]">لا توجد اشتراكات</p>
        ) : (
          <div className="overflow-hidden rounded border border-[var(--border)]">
            <div className="max-h-[72dvh] overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">المدرسة</th>
                    <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">الباقة</th>
                    <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">تاريخ الانتهاء</th>
                    <th
                      onClick={() => setSortDir((d) => (d === "asc" ? "desc" : "asc"))}
                      className="cursor-pointer select-none whitespace-nowrap px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]"
                    >
                      الأيام {sortDir === "asc" ? "↑" : sortDir === "desc" ? "↓" : "↕"}
                    </th>
                    <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">الحالة</th>
                    <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)] border-b border-[var(--border)]">إجراءات</th>
                  </tr>
                </thead>
                <tbody>
                  {displayedSubscriptions.map((subscription) => {
                    const daysLeft = calculateDaysLeft(subscription.end_date);
                    const expired = isSubscriptionExpired(subscription);
                    const isExpiringSoon = !expired && daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
                    const tone = expired ? "ui-pill ui-pill--danger" : isExpiringSoon ? "ui-pill ui-pill--warning" : "ui-pill ui-pill--success";
                    const schoolName = relationName(subscription.schools) || "—";

                    return (
                      <tr key={subscription.id} className={isExpiringSoon ? "bg-[var(--warning)]/5" : ""}>
                        <td>
                          <div className="space-y-1">
                            <div className="font-black text-[var(--text-primary)]">{schoolName}</div>
                            <div className="text-xs font-bold text-[var(--text-tertiary)]">{formatDate(subscription.created_at)}</div>
                          </div>
                        </td>
                        <td>
                          <span className="ui-pill">{PLAN_LABELS[subscription.plan]}</span>
                        </td>
                        <td className="text-[var(--text-secondary)]">{formatDate(subscription.end_date)}</td>
                        <td>
                          <DaysBar days={daysLeft} />
                        </td>
                        <td>
                          <span className={tone}>
                            {expired ? "منتهي / موقوف" : daysLeft !== null && daysLeft <= 30 ? "قرب الانتهاء" : "نشط"}
                          </span>
                        </td>
                        <td>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => onExtendSubscription(subscription.school_id)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                              title="تجديد"
                            >
                              <RefreshCw size={11} />
                            </button>
                            <button
                              onClick={() => setEditingSubscription(subscription)}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                              title="تعديل"
                            >
                              <PencilLine size={11} />
                            </button>
                            <button
                              onClick={() => setHistorySchool({ id: subscription.school_id, name: schoolName })}
                              className="inline-flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] hover:text-[var(--primary)]"
                              title="السجل"
                            >
                              <History size={11} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

      {editingSubscription && (
        <EditPlanModal
          subscription={editingSubscription}
          onClose={() => setEditingSubscription(null)}
          onSave={handleEditSave}
        />
      )}

      {historySchool && (
        <HistoryModal
          schoolId={historySchool.id}
          schoolName={historySchool.name}
          onClose={() => setHistorySchool(null)}
        />
      )}
    </>
  );
}
