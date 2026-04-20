"use client";

import { School, Plus, RefreshCw, FileDown, PencilLine, Trash2, Ban, BadgeCheck, Upload, Download } from "@/lib/icons";
import { SectionCard, EmptyState } from "./ui";
import { cx, formatDate, statusTone, calculateDaysLeft, isSubscriptionExpired } from "./utils";
import type { SchoolRecord, SubscriptionRecord } from "./types";
import { exportToCSV } from "@/lib/export";
import { PLAN_LABELS, SUBSCRIPTION_STATUS_LABELS } from "./types";

interface SchoolsTabProps {
  schools: SchoolRecord[];
  subscriptions: SubscriptionRecord[];
  filteredSchools: SchoolRecord[];
  onOpenCreateSchool: () => void;
  onOpenEditSchool: (school: SchoolRecord) => void;
  onToggleSchool: (id: string, current: boolean) => void;
  onExtendSubscription: (schoolId: string) => void;
  onDeleteSchool: (school: SchoolRecord) => void;
  onPermanentlyDeleteSchool?: (school: SchoolRecord) => void;
  onExportSchool: (school: SchoolRecord) => void;
  onImportSchoolData: (school: SchoolRecord, file: File) => void;
  importingSchoolId?: string | null;
  onRefresh: () => void;
}

