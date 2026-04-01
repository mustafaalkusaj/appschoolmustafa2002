"use client";

import { CreditCard, RefreshCw } from "@/lib/icons";
import { SectionCard, EmptyState } from "./ui";
import { formatDate, calculateDaysLeft, isSubscriptionExpired, relationName } from "./utils";
import type { SubscriptionRecord } from "./types";
import { PLAN_LABELS } from "./types";

interface SubscriptionsTabProps {
  subscriptions: SubscriptionRecord[];
  filteredSubscriptions: SubscriptionRecord[];
  onExtendSubscription: (schoolId: string) => void;
}

export function SubscriptionsTab({
  subscriptions: _subscriptions,
  filteredSubscriptions,
  onExtendSubscription,
}: SubscriptionsTabProps) {
  return (
    <SectionCard
      title={`الاشتراكات (${filteredSubscriptions.length})`}
      description="جدول متابعة مركزي لتجديد الاشتراكات ورؤية المدارس القريبة من الانتهاء."
    >
      {filteredSubscriptions.length === 0 ? (
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
                {filteredSubscriptions.map((subscription) => {
                  const daysLeft = calculateDaysLeft(subscription.end_date);
                  const expired = isSubscriptionExpired(subscription);
                  const tone = expired ? "ui-pill ui-pill--danger" : daysLeft !== null && daysLeft <= 30 ? "ui-pill ui-pill--warning" : "ui-pill ui-pill--success";

                  return (
                    <tr key={subscription.id}>
                      <td>
                        <div className="space-y-1">
                          <div className="font-black text-[var(--text-primary)]">{relationName(subscription.schools) || "—"}</div>
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
                        <button
                          type="button"
                          className="ui-button ui-button--secondary inline-flex items-center gap-2 px-4"
                          onClick={() => onExtendSubscription(subscription.school_id)}
                        >
                          <RefreshCw size={16} />
                          تجديد
                        </button>
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
  );
}
