"use client";

import { Fragment, useState, useMemo, useEffect } from "react";
import Link from "next/link";
import {
  School,
  Plus,
  FileDown,
  PencilLine,
  Trash2,
  Ban,
  BadgeCheck,
  Upload,
  Download,
  Copy,
  Search,
  ChevronLeft,
  ChevronRight,
  RefreshCw,
  Clock,
} from "@/lib/icons";
import { SectionCard, EmptyState } from "./ui";
import { cx, formatDate } from "./utils";
import type { SchoolRecord, SubscriptionRecord } from "./types";
import { exportToCSV } from "@/lib/export";

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
  onCopyClasses?: (school: SchoolRecord) => void;
  onCopySettings?: (school: SchoolRecord) => void;
}

const PAGE_SIZE = 20;

const PLAN_COLORS: Record<string, string> = {
  basic: "bg-blue-500/10 text-blue-600 border-blue-500/20",
  premium: "bg-purple-500/10 text-purple-600 border-purple-500/20",
  enterprise: "bg-amber-500/10 text-amber-600 border-amber-500/20",
};

function getSubInfo(schoolId: string, subscriptions: SubscriptionRecord[]) {
  const sub = subscriptions.find((s) => s.school_id === schoolId);
  if (!sub) return { days: null as number | null, status: "none" as string };
  if (!sub.end_date) return { days: null as number | null, status: sub.status as string };
  const days = Math.ceil((new Date(sub.end_date).getTime() - Date.now()) / 86400000);
  return { days, status: sub.status as string };
}

function ColorSwatch({ color }: { color: string | null }) {
  if (!color) return null;
  return (
    <span
      className="inline-block h-3 w-3 shrink-0 rounded-full border border-[var(--border)]"
      style={{ backgroundColor: color }}
    />
  );
}