export function SchoolsTab({
  schools: _schools,
  subscriptions,
  filteredSchools,
  onOpenCreateSchool,
  onOpenEditSchool,
  onToggleSchool,
  onExtendSubscription,
  onDeleteSchool,
  onPermanentlyDeleteSchool,
  onExportSchool,
  onImportSchoolData,
  importingSchoolId,
  onRefresh,
}: SchoolsTabProps) {
  return (
    <SectionCard
      title={`إدارة المدارس (${filteredSchools.length})`}
      description="مراجعة حالة المدارس وخططها وتجديد اشتراكاتها مع أدوات تعديل مباشرة."
      actions={
        <>
          <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => exportToCSV(filteredSchools, "schools")}>
            <FileDown size={16} />
            تصدير
          </button>
          <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={onRefresh}>
            <RefreshCw size={16} />
            تحديث
          </button>
          <button type="button" className="ui-button ui-button--primary inline-flex items-center gap-2" onClick={onOpenCreateSchool}>
            <Plus size={16} />
            إضافة مدرسة
          </button>
        </>
      }
    >
      {filteredSchools.length === 0 ? (
        <EmptyState
          icon={School}
          title="لا توجد نتائج مطابقة"
          description="جرّب تعديل كلمات البحث أو أضف مدرسة جديدة لبدء إدارة المنصة."
          actionLabel="إضافة مدرسة"
          onAction={onOpenCreateSchool}
        />
      ) : (
        <div className="grid gap-4 xl:grid-cols-2">
          {filteredSchools.map((school) => {
            const subscription = subscriptions.find((item) => item.school_id === school.id);
            const daysLeft = calculateDaysLeft(subscription?.end_date);
            const expired = isSubscriptionExpired(subscription);
            const badgeTone = !school.is_active || expired ? "danger" : daysLeft !== null && daysLeft <= 30 ? "warning" : "success";

            return (
              <article key={school.id} className="ui-surface overflow-hidden rounded-[30px] p-5">
                <div className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="space-y-2">
                    <div className="flex items-center gap-3">
                      <div className="inline-flex h-12 w-12 items-center justify-center rounded-[18px] bg-[rgba(79,140,255,0.12)] text-[var(--primary)]">
                        <School size={20} />
                      </div>
                      <div>
                        <h3 className="text-lg font-black text-[var(--text-primary)]">{school.name}</h3>
                        <p className="text-sm leading-7 text-[var(--text-secondary)]">{school.city || "مدينة غير محددة"}</p>
                      </div>
                    </div>
                    <div className="text-sm leading-7 text-[var(--text-secondary)]">
                      {school.owner_email || "بدون بريد مدير"} · {school.phone || "بدون هاتف"}
                    </div>
                  </div>

                  <div className="flex flex-wrap items-center gap-2">
                    <span className={statusTone(badgeTone)}>
                      {!school.is_active ? "موقوفة" : expired ? "منتهية" : daysLeft !== null && daysLeft <= 30 ? `${daysLeft} يوم متبقي` : "نشطة"}
                    </span>
                    <span className="ui-pill">{PLAN_LABELS[school.plan]}</span>
                  </div>
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="mb-1 text-xs font-black text-[var(--text-tertiary)]">تاريخ الانتهاء</p>
                    <p className="text-sm font-black text-[var(--text-primary)]">{formatDate(subscription?.end_date)}</p>
                  </div>
                  <div className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] p-4">
                    <p className="mb-1 text-xs font-black text-[var(--text-tertiary)]">حالة الاشتراك</p>
                    <p className="text-sm font-black text-[var(--text-primary)]">{subscription ? SUBSCRIPTION_STATUS_LABELS[subscription.status] : "—"}</p>
                  </div>
                </div>

                <div className="mt-4 h-2 overflow-hidden rounded-full bg-[rgba(79,140,255,0.08)]">
                  <div
                    className="h-full rounded-full"
                    style={{
                      width: daysLeft === null ? "18%" : `${Math.max(0, Math.min(100, (daysLeft / 365) * 100))}%`,
                      background: !school.is_active || expired ? "var(--danger)" : daysLeft !== null && daysLeft <= 30 ? "var(--warning)" : "var(--success)",
                    }}
                  />
                </div>

                <div className="mt-5 flex flex-wrap gap-2">
                  {!school.deleted_at ? (
                    <>
                      <button
                        type="button"
                        className={cx("ui-button inline-flex items-center gap-2", school.is_active ? "ui-button--danger" : "ui-button--secondary")}
                        onClick={() => onToggleSchool(school.id, school.is_active)}
                      >
                        {school.is_active ? <Ban size={16} /> : <BadgeCheck size={16} />}
                        {school.is_active ? "إيقاف المدرسة" : "تفعيل المدرسة"}
                      </button>
                      <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => onExtendSubscription(school.id)}>
                        <RefreshCw size={16} />
                        تجديد الاشتراك
                      </button>
                      <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => onOpenEditSchool(school)}>
                        <PencilLine size={16} />
                        تعديل
                      </button>
                      <button type="button" className="ui-button ui-button--secondary inline-flex items-center gap-2" onClick={() => onExportSchool(school)}>
                        <Download size={16} />
                        تحميل البيانات
                      </button>
                      <label className="ui-button ui-button--secondary inline-flex cursor-pointer items-center gap-2">
                        <Upload size={16} />
                        {importingSchoolId === school.id ? "جارٍ الاستيراد..." : "استيراد ملف"}
                        <input
                          type="file"
                          accept="application/json,.json"
                          className="hidden"
                          disabled={importingSchoolId === school.id}
                          onChange={(event) => {
                            const file = event.target.files?.[0];
                            if (file) {
                              onImportSchoolData(school, file);
                            }
                            event.currentTarget.value = "";
                          }}
                        />
                      </label>
                      <button type="button" className="ui-button ui-button--danger inline-flex items-center gap-2" onClick={() => onDeleteSchool(school)}>
                        <Trash2 size={16} />
                        أرشفة
                      </button>
                    </>
                  ) : (
                    <>
                      <span className="text-xs font-bold text-[var(--danger)]">مؤرشفة في {formatDate(school.deleted_at)}</span>
                      <button
                        type="button"
                        className="ui-button ui-button--danger inline-flex items-center gap-2"
                        onClick={() => onPermanentlyDeleteSchool?.(school)}
                      >
                        <Trash2 size={16} />
                        حذف نهائي
                      </button>
                    </>
                  )}
                </div>
              </article>
            );
          })}
        </div>
      )}
    </SectionCard>
  );
}
