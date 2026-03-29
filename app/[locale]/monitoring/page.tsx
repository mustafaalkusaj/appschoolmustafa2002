"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useToast } from "@/components/toast";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school-context";
import type {
  HomeworkDetail,
  HomeworkListItem,
  MonitoringMetaResponse,
  TeacherActivityAuditEntry,
  TeacherActivityStatus,
  TeacherMessageDetail,
  TeacherMessageListItem,
} from "@/lib/teacher-activity";

type TabKey = "messages" | "homework";

const PAGE_SIZE = 20;
const EMPTY_META: MonitoringMetaResponse = {
  branches: [],
  teachers: [],
  classes: [],
  sections: [],
  students: [],
};

function inputClass() {
  return "min-h-11 rounded-[16px] border border-slate-200 bg-white px-3 py-2 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function areaClass() {
  return "min-h-[110px] rounded-[18px] border border-slate-200 bg-white px-3 py-3 text-sm text-slate-900 outline-none transition focus:border-sky-400 focus:ring-4 focus:ring-sky-100";
}

function badgeTone(status: TeacherActivityStatus) {
  if (status === "edited_by_admin") return "bg-amber-100 text-amber-700";
  if (status === "deleted_by_admin") return "bg-rose-100 text-rose-700";
  return "bg-emerald-100 text-emerald-700";
}

function statusLabel(status: TeacherActivityStatus) {
  if (status === "edited_by_admin") return "معدّل إداريًا";
  if (status === "deleted_by_admin") return "محذوف إداريًا";
  return "نشط";
}

function readApiError(payload: unknown, fallback: string) {
  if (!payload || typeof payload !== "object") return fallback;
  const candidate = payload as { error?: { message?: string } };
  return candidate.error?.message || fallback;
}

