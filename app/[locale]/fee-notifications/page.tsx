"use client";

import { useCallback, useEffect, useMemo, useState } from "react";

import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useToast } from "@/components/toast";
import { useRole } from "@/hooks/useRole";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { resolveSchoolIdForProfile } from "@/lib/school-context";
import type {
  FeeNotificationDetail,
  FeeNotificationHistoryItem,
  MonitoringMetaResponse,
} from "@/lib/teacher-activity";

const PAGE_SIZE = 20;
const EMPTY_META: MonitoringMetaResponse = {
  branches: [],
  teachers: [],
  classes: [],
  sections: [],
  students: [],
};

function inputClass() {
  return "min-h-11 rounded-[16px] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";
}

function areaClass() {
  return "min-h-[120px] rounded-[18px] border border-[var(--border)] bg-[var(--surface-strong)] px-3 py-3 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10";
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

function targetModeLabel(value: string) {
  switch (value) {
    case "all_students":
      return "كل الطلاب";
    case "branch":
      return "حسب الفرع";
    case "class_section":
      return "حسب الصف/الشعبة";
    case "specific_students":
      return "طلاب محددون";
    default:
      return "المدرسة الحالية";
  }
}

function HistoryModal({
  item,
  onClose,
}: {
  item: FeeNotificationDetail;
  onClose: () => void;
}) {
  return (
    <div className="fixed inset-0 z-[320] flex items-center justify-center bg-slate-950/55 p-4 backdrop-blur-sm">
      <div className="max-h-[88vh] w-full max-w-4xl overflow-hidden rounded-[28px] bg-white shadow-[0_32px_90px_rgba(15,23,42,0.28)] dark:bg-slate-900 dark:shadow-[0_32px_90px_rgba(0,0,0,0.5)]">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5 dark:border-slate-800">
          <div>
            <div className="text-xs font-black tracking-[0.24em] text-slate-400">Fee Notification</div>
            <h2 className="mt-2 text-2xl font-black text-slate-900 dark:text-slate-100">{item.title}</h2>
            <div className="mt-2 text-sm text-slate-500 dark:text-slate-400">{item.message}</div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-2 text-sm font-bold text-slate-600 dark:bg-slate-800 dark:text-slate-400"
          >
            إغلاق
          </button>
        </div>

        <div className="grid max-h-[calc(88vh-92px)] grid-cols-1 gap-0 overflow-y-auto lg:grid-cols-[320px_minmax(0,1fr)]">
          <aside className="border-b border-slate-100 bg-slate-50 px-6 py-5 dark:border-slate-800 dark:bg-slate-800/50 lg:border-b-0 lg:border-l">
            <div className="space-y-3 text-sm text-slate-600 dark:text-slate-400">
              <div>
                <div className="text-xs font-bold text-slate-400">الاستهداف</div>
                <div className="mt-1 font-black text-slate-900 dark:text-slate-100">{targetModeLabel(item.targetMode)}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400">أنشأه</div>
                <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{item.createdByName || "—"}</div>
              </div>
              <div>
                <div className="text-xs font-bold text-slate-400">وقت الإنشاء</div>
                <div className="mt-1 font-semibold text-slate-800 dark:text-slate-200">{formatDateTime(item.createdAt)}</div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                  <div className="text-xs font-bold text-slate-400">تم الإرسال</div>
                  <div className="mt-2 text-xl font-black text-emerald-700 dark:text-emerald-500">{item.sentCount}</div>
                </div>
                <div className="rounded-[18px] bg-white px-4 py-3 shadow-sm dark:bg-slate-900">
                  <div className="text-xs font-bold text-slate-400">فشل</div>
                  <div className="mt-2 text-xl font-black text-rose-700 dark:text-rose-500">{item.failedCount}</div>
                </div>
              </div>
            </div>
          </aside>

          <div className="px-6 py-5">
            <div className="rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">سجل المستلمين</div>
              <div className="mt-4 space-y-3">
                {item.recipients.length > 0 ? (
                  item.recipients.map((recipient) => (
                    <div key={recipient.id} className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <div className="text-sm font-black text-slate-800 dark:text-slate-200">{recipient.studentName || "طالب"}</div>
                        <span className={`rounded-full px-3 py-1 text-xs font-black ${recipient.deliveryStatus === "sent" ? "bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-500" : "bg-rose-100 text-rose-700 dark:bg-rose-900/30 dark:text-rose-500"}`}>
                          {recipient.deliveryStatus === "sent" ? "تم" : "فشل"}
                        </span>
                      </div>
                      <div className="mt-2 text-xs text-slate-500 dark:text-slate-400">{formatDateTime(recipient.createdAt)}</div>
                      {recipient.failureReason ? <div className="mt-2 text-xs text-rose-600 dark:text-rose-400">{recipient.failureReason}</div> : null}
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    لا يوجد مستلمون مسجّلون لهذا التنبيه.
                  </div>
                )}
              </div>
            </div>

            <div className="mt-5 rounded-[22px] border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50">
              <div className="text-sm font-black text-slate-800 dark:text-slate-200">سجل التدقيق</div>
              <div className="mt-4 space-y-3">
                {item.auditTrail.length > 0 ? (
                  item.auditTrail.map((entry) => (
                    <div key={entry.id} className="rounded-[18px] border border-white bg-white px-4 py-3 shadow-sm dark:border-slate-800 dark:bg-slate-900">
                      <div className="text-sm font-black text-slate-800 dark:text-slate-200">{entry.summary}</div>
                      <div className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {entry.actorName || entry.actorEmail || "إدارة"} • {formatDateTime(entry.createdAt)}
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="rounded-[18px] border border-dashed border-slate-200 bg-white px-4 py-4 text-sm text-slate-500 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-400">
                    لا يوجد سجل تدقيق بعد.
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default function FeeNotificationsPage() {
  const { profile, can } = useRole();
  const schoolScope = useSchoolScope(profile);
  const toast = useToast();
  const canSendFeeNotifications = can("send_fee_notifications");
  const [schoolId, setSchoolId] = useState<string | null>(null);
  const [meta, setMeta] = useState<MonitoringMetaResponse>(EMPTY_META);
  const [history, setHistory] = useState<FeeNotificationHistoryItem[]>([]);
  const [selectedDetail, setSelectedDetail] = useState<FeeNotificationDetail | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [studentSearchInput, setStudentSearchInput] = useState("");
  const [studentSearch, setStudentSearch] = useState("");
  const [search, setSearch] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [historyBranchId, setHistoryBranchId] = useState("");
  const [form, setForm] = useState({
    title: "",
    message: "",
    note: "",
    due_at: "",
    deep_link: "",
    target_mode: "all_students",
    branch_id: "",
    class_name: "",
    section: "",
    student_ids: [] as string[],
  });

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setSearch(searchInput.trim()), 300);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => setStudentSearch(studentSearchInput.trim()), 250);
    return () => window.clearTimeout(timeoutId);
  }, [studentSearchInput]);

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
    if (form.branch_id) params.set("branchId", form.branch_id);
    if (form.class_name) params.set("className", form.class_name);
    if (form.section) params.set("section", form.section);
    if (studentSearch) params.set("studentQuery", studentSearch);

    const { response, payload } = await fetchJsonWithAuthorizedSession<MonitoringMetaResponse & { error?: { message?: string } }>(
      `/api/web/teacher-activity/meta?${params.toString()}`,
    );
    if (!response.ok) {
      throw new Error(readApiError(payload, "تعذر تحميل بيانات الاستهداف."));
    }

    setMeta({
      branches: payload?.branches ?? [],
      teachers: payload?.teachers ?? [],
      classes: payload?.classes ?? [],
      sections: payload?.sections ?? [],
      students: payload?.students ?? [],
    });
  }, [schoolId, form.branch_id, form.class_name, form.section, studentSearch]);

  const fetchHistory = useCallback(async () => {
    if (!schoolId) {
      setHistory([]);
      setTotalCount(0);
      return;
    }

    setLoading(true);
    const params = new URLSearchParams({
      schoolId,
      page: String(page),
      pageSize: String(PAGE_SIZE),
      search,
    });
    if (historyBranchId) params.set("branchId", historyBranchId);

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      items?: FeeNotificationHistoryItem[];
      totalCount?: number;
      error?: { message?: string };
    }>(`/api/web/fee-notifications?${params.toString()}`);

    setLoading(false);

    if (!response.ok) {
      throw new Error(readApiError(payload, "تعذر تحميل سجل التنبيهات."));
    }

    setHistory(payload?.items ?? []);
    setTotalCount(payload?.totalCount ?? 0);
  }, [schoolId, page, search, historyBranchId]);

  useEffect(() => {
    if (!schoolId || schoolScope.shouldBlockContent) return;
    void fetchMeta().catch((error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل بيانات الاستهداف.");
    });
  }, [fetchMeta, schoolId, schoolScope.shouldBlockContent, toast]);

  useEffect(() => {
    if (!schoolId || schoolScope.shouldBlockContent) return;
    void fetchHistory().catch((error) => {
      toast.error(error instanceof Error ? error.message : "تعذر تحميل السجل.");
      setLoading(false);
    });
  }, [fetchHistory, schoolId, schoolScope.shouldBlockContent, toast]);

  const openDetail = useCallback(async (id: string) => {
    if (!schoolId) return;
    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      item?: FeeNotificationDetail;
      error?: { message?: string };
    }>(`/api/web/fee-notifications/${id}?schoolId=${encodeURIComponent(schoolId)}`);

    if (!response.ok || !payload?.item) {
      throw new Error(readApiError(payload, "تعذر تحميل تفاصيل التنبيه."));
    }

    setSelectedDetail(payload.item);
  }, [schoolId]);

  const toggleStudent = useCallback((studentId: string) => {
    setForm((current) => ({
      ...current,
      student_ids: current.student_ids.includes(studentId)
        ? current.student_ids.filter((id) => id !== studentId)
        : [...current.student_ids, studentId],
    }));
  }, []);

  const handleSend = useCallback(async () => {
    if (!schoolId) return;
    setSending(true);

    const { response, payload } = await fetchJsonWithAuthorizedSession<{
      item?: FeeNotificationDetail;
      error?: { message?: string };
    }>("/api/web/fee-notifications", {
      method: "POST",
      headers: withJsonHeaders(),
      body: JSON.stringify({
        schoolId,
        title: form.title,
        message: form.message,
        note: form.note,
        due_at: form.due_at || null,
        deep_link: form.deep_link || null,
        target_mode: form.target_mode,
        branch_id: form.branch_id || null,
        class_name: form.class_name || null,
        section: form.section || null,
        student_ids: form.student_ids,
      }),
    });

    setSending(false);

    if (!response.ok || !payload?.item) {
      throw new Error(readApiError(payload, "تعذر إرسال التنبيه."));
    }

    toast.success("تم إرسال تنبيه الأقساط.");
    setForm({
      title: "",
      message: "",
      note: "",
      due_at: "",
      deep_link: "",
      target_mode: "all_students",
      branch_id: "",
      class_name: "",
      section: "",
      student_ids: [],
    });
    setStudentSearch("");
    setStudentSearchInput("");
    setSelectedDetail(payload.item);
    await Promise.all([fetchMeta(), fetchHistory()]);
  }, [schoolId, form, toast, fetchHistory, fetchMeta]);

  const pageCount = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const selectedStudentsCount = form.student_ids.length;

  const summaryCards = useMemo(
    () => [
      { label: "سجل التنبيهات", value: String(history.length).padStart(2, "0") },
      { label: "الطلاب المحددون", value: String(selectedStudentsCount).padStart(2, "0") },
      { label: "الفروع", value: String(meta.branches.length).padStart(2, "0") },
      { label: "الصفوف", value: String(meta.classes.length).padStart(2, "0") },
    ],
    [history.length, selectedStudentsCount, meta.branches.length, meta.classes.length],
  );

  return (
    <ProtectedRoute roles={["super_admin", "admin"]} permissions={["view_fee_notifications", "send_fee_notifications"]}>
      <div className="min-h-screen bg-[var(--surface-muted)]">
        <div className="mx-auto grid min-h-screen max-w-[1600px] grid-cols-1 xl:grid-cols-[270px_minmax(0,1fr)]">
          <AppSidebar currentPath="/fee-notifications" />
          <main className="min-w-0 px-4 py-4 sm:px-6 lg:px-8">
            <SchoolScopeBanner scope={schoolScope} />

            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState scope={schoolScope} title="تنبيهات الأقساط" />
            ) : (
              <div className="space-y-5">
                <section className="rounded-[32px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-xl">
                  <div className="flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
                    <div>
                      <div className="text-xs font-black tracking-[0.28em] text-[var(--text-muted)]">Installment Reminders</div>
                      <h1 className="mt-3 text-3xl font-black text-[var(--text-primary)]">تنبيهات الأقساط</h1>
                      <p className="mt-3 max-w-3xl text-sm leading-7 text-[var(--text-muted)]">
                        أرسل تذكيرات الرسوم للطلاب من الويب نفسه الذي يغذي التطبيق، مع تتبع عدد المرسَل والفاشل وتاريخ كامل لكل حملة.
                      </p>
                    </div>

                    <div className="grid w-full gap-3 sm:grid-cols-2 xl:w-auto xl:grid-cols-4">
                      {summaryCards.map((card) => (
                        <div key={card.label} className="rounded-[22px] border border-[var(--border)] bg-[var(--surface-muted)] px-4 py-4">
                          <div className="text-xs font-bold text-[var(--text-muted)]">{card.label}</div>
                          <div className="mt-2 text-2xl font-black text-[var(--text-primary)]">{card.value}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </section>

                <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_460px]">
                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-xl">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h2 className="text-xl font-black text-[var(--text-primary)]">سجل تنبيهات الأقساط</h2>
                        <p className="mt-1 text-sm text-[var(--text-muted)]">راجع الإرسال السابق وافتح التفاصيل لمعرفة المستلمين وسجل التدقيق.</p>
                      </div>
                      <div className="flex w-full max-w-[460px] gap-3">
                        <select
                          className={`${inputClass()} max-w-[180px]`}
                          value={historyBranchId}
                          onChange={(event) => {
                            setHistoryBranchId(event.target.value);
                            setPage(1);
                          }}
                        >
                          <option value="">كل الفروع</option>
                          {meta.branches.map((branch) => (
                            <option key={branch.id} value={branch.id}>{branch.name}</option>
                          ))}
                        </select>
                        <input
                          className={`${inputClass()} flex-1`}
                          placeholder="بحث في السجل"
                          value={searchInput}
                          onChange={(event) => {
                            setSearchInput(event.target.value);
                            setPage(1);
                          }}
                        />
                      </div>
                    </div>

                    <div className="mt-5 overflow-hidden rounded-[24px] border border-[var(--border)]">
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-[var(--border)]">
                          <thead className="bg-[var(--surface-muted)]">
                            <tr className="text-right text-xs font-black text-[var(--text-muted)]">
                              <th className="px-4 py-3">العنوان</th>
                              <th className="px-4 py-3">الاستهداف</th>
                              <th className="px-4 py-3">تم</th>
                              <th className="px-4 py-3">فشل</th>
                              <th className="px-4 py-3">التاريخ</th>
                              <th className="px-4 py-3" />
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-[var(--border)] bg-[var(--card-bg)]">
                            {loading ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">جارٍ تحميل السجل...</td>
                              </tr>
                            ) : history.length === 0 ? (
                              <tr>
                                <td colSpan={6} className="px-4 py-10 text-center text-sm text-[var(--text-muted)]">لا توجد تنبيهات مرسلة بعد.</td>
                              </tr>
                            ) : (
                              history.map((item) => (
                                <tr key={item.id} className="text-sm text-[var(--text-secondary)]">
                                  <td className="px-4 py-4">
                                    <div className="font-black text-[var(--text-primary)]">{item.title}</div>
                                    <div className="mt-1 line-clamp-2 max-w-[320px] text-xs text-[var(--text-muted)]">{item.message}</div>
                                  </td>
                                  <td className="px-4 py-4">{targetModeLabel(item.targetMode)}</td>
                                  <td className="px-4 py-4 font-black text-[var(--success)]">{item.sentCount}</td>
                                  <td className="px-4 py-4 font-black text-[var(--danger)]">{item.failedCount}</td>
                                  <td className="px-4 py-4">{formatDateTime(item.createdAt)}</td>
                                  <td className="px-4 py-4">
                                    <button
                                      type="button"
                                      onClick={() => void openDetail(item.id).catch((error) => toast.error(error instanceof Error ? error.message : "تعذر تحميل التفاصيل."))}
                                      className="rounded-full bg-[var(--surface-muted)] px-3 py-2 text-xs font-black text-[var(--text-secondary)]"
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
                      <div className="text-sm text-[var(--text-muted)]">إجمالي السجلات: {totalCount}</div>
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          disabled={page <= 1}
                          onClick={() => setPage((current) => Math.max(1, current - 1))}
                          className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-black text-[var(--text-secondary)] disabled:opacity-40"
                        >
                          السابق
                        </button>
                        <span className="text-sm font-bold text-[var(--text-secondary)]">
                          صفحة {page} من {pageCount}
                        </span>
                        <button
                          type="button"
                          disabled={page >= pageCount}
                          onClick={() => setPage((current) => Math.min(pageCount, current + 1))}
                          className="rounded-full bg-[var(--surface-muted)] px-4 py-2 text-sm font-black text-[var(--text-secondary)] disabled:opacity-40"
                        >
                          التالي
                        </button>
                      </div>
                    </div>
                  </section>

                  <section className="rounded-[32px] border border-[var(--border)] bg-[var(--card-bg)] p-6 shadow-[var(--card-shadow)] backdrop-blur-xl">
                    <div>
                      <h2 className="text-xl font-black text-[var(--text-primary)]">إنشاء تنبيه قسط</h2>
                      <p className="mt-1 text-sm text-[var(--text-muted)]">أرسل تذكيرًا إلى كل الطلاب أو حسب الفرع أو الصف أو مجموعة طلاب محددة.</p>
                    </div>

                    <div className="mt-5 space-y-4">
                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">العنوان</span>
                        <input className={inputClass()} value={form.title} onChange={(event) => setForm((current) => ({ ...current, title: event.target.value }))} />
                      </label>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الرسالة</span>
                        <textarea className={areaClass()} value={form.message} onChange={(event) => setForm((current) => ({ ...current, message: event.target.value }))} />
                      </label>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">نوع الاستهداف</span>
                          <select className={inputClass()} value={form.target_mode} onChange={(event) => setForm((current) => ({ ...current, target_mode: event.target.value, student_ids: [] }))}>
                            <option value="all_students">كل الطلاب</option>
                            <option value="school">المدرسة الحالية</option>
                            <option value="branch">فرع محدد</option>
                            <option value="class_section">صف/شعبة</option>
                            <option value="specific_students">طلاب محددون</option>
                          </select>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الفرع</span>
                          <select className={inputClass()} value={form.branch_id} onChange={(event) => setForm((current) => ({ ...current, branch_id: event.target.value, student_ids: [] }))}>
                            <option value="">كل الفروع</option>
                            {meta.branches.map((branch) => (
                              <option key={branch.id} value={branch.id}>{branch.name}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الصف</span>
                          <select className={inputClass()} value={form.class_name} onChange={(event) => setForm((current) => ({ ...current, class_name: event.target.value, student_ids: [] }))}>
                            <option value="">كل الصفوف</option>
                            {meta.classes.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الشعبة</span>
                          <select className={inputClass()} value={form.section} onChange={(event) => setForm((current) => ({ ...current, section: event.target.value, student_ids: [] }))}>
                            <option value="">كل الشعب</option>
                            {meta.sections.map((value) => (
                              <option key={value} value={value}>{value}</option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <div className="grid gap-4 md:grid-cols-2">
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">تاريخ الاستحقاق</span>
                          <input type="datetime-local" className={inputClass()} value={form.due_at} onChange={(event) => setForm((current) => ({ ...current, due_at: event.target.value }))} />
                        </label>
                        <label className="flex flex-col gap-2">
                          <span className="text-xs font-bold text-slate-500 dark:text-slate-400">الرابط العميق</span>
                          <input className={inputClass()} value={form.deep_link} onChange={(event) => setForm((current) => ({ ...current, deep_link: event.target.value }))} />
                        </label>
                      </div>

                      <label className="flex flex-col gap-2">
                        <span className="text-xs font-bold text-slate-500 dark:text-slate-400">ملاحظة</span>
                        <input className={inputClass()} value={form.note} onChange={(event) => setForm((current) => ({ ...current, note: event.target.value }))} />
                      </label>

                      {form.target_mode === "specific_students" ? (
                        <div className="rounded-[24px] border border-slate-100 bg-slate-50 px-4 py-4 dark:border-slate-800 dark:bg-slate-800/50">
                          <div className="flex items-center justify-between gap-3">
                            <div className="text-sm font-black text-slate-800 dark:text-slate-200">تحديد طلاب بالاسم</div>
                            <input
                              className={`${inputClass()} w-full max-w-[220px]`}
                              placeholder="ابحث عن طالب"
                              value={studentSearchInput}
                              onChange={(event) => setStudentSearchInput(event.target.value)}
                            />
                          </div>
                          <div className="mt-4 grid max-h-[220px] gap-2 overflow-y-auto">
                            {meta.students.map((student) => {
                              const checked = form.student_ids.includes(student.id);
                              return (
                                <label key={student.id} className="flex items-center gap-3 rounded-[16px] bg-white px-3 py-3 shadow-sm dark:bg-slate-900">
                                  <input type="checkbox" checked={checked} onChange={() => toggleStudent(student.id)} />
                                  <span className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                                    {student.fullName} {student.className ? `• ${student.className}` : ""} {student.section ? `• ${student.section}` : ""}
                                  </span>
                                </label>
                              );
                            })}
                            {meta.students.length === 0 ? <div className="text-sm text-[var(--text-muted)]">لا توجد نتائج للطلاب.</div> : null}
                          </div>
                        </div>
                      ) : null}

                      <button
                        type="button"
                        disabled={sending || !canSendFeeNotifications}
                        onClick={() => void handleSend().catch((error) => toast.error(error instanceof Error ? error.message : "تعذر إرسال التنبيه."))}
                        className="w-full rounded-[18px] bg-[var(--primary)] px-4 py-3 text-sm font-black text-white"
                      >
                        {sending ? "جارٍ الإرسال..." : canSendFeeNotifications ? "إرسال التنبيه" : "لا تملك صلاحية الإرسال"}
                      </button>
                    </div>
                  </section>
                </div>
              </div>
            )}

            {selectedDetail ? <HistoryModal item={selectedDetail} onClose={() => setSelectedDetail(null)} /> : null}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