function DaysBar({ days }: { days: number | null }) {
  if (days === null)
    return <span className="text-[10px] text-[var(--text-muted)]">—</span>;
  if (days < 0)
    return <span className="text-[10px] font-black text-[var(--danger)]">منتهي</span>;
  const pct = Math.min(100, Math.max(0, (days / 365) * 100));
  const color =
    days < 30
      ? "bg-[var(--danger)]"
      : days < 90
      ? "bg-[var(--warning)]"
      : "bg-[var(--success)]";
  return (
    <div className="flex items-center gap-1.5">
      <span className="text-[10px] font-black text-[var(--text-primary)]">{days}</span>
      <div className="h-1.5 w-12 overflow-hidden rounded-full bg-[var(--surface-muted)]">
        <div className={cx("h-full rounded-full", color)} style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function StatusBadge({
  school,
  days,
}: {
  school: SchoolRecord;
  days: number | null;
}) {
  if (school.deleted_at) {
    return (
      <span className="text-[9px] font-black text-[var(--text-muted)] line-through">
        مؤرشفة
      </span>
    );
  }
  if (!school.is_active) {
    return (
      <span className="rounded-full border border-gray-300/40 bg-gray-100 px-1.5 py-0.5 text-[9px] font-black text-gray-500">
        معطلة
      </span>
    );
  }
  if (days !== null && days < 0) {
    return (
      <span className="rounded-full border border-[var(--danger)]/20 bg-[var(--danger)]/10 px-1.5 py-0.5 text-[9px] font-black text-[var(--danger)]">
        انتهى الاشتراك
      </span>
    );
  }
  if (days !== null && days <= 30) {
    return (
      <span className="rounded-full border border-[var(--warning)]/20 bg-[var(--warning)]/10 px-1.5 py-0.5 text-[9px] font-black text-[var(--warning)]">
        تنتهي قريباً
      </span>
    );
  }
  return (
    <span className="rounded-full border border-[var(--success)]/20 bg-[var(--success)]/10 px-1.5 py-0.5 text-[9px] font-black text-[var(--success)]">
      نشطة
    </span>
  );
}

export function SchoolsTab({
  schools,
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
  onCopyClasses,
  onCopySettings,
}: SchoolsTabProps) {
  const [page, setPage] = useState(0);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [planFilter, setPlanFilter] = useState<string>("all");
  const [internalQuery, setInternalQuery] = useState("");
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [bulkLoading, setBulkLoading] = useState(false);

  const displaySchools = useMemo(() => {
    return filteredSchools.filter((s) => {
      if (planFilter !== "all" && s.plan !== planFilter) return false;
      if (
        internalQuery &&
        !s.name.toLowerCase().includes(internalQuery.toLowerCase())
      )
        return false;
      return true;
    });
  }, [filteredSchools, planFilter, internalQuery]);

  useEffect(() => {
    setPage(0);
  }, [planFilter, internalQuery, filteredSchools]);

  const pageSchools = displaySchools.slice(
    page * PAGE_SIZE,
    (page + 1) * PAGE_SIZE
  );
  const totalPages = Math.ceil(displaySchools.length / PAGE_SIZE);

  const allPageSelected =
    pageSchools.length > 0 && pageSchools.every((s) => selected.has(s.id));

  function toggleSelectAll() {
    const next = new Set(selected);
    if (allPageSelected) {
      pageSchools.forEach((s) => next.delete(s.id));
    } else {
      pageSchools.forEach((s) => next.add(s.id));
    }
    setSelected(next);
  }

  async function handleBulkToggle(activate: boolean) {
    setBulkLoading(true);
    const ids = Array.from(selected);
    for (const id of ids) {
      const school = schools.find((s) => s.id === id);
      if (school && school.is_active !== activate) {
        await onToggleSchool(id, school.is_active);
      }
    }
    setSelected(new Set());
    setBulkLoading(false);
  }

  return (
    <SectionCard
      title={`إدارة المدارس (${filteredSchools.length})`}
      description="مراجعة حالة المدارس وخططها وتجديد اشتراكاتها مع أدوات تعديل مباشرة."
      actions={
        <>
          <button
            type="button"
            className="ui-button ui-button--secondary inline-flex items-center gap-2"
            onClick={() => exportToCSV(filteredSchools, "schools")}
          >
            <FileDown size={16} />
            تصدير
          </button>
          <button
            type="button"
            className="ui-button ui-button--secondary inline-flex items-center gap-2"
            onClick={onRefresh}
          >
            <RefreshCw size={16} />
            تحديث
          </button>
          <button
            type="button"
            className="ui-button ui-button--primary inline-flex items-center gap-2"
            onClick={onOpenCreateSchool}
          >
            <Plus size={16} />
            إضافة مدرسة
          </button>
        </>
      }
    >
      {/* Toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        {/* Internal search */}
        <div className="relative min-w-[160px] flex-1">
          <Search
            size={12}
            className="absolute start-2.5 top-1/2 -translate-y-1/2 text-[var(--text-muted)]"
          />
          <input
            value={internalQuery}
            onChange={(e) => setInternalQuery(e.target.value)}
            placeholder="بحث في المدارس..."
            className="h-7 w-full rounded border border-[var(--border)] bg-[var(--surface-muted)] ps-7 pe-3 text-xs outline-none focus:border-[var(--primary)]"
          />
        </div>

        {/* Plan filter */}
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="h-7 rounded border border-[var(--border)] bg-[var(--surface-muted)] px-2 text-xs outline-none"
        >
          <option value="all">كل الخطط</option>
          <option value="basic">أساسية</option>
          <option value="premium">مميزة</option>
          <option value="enterprise">مؤسسية</option>
        </select>

        {/* Count */}
        <span className="text-[10px] text-[var(--text-muted)]">
          {displaySchools.length} مدرسة
        </span>
      </div>

      {/* Bulk actions bar */}
      {selected.size > 0 && (
        <div className="mb-2 flex items-center gap-2 rounded-md border border-[var(--primary)]/20 bg-[var(--primary)]/8 px-3 py-1.5">
          <span className="text-xs font-black text-[var(--primary)]">
            {selected.size} محدد
          </span>
          <button
            onClick={() => handleBulkToggle(true)}
            disabled={bulkLoading}
            className="text-[10px] font-black text-[var(--success)] hover:underline disabled:opacity-50"
          >
            تمكين
          </button>
          <button
            onClick={() => handleBulkToggle(false)}
            disabled={bulkLoading}
            className="text-[10px] font-black text-[var(--danger)] hover:underline disabled:opacity-50"
          >
            تعطيل
          </button>
          <button
            onClick={() => setSelected(new Set())}
            className="ms-auto text-[10px] text-[var(--text-muted)] hover:underline"
          >
            إلغاء
          </button>
        </div>
      )}

      {displaySchools.length === 0 ? (
        <EmptyState
          icon={School}
          title="لا توجد نتائج مطابقة"
          description="جرّب تعديل كلمات البحث أو أضف مدرسة جديدة لبدء إدارة المنصة."
          actionLabel="إضافة مدرسة"
          onAction={onOpenCreateSchool}
        />
      ) : (
        <>
          <div className="overflow-x-auto rounded border border-[var(--border)]">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-[var(--border)] bg-[var(--surface-muted)]">
                  <th className="w-8 px-2 py-1.5">
                    <input
                      type="checkbox"
                      checked={allPageSelected}
                      onChange={toggleSelectAll}
                      className="cursor-pointer"
                    />
                  </th>
                  <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)]">
                    المدرسة
                  </th>
                  <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)]">
                    المدينة
                  </th>
                  <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)]">
                    الخطة
                  </th>
                  <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)]">
                    الاشتراك
                  </th>
                  <th className="px-2 py-1.5 text-start text-[10px] font-black uppercase text-[var(--text-muted)]">
                    الحالة
                  </th>
                  <th className="w-auto px-2 py-1.5"></th>
                </tr>
              </thead>
              <tbody>
                {pageSchools.map((school) => {
                  const { days } = getSubInfo(school.id, subscriptions);
                  const isExpanded = expandedId === school.id;
                  const isSelected = selected.has(school.id);

                  return (
                    <Fragment key={school.id}>
                      <tr
                        className={cx(
                          "border-b border-[var(--border)] transition-colors hover:bg-[var(--surface-muted)]",
                          isExpanded ? "bg-[var(--surface-muted)]" : ""
                        )}
                      >
                        <td className="px-2 py-1.5">
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={(e) => {
                              const next = new Set(selected);
                              if (e.target.checked) next.add(school.id);
                              else next.delete(school.id);
                              setSelected(next);
                            }}
                            onClick={(e) => e.stopPropagation()}
                            className="cursor-pointer"
                          />
                        </td>

                        <td
                          className="cursor-pointer px-2 py-1.5"
                          onClick={() =>
                            setExpandedId(isExpanded ? null : school.id)
                          }
                        >
                          <div className="flex items-center gap-1.5">
                            <ColorSwatch color={school.primary_color} />
                            <span className="max-w-[140px] truncate font-black text-[var(--text-primary)]">
                              {school.name}
                            </span>
                            {school.deleted_at && (
                              <span className="text-[9px] text-[var(--text-muted)]">
                                (مؤرشفة)
                              </span>
                            )}
                          </div>
                        </td>

                        <td className="px-2 py-1.5 text-[var(--text-secondary)]">
                          {school.city || "—"}
                        </td>

                        <td className="px-2 py-1.5">
                          <span
                            className={cx(
                              "rounded-full border px-1.5 py-0.5 text-[9px] font-black",
                              PLAN_COLORS[school.plan] ?? ""
                            )}
                          >
                            {school.plan}
                          </span>
                        </td>

                        <td className="px-2 py-1.5">
                          <DaysBar days={days} />
                        </td>

                        <td className="px-2 py-1.5">
                          <StatusBadge school={school} days={days} />
                        </td>

                        <td className="px-2 py-1.5">
                          <div className="flex items-center gap-1">
                            {!school.deleted_at ? (
                              <>
                                {/* Edit */}
                                <button
                                  type="button"
                                  title="تعديل"
                                  onClick={() => onOpenEditSchool(school)}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                                >
                                  <PencilLine size={12} />
                                </button>

                                {/* Toggle active */}
                                <button
                                  type="button"
                                  title={
                                    school.is_active
                                      ? "إيقاف المدرسة"
                                      : "تفعيل المدرسة"
                                  }
                                  onClick={() =>
                                    onToggleSchool(school.id, school.is_active)
                                  }
                                  className={cx(
                                    "flex h-5 w-5 items-center justify-center rounded hover:bg-[var(--surface-muted)]",
                                    school.is_active
                                      ? "text-[var(--danger)]"
                                      : "text-[var(--success)]"
                                  )}
                                >
                                  {school.is_active ? (
                                    <Ban size={12} />
                                  ) : (
                                    <BadgeCheck size={12} />
                                  )}
                                </button>

                                {/* Extend subscription */}
                                <button
                                  type="button"
                                  title="تجديد الاشتراك"
                                  onClick={() =>
                                    onExtendSubscription(school.id)
                                  }
                                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                                >
                                  <Clock size={12} />
                                </button>

                                {/* Export */}
                                <button
                                  type="button"
                                  title="تحميل البيانات"
                                  onClick={() => onExportSchool(school)}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                                >
                                  <Download size={12} />
                                </button>

                                {/* Import file */}
                                <label
                                  title="استيراد ملف"
                                  className="flex h-5 w-5 cursor-pointer items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                                >
                                  <Upload size={12} />
                                  <input
                                    type="file"
                                    accept="application/json,.json"
                                    className="hidden"
                                    disabled={importingSchoolId === school.id}
                                    onChange={(event) => {
                                      const file =
                                        event.target.files?.[0];
                                      if (file) {
                                        onImportSchoolData(school, file);
                                      }
                                      event.currentTarget.value = "";
                                    }}
                                  />
                                </label>

                                {/* Copy classes */}
                                {onCopyClasses && (
                                  <button
                                    type="button"
                                    title="نسخ الصفوف"
                                    onClick={() => onCopyClasses(school)}
                                    className="flex h-5 w-5 items-center justify-center rounded text-[var(--text-secondary)] hover:bg-[var(--surface-muted)] hover:text-[var(--primary)]"
                                  >
                                    <Copy size={12} />
                                  </button>
                                )}

                                {/* Archive */}
                                <button
                                  type="button"
                                  title="أرشفة"
                                  onClick={() => onDeleteSchool(school)}
                                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--danger)] hover:bg-[var(--danger)]/10"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            ) : (
                              <>
                                <span className="text-[9px] font-bold text-[var(--danger)]">
                                  {formatDate(school.deleted_at)}
                                </span>
                                <button
                                  type="button"
                                  title="حذف نهائي"
                                  onClick={() =>
                                    onPermanentlyDeleteSchool?.(school)
                                  }
                                  className="flex h-5 w-5 items-center justify-center rounded text-[var(--danger)] hover:bg-[var(--danger)]/10"
                                >
                                  <Trash2 size={12} />
                                </button>
                              </>
                            )}
                          </div>
                        </td>
                      </tr>

                      {/* Expanded detail row */}
                      {isExpanded && (
                        <tr
                          className="border-b border-[var(--border)] bg-[var(--surface-soft)]"
                        >
                          <td colSpan={7} className="px-4 py-2">
                            <div className="grid grid-cols-2 gap-3 text-[10px] md:grid-cols-4">
                              <div>
                                <span className="text-[var(--text-muted)]">
                                  البريد:{" "}
                                </span>
                                <span className="font-bold">
                                  {school.owner_email || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)]">
                                  الهاتف:{" "}
                                </span>
                                <span className="font-bold">
                                  {school.phone || "—"}
                                </span>
                              </div>
                              <div>
                                <span className="text-[var(--text-muted)]">
                                  أُنشئت:{" "}
                                </span>
                                <span className="font-bold">
                                  {school.created_at
                                    ? new Date(
                                        school.created_at
                                      ).toLocaleDateString("ar-IQ")
                                    : "—"}
                                </span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="text-[var(--text-muted)]">
                                  الألوان:{" "}
                                </span>
                                {[
                                  school.primary_color,
                                  school.secondary_color,
                                ]
                                  .filter(Boolean)
                                  .map((c, i) => (
                                    <span
                                      key={i}
                                      className="inline-block h-4 w-4 rounded border border-[var(--border)]"
                                      style={{ backgroundColor: c! }}
                                    />
                                  ))}
                              </div>
                            </div>
                            <div className="mt-2 flex justify-end">
                              <Link
                                href={`/super-admin/schools/${school.id}`}
                                className="inline-flex items-center gap-1 rounded border border-[var(--primary)]/30 bg-[var(--primary)]/8 px-2 py-0.5 text-[10px] font-black text-[var(--primary)] hover:bg-[var(--primary)]/15 transition-colors"
                              >
                                عرض التفاصيل ←
                              </Link>
                            </div>
                          </td>
                        </tr>
                      )}
                    </Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-[var(--border)] px-3 py-2">
              <span className="text-[10px] text-[var(--text-muted)]">
                {page * PAGE_SIZE + 1}–
                {Math.min((page + 1) * PAGE_SIZE, displaySchools.length)} من{" "}
                {displaySchools.length}
              </span>
              <div className="flex items-center gap-1">
                <button
                  disabled={page === 0}
                  onClick={() => setPage((p) => p - 1)}
                  className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40"
                >
                  <ChevronRight size={12} />
                </button>
                <span className="px-2 text-[10px] font-bold">
                  {page + 1} / {totalPages}
                </span>
                <button
                  disabled={page >= totalPages - 1}
                  onClick={() => setPage((p) => p + 1)}
                  className="flex h-6 w-6 items-center justify-center rounded border border-[var(--border)] text-[var(--text-muted)] disabled:opacity-40"
                >
                  <ChevronLeft size={12} />
                </button>
              </div>
            </div>
          )}
        </>
      )}
    </SectionCard>
  );
}