function formatDateTime(value: string | null | undefined) {
  if (!value) return "—";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";
  return new Intl.DateTimeFormat("ar-IQ", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(date);
}

function DetailModal({
  tab,
  item,
  editValues,
  onChange,
  editMode,
  onClose,
  onEditToggle,
  onSave,
  onDelete,
  saving,
  canModerate,
}: {
  tab: TabKey;
  item: TeacherMessageDetail | HomeworkDetail;
  editValues: Record<string, string>;
  onChange: (key: string, value: string) => void;
  editMode: boolean;
  onClose: () => void;
  onEditToggle: () => void;
  onSave: () => void;
  onDelete: () => void;
  saving: boolean;
  canModerate: boolean;
}) {
  const isMessage = tab === "messages";
  const messageItem = isMessage ? (item as TeacherMessageDetail) : null;
  const homeworkItem = !isMessage ? (item as HomeworkDetail) : null;
  const attachment = item.attachment;

  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-5xl overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <div className="text-xs font-black tracking-[0.24em] text-slate-400">
              {isMessage ? "Teacher Messages" : "Teacher Homework"}
            </div>
            <h2 className="mt-2 text-2xl font-black text-slate-900">{item.title}</h2>
            <div className="mt-2 flex flex-wrap gap-2 text-xs text-slate-500">
              <span>{item.teacherName || "—"}</span>
              <span>•</span>
              <span>{item.schoolName || "—"}</span>
              <span>•</span>
              <span>{item.branchName || "—"}</span>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600"
          >
            إغلاق
          </button>
        </div>

        <div className="grid max-h-[calc(88vh-92px)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[minmax(0,1.2fr)_360px]">
          <div className="space-y-5 px-6 py-5">
            <div className="grid gap-3 md:grid-cols-2">
              <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs font-bold text-slate-400">الحالة</div>
                <div className={`mt-2 inline-flex rounded-full px-3 py-1 text-xs font-black ${badgeTone(item.status)}`}>
                  {statusLabel(item.status)}
                </div>
              </div>
              <div className="rounded-[20px] border border-slate-100 bg-slate-50 px-4 py-3">
                <div className="text-xs font-bold text-slate-400">آخر تحديث</div>
                <div className="mt-2 text-sm font-semibold text-slate-700">{formatDateTime(item.updatedAt || item.createdAt)}</div>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500">العنوان</span>
                <input
                  className={inputClass()}
                  value={editValues.title ?? item.title}
                  disabled={!editMode || saving}
                  onChange={(event) => onChange("title", event.target.value)}
                />
              </label>
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500">{isMessage ? "الرابط" : "المادة"}</span>
                <input
                  className={inputClass()}
                  value={editValues[isMessage ? "link" : "subject"] ?? (isMessage ? (messageItem?.link || "") : (homeworkItem?.subject || ""))}
                  disabled={!editMode || saving}
                  onChange={(event) => onChange(isMessage ? "link" : "subject", event.target.value)}
                />
              </label>
            </div>

            <label className="flex flex-col gap-2">
              <span className="text-xs font-bold text-slate-500">{isMessage ? "المحتوى" : "الوصف"}</span>
              <textarea
                className={areaClass()}
                value={editValues[isMessage ? "message" : "description"] ?? (isMessage ? (messageItem?.message || "") : (homeworkItem?.description || ""))}
                disabled={!editMode || saving}
                onChange={(event) => onChange(isMessage ? "message" : "description", event.target.value)}
              />
            </label>

            <div className="grid gap-4 md:grid-cols-3">
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500">تاريخ الاستحقاق/التسليم</span>
                <input
                  type="datetime-local"
                  className={inputClass()}
                  value={editValues.due_at ?? ((item.dueAt || "").slice(0, 16))}
                  disabled={!editMode || saving}
                  onChange={(event) => onChange("due_at", event.target.value)}
                />
              </label>
              {!isMessage ? (
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">نوع المحتوى</span>
                  <select
                    className={inputClass()}
                    value={editValues.content_kind ?? (homeworkItem?.contentKind || "homework")}
                    disabled={!editMode || saving}
                    onChange={(event) => onChange("content_kind", event.target.value)}
                  >
                    <option value="homework">واجب</option>
                    <option value="exam_material">مادة امتحانية</option>
                  </select>
                </label>
              ) : (
                <label className="flex flex-col gap-2">
                  <span className="text-xs font-bold text-slate-500">ملاحظة</span>
                  <input
                    className={inputClass()}
                    value={editValues.note ?? (messageItem?.note || "")}
                    disabled={!editMode || saving}
                    onChange={(event) => onChange("note", event.target.value)}
                  />
                </label>
              )}
              <label className="flex flex-col gap-2">
                <span className="text-xs font-bold text-slate-500">سبب الإجراء</span>
                <input
                  className={inputClass()}
                  value={editValues.reason ?? ""}
                  disabled={!editMode || saving}
                  onChange={(event) => onChange("reason", event.target.value)}
                />
              </label>
            </div>

            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
              <div className="mb-3 text-sm font-black text-slate-800">الاستهداف</div>
              {isMessage ? (
                <div className="flex flex-wrap gap-2">
                  {(item as TeacherMessageDetail).targets.length > 0 ? (
                    (item as TeacherMessageDetail).targets.map((target, index) => (
                      <span key={`${target.student_id || target.user_id || index}`} className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 shadow-sm">
                        {target.student_name || "طالب"} {target.class_name ? `• ${target.class_name}` : ""} {target.section ? `• ${target.section}` : ""}
                      </span>
                    ))
                  ) : (
                    <span className="text-sm text-slate-500">لا توجد بيانات استهداف مفصلة.</span>
                  )}
                </div>
              ) : (
                <div className="flex flex-wrap gap-2 text-sm text-slate-600">
                  <span>{homeworkItem?.studentName || "لكل الصف"}</span>
                  <span>{homeworkItem?.className || "—"}</span>
                  <span>{homeworkItem?.section || "—"}</span>
                </div>
              )}
            </div>

            {attachment ? (
              <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                <div className="text-sm font-black text-slate-800">المرفق</div>
                <div className="mt-2 text-sm text-slate-600">
                  {attachment.name || attachment.path || "ملف مرفق"} {attachment.mimeType ? `• ${attachment.mimeType}` : ""}
                </div>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-3">
              <button
                type="button"
                onClick={editMode ? onSave : onEditToggle}
                disabled={saving || !canModerate}
                className="rounded-[16px] bg-sky-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
              >
                {saving ? "جارٍ الحفظ..." : !canModerate ? "للقراءة فقط" : editMode ? "حفظ التعديلات" : "تعديل"}
              </button>
              <button
                type="button"
                onClick={onDelete}
                disabled={saving || !canModerate}
                className="rounded-[16px] bg-rose-600 px-4 py-3 text-sm font-black text-white disabled:opacity-40"
              >
                حذف
              </button>
            </div>
          </div>

          <aside className="border-t border-slate-100 bg-slate-50 px-6 py-5 lg:border-r lg:border-t-0">
            <div className="text-sm font-black text-slate-800">سجل التدقيق</div>
            <div className="mt-4 space-y-3">
              {item.auditTrail.length > 0 ? (
                item.auditTrail.map((entry: TeacherActivityAuditEntry) => (
                  <div key={entry.id} className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-sm">
                    <div className="text-sm font-black text-slate-800">{entry.summary}</div>
                    <div className="mt-1 text-xs text-slate-500">
                      {entry.actorName || entry.actorEmail || "إدارة"} • {formatDateTime(entry.createdAt)}
                    </div>
                    {entry.reason ? <div className="mt-2 text-xs text-slate-600">السبب: {entry.reason}</div> : null}
                  </div>
                ))
              ) : (
                <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500">
                  لا يوجد سجل تدقيق بعد.
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    </div>
  );
}

export default function MonitoringPage() {
  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const toast = useToast();
  const canModerate = can("moderate_teacher_activity");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [tab, setTab] = useState<TabKey>("messages");
  const [meta, setMeta] = useState<MonitoringMetaResponse>(EMPTY_META);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [branchId, setBranchId] = useState("");
  const [teacherId, setTeacherId] = useState("");
  const [className, setClassName] = useState("");
  const [section, setSection] = useState("");
  const [status, setStatus] = useState<"all" | TeacherActivityStatus>("all");
  const [messageItems, setMessageItems] = useState<TeacherMessageListItem[]>([]);
  const [homeworkItems, setHomeworkItems] = useState<HomeworkListItem[]>([]);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedDetail, setSelectedDetail] = useState<TeacherMessageDetail | HomeworkDetail | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editValues, setEditValues] = useState<Record<string, string>>({});

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
      setPage(1);
    }, 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void (async () => {
      const scopedSchoolId = await resolveSchoolIdForProfile(profile, {
        selectedSchoolId: schoolScope.selectedSchoolId,
      });
      setSchoolId(scopedSchoolId);
    })();
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

  const fetchMeta = useCallback(async () => {
    if (!schoolId) return;
    const params = new URLSearchParams({ schoolId });
    if (branchId) params.set("branchId", branchId);
    if (className) params.set("className", className);
    if (section) params.set("section", section);

    const { response, payload } = await fetchJsonWithAuthorizedSession<MonitoringMetaResponse & { error?: { message?: string } }>(
      `/api/web/teacher-activity/meta?${params.toString()}`,
    );

    if (!response.ok) {
      throw new Error(readApiError(payload, "تعذر تحميل المرشحات."));
    }

    setMeta({
      branches: payload?.branches ?? [],
      teachers: payload?.teachers ?? [],
      classes: payload?.classes ?? [],
      sections: payload?.sections ?? [],
      students: payload?.students ?? [],
    });
  }, [schoolId, branchId, className, section]);

  const fetchList = useCallback(async () => {
    if (!schoolId) {
      setMessageItems([]);
      setHomeworkItems([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      schoolId,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      status,
      search,
    });
    if (branchId) params.set("branchId", branchId);
    if (teacherId) params.set("teacherId", teacherId);
    if (className) params.set("className", className);
    if (section) params.set("section", section);

    const endpoint = tab === "messages" ? "/api/web/teacher-activity/messages" : "/api/web/teacher-activity/homework";
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      items?: TeacherMessageListItem[] | HomeworkListItem[];
      totalCount?: number;
      error?: { message?: string };
    }>(`${endpoint}?${params.toString()}`);

    setLoading(false);

    if (!response.ok) {
      throw new Error(readApiError(payload, "تعذر تحميل البيانات."));
    }

    setTotalCount(payload?.totalCount ?? 0);
    if (tab === "messages") {
      setMessageItems((payload?.items as TeacherMessageListItem[]) ?? []);
    } else {
      setHomeworkItems((payload?.items as HomeworkListItem[]) ?? []);
    }
  }, [schoolId, page, status, search, branchId, teacherId, className, section, tab]);

  useEffect(() => {
    if (!schoolId || schoolScope.shouldBlockContent) return;
    void fetchMeta().catch((error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل المرشحات.");
    });
  }, [fetchMeta, schoolId, schoolScope.shouldBlockContent, toast]);

  useEffect(() => {
    if (!schoolId || schoolScope.shouldBlockContent) return;
    void fetchList().catch((error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل القائمة.");
      setLoading(false);
    });
  }, [fetchList, schoolId, schoolScope.shouldBlockContent, toast]);

  const currentItems = tab === "messages" ? messageItems : homeworkItems;
  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));

  const openDetail = useCallback(
    async (id: string) => {
      if (!schoolId) return;
      const endpoint = tab === "messages" ? `/api/web/teacher-activity/messages/${id}` : `/api/web/teacher-activity/homework/${id}`;
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        item?: TeacherMessageDetail | HomeworkDetail;
        error?: { message?: string };
      }>(`${endpoint}?schoolId=${encodeURIComponent(schoolId)}`);

      if (!response.ok || !payload?.item) {
        throw new Error(readApiError(payload, "تعذر تحميل التفاصيل."));
      }

      setSelectedId(id);
      setSelectedDetail(payload.item);
      setEditMode(false);
      setEditValues({});
    },
    [schoolId, tab],
  );

  const handleSave = useCallback(async () => {
    if (!selectedId || !schoolId || !selectedDetail) return;
    setSaving(true);

    const endpoint = tab === "messages" ? `/api/web/teacher-activity/messages/${selectedId}` : `/api/web/teacher-activity/homework/${selectedId}`;
    const body =
      tab === "messages"
        ? {
            schoolId,
            title: editValues.title ?? selectedDetail.title,
            message: editValues.message ?? (selectedDetail as TeacherMessageDetail).message,
            note: editValues.note ?? (selectedDetail as TeacherMessageDetail).note ?? "",
            link: editValues.link ?? (selectedDetail as TeacherMessageDetail).link ?? "",
            due_at: editValues.due_at || (selectedDetail.dueAt || ""),
            reason: editValues.reason ?? "",
          }
        : {
            schoolId,
            title: editValues.title ?? selectedDetail.title,
            description: editValues.description ?? (selectedDetail as HomeworkDetail).description ?? "",
            subject: editValues.subject ?? (selectedDetail as HomeworkDetail).subject ?? "",
            due_at: editValues.due_at || (selectedDetail.dueAt || ""),
            content_kind: editValues.content_kind ?? (selectedDetail as HomeworkDetail).contentKind ?? "homework",
            reason: editValues.reason ?? "",
          };

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      item?: TeacherMessageDetail | HomeworkDetail;
      error?: { message?: string };
    }>(endpoint, {
      method: "PATCH",
      headers: withJsonHeaders(),
      body: JSON.stringify(body),
    });

    setSaving(false);

    if (!response.ok || !payload?.item) {
      throw new Error(readApiError(payload, "تعذر حفظ التعديلات."));
    }

    setSelectedDetail(payload.item);
    setEditMode(false);
    setEditValues({});
    toast.success("تم حفظ التعديلات.");
    await fetchList();
  }, [selectedId, schoolId, selectedDetail, tab, editValues, toast, fetchList]);

  const handleDelete = useCallback(async () => {
    if (!selectedId || !schoolId) return;
    setSaving(true);
    const endpoint = tab === "messages" ? `/api/web/teacher-activity/messages/${selectedId}` : `/api/web/teacher-activity/homework/${selectedId}`;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{ error?: { message?: string } }>(endpoint, {
      method: "DELETE",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        schoolId,
        reason: editValues.reason ?? "",
      }),
    });
    setSaving(false);
    setConfirmDelete(false);

    if (!response.ok) {
      throw new Error(readApiError(payload, "تعذر حذف العنصر."));
    }

    setSelectedId(null);
    setSelectedDetail(null);
    setEditMode(false);
    setEditValues({});
    toast.success("تم الحذف بنجاح.");
    await fetchList();
  }, [selectedId, schoolId, tab, editValues.reason, toast, fetchList]);

  const summaryCards = useMemo(
    () => [
      { label: "الرسائل الحالية", value: String(messageItems.length).padStart(2, "0") },
      { label: "الواجبات الحالية", value: String(homeworkItems.length).padStart(2, "0") },
      { label: "الأساتذة المتاحون", value: String(meta.teachers.length).padStart(2, "0") },
      { label: "الفروع", value: String(meta.branches.length).padStart(2, "0") },
    ],
    [homeworkItems.length, messageItems.length, meta.branches.length, meta.teachers.length],
  );

  return (
    <ProtectedRoute roles={["super_admin", "admin"]} permissions={["view_teacher_activity"]}>
      <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,#dbeafe_0%,#f8fafc_35%,#f8fafc_100%)]">
        <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)]">
          <AppSidebar currentPath="/monitoring" showFloatingToggle />

          <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
            <SchoolScopeBanner scope={schoolScope} />

            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState scope={schoolScope} title="مراقبة نشاط الأساتذة" />
            ) : (
              <div className="space-y-5">
                <section className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="text-xs font-black tracking-[0.28em] text-slate-400">Teacher Monitoring</div>
                      <h1 className="mt-3 text-3xl font-black text-slate-900">صفحة مراقبة نشاط الأساتذة</h1>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-slate-500">
                        راقب رسائل الأساتذة وواجباتهم، عدّل المحتوى غير المناسب، واحفظ أثرًا تدقيقيًا لكل إجراء إداري.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
                      {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4">
                          <div className="text-xs font-bold text-slate-400">{card.label}</div>
                          <div className="mt-2 text-2xl font-black text-slate-900">{card.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <section className="rounded-[32px] border border-white/70 bg-white/80 p-6 shadow-[0_32px_80px_-36px_rgba(15,23,42,0.28)] backdrop-blur-xl">
                  <div className="flex flex-wrap gap-3">
                    <button
                      type="button"
                      onClick={() => {
                        setTab("messages");
                        setPage(1);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-black ${tab === "messages" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      الرسائل والإشعارات
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setTab("homework");
                        setPage(1);
                      }}
                      className={`rounded-full px-4 py-2 text-sm font-black ${tab === "homework" ? "bg-sky-600 text-white" : "bg-slate-100 text-slate-600"}`}
                    >
                      الواجبات
                    </button>
                  </div>

                  <div className="mt-5 grid gap-3 md:grid-cols-2 xl:grid-cols-6">
                    <input
                      className={inputClass()}
                      placeholder="بحث بالكلمات"
                      value={searchInput}
                      onChange={(event) => setSearchInput(event.target.value)}
                    />
                    <select className={inputClass()} value={branchId} onChange={(event) => { setBranchId(event.target.value); setPage(1); }}>
                      <option value="">كل الفروع</option>
                      {meta.branches.map((branch) => (
                        <option key={branch.id} value={branch.id}>{branch.name}</option>
                      ))}
                    </select>
                    <select className={inputClass()} value={teacherId} onChange={(event) => { setTeacherId(event.target.value); setPage(1); }}>
                      <option value="">كل الأساتذة</option>
                      {meta.teachers.map((teacher) => (
                        <option key={teacher.id} value={teacher.id}>{teacher.name}</option>
                      ))}
                    </select>
                    <select className={inputClass()} value={className} onChange={(event) => { setClassName(event.target.value); setPage(1); }}>
                      <option value="">كل الصفوف</option>
                      {meta.classes.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <select className={inputClass()} value={section} onChange={(event) => { setSection(event.target.value); setPage(1); }}>
                      <option value="">كل الشعب</option>
                      {meta.sections.map((value) => (
                        <option key={value} value={value}>{value}</option>
                      ))}
                    </select>
                    <select className={inputClass()} value={status} onChange={(event) => { setStatus(event.target.value as "all" | TeacherActivityStatus); setPage(1); }}>
                      <option value="all">كل الحالات</option>
                      <option value="active">نشط</option>
                      <option value="edited_by_admin">معدّل إداريًا</option>
                      <option value="deleted_by_admin">محذوف إداريًا</option>
                    </select>
                  </div>

                  <div className="mt-6 overflow-hidden rounded-[24px] border border-slate-100">
                    <div className="overflow-x-auto">
                      <table className="min-w-full divide-y divide-slate-100">
                        <thead className="bg-slate-50">
                          <tr className="text-right text-xs font-black text-slate-500">
                            <th className="px-4 py-3">العنوان</th>
                            <th className="px-4 py-3">الأستاذ</th>
                            <th className="px-4 py-3">الفرع</th>
                            <th className="px-4 py-3">{tab === "messages" ? "الاستهداف" : "الصف/الشعبة"}</th>
                            <th className="px-4 py-3">الحالة</th>
                            <th className="px-4 py-3">التاريخ</th>
                            <th className="px-4 py-3" />
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 bg-white">
                          {loading ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">جارٍ تحميل البيانات...</td>
                            </tr>
                          ) : currentItems.length === 0 ? (
                            <tr>
                              <td colSpan={7} className="px-4 py-10 text-center text-sm text-slate-500">لا توجد بيانات مطابقة للفلاتر الحالية.</td>
                            </tr>
                          ) : (
                            currentItems.map((item) => (
                              <tr key={item.id} className="text-sm text-slate-700">
                                <td className="px-4 py-4">
                                  <div className="font-black text-slate-900">{item.title}</div>
                                  <div className="mt-1 line-clamp-2 max-w-[340px] text-xs text-slate-500">
                                    {"message" in item ? item.message : item.description || "—"}
                                  </div>
                                </td>
                                <td className="px-4 py-4">{item.teacherName || "—"}</td>
                                <td className="px-4 py-4">{item.branchName || "—"}</td>
                                <td className="px-4 py-4">
                                  {"targetCount" in item ? `${item.targetCount} طالب` : `${item.className || "—"} / ${item.section || "—"}`}
                                </td>
                                <td className="px-4 py-4">
                                  <span className={`inline-flex rounded-full px-3 py-1 text-xs font-black ${badgeTone(item.status)}`}>
                                    {statusLabel(item.status)}
                                  </span>
                                </td>
                                <td className="px-4 py-4">{formatDateTime(item.createdAt)}</td>
                                <td className="px-4 py-4">
                                  <button
                                    type="button"
                                    onClick={() => void openDetail(item.id).catch((error) => toast.error(error instanceof Error ? error.message : "تعذر تحميل التفاصيل."))}
                                    className="rounded-full bg-slate-100 px-3 py-2 text-xs font-black text-slate-700"
                                  >
                                    تفاصيل
                                  </button>
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>

                  <div className="mt-4 flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-500">إجمالي السجلات: {totalCount}</div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        disabled={page <= 1}
                        onClick={() => setPage((current) => Math.max(1, current - 1))}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-40"
                      >
                        السابق
                      </button>
                      <span className="text-sm font-bold text-slate-600">
                        صفحة {page} من {pageCount}
                      </span>
                      <button
                        type="button"
                        disabled={page >= pageCount}
                        onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                        className="rounded-full bg-slate-100 px-4 py-2 text-sm font-black text-slate-700 disabled:opacity-40"
                      >
                        التالي
                      </button>
                    </div>
                  </div>
                </section>
              </div>
            )}
          </main>
        </div>
      </div>

      {selectedDetail && selectedId ? (
        <DetailModal
          tab={tab}
          item={selectedDetail}
          editValues={editValues}
          onChange={(key, value) => setEditValues((current) => ({ ...current, [key]: value }))}
          editMode={editMode}
          onClose={() => {
            setSelectedId(null);
            setSelectedDetail(null);
            setEditMode(false);
            setEditValues({});
          }}
          onEditToggle={() => {
            if (!canModerate) return;
            setEditMode(true);
          }}
          onSave={() => void handleSave().catch((error) => toast.error(error instanceof Error ? error.message : "تعذر حفظ التعديلات."))}
          onDelete={() => {
            if (!canModerate) return;
            setConfirmDelete(true);
          }}
          saving={saving}
          canModerate={canModerate}
        />
      ) : null}

      <ConfirmDialog
        open={confirmDelete}
        title="حذف هذا المحتوى؟"
        description="سيتم تطبيق حذف إداري ناعم مع الاحتفاظ بسجل التدقيق."
        confirmLabel="حذف"
        busy={saving}
        onClose={() => setConfirmDelete(false)}
        onConfirm={() => void handleDelete().catch((error) => toast.error(error instanceof Error ? error.message : "تعذر حذف العنصر."))}
      />
    </ProtectedRoute>
  );
}
