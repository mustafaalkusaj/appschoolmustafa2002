"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/useRuntimeBranding";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print-branding";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveBranchIdForSchool, resolveSchoolIdForProfile } from "@/lib/school-context";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";

function buildReceiptNumber() {
  const stamp = new Date().toISOString().replace(/\D/g, "").slice(0, 14);
  const randomPart =
    typeof crypto !== "undefined" && typeof crypto.randomUUID === "function"
      ? crypto.randomUUID().split("-")[0].toUpperCase()
      : Math.random().toString(36).slice(2, 10).toUpperCase();

  return `REC-${stamp}-${randomPart}`;
}

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
  const [paymentCountsByStudent, setPaymentCountsByStudent] = useState<Record<string, number>>({});
  const [paymentYears, setPaymentYears] = useState<number[]>([]);
  const [totalPaymentCount, setTotalPaymentCount] = useState(0);
  const [paymentsByStudent, setPaymentsByStudent] = useState<Record<string, any[]>>({});
  const [paymentsLoadingStudentId, setPaymentsLoadingStudentId] = useState<string | null>(null);
  const [archives, setArchives] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null);
  const [archiveYear, setArchiveYear] = useState(new Date().getFullYear().toString());
  const [archiving, setArchiving] = useState(false);
  const [archiveNotice, setArchiveNotice] = useState("");
  const [selectedArchive, setSelectedArchive] = useState<any>(null);
  const [showArchiveDetail, setShowArchiveDetail] = useState(false);
  const [archiveExportingId, setArchiveExportingId] = useState<string | null>(null);

  // فلاتر
  const [quickFilter, setQuickFilter] = useState("all");
  const [filterClass, setFilterClass] = useState("");
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
  const [filterSort, setFilterSort] = useState("name");
  const [filterDir, setFilterDir] = useState("asc");

  // تفاصيل
  const [selectedStudent, setSelectedStudent] = useState<any>(null);
  const [showDetail, setShowDetail] = useState(false);

  // دفعة
  const [showPayModal, setShowPayModal] = useState(false);
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
  const [showDropdown, setShowDropdown] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (searchRef.current && !searchRef.current.contains(e.target as Node)) setShowDropdown(false);
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setError("");

    try {
      const scopedSchoolId = await resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
      setResolvedSchoolId(scopedSchoolId);

      if (!scopedSchoolId) {
        setStudents([]);
        setPaymentCountsByStudent({});
        setPaymentYears([]);
        setTotalPaymentCount(0);
        setPaymentsByStudent({});
        setArchives([]);
        return;
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: any[];
        paymentCountsByStudent?: Record<string, number>;
        paymentYears?: number[];
        totalPaymentCount?: number;
        archives?: any[];
        archiveNotice?: string;
        error?: { message?: string };
      }>(`/api/web/payments/overview?schoolId=${encodeURIComponent(scopedSchoolId)}`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تحميل بيانات المدفوعات.");
      }

      setStudents(payload?.students ?? []);
      setPaymentCountsByStudent(payload?.paymentCountsByStudent ?? {});
      setPaymentYears(payload?.paymentYears ?? []);
      setTotalPaymentCount(typeof payload?.totalPaymentCount === "number" ? payload.totalPaymentCount : 0);
      setPaymentsByStudent({});
      setArchives(payload?.archives ?? []);
      setArchiveNotice(payload?.archiveNotice ?? "");
    } catch (fetchError) {
      setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل بيانات المدفوعات.");
    } finally {
      setLoading(false);
    }
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [profile, schoolScope.scopeLoading, fetchAll]);

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
    if (!confirm("هل تريد حذف هذه الدفعة؟")) return;
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

      XLSX.writeFile(wb, `أرشيف_حسابات_${archive.archive_year}_${formatDate(new Date())}.xlsx`);
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

  const classes = Array.from(new Set(students.map((s) => s.class_name))).filter(Boolean) as string[];

  // فلترة الطلاب
  const studentPaymentsCount = (id: string) => paymentCountsByStudent[id] ?? 0;

  let filteredStudents = students.filter((s) => {
    if (quickFilter === "transferred") return s.status === "transferred";
    if (quickFilter === "deleted") return s.status === "deleted";
    if (quickFilter === "suspended") return s.status === "suspended";
    if (quickFilter === "graduated") return s.status === "graduated";
    if (quickFilter === "discounted") return (s.discount_value || 0) > 0;
    if (quickFilter === "collected") return s.remaining_fee <= 0 && s.total_fee > 0;
    if (quickFilter === "no_invoice") return studentPaymentsCount(s.id) === 0;
    return s.status !== "deleted";
  });

  filteredStudents = filteredStudents.filter(
    (s) => (s.full_name?.includes(search) || s.class_name?.includes(search)) && (filterClass ? s.class_name === filterClass : true),
  );

  // ترتيب
  filteredStudents = [...filteredStudents].sort((a, b) => {
    const va =
      a[filterSort === "name" ? "full_name" : filterSort === "remaining" ? "remaining_fee" : filterSort === "total" ? "total_fee" : "full_name"];
    const vb =
      b[filterSort === "name" ? "full_name" : filterSort === "remaining" ? "remaining_fee" : filterSort === "total" ? "total_fee" : "full_name"];
    if (typeof va === "string") return filterDir === "asc" ? va.localeCompare(vb) : vb.localeCompare(va);
    return filterDir === "asc" ? va - vb : vb - va;
  });

  async function exportExcel() {
    const XLSX = await loadXLSX();
    const rows = filteredStudents.map((s) => ({
      "اسم الطالب": s.full_name,
      "الصف": s.class_name,
      "الهاتف": s.phone || "",
      "المبلغ الكلي": s.total_fee,
      "المدفوع": s.paid_fee,
      "الخصم": s.discount_value || 0,
      "المتبقي": s.remaining_fee,
      "الحالة": s.status,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "فواتير الطلاب");
    XLSX.writeFile(wb, `فواتير_${formatDate(new Date())}.xlsx`);
  }

  const studentPaymentsList = (id: string) =>
    paymentsByStudent[id] ?? [];

  const searchResults = students.filter((s) => s.full_name.includes(studentSearch) || s.class_name.includes(studentSearch)).slice(0, 8);

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
        <div className="app-layout">
          <AppSidebar currentPath="/payments" />

          <div className="app-main">
            <AppShellTopbar
              title="فواتير الطلاب"
              subtitle={`${students.filter((s) => s.status !== "deleted").length} طالباً مسجلاً`}
              scope={schoolScope}
            />
            <div className="content app-shell-content">
              {success && <div className="msg-success">{success}</div>}
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
                        ["إجمالي الرسوم", `د.ع ${formatNumber(students.filter((s) => s.status !== "deleted").reduce((a, s) => a + s.total_fee, 0))}`],
                        ["إجمالي المدفوع", `د.ع ${formatNumber(students.filter((s) => s.status !== "deleted").reduce((a, s) => a + s.paid_fee, 0))}`],
                        ["إجمالي المتبقي", `د.ع ${formatNumber(students.filter((s) => s.status !== "deleted").reduce((a, s) => a + s.remaining_fee, 0))}`],
                        [
                          "المسددة بالكامل",
                          `${formatNumber(students.filter((s) => s.remaining_fee <= 0 && s.total_fee > 0).length)} / ${formatNumber(students.filter((s) => s.status !== "deleted").length)}`,
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
                        <button className="ui-button ui-button--success h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={exportExcel}>
                          <AppIcon token="⬇️" size={14} /> تصدير إكسل
                        </button>
                        {canAddPayments && (
                          <button
                            className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5"
                            onClick={() => {
                              setPayStudent(null);
                              setStudentSearch("");
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
                  <div className="adv-grid">
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
                      <label className="af-label">من تاريخ</label>
                      <input className="af-input" type="date" value={filterFrom} onChange={(e) => setFilterFrom(e.target.value)} />
                    </div>
                    <div className="af-item">
                      <label className="af-label">إلى تاريخ</label>
                      <input className="af-input" type="date" value={filterTo} onChange={(e) => setFilterTo(e.target.value)} />
                    </div>
                    <div className="af-item">
                      <label className="af-label">ترتيب حسب</label>
                      <select className="af-input" value={filterSort} onChange={(e) => setFilterSort(e.target.value)}>
                        <option value="name">الاسم</option>
                        <option value="remaining">المتبقي</option>
                        <option value="total">إجمالي الرسوم</option>
                      </select>
                    </div>
                  </div>
                  <div className="adv-grid2">
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
                  <input placeholder="بحث باسم الطالب أو الصف..." value={search} onChange={(e) => setSearch(e.target.value)} />
                </div>
                <span className="results-count">{filteredStudents.length} نتيجة</span>
              </div>

              {/* الجدول */}
              <div className="tbl-wrap">
                {loading ? (
                  <div className="spin" />
                ) : filteredStudents.length === 0 ? (
                  <div className="empty">لا توجد نتائج</div>
                ) : (
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
                      {filteredStudents.map((s, i) => {
                        const pct = s.total_fee > 0 ? Math.min(100, Math.round((s.paid_fee / s.total_fee) * 100)) : 0;
                        return (
                          <tr key={s.id}>
                            <td style={{ color: "var(--text-tertiary)", fontSize: ".7rem" }}>{i + 1}</td>
                            <td>
                              <span
                                className="student-link"
                                style={{ color: "var(--primary)", fontWeight: 700, cursor: "pointer", textDecoration: "underline", textUnderlineOffset: 3 }}
                                onClick={() => {
                                  void openStudentDetail(s);
                                }}
                              >
                                {s.full_name}
                              </span>
                            </td>
                            <td style={{ color: "var(--text-tertiary)" }}>{s.class_name}</td>
                            <td style={{ color: "var(--text-tertiary)", fontSize: ".75rem" }}>{s.phone || "—"}</td>
                            <td style={{ fontWeight: 700 }}>د.ع {formatNumber(s.total_fee)}</td>
                            <td style={{ color: "var(--success)", fontWeight: 700 }}>د.ع {formatNumber(s.paid_fee)}</td>
                            <td style={{ color: "var(--text-tertiary)" }}>{s.discount_value > 0 ? `د.ع ${formatNumber(s.discount_value)}` : "—"}</td>
                            <td>
                              <div style={{ color: s.remaining_fee > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
                                د.ع {formatNumber(s.remaining_fee)}
                              </div>
                              <div className="progress-bar">
                                <div
                                  className="progress-fill"
                                  style={{ width: `${pct}%`, background: pct >= 100 ? "var(--success)" : "var(--primary)" }}
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
                {archiveNotice && <div className="msg-error" style={{ marginBottom: ".8rem" }}>{archiveNotice}</div>}
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
                    <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={archiveAccountsYear} disabled={archiving}>
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
                    <span className="detail-val" style={{ color: "var(--success)" }}>
                      د.ع {formatNumber(selectedStudent.paid_fee)}
                    </span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">الخصم:</span>
                    <span className="detail-val">د.ع {formatNumber(selectedStudent.discount_value || 0)}</span>
                  </div>
                  <div className="detail-row">
                    <span className="detail-label">المتبقي:</span>
                    <span className="detail-val" style={{ color: "var(--danger)" }}>
                      د.ع {formatNumber(selectedStudent.remaining_fee)}
                    </span>
                  </div>
                </div>
              </div>

              {/* شريط التقدم */}
              <div style={{ background: "var(--primary-subtle)", borderRadius: 12, padding: "1rem", marginBottom: "1.2rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: ".5rem", fontSize: ".8rem" }}>
                  <span style={{ fontWeight: 700 }}>نسبة الإنجاز</span>
                  <span style={{ color: "var(--primary)", fontWeight: 800 }}>
                    {selectedStudent.total_fee > 0 ? Math.min(100, Math.round((selectedStudent.paid_fee / selectedStudent.total_fee) * 100)) : 0}%
                  </span>
                </div>
                <div className="progress-bar" style={{ height: 12 }}>
                  <div
                    className="progress-fill"
                    style={{
                      width: `${selectedStudent.total_fee > 0 ? Math.min(100, Math.round((selectedStudent.paid_fee / selectedStudent.total_fee) * 100)) : 0}%`,
                      background: "linear-gradient(90deg,var(--primary),var(--success))",
                    }}
                  />
                </div>
              </div>

              {/* المعاملات */}
              <div>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".8rem" }}>
                  <span style={{ fontSize: ".88rem", fontWeight: 800, display: "inline-flex", alignItems: "center", gap: ".3rem" }}>
                    <AppIcon token="💳" size={14} /> معاملات الدفع ({studentPaymentsCount(selectedStudent.id)})
                  </span>
                  {canAddPayments && (
                    <button
                      className="ui-button ui-button--primary"
                      style={{ padding: ".4rem .8rem", fontSize: ".75rem" }}
                      onClick={() => {
                        setPayStudent(selectedStudent);
                        setStudentSearch(selectedStudent.full_name);
                        setShowPayModal(true);
                      }}
                    >
                      + إضافة دفعة
                    </button>
                  )}
                </div>
                {paymentsLoadingStudentId === selectedStudent.id ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-tertiary)", fontSize: ".85rem" }}>
                    جارٍ تحميل دفعات الطالب...
                  </div>
                ) : studentPaymentsList(selectedStudent.id).length === 0 ? (
                  <div style={{ textAlign: "center", padding: "2rem", color: "var(--text-tertiary)", fontSize: ".85rem" }}>
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
                            <button className="ui-button ui-button--danger" style={{padding:".28rem .6rem",fontSize:".68rem"}} onClick={() => deletePayment(p.id)}>
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
                    className="ui-button ui-button--success h-9 px-4 text-sm inline-flex items-center gap-1.5"
                    onClick={() => exportArchiveExcel(selectedArchive)}
                    disabled={archiveExportingId === selectedArchive.id}
                  >
                    <AppIcon token="⬇️" size={14} /> {archiveExportingId === selectedArchive.id ? "جارٍ التصدير..." : "تصدير ملف الأرشيف"}
                  </button>
                  <button className="ui-button ui-button--primary h-9 px-4 text-sm inline-flex items-center gap-1.5" onClick={() => setShowArchiveDetail(false)}>
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
                              <td style={{ color: "var(--success)", fontWeight: 700 }}>د.ع {formatNumber(student.paid_fee || 0)}</td>
                              <td style={{ color: (student.remaining_fee || 0) > 0 ? "var(--danger)" : "var(--success)", fontWeight: 700 }}>
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
                              <td style={{ color: "var(--success)", fontWeight: 700 }}>د.ع {formatNumber(payment.amount || 0)}</td>
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
          <div className="modal-overlay" onClick={(e) => {
            if (e.target === e.currentTarget) setShowPayModal(false);
          }}>
            <div className="modal-box">
              <div className="modal-header">
                <div style={{fontWeight:800,fontSize:"1rem"}}>تسجيل دفعة جديدة</div>
                <button className="ui-button ui-button--ghost" style={{width:30,height:30,borderRadius:7}} onClick={() => setShowPayModal(false)}>
                  <AppIcon token="✕" size={14} />
                </button>
              </div>
              {error && <div className="msg-error">{error}</div>}
              <form onSubmit={handlePayment}>
                <div className="form-grid">
                  <div className="form-group full">
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
                            color: "var(--success)",
                            display: "inline-flex",
                          }}
                        >
                          <AppIcon token="✓" size={14} />
                        </span>
                      )}
                      {showDropdown && !payStudent && studentSearch && (
                        <div className="dropdown">
                          {searchResults.length === 0 ? (
                            <div style={{ padding: "1rem", textAlign: "center", color: "var(--text-tertiary)", fontSize: ".8rem" }}>لا توجد نتائج</div>
                          ) : (
                            searchResults.map((s) => (
                              <div
                                key={s.id}
                                className="dropdown-item"
                                onMouseDown={() => {
                                  setPayStudent(s);
                                  setStudentSearch(s.full_name);
                                  setShowDropdown(false);
                                }}
                              >
                                <div style={{fontWeight:700}}>{s.full_name}</div>
                                <div style={{display:"flex",justifyContent:"space-between",marginTop:".1rem"}}>
                                  <span style={{color:"var(--text-tertiary)",fontSize:".73rem"}}>{s.class_name}</span>
                                  <span style={{color:"var(--danger)",fontSize:".73rem",fontWeight:600}}>متبقي: د.ع {formatNumber(s.remaining_fee)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  {payStudent && (
                    <div className="form-group full">
                      <div style={{background:"var(--primary-subtle)",borderRadius:10,padding:".8rem 1rem"}}>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",margin:".2rem 0"}}>
                          <span style={{color:"var(--text-tertiary)"}}>الكلي:</span>
                          <span style={{fontWeight:700}}>د.ع {formatNumber(payStudent.total_fee)}</span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",margin:".2rem 0"}}>
                          <span style={{color:"var(--text-tertiary)"}}>المدفوع:</span>
                          <span style={{ color: "var(--success)", fontWeight:700 }}>
                            د.ع {formatNumber(payStudent.paid_fee)}
                          </span>
                        </div>
                        <div style={{display:"flex",justifyContent:"space-between",fontSize:".8rem",margin:".2rem 0"}}>
                          <span style={{color:"var(--text-tertiary)"}}>المتبقي:</span>
                          <span style={{ color: "var(--danger)", fontWeight:700 }}>
                            د.ع {formatNumber(payStudent.remaining_fee)}
                          </span>
                        </div>
                      </div>
                    </div>
                  )}
                  <div className="form-group">
                    <label className="form-label">تاريخ الإيصال *</label>
                    <input
                      className="form-input"
                      type="date"
                      required
                      value={payForm.receipt_date}
                      onChange={(e) => setPayForm({ ...payForm, receipt_date: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">المبلغ (د.ع) *</label>
                    <input
                      className="form-input"
                      type="number"
                      required
                      placeholder="500000"
                      value={payForm.amount}
                      onChange={(e) => setPayForm({ ...payForm, amount: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      رقم الإيصال الورقي <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="مثال: 1042"
                      value={payForm.manual_receipt_number}
                      onChange={(e) => setPayForm({ ...payForm, manual_receipt_number: e.target.value })}
                    />
                  </div>
                  <div className="form-group">
                    <label className="form-label">رقم الإيصال الإلكتروني</label>
                    <div style={{background:"var(--primary-subtle)",borderRadius:10,padding:".65rem 1rem",fontSize:".85rem",fontWeight:800,color:"var(--primary)",textAlign:"center"}}>{nextReceiptNum}</div>
                  </div>
                  <div className="form-group">
                    <label className="form-label">طريقة الدفع</label>
                    <select className="form-select" value={payForm.payment_method} onChange={(e) => setPayForm({ ...payForm, payment_method: e.target.value })}>
                      <option value="cash">نقداً</option>
                      <option value="bank_transfer">تحويل بنكي</option>
                      <option value="check">شيك</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label className="form-label">
                      ملاحظات <span style={{fontSize:".68rem",color:"var(--text-tertiary)",fontWeight:400}}>(اختياري)</span>
                    </label>
                    <input
                      className="form-input"
                      placeholder="أي ملاحظات..."
                      value={payForm.notes}
                      onChange={(e) => setPayForm({ ...payForm, notes: e.target.value })}
                    />
                  </div>
                </div>
                <div className="modal-actions">
                  <button type="submit" className="ui-button ui-button--primary" style={{flex:1}} disabled={saving || !payStudent}>
                    {saving ? "جارٍ الحفظ..." : "تسجيل الدفعة"}
                  </button>
                  <button type="button" className="ui-button ui-button--secondary" onClick={() => setShowPayModal(false)}>
                    إلغاء
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
    </ProtectedRoute>
  );
}
