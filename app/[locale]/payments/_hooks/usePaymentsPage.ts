"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument } from "@/lib/print/branding";
import { buildReceiptHtml, type ReceiptConfig } from "@/lib/print/receipt-template";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

import { usePaymentsMeta } from "./usePaymentsMeta";
import { useStudentsPage } from "./useStudentsPage";
import { usePaymentOperations } from "./usePaymentOperations";
import { useArchiveOperations } from "./useArchiveOperations";

import { Student, Payment, PaymentArchive, SEARCH_DEBOUNCE_MS } from "../_types";

export function usePaymentsPage(options?: { currentBranchId?: string | null }) {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, can } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const canAddPayments = can("add_payments");
  const canDeletePayments = can("delete_payments");
  const currentBranchId = options?.currentBranchId ?? null;

  // State
  const [resolvedSchoolId, setResolvedSchoolId] = useState<string | null>(null);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");
  const [searchInput, setSearchInput] = useState("");
  const [search, setSearch] = useState("");
  const [exporting, setExporting] = useState(false);

  // Filters
  const [quickFilter, setQuickFilter] = useState("all");
  const [filterClass, setFilterClass] = useState("");
  const [filterSort, setFilterSort] = useState("name");
  const [filterDir, setFilterDir] = useState("asc");

  // Selected student for detail panel
  const [selectedStudent, setSelectedStudent] = useState<Student | null>(null);
  const [showDetail, setShowDetail] = useState(false);

  // Receipt customization config (loaded once per school)
  const [receiptConfig, setReceiptConfig] = useState<ReceiptConfig | null>(null);

  // Debounced search
  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearch(searchInput.trim());
    }, SEARCH_DEBOUNCE_MS);
    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  // Resolve school ID
  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;

    let cancelled = false;
    void (async () => {
      try {
        const scopedSchoolId = await resolveSchoolIdForProfile(profile, {
          selectedSchoolId: schoolScope.selectedSchoolId,
        });
        if (!cancelled) {
          setResolvedSchoolId(scopedSchoolId);
        }
      } catch {
        if (!cancelled) {
          setResolvedSchoolId(null);
          setError("تعذر تحديد المدرسة الحالية.");
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [profile, schoolScope.scopeLoading, schoolScope.selectedSchoolId]);

  // Load receipt customization config (super-admin uploads decorations per school)
  useEffect(() => {
    if (!resolvedSchoolId) {
      setReceiptConfig(null);
      return;
    }
    let cancelled = false;
    void (async () => {
      try {
        const rcParams = new URLSearchParams({ schoolId: resolvedSchoolId });
        if (currentBranchId) rcParams.set("branchId", currentBranchId);
        const { payload } = await fetchJsonWithAuthorizedSession<{ ok: boolean; config: ReceiptConfig | null }>(
          `/api/web/payments/receipt-config?${rcParams.toString()}`,
        );
        if (!cancelled && payload?.ok) setReceiptConfig(payload.config);
      } catch {
        if (!cancelled) setReceiptConfig(null);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [resolvedSchoolId, currentBranchId]);

  // Hooks
  const metaHook = usePaymentsMeta(resolvedSchoolId, currentBranchId);
  const studentsHook = useStudentsPage(
    resolvedSchoolId,
    quickFilter,
    filterClass,
    filterSort,
    filterDir,
    search,
    currentBranchId
  );

  const onSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }, []);

  const printReceipt = useCallback(
    (p: Payment, student: Student, pageSizeOverride?: "A5" | "A4") => {
      const methodLabels: Record<string, string> = {
        cash: isEnglish ? "Cash" : "نقداً",
        bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي",
        check: isEnglish ? "Check" : "شيك",
      };
      const html = buildReceiptHtml({
        locale: isEnglish ? "en" : "ar",
        schoolName: runtimeBranding.schoolName || (isEnglish ? "School" : "المدرسة"),
        branchName: runtimeBranding.branchName,
        schoolLogoUrl: runtimeBranding.branchLogoUrl || runtimeBranding.logoUrl,
        receiptNumber: p.receipt_number || p.manual_receipt_number || "—",
        studentName: student?.full_name || "—",
        className: student?.class_name || "—",
        paymentMethod: methodLabels[p.payment_method as string] || p.payment_method || "—",
        paymentDate: formatDate(p.created_at),
        totalFee: Number(student?.total_fee ?? 0),
        discount: Number(student?.discount_value ?? 0),
        paidNow: Number(p.amount ?? 0),
        remaining: Number(student?.remaining_fee ?? 0),
        notes: p.notes || null,
        config: receiptConfig,
        pageSizeOverride: pageSizeOverride ?? null,
        autoPrint: false,
      });
      printHtmlDocument(html);
    },
    [isEnglish, runtimeBranding, receiptConfig],
  );

  const paymentOpsHook = usePaymentOperations(
    resolvedSchoolId,
    canAddPayments,
    canDeletePayments,
    onSuccess,
    setError,
    printReceipt,
    currentBranchId
  );

  const archiveOpsHook = useArchiveOperations(
    resolvedSchoolId,
    canDeletePayments,
    onSuccess,
    setError,
    currentBranchId
  );

  // Handlers
  const openStudentDetail = useCallback(
    async (student: Student) => {
      setSelectedStudent(student);
      setShowDetail(true);
      await paymentOpsHook.loadStudentPayments(student.id);
    },
    [paymentOpsHook]
  );

  const handleExportExcel = useCallback(async () => {
    if (!resolvedSchoolId) return;
    setExporting(true);
    try {
      const params = new URLSearchParams({
        schoolId: resolvedSchoolId,
        quickFilter,
        sort: filterSort,
        dir: filterDir,
      });
      if (search) params.set("search", search);
      if (filterClass) params.set("className", filterClass);
      if (currentBranchId) params.set("branchId", currentBranchId);

      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: Student[];
        error?: { message?: string };
      }>(`/api/web/payments/export?${params.toString()}`);

      if (!response.ok) throw new Error(payload?.error?.message || "تعذر تحميل بيانات التصدير.");

      const XLSX = await loadXLSX();
      const rows = (payload?.students ?? []).map((s) => ({
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
      await XLSX.writeFile(wb, `فواتير_${formatDate(new Date())}.xlsx`);
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "تعذر تصدير البيانات.");
    } finally {
      setExporting(false);
    }
  }, [resolvedSchoolId, quickFilter, filterSort, filterDir, search, filterClass, currentBranchId]);

  const handleArchiveExport = useCallback(
    async (archive: PaymentArchive) => {
      const { exportArchiveExcel: doExport } = await import("../_components/PaymentsArchive");
      await doExport(archive, archiveOpsHook.setArchiveExportingId);
    },
    [archiveOpsHook]
  );

  const updateStudentFinancials = useCallback(
    (studentId: string, update: { paid_fee: number; remaining_fee: number }) => {
      studentsHook.updateStudentFinancials(studentId, update);
      setSelectedStudent((current) =>
        current?.id === studentId
          ? { ...current, paid_fee: update.paid_fee, remaining_fee: update.remaining_fee }
          : current
      );
    },
    [studentsHook]
  );

  const handleDeletePayment = useCallback(
    async (paymentId: string) => {
      if (!selectedStudent) {
        setError("لا يمكن حذف الدفعة: لم يتم تحديد الطالب.");
        return;
      }

      await paymentOpsHook.deletePayment(
        paymentId,
        selectedStudent.id,
        updateStudentFinancials,
        metaHook.refreshMeta,
        metaHook.decrementPaymentCount
      );
      studentsHook.updatePaymentCount(selectedStudent.id, -1);
    },
    [selectedStudent, paymentOpsHook, studentsHook, metaHook, updateStudentFinancials, setError]
  );

  const handlePaymentSubmit = useCallback(
    async (e: React.FormEvent) => {
      if (!paymentOpsHook.payStudent) return;
      await paymentOpsHook.handlePayment(
        e,
        paymentOpsHook.payStudent,
        paymentOpsHook.payForm,
        updateStudentFinancials,
        metaHook.refreshMeta,
        metaHook.incrementPaymentCount,
        metaHook.addPaymentYear
      );
    },
    [paymentOpsHook, metaHook, updateStudentFinancials]
  );

  const openPaymentForStudent = useCallback(
    (student: Student) => {
      setSelectedStudent(student);
      paymentOpsHook.openPaymentModal(student);
    },
    [paymentOpsHook]
  );

  return useMemo(() => ({
    // Permissions
    canAddPayments,
    canDeletePayments,

    // School scope
    schoolScope,
    resolvedSchoolId,

    // State
    success,
    error,
    searchInput,
    setSearchInput,
    exporting,

    // Filters
    quickFilter,
    setQuickFilter,
    filterClass,
    setFilterClass,
    filterSort,
    setFilterSort,
    filterDir,
    setFilterDir,

    // Meta hook
    metaHook,

    // Students hook
    studentsHook,

    // Payment operations hook
    paymentOpsHook,

    // Archive operations hook
    archiveOpsHook,

    // Selected student
    selectedStudent,
    setSelectedStudent,
    showDetail,
    setShowDetail,

    // Handlers
    openStudentDetail,
    handleExportExcel,
    printReceipt,
    handleArchiveExport,
    handleDeletePayment,
    handlePaymentSubmit,
    openPaymentForStudent,
    updateStudentFinancials,
  }), [canAddPayments, canDeletePayments, schoolScope, resolvedSchoolId, success, error, searchInput, setSearchInput, exporting, quickFilter, setQuickFilter, filterClass, setFilterClass, filterSort, setFilterSort, filterDir, setFilterDir, metaHook, studentsHook, paymentOpsHook, archiveOpsHook, selectedStudent, setSelectedStudent, showDetail, setShowDetail, openStudentDetail, handleExportExcel, printReceipt, handleArchiveExport, handleDeletePayment, handlePaymentSubmit, openPaymentForStudent, updateStudentFinancials]);
}
