"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveBranchIdForSchool, resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

function buildReceiptNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().split("-")[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `REC-${stamp}-${randomPart}`;
}

const SEARCH_DEBOUNCE_MS = 300;
const PAGE_SIZE = 25;
const EMPTY_SUMMARY = {
  totalStudents: 0,
  totalFee: 0,
  totalPaid: 0,
  totalRemaining: 0,
  collectedCount: 0,
};

type PaymentsMetaState = {
  summary: typeof EMPTY_SUMMARY;
  classOptions: string[];
  paymentYears: number[];
  totalPaymentCount: number;
  archives: any[];
  archiveNotice: string;
};

type PaymentsPageState = {
  students: any[];
  paymentCountsByStudent: Record<string, number>;
  totalCount: number;
};

const paymentsMetaCache = new Map<string, PaymentsMetaState>();
const paymentsPageCache = new Map<string, PaymentsPageState>();

export default function PaymentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, can } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const canAddPayments = can("add_payments");
  const canDeletePayments = can("delete_payments");
  const [students, setStudents] = useState<any[]>([]);
  const [classes, setClasses] = useState<string[]>([]);
  const [paymentCountsByStudent, setPaymentCountsByStudent] = useState<Record<string, number>>({});
  const [paymentYears, setPaymentYears] = useState<number[]>([]);
  const [totalPaymentCount, setTotalPaymentCount] = useState(0);
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<string, any[]>>({});
  const [paymentsLoadingStudentId, setPaymentsLoadingStudentId] = useState<string | null>(null);
  const [archives, setArchives] = useState<any[]>([]);
  const [summary, setSummary] = useState(EMPTY_SUMMARY);
  const [metaLoading, setMetaLoading] = useState(true);
  const [loading, setLoading] = useState(true);
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [archiving, setArchiving] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<any>(null);
  const [showArchiveDetail, setShowArchiveDetail] = useState(false);
  const [archiveExportingId, setArchiveExportingId] = useState<string | null>(null);

  // فلاتر
  const [quickFilter, setQuickFilter] = useState("all");
  const [filterClass, setFilterClass] = useState("");
  const [filterSort, setFilterSort] = useState("name");
  const [filterDir, setFilterDir] = useState("asc");

  // تفاصيل
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  // دفعة
  const [showPayModal, setShowPayModal] = useState(false);
  const [pendingDeletePaymentId, setPendingDeletePaymentId] = useState<string | null>(null);
  const [payStudent, setPayStudent] = useState<any>(null);
  const [saving, setSaving] = useState(false);
  const [payForm, setPayForm] = useState({
    amount: "",
    payment_method: "cash",
    notes: "",
    receipt_date: new Date().toISOString().split("T")[0],
    manual_receipt_number: "",
  });
  const [studentSearch, setStudentSearch] = useState("");
  const [studentSearchResults, setStudentSearchResults] = useState<any[]>([]);
  const [studentSearchLoading, setStudentSearchLoading] = useState(false);
  const [showDropdown, setShowDropdown] = useState(false);
  const [exporting, setExporting] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;

    let cancelled = false;
    setMetaLoading(true);
    setLoading(true);
    setError("");

    void (async () => {
      try {
        const scopedSchoolId = await resolveSchoolIdForProfile(profile, {
          selectedSchoolId: schoolScope.selectedSchoolId,
        });

        if (cancelled) return;

        setResolvedSchoolId(scopedSchoolId);
        setPage(1);
        setPaymentsByStudent({});

        if (!scopedSchoolId) {
          setStudents([]);
          setClasses([]);
          setSummary(EMPTY_SUMMARY);
          setPaymentCountsByStudent({});
          setPaymentYears([]);
          setTotalPaymentCount(0);
          setArchives([]);
          setArchiveNotice("");
          setTotalCount(0);
          setMetaLoading(false);
          setLoading(false);
        }
      } catch (scopeError) {
        if (cancelled) return;
        setResolvedSchoolId(null);
        setStudents([]);
        setClasses([]);
        setSummary(EMPTY_SUMMARY);
        setPaymentCountsByStudent({});
        setPaymentYears([]);
        setTotalPaymentCount(0);
        setArchives([]);
        setArchiveNotice("");
        setTotalCount(0);
        setMetaLoading(false);
        setLoading(false);
        setError(scopeError instanceof Error ? scopeError.message : "تعذر تحديد المدرسة الحالية.");
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

  const fetchMeta = useCallback(async () => {
    if (!resolvedSchoolId) return;

    const cached = paymentsMetaCache.get(resolvedSchoolId);
    if (cached) {
      setSummary(cached.summary);
      setClasses(cached.classOptions);
      setPaymentYears(cached.paymentYears);
      setTotalPaymentCount(cached.totalPaymentCount);
      setArchives(cached.archives);
      setArchiveNotice(cached.archiveNotice);
      setMetaLoading(false);
    } else {
      setMetaLoading(true);
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        summary?: typeof EMPTY_SUMMARY;
        classOptions?: string[];
        paymentYears?: number[];
        totalPaymentCount?: number;
        archives?: any[];
        archiveNotice?: string;
        error?: { message?: string };
      }>(`/api/web/payments/meta?schoolId=${encodeURIComponent(resolvedSchoolId)}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل ملخص المدفوعات.");
      }

      const nextMeta = {
        summary: payload?.summary ?? EMPTY_SUMMARY,
        classOptions: payload?.classOptions ?? [],
        paymentYears: payload?.paymentYears ?? [],
        totalPaymentCount: typeof payload?.totalPaymentCount === "number" ? payload.totalPaymentCount : 0,
        archives: payload?.archives ?? [],
        archiveNotice: payload?.archiveNotice ?? "",
      } satisfies PaymentsMetaState;

      paymentsMetaCache.set(resolvedSchoolId, nextMeta);
      setSummary(nextMeta.summary);
      setClasses(nextMeta.classOptions);
      setPaymentYears(nextMeta.paymentYears);
      setTotalPaymentCount(nextMeta.totalPaymentCount);
      setArchives(nextMeta.archives);
      setArchiveNotice(nextMeta.archiveNotice);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل ملخص المدفوعات.");
    } finally {
      setMetaLoading(false);
    }
  }, [resolvedSchoolId]);

  const buildStudentsQueryParams = useCallback(() => {
    const params = new URLSearchParams({
      schoolId: resolvedSchoolId ?? "",
      page: String(page),
      pageSize: String(PAGE_SIZE),
      quickFilter,
      sort: filterSort,
      dir: filterDir,
    });

    if (search) {
      params.set("search", search);
    }

    if (filterClass) {
      params.set("className", filterClass);
    }

    return params;
  }, [filterClass, filterDir, filterSort, page, quickFilter, resolvedSchoolId, search]);

  const fetchStudentsPage = useCallback(async () => {
    if (!resolvedSchoolId) return;

    const params = buildStudentsQueryParams();
    const cacheKey = params.toString();
    const cached = paymentsPageCache.get(cacheKey);

    if (cached) {
      setStudents(cached.students);
      setPaymentCountsByStudent(cached.paymentCountsByStudent);
      setTotalCount(cached.totalCount);
      setLoading(false);
    } else {
      setLoading(true);
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: any[];
        paymentCountsByStudent?: Record<string, number>;
        totalCount?: number;
        error?: { message?: string };
      }>(`/api/web/payments/students?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل قائمة المدفوعات.");
      }

      const nextPage = {
        students: payload?.students ?? [],
        paymentCountsByStudent: payload?.paymentCountsByStudent ?? {},
        totalCount: typeof payload?.totalCount === "number" ? payload.totalCount : 0,
      } satisfies PaymentsPageState;

      paymentsPageCache.set(cacheKey, nextPage);
      setStudents(nextPage.students);
      setPaymentCountsByStudent(nextPage.paymentCountsByStudent);
      setTotalCount(nextPage.totalCount);
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل قائمة المدفوعات.");
      if (!cached) {
        setStudents([]);
        setPaymentCountsByStudent({});
        setTotalCount(0);
      }
    } finally {
      setLoading(false);
    }
  }, [buildStudentsQueryParams, resolvedSchoolId]);

  useEffect(() => {
    if (!resolvedSchoolId) return;
    void fetchMeta();
  }, [fetchMeta, resolvedSchoolId]);

  useEffect(() => {
    if (!resolvedSchoolId) return;
    void fetchStudentsPage();
  }, [fetchStudentsPage, resolvedSchoolId]);

  useEffect(() => {
    setPage(1);
  }, [resolvedSchoolId, search, quickFilter, filterClass, filterSort, filterDir]);

  useEffect(() => {
    if (!showPayModal || !resolvedSchoolId || payStudent || !studentSearch.trim()) {
      setStudentSearchResults([]);
      setStudentSearchLoading(false);
      return;
    }

    let cancelled = false;
    const timeoutId = window.setTimeout(() => {
      setStudentSearchLoading(true);
      void (async () => {
        try {
          const params = new URLSearchParams({
            schoolId: resolvedSchoolId,
            q: studentSearch.trim(),
            limit: "8",
          });
          const { response, payload } = await fetchJsonWithAuthorizedSession<{
            students?: any[];
            error?: { message?: string };
          }>(`/api/web/payments/student-search?${params.toString()}`);

          if (cancelled) return;
          if (!response.ok) {
            throw new Error(payload?.error?.message || "تعذر تحميل نتائج البحث.");
          }

          setStudentSearchResults(payload?.students ?? []);
        } catch (searchError) {
          if (cancelled) return;
          setStudentSearchResults([]);
          setError(searchError instanceof Error ? searchError.message : "تعذر تحميل نتائج البحث.");
        } finally {
          if (!cancelled) {
            setStudentSearchLoading(false);
          }
        }
      })();
    }, SEARCH_DEBOUNCE_MS);

    return () => {
      cancelled = true;
      window.clearTimeout(timeoutId);
    };
  }, [payStudent, resolvedSchoolId, showPayModal, studentSearch]);

  function applyStudentFinancialUpdate(studentId: string, update: { paid_fee: number; remaining_fee: number }) {
    setStudents((current) =>
      current.map((student) =>
        student.id === studentId
          ? {
              ...student,
              paid_fee: update.paid_fee,
              remaining_fee: update.remaining_fee,
            }
          : student,
      ),
    );
    setSelectedStudent((current: any) =>
      current?.id === studentId
        ? {
            ...current,
            paid_fee: update.paid_fee,
            remaining_fee: update.remaining_fee,
          }
        : current,
    );
    setPayStudent((current: any) =>
      current?.id === studentId
        ? {
            ...current,
            paid_fee: update.paid_fee,
            remaining_fee: update.remaining_fee,
          }
        : current,
    );
  }

  const loadStudentPayments = useCallback(
    async (studentId: string, options?: { force?: boolean }) => {
      if (!resolvedSchoolId) return [];
      if (!options?.force && paymentsByStudent[studentId]) {
        return paymentsByStudent[studentId];
      }

      setPaymentsLoadingStudentId(studentId);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          payments?: any[];
          error?: { message?: string };
        }>(`/api/web/payments/students/${studentId}?schoolId=${encodeURIComponent(resolvedSchoolId)}`);

        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تحميل سجل دفعات الطالب.");
        }

        const nextPayments = payload?.payments ?? [];
        setPaymentsByStudent((current) => ({ ...current, [studentId]: nextPayments }));
        return nextPayments;
      } catch (loadError) {
        setError(loadError instanceof Error ? loadError.message : "تعذر تحميل سجل دفعات الطالب.");
        return [];
      } finally {
        setPaymentsLoadingStudentId((current) => (current === studentId ? null : current));
      }
    },
    [paymentsByStudent, resolvedSchoolId],
  );

  const openStudentDetail = useCallback(
    async (student: any) => {
      setSelectedStudent(student);
      setShowDetail(true);
      void loadStudentPayments(student.id);
    },
    [loadStudentPayments],
  );

  async function handlePayment(e: React.FormEvent) {
    e.preventDefault();
    if (!canAddPayments) {
      setError("ليس لديك صلاحية إضافة دفعات جديدة.");
      return;
    }
    if (!payStudent) return;
    setSaving(true);
    setError("");
    const amount = parseInt(payForm.amount);
    if (!amount || amount <= 0) {
      setError("المبلغ يجب أن يكون أكبر من صفر");
      setSaving(false);
      return;
    }

    const targetSchoolId = payStudent.school_id || resolvedSchoolId;
    if (!targetSchoolId) {
      setError("لا يمكن تحديد المدرسة الخاصة بهذا المستخدم");
      setSaving(false);
      return;
    }

    const branchId = await resolveBranchIdForSchool(targetSchoolId);
    const electronicReceiptNum = buildReceiptNumber();
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        payment?: any;
        studentUpdate?: { id: string; paid_fee: number; remaining_fee: number } | null;
        warning?: string;
        error?: { message?: string };
      }>("/api/web/payments/records", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: targetSchoolId,
          branch_id: branchId,
          student_id: payStudent.id,
          amount,
          payment_method: payForm.payment_method,
          notes: payForm.notes || null,
          receipt_date: payForm.receipt_date,
          receipt_number: electronicReceiptNum,
          manual_receipt_number: payForm.manual_receipt_number || null,
        }),
      });

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر تسجيل الدفعة.");
        return;
      }

      if (payload?.studentUpdate) {
        applyStudentFinancialUpdate(payStudent.id, payload.studentUpdate);
      }
      if (payload?.payment) {
        setPaymentsByStudent((current) => ({
          ...current,
          [payStudent.id]: [payload.payment, ...(current[payStudent.id] ?? [])],
        }));
        setPaymentCountsByStudent((current) => ({
          ...current,
          [payStudent.id]: (current[payStudent.id] ?? 0) + 1,
        }));
        setTotalPaymentCount((current) => current + 1);
        const createdYear = payload.payment.created_at ? new Date(payload.payment.created_at).getFullYear() : null;
        if (typeof createdYear === "number" && Number.isFinite(createdYear)) {
          setPaymentYears((current) =>
            current.includes(createdYear) ? current : [createdYear, ...current].sort((left, right) => right - left),
          );
        }
      }

      setSuccess(payload?.warning ? `تم تسجيل الدفعة مع ملاحظة: ${payload.warning}` : "تم تسجيل الدفعة بنجاح ✓");
      setShowPayModal(false);
      setPayForm({
        amount: "",
        payment_method: "cash",
        notes: "",
        receipt_date: new Date().toISOString().split("T")[0],
        manual_receipt_number: "",
      });
      setPayStudent(null);
      setStudentSearch("");
      setStudentSearchResults([]);
      void fetchMeta();
      setTimeout(() => setSuccess(""), 3000);
    } catch (payError) {
      setError(payError instanceof Error ? payError.message : "تعذر تسجيل الدفعة.");
    } finally {
      setSaving(false);
    }
  }

  async function deletePayment(id: string) {
    if (!canDeletePayments) {
      setError("ليس لديك صلاحية حذف الدفعات.");
      return;
    }
    if (!resolvedSchoolId || !selectedStudent?.id) {
      setError("تعذر تحديد سياق المدرسة أو الطالب لهذه العملية.");
      return;
    }

    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        deletedPaymentId?: string;
        studentUpdate?: { id: string; paid_fee: number; remaining_fee: number } | null;
        warning?: string;
        error?: { message?: string };
      }>(`/api/web/payments/records/${id}`, {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: resolvedSchoolId }),
      });

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر حذف الدفعة.");
        return;
      }

      if (payload?.studentUpdate) {
        applyStudentFinancialUpdate(selectedStudent.id, payload.studentUpdate);
      }
      setPaymentsByStudent((current) => ({
        ...current,
        [selectedStudent.id]: (current[selectedStudent.id] ?? []).filter((payment) => payment.id !== id),
      }));
      setPaymentCountsByStudent((current) => ({
        ...current,
        [selectedStudent.id]: Math.max(0, (current[selectedStudent.id] ?? 1) - 1),
      }));
      setTotalPaymentCount((current) => Math.max(0, current - 1));

      if (payload?.warning) {
        setError(`تم حذف الدفعة لكن تعذر مزامنة رصيد الطالب بالكامل: ${payload.warning}`);
      }

      void fetchMeta();
    } catch (deleteError) {
      setError(deleteError instanceof Error ? deleteError.message : "تعذر حذف الدفعة.");
    }
  }

  async function archiveAccountsYear() {
    if (!canDeletePayments) {
      setError("ليس لديك صلاحية أرشفة الحسابات.");
      return;
    }
    if (!resolvedSchoolId) {
      setError("لا يمكن تحديد المدرسة الحالية للأرشفة");
      return;
    }

    const year = parseInt(archiveYear, 10);
    if (!year) {
      setError("اختر سنة صحيحة للأرشفة");
      return;
    }

    setArchiving(true);
    setError("");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        archive?: any;
        created?: boolean;
        error?: { message?: string };
      }>("/api/web/payments/archive", {
        method: "POST",
        headers: withJsonHeaders(),
        body: JSON.stringify({
          school_id: resolvedSchoolId,
          archive_year: year,
        }),
      });

      if (!response.ok) {
        setError(payload?.error?.message || "تعذر حفظ الأرشيف السنوي.");
        return;
      }

      if (payload?.archive) {
        setArchives((current) => {
          const next = [payload.archive, ...current.filter((archive) => archive.id !== payload.archive.id)];
          return next.sort((left, right) => {
            const yearDiff = Number(right.archive_year ?? 0) - Number(left.archive_year ?? 0);
            if (yearDiff !== 0) return yearDiff;
            return new Date(String(right.archive_date ?? "")).getTime() - new Date(String(left.archive_date ?? "")).getTime();
          });
        });
      }
      setSuccess(payload?.created ? "تم إنشاء الأرشيف السنوي للحسابات ✓" : "تم تحديث الأرشيف السنوي للحسابات ✓");
      void fetchMeta();
      setTimeout(() => setSuccess(""), 3000);
    } catch (archiveError) {
      setError(archiveError instanceof Error ? archiveError.message : "تعذر حفظ الأرشيف السنوي.");
    } finally {
      setArchiving(false);
    }
  }

  function getPaymentMethodLabel(method: string) {
    return (
      {
        cash: "نقداً",
        bank_transfer: "تحويل بنكي",
        check: "شيك",
      } as Record<string, string>
    )[method] || method;
  }

  function getArchiveStudents(archive: any) {
    return Array.isArray(archive?.data?.students) ? archive.data.students : [];
  }

  function getArchivePayments(archive: any) {
    return Array.isArray(archive?.data?.payments) ? archive.data.payments : [];
  }

  async function exportArchiveExcel(archive: any) {
    setArchiveExportingId(archive.id);
    try {
      const XLSX = await loadXLSX();
      const wb = XLSX.utils.book_new();
      const archiveStudents = getArchiveStudents(archive);
      const archivePayments = getArchivePayments(archive);
      const studentsById = Object.fromEntries(archiveStudents.map((student: any) => [student.id, student]));

      const summarySheet = XLSX.utils.json_to_sheet([
        {
          "السنة المؤرشفة": archive.archive_year,
          "عدد الطلاب": archive.total_students || archiveStudents.length,
          "عدد الدفعات": archive.total_payments || archivePayments.length,
          "إجمالي المبالغ": archive.total_amount || 0,
          "تاريخ الأرشفة": formatDate(archive.archive_date),
        },
      ]);

      XLSX.utils.book_append_sheet(wb, summarySheet, "الملخص");

      if (archiveStudents.length) {
        const studentsSheet = XLSX.utils.json_to_sheet(
          archiveStudents.map((student: any) => ({
            "اسم الطالب": student.full_name || "—",
            "الصف": student.class_name || "—",
            "الحالة": student.status || "—",
            "إجمالي الرسوم": student.total_fee || 0,
            "المدفوع": student.paid_fee || 0,
            "المتبقي": student.remaining_fee || 0,
            "الهاتف": student.phone || "",
          })),
        );
        XLSX.utils.book_append_sheet(wb, studentsSheet, "الطلاب");
      }

      if (archivePayments.length) {
        const paymentsSheet = XLSX.utils.json_to_sheet(
          archivePayments.map((payment: any) => ({
            "اسم الطالب": studentsById[payment.student_id]?.full_name || "—",
            "الصف": studentsById[payment.student_id]?.class_name || "—",
            "المبلغ": payment.amount || 0,
            "طريقة الدفع": getPaymentMethodLabel(payment.payment_method),
            "تاريخ الدفعة": formatDate(payment.created_at),
            "رقم الإيصال الإلكتروني": payment.receipt_number || "—",
            "رقم الإيصال الورقي": payment.manual_receipt_number || "—",
            "ملاحظات": payment.notes || "",
          })),
        );
        XLSX.utils.book_append_sheet(wb, paymentsSheet, "الدفعات");
      }

      await XLSX.writeFile(wb, `أرشيف_حسابات_${archive.archive_year}_${formatDate(new Date())}.xlsx`);
    } finally {
      setArchiveExportingId(null);
    }
  }

  function printReceipt(p: any, student: any) {
    const w = window.open("", "_blank");
    if (!w) return;
    w.document.write(
      wrapPrintDocument({
        title: isEnglish ? "Receipt" : "إيصال",
        subtitle: `${isEnglish ? "Receipt no." : "رقم الإيصال"}: ${escapeHtml(p.receipt_number || "—")}`,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: isEnglish ? "en" : "ar",
        },
        bodyHtml: `
          <div class="print-grid">
            <div class="print-panel"><span class="print-label">${isEnglish ? "Student name" : "اسم الطالب"}</span><div class="print-value">${escapeHtml(student?.full_name || "—")}</div></div>
            <div class="print-panel"><span class="print-label">${isEnglish ? "Class" : "الصف"}</span><div class="print-value">${escapeHtml(student?.class_name || "—")}</div></div>
            <div class="print-panel"><span class="print-label">${isEnglish ? "Payment method" : "طريقة الدفع"}</span><div class="print-value">${escapeHtml(({ cash: isEnglish ? "Cash" : "نقداً", bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي", check: isEnglish ? "Check" : "شيك" } as Record<string, string>)[p.payment_method as string] || p.payment_method || "—")}</div></div>
            <div class="print-panel"><span class="print-label">${isEnglish ? "Date" : "التاريخ"}</span><div class="print-value">${formatDate(p.created_at)}</div></div>
          </div>
          <div class="print-panel" style="margin-top:16px;text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
            <span class="print-label">${isEnglish ? "Amount received" : "المبلغ المستلم"}</span>
            <div class="print-value" style="font-size:30px">د.ع ${formatNumber(p.amount || 0)}</div>
          </div>
          ${
            p.notes
              ? `<div class="print-panel" style="margin-top:16px"><span class="print-label">${isEnglish ? "Notes" : "ملاحظات"}</span><div class="print-value" style="font-size:15px;font-weight:700">${escapeHtml(p.notes)}</div></div>`
              : ""
          }
          <div style="margin-top:16px;text-align:center;color:var(--print-muted);font-size:13px">${isEnglish ? "Thank you" : "شكراً لكم"}</div>
        `,
      }),
    );
    w.document.close();
  }

  async function exportExcel() {
    if (!resolvedSchoolId) return;

    setExporting(true);
    try {
      const params = new URLSearchParams({
        schoolId: resolvedSchoolId,
        quickFilter,
        sort: filterSort,
        dir: filterDir,
      });

      if (search) {
        params.set("search", search);
      }
      if (filterClass) {
        params.set("className", filterClass);
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: any[];
        error?: { message?: string };
      }>(`/api/web/payments/export?${params.toString()}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل بيانات التصدير.");
      }

      const XLSX = await loadXLSX();
      const rows = (payload?.students ?? []).map((student) => ({
        "اسم الطالب": student.full_name,
        "الصف": student.class_name,
        "الهاتف": student.phone || "",
        "المبلغ الكلي": student.total_fee,
        "المدفوع": student.paid_fee,
        "الخصم": student.discount_value || 0,
        "المتبقي": student.remaining_fee,
        "الحالة": student.status,
      }));
      const ws = XLSX.utils.json_to_sheet(rows);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "فواتير الطلاب");
      await XLSX.writeFile(wb, `فواتير_${formatDate(new Date())}.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "تعذر تصدير البيانات.");
    } finally {
      setExporting(false);
    }
  }

  const studentPaymentsList = (id: string) => paymentsByStudent[id] ?? [];
  const searchResults = studentSearchResults;
  const totalPages = Math.max(1, Math.ceil(totalCount / PAGE_SIZE));
  const nextReceiptNum = `REC-${(totalPaymentCount + 1001).toString()}`;
  const archiveYearOptions = Array.from(new Set([...paymentYears, ...archives.map((archive) => archive.archive_year), new Date().getFullYear()]))
    .sort((a, b) => b - a);
  const archivedYearsCount = archives.length;
  const totalArchivedAmount = archives.reduce((sum, archive) => sum + (archive.total_amount || 0), 0);
  const latestArchive = archives[0] || null;
  const archiveDetailStudents = selectedArchive ? getArchiveStudents(selectedArchive) : [];
  const archiveDetailPayments = selectedArchive
    ? [...getArchivePayments(selectedArchive)].sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())
    : [];
  const archiveStudentsById = Object.fromEntries(archiveDetailStudents.map((student: any) => [student.id, student]));

  const QUICK_FILTERS = [
    { id: "all", label: "الكل" },
    { id: "no_invoice", label: "بدون دفعات" },
    { id: "collected", label: "المبالغ المستوفاة" },
    { id: "discounted", label: "الطلاب المخفضون" },
    { id: "transferred", label: "الفواتير المنقولة" },
    { id: "graduated", label: "فواتير المتخرجين" },
    { id: "suspended", label: "فواتير الموقوفين" },
    { id: "deleted", label: "الفواتير المحذوفة" },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin", "employee"]}>
      <>
        <style>{`
          *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
          :root{--p2:#4C2F9E;--p3:#6C4AB6;--p4:#9B7EDC;--bg:#F0EEFF;--dark:#1F1547;--gray:#6B7280;--field-bg:#F9FBFF;--field-text:#0F172A;--field-border:rgba(15,23,42,0.1);--field-border-strong:rgba(79,140,255,0.42);--field-ring:rgba(79,140,255,0.14);--field-shadow:inset 0 1px 0 rgba(255,255,255,0.82);}
          body{font-family:var(--font-manrope),Segoe UI,sans-serif;direction:rtl;background:var(--bg);color:var(--dark)}
          .layout{display:flex;height:100vh}
          .sidebar{width:200px;background:linear-gradient(180deg,#EDE8FA,#E0D8F8);display:flex;flex-direction:column;padding:1rem .8rem;border-right:1px solid rgba(108,74,182,0.1);flex-shrink:0}
          .logo{display:flex;align-items:center;gap:.6rem;margin-bottom:1rem;padding:.4rem}
          .logo-ico{width:34px;height:34px;border-radius:9px;background:linear-gradient(135deg,var(--p3),var(--p4));display:flex;align-items:center;justify-content:center}
          .logo-ico svg{width:18px;height:18px;fill:white}
          .logo span{font-size:.88rem;font-weight:800;color:var(--p2)}
          .nav{display:flex;align-items:center;gap:.6rem;padding:.55rem .8rem;border-radius:9px;color:var(--p2);font-size:.8rem;font-weight:600;cursor:pointer;transition:all .2s;text-decoration:none}
          .nav:hover{background:rgba(108,74,182,0.1)}.nav.active{background:linear-gradient(135deg,var(--p3),var(--p4));color:white}
          .nav.danger{color:#EF4444}.nav.danger:hover{background:#FEE2E2}
          .sep{height:1px;background:rgba(108,74,182,0.12);margin:.4rem 0}
          .main{flex:1;display:flex;flex-direction:column;overflow:hidden}
          .topbar{background:white;padding:.7rem 1.4rem;display:flex;align-items:center;justify-content:space-between;border-bottom:1px solid rgba(108,74,182,0.08);flex-shrink:0}
          .topbar-title{font-size:.95rem;font-weight:800}.topbar-sub{font-size:.7rem;color:var(--gray)}
          .content{flex:1;overflow-y:auto;padding:1.2rem 1.4rem}

          /* STATS */
          .stats{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:1rem}
          .sc{background:white;border-radius:12px;padding:.8rem 1rem;border:1px solid rgba(108,74,182,0.06);box-shadow:0 2px 8px rgba(108,74,182,0.06)}
          .sc-label{font-size:.7rem;color:var(--gray);font-weight:500}.sc-val{font-size:.95rem;font-weight:800;margin-top:.1rem}

          /* OPERATIONS */
          .ops-section{background:white;border-radius:14px;padding:1.1rem 1.3rem;margin-bottom:1rem;box-shadow:0 2px 8px rgba(108,74,182,0.06)}
          .ops-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem}
          .ops-title{font-size:.88rem;font-weight:800;color:var(--dark);display:flex;align-items:center;gap:.4rem}
          .ops-actions{display:flex;gap:.6rem}
          .quick-filters{display:flex;flex-wrap:wrap;gap:.5rem;margin-bottom:1rem}
          .qf-btn{padding:.35rem .8rem;border-radius:20px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:600;cursor:pointer;border:1.5px solid rgba(108,74,182,0.2);background:white;color:var(--p2);transition:all .2s}
          .qf-btn:hover{background:#EDE8FA}
          .qf-btn.active{background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border-color:transparent;box-shadow:0 3px 10px rgba(108,74,182,0.3)}

          /* ADVANCED FILTERS */
          .adv-filters{background:#F8F6FF;border-radius:11px;padding:.9rem 1rem}
          .adv-title{font-size:.78rem;font-weight:700;color:var(--p2);margin-bottom:.7rem;display:flex;align-items:center;gap:.3rem}
          .adv-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.7rem;margin-bottom:.6rem}
          .adv-grid2{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:.7rem}
          .af-item{display:flex;flex-direction:column;gap:.25rem}
          .af-label{font-size:.7rem;font-weight:600;color:var(--gray)}
          .af-input{padding:.5rem .7rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.78rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
          .af-input:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}

          /* TOOLBAR */
          .toolbar{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}
          .srch{position:relative;flex:1}
          .srch svg{position:absolute;right:11px;top:50%;transform:translateY(-50%);width:15px;height:15px;color:var(--gray)}
          .srch input{width:100%;padding:.55rem 2.1rem .55rem .8rem;background:var(--field-bg);border:1px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
          .srch input:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
          .btn-add{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}
          .btn-export{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:#D1FAE5;color:#065F46;border:1.5px solid #6EE7B7;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer;white-space:nowrap}

          /* TABLE */
          .tbl-wrap{background:white;border-radius:13px;border:1px solid rgba(108,74,182,0.06);overflow:hidden;box-shadow:0 2px 8px rgba(108,74,182,0.06)}
          table{width:100%;border-collapse:collapse}
          thead{background:#F8F6FF}
          th{padding:.6rem .9rem;font-size:.72rem;font-weight:700;color:var(--p2);text-align:left;border-bottom:1px solid rgba(108,74,182,0.08)}
          td{padding:.6rem .9rem;font-size:.78rem;border-bottom:1px solid rgba(108,74,182,0.04)}
          tr:last-child td{border-bottom:none}
          tr:hover td{background:#FAFAFE}
          .student-link{font-weight:700;color:var(--p2);cursor:pointer;text-decoration:underline;text-underline-offset:3px}
          .student-link:hover{color:var(--p3)}
          .badge{display:inline-block;padding:.18rem .55rem;border-radius:20px;font-size:.66rem;font-weight:700}
          .btn-pay{width:30px;height:30px;background:linear-gradient(135deg,#10B981,#059669);color:white;border:none;border-radius:8px;cursor:pointer;font-size:.9rem;display:flex;align-items:center;justify-content:center;font-weight:700;transition:transform .15s}
          .btn-pay:hover{transform:scale(1.1)}
          .btn-print-sm{width:28px;height:28px;background:#EDE8FA;color:var(--p3);border:none;border-radius:7px;cursor:pointer;font-size:.8rem;display:flex;align-items:center;justify-content:center}
          .empty{text-align:center;padding:3rem;color:var(--gray);font-size:.85rem}
          .spin{width:22px;height:22px;border:3px solid rgba(108,74,182,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:2rem auto}
          @keyframes sp{to{transform:rotate(360deg)}}
          .progress-bar{background:#E5E7EB;border-radius:20px;height:6px;overflow:hidden;margin-top:.3rem}
          .progress-fill{height:100%;border-radius:20px}
          .ok{background:#D1FAE5;color:#065F46;border:1px solid #6EE7B7;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
          .err{background:#FEE2E2;color:#991B1B;border:1px solid #FCA5A5;border-radius:9px;padding:.6rem .9rem;font-size:.8rem;font-weight:600;margin-bottom:.8rem}
          .results-count{font-size:.78rem;color:var(--gray);font-weight:500}
          .pagination{display:flex;align-items:center;justify-content:space-between;gap:.8rem;padding:.85rem 1rem;border-top:1px solid rgba(108,74,182,0.08);background:#FCFBFF}
          .btn-nav{padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:10px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer}
          .btn-nav:disabled{opacity:.55;cursor:not-allowed}
          .dropdown-status{padding:1rem;text-align:center;color:var(--gray);font-size:.8rem}

          /* DETAIL */
          .detail-overlay{position:fixed;inset:0;background:rgba(0,0,0,0.4);z-index:100;display:flex;align-items:flex-start;justify-content:flex-start;backdrop-filter:blur(4px)}
          .detail-panel{background:white;width:680px;max-width:95vw;height:100vh;overflow-y:auto;box-shadow:-8px 0 40px rgba(0,0,0,0.2);padding:1.8rem;margin-right:auto}
          .detail-header{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.4rem}
          .detail-title{font-size:1.1rem;font-weight:900}
          .detail-close{width:34px;height:34px;border-radius:9px;background:#F3F4F6;border:none;cursor:pointer;font-size:1.1rem}
          .detail-cards{display:grid;grid-template-columns:1fr 1fr;gap:1rem;margin-bottom:1.2rem}
          .detail-card{background:#F8F6FF;border-radius:12px;padding:1rem}
          .detail-card-title{font-size:.78rem;font-weight:700;color:var(--p2);margin-bottom:.6rem}
          .detail-row{display:flex;justify-content:space-between;font-size:.8rem;margin:.25rem 0}
          .detail-label{color:var(--gray)}.detail-val{font-weight:700}
          .pay-row{background:#F8F6FF;border-radius:12px;padding:.9rem 1rem;margin-bottom:.6rem;border:1.5px solid rgba(108,74,182,0.07);transition:border-color .2s}
          .pay-row:hover{border-color:rgba(108,74,182,0.2)}
          .pay-row:last-child{margin-bottom:0}
          .pay-row-top{display:flex;align-items:center;justify-content:space-between;margin-bottom:.55rem}
          .pay-num{width:28px;height:28px;border-radius:8px;background:linear-gradient(135deg,var(--p3),var(--p4));color:white;display:flex;align-items:center;justify-content:center;font-size:.68rem;font-weight:800;flex-shrink:0}
          .pay-amount{font-size:1rem;font-weight:900;color:#10B981}
          .pay-meta{font-size:.7rem;color:var(--gray)}
          .pay-fields{display:grid;grid-template-columns:1fr 1fr;gap:.4rem .8rem}
          .pay-field{display:flex;flex-direction:column;gap:.1rem}
          .pay-field-label{font-size:.65rem;color:var(--gray);font-weight:600}
          .pay-field-val{font-size:.76rem;font-weight:700;color:var(--dark)}
          .pay-field-val.receipt-e{color:var(--p3);font-family:monospace;font-size:.72rem}
          .pay-method-badge{display:inline-flex;align-items:center;gap:.25rem;background:#EDE8FA;color:var(--p3);border-radius:6px;padding:.15rem .5rem;font-size:.65rem;font-weight:700}
          .pay-actions{display:flex;gap:.4rem;align-items:center}
          .btn-del-sm{padding:.28rem .6rem;background:#FEE2E2;color:#991B1B;border:none;border-radius:6px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.68rem;font-weight:600;cursor:pointer}

          /* MODAL */
          .overlay{position:fixed;inset:0;background:rgba(0,0,0,0.5);z-index:200;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(4px)}
          .modal{background:white;border-radius:18px;padding:1.6rem;width:100%;max-width:480px;max-height:90vh;overflow-y:auto;box-shadow:0 20px 60px rgba(0,0,0,0.2)}
          .mh{display:flex;align-items:center;justify-content:space-between;margin-bottom:1.2rem}
          .mt{font-size:1rem;font-weight:800}
          .mc{width:30px;height:30px;border-radius:7px;background:#F3F4F6;border:none;cursor:pointer;font-size:1rem}
          .fg{display:grid;grid-template-columns:1fr 1fr;gap:.8rem}
          .ff{display:flex;flex-direction:column;gap:.32rem}.ff.full{grid-column:1/-1}
          .fl{font-size:.76rem;font-weight:600}.opt{font-size:.68rem;color:var(--gray);font-weight:400}
          .fis{padding:.65rem .85rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;width:100%;color:var(--field-text);box-shadow:var(--field-shadow)}
          .fis:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
          .receipt-auto{background:#EDE8FA;border-radius:10px;padding:.65rem 1rem;font-size:.85rem;font-weight:800;color:var(--p2);text-align:center}
          .student-info-box{background:#F0EEFF;border-radius:10px;padding:.8rem 1rem}
          .si-row{display:flex;justify-content:space-between;font-size:.8rem;margin:.2rem 0}
          .si-label{color:var(--gray)}.si-val{font-weight:700}
          .fa{display:flex;gap:.7rem;margin-top:1.1rem}
          .bs{flex:1;padding:.75rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:700;cursor:pointer}
          .bs:disabled{opacity:.65;cursor:not-allowed}
          .bc{padding:.75rem 1.2rem;background:#F3F4F6;color:var(--gray);border:none;border-radius:11px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.88rem;font-weight:600;cursor:pointer}
          .search-wrap{position:relative}
          .search-input{width:100%;padding:.65rem .85rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.82rem;direction:rtl;outline:none;color:var(--field-text);box-shadow:var(--field-shadow)}
          .search-input:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
          .search-input.selected{border-color:#10B981;background:#F0FDF4}
          .dropdown{position:absolute;top:calc(100% + 4px);right:0;left:0;background:white;border:1px solid rgba(108,74,182,0.15);border-radius:10px;box-shadow:0 8px 24px rgba(0,0,0,0.1);z-index:300;max-height:220px;overflow-y:auto}
          .dropdown-item{padding:.62rem 1rem;cursor:pointer;font-size:.82rem;border-bottom:1px solid rgba(108,74,182,0.05)}
          .dropdown-item:hover{background:#F0EEFF}
          .d-name{font-weight:700}.d-meta{display:flex;justify-content:space-between;margin-top:.1rem}
          .d-cls{color:var(--gray);font-size:.73rem}.d-rem{color:#EF4444;font-size:.73rem;font-weight:600}
          .archive-box{background:white;border-radius:14px;padding:1.1rem 1.3rem;margin-top:1rem;box-shadow:0 2px 8px rgba(108,74,182,0.06)}
          .archive-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.9rem}
          .archive-ttl{font-size:.88rem;font-weight:800;color:var(--dark);display:flex;align-items:center;gap:.4rem}
          .archive-note{font-size:.75rem;color:var(--gray);margin-bottom:.8rem}
          .archive-controls{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}
          .archive-select{padding:.55rem .8rem;background:var(--field-bg);border:1.5px solid var(--field-border);border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;direction:rtl;outline:none;color:var(--field-text);min-width:140px;box-shadow:var(--field-shadow)}
          .archive-select:focus{border-color:var(--field-border-strong);background:white;box-shadow:0 0 0 4px var(--field-ring),var(--field-shadow)}
          .archive-list{display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:.7rem}
          .arch-card{background:#F8F6FF;border:1px solid rgba(108,74,182,0.08);border-radius:12px;padding:.9rem 1rem}
          .arch-year{font-size:.9rem;font-weight:800;color:var(--p2);margin-bottom:.25rem}
          .arch-info{font-size:.73rem;color:var(--gray);line-height:1.7}
          .arch-amount{font-size:.95rem;font-weight:900;color:#10B981;margin-top:.45rem}
          .archive-stats{display:grid;grid-template-columns:repeat(3,1fr);gap:.7rem;margin-bottom:.9rem}
          .archive-stat{background:#F8F6FF;border:1px solid rgba(108,74,182,0.08);border-radius:12px;padding:.85rem 1rem}
          .archive-stat-label{font-size:.72rem;color:var(--gray);margin-bottom:.25rem}
          .archive-stat-value{font-size:.95rem;font-weight:900;color:var(--dark)}
          .arch-actions{display:flex;gap:.45rem;flex-wrap:wrap;margin-top:.75rem}
          .arch-btn{display:inline-flex;align-items:center;justify-content:center;gap:.35rem;padding:.45rem .75rem;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.74rem;font-weight:700;cursor:pointer}
          .arch-btn.primary{background:linear-gradient(135deg,var(--p3),var(--p2));color:white}
          .arch-btn.soft{background:white;color:var(--p2);border:1px solid rgba(108,74,182,0.16)}
          .archive-detail-overlay{position:fixed;inset:0;background:rgba(15,23,42,.45);display:flex;align-items:center;justify-content:center;z-index:220;padding:1rem;backdrop-filter:blur(4px)}
          .archive-detail-modal{width:min(1120px,100%);max-height:92vh;overflow:auto;background:white;border-radius:22px;box-shadow:0 28px 70px rgba(15,23,42,.28)}
          .archive-detail-head{display:flex;align-items:flex-start;justify-content:space-between;gap:1rem;padding:1.25rem 1.35rem;border-bottom:1px solid rgba(108,74,182,0.08)}
          .archive-detail-title{font-size:1.05rem;font-weight:900;color:var(--dark)}
          .archive-detail-sub{font-size:.76rem;color:var(--gray);margin-top:.3rem}
          .archive-detail-actions{display:flex;gap:.55rem;align-items:center;flex-wrap:wrap}
          .archive-detail-body{padding:1.15rem 1.35rem 1.35rem}
          .archive-kpis{display:grid;grid-template-columns:repeat(4,1fr);gap:.75rem;margin-bottom:1rem}
          .archive-kpi{background:#F8F6FF;border:1px solid rgba(108,74,182,0.08);border-radius:14px;padding:.95rem 1rem}
          .archive-kpi-label{font-size:.72rem;color:var(--gray);margin-bottom:.2rem}
          .archive-kpi-value{font-size:.98rem;font-weight:900;color:var(--dark)}
          .archive-section{background:#FCFBFF;border:1px solid rgba(108,74,182,0.08);border-radius:16px;padding:1rem 1rem 1.1rem;margin-bottom:.9rem}
          .archive-section-top{display:flex;align-items:center;justify-content:space-between;gap:1rem;margin-bottom:.75rem}
          .archive-section-title{font-size:.85rem;font-weight:800;color:var(--dark);display:inline-flex;align-items:center;gap:.35rem}
          .archive-section-sub{font-size:.72rem;color:var(--gray)}
          .archive-table-wrap{border:1px solid rgba(108,74,182,0.08);border-radius:12px;overflow:hidden;background:white}
          .archive-empty{padding:1.6rem;text-align:center;color:var(--gray);font-size:.8rem}
          @media (max-width:1100px){
            .stats,.adv-grid,.adv-grid2{grid-template-columns:repeat(2,1fr)}
          }
          @media (max-width:1100px){.archive-kpis,.archive-stats{grid-template-columns:repeat(2,1fr)}}
          @media (max-width:780px){
            .stats,.adv-grid,.adv-grid2,.detail-cards,.pay-fields{grid-template-columns:1fr}
            .ops-header,.ops-actions,.toolbar,.fa,.fg,.detail-header,.pay-row-top,.archive-controls,.archive-top,.archive-detail-head,.archive-section-top,.pagination{flex-direction:column;align-items:stretch}
            .srch,.btn-add,.btn-export,.bc,.bs{width:100%}
            .tbl-wrap,.archive-table-wrap{overflow:auto}
            th,td{white-space:nowrap}
            .detail-panel{width:100%;max-width:100%;padding:1.2rem}
            .archive-controls,.archive-top,.archive-detail-head,.archive-section-top{flex-direction:column;align-items:stretch}
            .archive-kpis,.archive-stats{grid-template-columns:1fr}
            .archive-detail-actions{justify-content:stretch}
            .arch-btn,.archive-detail-actions .btn-export,.archive-detail-actions .btn-add{width:100%;justify-content:center}
          }
        `}</style>

        <div className="layout">
          <AppSidebar currentPath="/payments" showFloatingToggle />

          <div className="main">
            <div className="content app-shell-content">
              {success && <div className="ok">{success}</div>}
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />
              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="فواتير الطلاب"
                  description="لن يتم تحميل الطلاب أو الدفعات أو الأرشيف قبل اختيار مدرسة واضحة لهذا القسم."
                />
              ) : (
                <>
                  {/* إحصائيات */}
                  <div className="stats">
                    {(
                      [
                        ["إجمالي الرسوم", metaLoading ? "..." : `د.ع ${formatNumber(summary.totalFee)}`],
                        ["إجمالي المدفوع", metaLoading ? "..." : `د.ع ${formatNumber(summary.totalPaid)}`],
                        ["إجمالي المتبقي", metaLoading ? "..." : `د.ع ${formatNumber(summary.totalRemaining)}`],
                        [
                          "المسددة بالكامل",
                          metaLoading ? "..." : `${formatNumber(summary.collectedCount)} / ${formatNumber(summary.totalStudents)}`,
                        ],
                      ] as any[]
                    ).map(([l, v]: any, i: number) => (
                      <div className="sc" key={i}>
                        <div className="sc-label">{l}</div>
                        <div className="sc-val">{v}</div>
                      </div>
                    ))}
                  </div>

                  {/* قسم العمليات */}
                  <div className="ops-section">
                    <div className="ops-header">
                      <div className="ops-title">
                        <AppIcon token="⚙️" size={14} /> العمليات
                      </div>
                      <div className="ops-actions">
                        <button className="btn-export" onClick={exportExcel} disabled={exporting || !resolvedSchoolId}>
                          <AppIcon token="⬇️" size={14} /> {exporting ? "جارٍ التصدير..." : "تصدير إكسل"}
                        </button>
                        {canAddPayments && (
                          <button
                            className="btn-add"
                            onClick={() => {
                              setPayStudent(null);
                              setStudentSearch("");
                              setStudentSearchResults([]);
                              setShowPayModal(true);
                            }}
                          >
                            + إضافة فاتورة
                          </button>
                        )}
                      </div>
                    </div>

                    {/* فلاتر سريعة */}
                    <div className="quick-filters">
                      {QUICK_FILTERS.map((f) => (
                        <button key={f.id} className={`qf-btn${quickFilter === f.id ? " active" : ""}`} onClick={() => setQuickFilter(f.id)}>
                          <AppIcon token="📋" size={12} /> {f.label}
                        </button>
                      ))}
                    </div>

                    {/* فلاتر متقدمة */}
                <div className="adv-filters">
                  <div className="adv-title">
                    <AppIcon token="🔍" size={13} /> الفلاتر
                  </div>
                  <div className="adv-grid2">
                    <div className="af-item">
                      <label className="af-label">الصف والشعبة</label>
                      <select className="af-input" value={filterClass} onChange={(e) => setFilterClass(e.target.value)}>
                        <option value="">- الكل -</option>
                        {classes.map((c) => (
                          <option key={c} value={c}>
                            {c}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="af-item">
                      <label className="af-label">ترتيب حسب</label>
                      <select className="af-input" value={filterSort} onChange={(e) => setFilterSort(e.target.value)}>
                        <option value="name">الاسم</option>
                        <option value="remaining">المتبقي</option>
                        <option value="total">إجمالي الرسوم</option>
                      </select>
                    </div>
                    <div className="af-item">
                      <label className="af-label">اتجاه الترتيب</label>
                      <select className="af-input" value={filterDir} onChange={(e) => setFilterDir(e.target.value)}>
                        <option value="asc">تصاعدي ↑</option>
                        <option value="desc">تنازلي ↓</option>
                      </select>
                    </div>
                  </div>
                </div>
              </div>

              {/* TOOLBAR */}
              <div className="toolbar">
                <div className="srch">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                  </svg>
                  <input placeholder="بحث باسم الطالب أو الصف..." value={searchInput} onChange={(e) => setSearchInput(e.target.value)} />
                </div>
                <span className="results-count">{loading ? "جارٍ التحميل..." : `${formatNumber(totalCount)} نتيجة`}</span>
              </div>

              {/* الجدول */}
              <div className="tbl-wrap">
                {loading ? (
                  <div className="spin" />
                ) : students.length === 0 ? (
                  <div className="empty">لا توجد نتائج</div>
                ) : (
                  <>
                    <table>
                      <thead>
                        <tr>
                          <th>#</th>
                          <th>اسم الطالب</th>
                          <th>الصف والشعبة</th>
                          <th>رقم الهاتف</th>
                          <th>المبلغ الكلي</th>
                          <th>المبلغ المدفوع</th>
                          <th>الخصم</th>
                          <th>المبلغ المتبقي</th>
                          <th>العمليات</th>
                        </tr>
                      </thead>
                      <tbody>
                        {students.map((s, i) => {
                          const pct = s.total_fee > 0 ? Math.min(100, Math.round((s.paid_fee / s.total_fee) * 100)) : 0;
                          return (
                            <tr key={s.id}>
                              <td style={{ color: "var(--gray)", fontSize: ".7rem" }}>{(page - 1) * PAGE_SIZE + i + 1}</td>
                              <td>
                                <span
                                  className="student-link"
                                  onClick={() => {
                                    void openStudentDetail(s);
                                  }}
                                >
                                  {s.full_name}
                                </span>
                                <div style={{ color: "var(--gray)", fontSize: ".7rem", marginTop: ".18rem" }}>
                                  {formatNumber(paymentCountsByStudent[s.id] ?? 0)} دفعة مسجلة
                                </div>
                              </td>
                              <td style={{ color: "var(--gray)" }}>{s.class_name}</td>
                              <td style={{ color: "var(--gray)", fontSize: ".75rem" }}>{s.phone || "—"}</td>
                              <td style={{ fontWeight: 700 }}>د.ع {formatNumber(s.total_fee)}</td>
                              <td style={{ color: "#10B981", fontWeight: 700 }}>د.ع {formatNumber(s.paid_fee)}</td>
                              <td style={{ color: "var(--gray)" }}>{s.discount_value > 0 ? `د.ع ${formatNumber(s.discount_value)}` : "—"}</td>
                              <td>
                                <div style={{ color: s.remaining_fee > 0 ? "#EF4444" : "#10B981", fontWeight: 700 }}>
                                  د.ع {formatNumber(s.remaining_fee)}
                                </div>
                                <div className="progress-bar">
                                  <div
                                    className="progress-fill"
                                    style={{ width: `${pct}%`, background: pct >= 100 ? "#10B981" : "#6C4AB6" }}
                                  />
                                </div>
                              </td>
                              <td>
                                <div style={{ display: "flex", gap: ".3rem", alignItems: "center" }}>
                                  <button
                                    className="btn-pay"
                                    title="إضافة دفعة"
                                    onClick={() => {
                                      setPayStudent(s);
                                      setStudentSearch(s.full_name);
                                      setStudentSearchResults([]);
                                      setShowPayModal(true);
                                    }}
                                  >
                                    <AppIcon token="$" size={14} className="text-white" />
                                  </button>
                                  <button
                                    className="btn-print-sm"
                                    title="تفاصيل"
                                    onClick={() => {
                                      void openStudentDetail(s);
                                    }}
                                  >
                                    <AppIcon token="📋" size={13} />
                                  </button>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                    {totalPages > 1 && (
                      <div className="pagination">
                        <button className="btn-nav" disabled={page === 1} onClick={() => setPage((current) => Math.max(1, current - 1))}>
                          السابق
                        </button>
                        <span className="results-count">
                          صفحة {formatNumber(page)} من {formatNumber(totalPages)} | {formatNumber(totalCount)} طالب
                        </span>
                        <button
                          className="btn-nav"
                          disabled={page >= totalPages}
                          onClick={() => setPage((current) => Math.min(totalPages, current + 1))}
                        >
                          التالي
                        </button>
                      </div>
                    )}
                  </>
                )}
              </div>

              <div className="archive-box">
                <div className="archive-top">
                  <div className="archive-ttl">
                    <AppIcon token="🗄️" size={14} /> الأرشيف السنوي للحسابات
                  </div>
                </div>
                <div className="archive-note">
                  يتم حفظ نسخة سنوية من دفعات المدرسة الحالية داخل Supabase بدون حذف السجلات الأصلية.
                </div>
                {archiveNotice && <div className="err" style={{ marginBottom: ".8rem" }}>{archiveNotice}</div>}
                <div className="archive-stats">
                  <div className="archive-stat">
                    <div className="archive-stat-label">السنوات المؤرشفة</div>
                    <div className="archive-stat-value">{formatNumber(archivedYearsCount)}</div>
                  </div>
                  <div className="archive-stat">
                    <div className="archive-stat-label">إجمالي المبلغ المؤرشف</div>
                    <div className="archive-stat-value">د.ع {formatNumber(totalArchivedAmount)}</div>
                  </div>
                  <div className="archive-stat">
                    <div className="archive-stat-label">آخر سنة مؤرشفة</div>
                    <div className="archive-stat-value">{latestArchive ? latestArchive.archive_year : "—"}</div>
                  </div>
                </div>
                <div className="archive-controls">
                  <select className="archive-select" value={archiveYear} onChange={(e) => setArchiveYear(e.target.value)}>
                    {archiveYearOptions.map((year) => (
                      <option key={year} value={year}>
                        سنة {year}
                      </option>
                    ))}
                  </select>
                  {canDeletePayments && (
                    <button className="btn-add" onClick={archiveAccountsYear} disabled={archiving}>
                      <AppIcon token="🗃️" size={14} /> {archiving ? "جارٍ الأرشفة..." : "أرشفة السنة المحددة"}
                    </button>
                  )}
                </div>
                {archives.length === 0 ? (
                  <div className="empty" style={{ padding: "1.5rem 0" }}>لا يوجد أرشيف سنوي محفوظ بعد</div>
                ) : (
                  <div className="archive-list">
                    {archives.map((archive) => (
                      <div className="arch-card" key={archive.id}>
                        <div className="arch-year">{archive.archive_year}</div>
                        <div className="arch-info">
                          {archive.total_students} طالب • {archive.total_payments} دفعة
                        </div>
                        <div className="arch-info">تاريخ الأرشفة: {formatDate(archive.archive_date)}</div>
                        <div className="arch-amount">د.ع {formatNumber(archive.total_amount || 0)}</div>
                        <div className="arch-actions">
                          <button
                            className="arch-btn primary"
                            onClick={() => {
                              setSelectedArchive(archive);
                              setShowArchiveDetail(true);
                            }}
                          >
                            <AppIcon token="📂" size={13} /> عرض التفاصيل
                          </button>
                          <button
                            className="arch-btn soft"
                            onClick={() => exportArchiveExcel(archive)}
                            disabled={archiveExportingId === archive.id}
                          >
                            <AppIcon token="⬇️" size={13} /> {archiveExportingId === archive.id ? "جارٍ التصدير..." : "تصدير الأرشيف"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
                </>
              )}
            </div>
          </div>
        </div>

        {/* DETAIL PANEL */}
        {showDetail && selectedStudent && (
          <div className="detail-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) setShowDetail(false);
          }}>
            <div className="detail-panel">
              <div className="detail-header">
                <div className="detail-title">تفاصيل الفاتورة — {selectedStudent.full_name}</div>
                <button className="detail-close" onClick={() => setShowDetail(false)}>
                  <AppIcon token="✕" size={16} />
                </button>
              </div>
              <div className="detail-cards">
                <div className="detail-card">
                  <div className="detail-card-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                    <AppIcon token="👤" size={14} /> معلومات الطالب
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">الاسم:</span>
                    <span className="detail-val">{selectedStudent.full_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">الصف:</span>
                    <span className="detail-val">{selectedStudent.class_name}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">الهاتف:</span>
                    <span className="detail-val">{selectedStudent.phone || "—"}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">العنوان:</span>
                    <span className="detail-val">{selectedStudent.address || "—"}</span>
                  </div>
                </div>
                <div className="detail-card">
                  <div className="detail-card-title" style={{ display: "flex", alignItems: "center", gap: ".35rem" }}>
                    <AppIcon token="📊" size={14} /> الملخص المالي
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">المبلغ الكلي:</span>
                    <span className="detail-val">د.ع {formatNumber(selectedStudent.total_fee)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">المدفوع:</span>
                    <span className="detail-val" style={{ color: "#10B981" }}>
                      د.ع {formatNumber(selectedStudent.paid_fee)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">الخصم:</span>
                    <span className="detail-val">د.ع {formatNumber(selectedStudent.discount_value || 0)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">المتبقي:</span>
                    <span className="detail-val" style={{ color: "#EF4444" }}>
                      د.ع {formatNumber(selectedStudent.remaining_fee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* شريط التقدم */}
              <div style={{ background: "#F8F6FF", borderRadius: 12, padding: "1rem", marginBottom: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem", fontSize: ".8rem" }}>
                  <span style={{ fontWeight: 700 }}>نسبة الإنجاز</span>
                  <span style={{ color: "var(--p3)", fontWeight: 800 }}>
                    {selectedStudent.total_fee > 0 ? Math.min(100, Math.round((selectedStudent.paid_fee / selectedStudent.total_fee) * 100)) : 0}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${selectedStudent.total_fee > 0 ? Math.min(100, Math.round((selectedStudent.paid_fee / selectedStudent.total_fee) * 100)) : 0}%`,
                      background: "linear-gradient(90deg,#6C4AB6,#10B981)",
                    }}
                  />
                </div>
              </div>

              {/* المعاملات */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".8rem" }}>
                  <span style={{ fontSize: ".88rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                    <AppIcon token="💳" size={14} /> معاملات الدفع ({paymentCountsByStudent[selectedStudent.id] ?? studentPaymentsList(selectedStudent.id).length})
                  </span>
                  {canAddPayments && (
                    <button
                      className="btn-add"
                      style={{ padding: ".4rem .8rem", fontSize: ".75rem" }}
                      onClick={() => {
                        setPayStudent(selectedStudent);
                        setStudentSearch(selectedStudent.full_name);
                        setStudentSearchResults([]);
                        setShowPayModal(true);
                      }}
                    >
                      + إضافة دفعة
                    </button>
                  )}
                </div>
                {paymentsLoadingStudentId === selectedStudent.id ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray)", fontSize: ".85rem" }}>
                    جارٍ تحميل دفعات الطالب...
                  </div>
                ) : studentPaymentsList(selectedStudent.id).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--gray)", fontSize: ".85rem" }}>
                    لا توجد دفعات مسجلة حتى الآن
                  </div>
                ) : (
                  studentPaymentsList(selectedStudent.id).map((p, i) => (
                    <div className="pay-row" key={p.id}>
                      {/* السطر العلوي: الرقم + المبلغ + الأزرار */}
                      <div className="pay-row-top">
                        <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                          <div className="pay-num">{i + 1}</div>
                          <span className="pay-amount">د.ع {formatNumber(p.amount)}</span>
                          <span className="pay-method-badge">
                            {(
                              {
                                cash: { icon: "💵", label: "نقداً" },
                                bank_transfer: { icon: "🏦", label: "تحويل" },
                                check: { icon: "📄", label: "شيك" },
                              } as Record<string, { icon: string; label: string }>
                            )[p.payment_method as string]
                              ? (
                                  <>
                                    <AppIcon token={({ cash: "💵", bank_transfer: "🏦", check: "📄" } as Record<string, string>)[p.payment_method as string]} size={12} />
                                    {({ cash: "نقداً", bank_transfer: "تحويل", check: "شيك" } as Record<string, string>)[p.payment_method as string]}
                                  </>
                                )
                              : p.payment_method}
                          </span>
                        </div>
                        <div className="pay-actions">
                          <button className="btn-print-sm" title="طباعة" onClick={() => printReceipt(p, selectedStudent)}>
                            <AppIcon token="🖨️" size={13} />
                          </button>
                          {canDeletePayments && (
                            <button className="btn-del-sm" onClick={() => setPendingDeletePaymentId(p.id)}>
                              حذف
                            </button>
                          )}
                        </div>
                      </div>
                      {/* تفاصيل الدفعة */}
                      <div className="pay-fields">
                        <div className="pay-field">
                          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                            <AppIcon token="📅" size={11} /> التاريخ
                          </span>
                          <span className="pay-field-val">{formatDate(p.created_at)}</span>
                        </div>
                        <div className="pay-field">
                          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                            <AppIcon token="🧾" size={11} /> رقم الإيصال الورقي
                          </span>
                          <span className="pay-field-val">{p.manual_receipt_number || "—"}</span>
                        </div>
                        <div className="pay-field">
                          <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                            <AppIcon token="🔢" size={11} /> رقم الإيصال الإلكتروني
                          </span>
                          <span className="pay-field-val receipt-e">{p.receipt_number || "—"}</span>
                        </div>
                        {p.notes && (
                          <div className="pay-field">
                            <span className="pay-field-label" style={{ display: "inline-flex", alignItems: "center", gap: ".25rem" }}>
                              <AppIcon token="📝" size={11} /> ملاحظات
                            </span>
                            <span className="pay-field-val">{p.notes}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {showArchiveDetail && selectedArchive && (
          <div
            className="archive-detail-overlay"
            onClick={(e) => {
              if (e.target === e.currentTarget) setShowArchiveDetail(false);
            }}
          >
            <div className="archive-detail-modal">
              <div className="archive-detail-head">
                <div>
                  <div className="archive-detail-title">أرشيف الحسابات لسنة {selectedArchive.archive_year}</div>
                  <div className="archive-detail-sub">
                    نسخة مؤرشفة خاصة بهذه المدرسة بتاريخ {formatDate(selectedArchive.archive_date)}
                  </div>
                </div>
                <div className="archive-detail-actions">
                  <button
                    className="btn-export"
                    onClick={() => exportArchiveExcel(selectedArchive)}
                    disabled={archiveExportingId === selectedArchive.id}
                  >
                    <AppIcon token="⬇️" size={14} /> {archiveExportingId === selectedArchive.id ? "جارٍ التصدير..." : "تصدير ملف الأرشيف"}
                  </button>
                  <button className="btn-add" onClick={() => setShowArchiveDetail(false)}>
                    <AppIcon token="✕" size={14} /> إغلاق
                  </button>
                </div>
              </div>

              <div className="archive-detail-body">
                <div className="archive-kpis">
                  <div className="archive-kpi">
                    <div className="archive-kpi-label">إجمالي المبالغ</div>
                    <div className="archive-kpi-value">د.ع {formatNumber(selectedArchive.total_amount || 0)}</div>
                  </div>
                  <div className="archive-kpi">
                    <div className="archive-kpi-label">عدد الدفعات</div>
                    <div className="archive-kpi-value">{formatNumber(selectedArchive.total_payments || archiveDetailPayments.length)}</div>
                  </div>
                  <div className="archive-kpi">
                    <div className="archive-kpi-label">عدد الطلاب</div>
                    <div className="archive-kpi-value">{formatNumber(selectedArchive.total_students || archiveDetailStudents.length)}</div>
                  </div>
                  <div className="archive-kpi">
                    <div className="archive-kpi-label">تاريخ الأرشفة</div>
                    <div className="archive-kpi-value">{formatDate(selectedArchive.archive_date)}</div>
                  </div>
                </div>

                <div className="archive-section">
                  <div className="archive-section-top">
                    <div className="archive-section-title">
                      <AppIcon token="👥" size={14} /> الطلاب ضمن الأرشيف
                    </div>
                    <div className="archive-section-sub">{archiveDetailStudents.length} طالب محفوظ داخل اللقطة السنوية</div>
                  </div>
                  <div className="archive-table-wrap">
                    {archiveDetailStudents.length === 0 ? (
                      <div className="archive-empty">لا يوجد طلاب محفوظون داخل هذا الأرشيف.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>اسم الطالب</th>
                            <th>الصف</th>
                            <th>الحالة</th>
                            <th>إجمالي الرسوم</th>
                            <th>المدفوع</th>
                            <th>المتبقي</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archiveDetailStudents.map((student: any, index: number) => (
                            <tr key={student.id || `${student.full_name}-${index}`}>
                              <td>{index + 1}</td>
                              <td style={{ fontWeight: 700 }}>{student.full_name || "—"}</td>
                              <td>{student.class_name || "—"}</td>
                              <td>{student.status || "—"}</td>
                              <td>د.ع {formatNumber(student.total_fee || 0)}</td>
                              <td style={{ color: "#10B981", fontWeight: 700 }}>د.ع {formatNumber(student.paid_fee || 0)}</td>
                              <td style={{ color: (student.remaining_fee || 0) > 0 ? "#EF4444" : "#10B981", fontWeight: 700 }}>
                                د.ع {formatNumber(student.remaining_fee || 0)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>

                <div className="archive-section" style={{ marginBottom: 0 }}>
                  <div className="archive-section-top">
                    <div className="archive-section-title">
                      <AppIcon token="💳" size={14} /> الدفعات المؤرشفة
                    </div>
                    <div className="archive-section-sub">{archiveDetailPayments.length} دفعة محفوظة ضمن هذه السنة</div>
                  </div>
                  <div className="archive-table-wrap">
                    {archiveDetailPayments.length === 0 ? (
                      <div className="archive-empty">لا توجد دفعات محفوظة داخل هذا الأرشيف.</div>
                    ) : (
                      <table>
                        <thead>
                          <tr>
                            <th>#</th>
                            <th>اسم الطالب</th>
                            <th>الصف</th>
                            <th>المبلغ</th>
                            <th>طريقة الدفع</th>
                            <th>التاريخ</th>
                            <th>الإيصال</th>
                          </tr>
                        </thead>
                        <tbody>
                          {archiveDetailPayments.map((payment: any, index: number) => (
                            <tr key={payment.id || `${payment.student_id}-${payment.created_at}-${index}`}>
                              <td>{index + 1}</td>
                              <td style={{ fontWeight: 700 }}>{archiveStudentsById[payment.student_id]?.full_name || "—"}</td>
                              <td>{archiveStudentsById[payment.student_id]?.class_name || "—"}</td>
                              <td style={{ color: "#10B981", fontWeight: 700 }}>د.ع {formatNumber(payment.amount || 0)}</td>
                              <td>{getPaymentMethodLabel(payment.payment_method)}</td>
                              <td>{formatDate(payment.created_at)}</td>
                              <td>{payment.manual_receipt_number || payment.receipt_number || "—"}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* MODAL دفعة */}
        {showPayModal && (
          <div className="overlay" onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayModal(false);
          }}>
            <div className="modal">
              <div className="mh">
                <div className="mt">تسجيل دفعة جديدة</div>
                <button className="mc" onClick={() => setShowPayModal(false)}>
                  <AppIcon token="✕" size={14} />
                </button>
              </div>
              {error && <div className="err">{error}</div>}
              <form onSubmit={handlePayment}>
                <div className="fg">
                  <div className="ff full">
                    <label className="fl">اسم الطالب *</label>
                    <div className="search-wrap" ref={searchRef}>
                      <input
                        className={`search-input${payStudent ? " selected" : ""}`}
                        placeholder="ابحث باسم الطالب..."
                        value={studentSearch}
                        onChange={(e) => {
                          setStudentSearch(e.target.value);
                          setPayStudent(null);
                          setShowDropdown(true);
                        }}
                        onFocus={() => setShowDropdown(true)}
                        autoComplete="off"
                      />
                      {payStudent && (
                        <span
                          style={{
                            position: "absolute",
                            left: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            color: "#10B981",
                            display: "inline-flex",
                          }}
                        >
                          <AppIcon token="✓" size={14} />
                        </span>
                      )}
                      {showDropdown && !payStudent && studentSearch && (
                        <div className="dropdown">
                          {studentSearchLoading ? (
                            <div className="dropdown-status">جارٍ البحث...</div>
                          ) : searchResults.length === 0 ? (
                            <div className="dropdown-status">لا توجد نتائج</div>
                          ) : (
                            searchResults.map((s) => (
                              <div
                                key={s.id}
                                className="dropdown-item"
                                onMouseDown={() => {
                                  setPayStudent(s);
                                  setStudentSearch(s.full_name);
                                  setStudentSearchResults([]);
                                  setShowDropdown(false);
                                }}
                              >
                                <div className="d-name">{s.full_name}</div>
                                <div className="d-meta">
                                  <span className="d-cls">{s.class_name}</span>
                                  <span className="d-rem">متبقي: د.ع {formatNumber(s.remaining_fee)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {payStudent && (
                    <div className="ff full">
                      <div className="student-info-box">
                        <div className="si-row">
                          <span className="si-label">الكلي:</span>
                          <span className="si-val">د.ع {formatNumber(payStudent.total_fee)}</span>
                        </div>
                        <div className="si-row">
                          <span className="si-label">المدفوع:</span>
                          <span className="si-val" style={{ color: "#10B981" }}>
                            د.ع {formatNumber(payStudent.paid_fee)}
                          </span>
                        </div>
                        <div className="si-row">
                          <span className="si-label">المتبقي:</span>
                          <span className="si-val" style={{ color: "#EF4444" }}>
                            د.ع {formatNumber(payStudent.remaining_fee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="ff">
                    <label className="fl">تاريخ الإيصال *</label>
                    <input
                      className="fis"
                      type="date"
                      required
                      value={payForm.receipt_date}
                      onChange={(e) => setPayForm({ ...payForm, receipt_date: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">المبلغ (د.ع) *</label>
                    <input
                      className="fis"
                      type="number"
                      required
                      placeholder="500000"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">
                      رقم الإيصال الورقي <span className="opt">(اختياري)</span>
                    </label>
                    <input
                      className="fis"
                      placeholder="مثال: 1042"
                      value={payForm.manual_receipt_number}
                      onChange={(e) => setPayForm({ ...payForm, manual_receipt_number: e.target.value })}
                    />
                  </div>
                  <div className="ff">
                    <label className="fl">رقم الإيصال الإلكتروني</label>
                    <div className="receipt-auto">{nextReceiptNum}</div>
                  </div>
                  <div className="ff">
                    <label className="fl">طريقة الدفع</label>
                    <select className="fis" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                      <option value="cash">نقداً</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                    </select>
                  </div>
                  <div className="ff">
                    <label className="fl">
                      ملاحظات <span className="opt">(اختياري)</span>
                    </label>
                    <input
                      className="fis"
                      placeholder="أي ملاحظات..."
                      value={payForm.notes}
                      onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="fa">
                  <button type="submit" className="bs" disabled={saving || !payStudent}>
                    {saving ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
                  </button>
                  <button type="button" className="bc" onClick={() => setShowPayModal(false)}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
        <ConfirmDialog
          open={Boolean(pendingDeletePaymentId)}
          title="حذف الدفعة"
          description={selectedStudent ? `سيتم حذف دفعة الطالب ${selectedStudent.full_name} وإعادة احتساب الرصيد المتبقي.` : "سيتم حذف الدفعة المحددة وإعادة احتساب الرصيد المتبقي."}
          confirmLabel="نعم، احذف الدفعة"
          cancelLabel="إلغاء"
          tone="danger"
          onClose={() => setPendingDeletePaymentId(null)}
          onConfirm={async () => {
            const targetId = pendingDeletePaymentId;
            setPendingDeletePaymentId(null);
            if (targetId) {
              await deletePayment(targetId);
            }
          }}
        />
      </>
    </ProtectedRoute>
  );
}
