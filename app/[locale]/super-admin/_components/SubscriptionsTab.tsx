"use client";

import { useState, useMemo, useCallback, useEffect } from "react";
import { CreditCard, RefreshCw, History, PencilLine, Loader2 } from "@/lib/icons";
import { SectionCard, EmptyState, ModalFrame } from "./ui";
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
          <input
            type="date"
            className="w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm font-bold text-[var(--text-primary)] outline-none focus:ring-2 focus:ring-[var(--primary)]/20"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
          />
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

export function SubscriptionsTab({
  subscriptions: _subscriptions,
  filteredSubscriptions,
  onExtendSubscription,
  onEditPlan,
  onBulkRenew,
}: SubscriptionsTabProps) {
  const [showExpiringOnly, setShowExpiringOnly] = useState(false);
  const [editingSubscription, setEditingSubscription] = useState<SubscriptionRecord | null>(null);
  const [historySchool, setHistorySchool] = useState<{ id: string; name: string } | null>(null);
  const [bulkRenewing, setBulkRenewing] = useState(false);

  const displayedSubscriptions = useMemo(
    () =>
      showExpiringOnly
        ? filteredSubscriptions.filter((s) => {
            const daysLeft = calculateDaysLeft(s.end_date);
            return daysLeft !== null && daysLeft >= 0 && daysLeft <= 30;
          })
        : filteredSubscriptions,
    [filteredSubscriptions, showExpiringOnly],
  );

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
      <SectionCard
        title={`الاشتراكات (${displayedSubscriptions.length})`}
        description="جدول متابعة مركزي لتجديد الاشتراكات ورؤية المدارس القريبة من الانتهاء."
        actions={
          <div className="flex items-center gap-2">
            {onBulkRenew && expiringSchoolIds.length > 0 && (
              <button
                type="button"
                className="ui-button ui-button--primary inline-flex items-center gap-2"
                onClick={() => void handleBulkRenew()}
                disabled={bulkRenewing}
              >
                {bulkRenewing ? <Loader2 size={16} className="animate-spin" /> : <RefreshCw size={16} />}
                تجديد الكل ({expiringSchoolIds.length})
              </button>
            )}
            <button
              type="button"
              className={`ui-button inline-flex items-center gap-2 ${showExpiringOnly ? "ui-button--primary" : "ui-button--secondary"}`}
              onClick={() => setShowExpiringOnly((v) => !v)}
            >
              منتهية قريباً فقط (30 يوم)
            </button>
          </div>
        }
      >
        {displayedSubscriptions.length === 0 ? (
          <EmptyState
            icon={CreditCard}
            title="لا توجد نتائج للاشتراكات"
            description="جرّب تعديل كلمات البحث أو أضف مدرسة جديدة لإنشاء اشتراكها الافتراضي."
          />
        ) : (
          <div className="overflow-hidden rounded-[30px] border border-[var(--border)]">
            <div className="max-h-[72dvh] overflow-auto">
              <table className="ui-table">
                <thead>
                  <tr>
                    <th>المدرسة</th>
                    <th>الباقة</th>
                    <th>تاريخ الانتهاء</th>
                    <th>المتبقي</th>
                    <th>الحالة</th>
                    <th>إجراءات</th>
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
                      <tr key={subscription.id} className={isExpiringSoon ? "bg-amber-50/60 dark:bg-amber-950/20" : ""}>
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
                        <td className="font-black text-[var(--text-primary)]">{daysLeft === null ? "—" : `${daysLeft} يوم`}</td>
                        <td>
                          <span className={tone}>
                            {expired ? "منتهي / موقوف" : daysLeft !== null && daysLeft <= 30 ? "قرب الانتهاء" : "نشط"}
                          </span>
                        </td>
                        <td>
                          <div className="flex flex-wrap gap-2">
                            <button
                              type="button"
                              className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                              onClick={() => onExtendSubscription(subscription.school_id)}
                            >
                              <RefreshCw size={16} />
                              تجديد
                            </button>
                            <button
                              type="button"
                              className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                              title="تعديل الباقة"
                              onClick={() => setEditingSubscription(subscription)}
                            >
                              <PencilLine size={16} />
                            </button>
                            <button
                              type="button"
                              className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                              title="سجل الاشتراكات"
                              onClick={() => setHistorySchool({ id: subscription.school_id, name: schoolName })}
                            >
                              <History size={16} />
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
      </SectionCard>

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
