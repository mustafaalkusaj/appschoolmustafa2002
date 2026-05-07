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
import { loadExcelJS, solidFill, thinBorder, addTitleBlock, addColumnHeaders, addDataRow, addTotalsRow, NUM_FMT_IQD, colLetter } from "@/lib/excel/styled-export";
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

      const students = payload?.students ?? [];
      const ExcelJS  = await loadExcelJS();
      const wb = new ExcelJS.Workbook();
      wb.creator = "School System";
      wb.created = new Date();

      const COLS = [
        { label: "اسم الطالب",   width: 32, key: "name" },
        { label: "الصف",         width: 20, key: "class" },
        { label: "الهاتف",       width: 16, key: "phone" },
        { label: "المبلغ الكلي", width: 18, key: "total",     numFmt: NUM_FMT_IQD },
        { label: "المدفوع",      width: 18, key: "paid",      numFmt: NUM_FMT_IQD },
        { label: "الخصم",        width: 15, key: "discount",  numFmt: NUM_FMT_IQD },
        { label: "المتبقي",      width: 18, key: "remaining", numFmt: NUM_FMT_IQD },
        { label: "الحالة",       width: 14, key: "status" },
      ];
      const LAST_COL = colLetter(COLS.length - 1);

      const ws = wb.addWorksheet("فواتير الطلاب", {
        views: [{ state: "frozen", xSplit: 0, ySplit: 4, rightToLeft: true }],
        pageSetup: {
          paperSize: 9, orientation: "portrait",
          fitToPage: true, fitToWidth: 1, fitToHeight: 0,
          horizontalCentered: true,
          margins: { left: 0.5, right: 0.5, top: 0.75, bottom: 0.75, header: 0.3, footer: 0.3 },
        },
      });

      const schoolLabel = runtimeBranding.schoolName || "المدرسة";
      const branchLabel = runtimeBranding.branchName ? ` — ${runtimeBranding.branchName}` : "";
      addTitleBlock(ws, {
        schoolName: `${schoolLabel}${branchLabel}`,
        reportTitle: "فواتير الطلاب",
        meta: `تاريخ التصدير: ${new Date().toLocaleDateString("ar-IQ")}   |   عدد الطلاب: ${students.length}`,
        lastCol: LAST_COL,
        numCols: COLS.length,
      });
      addColumnHeaders(ws, COLS, 4, LAST_COL);

      const STATUS_COLORS: Record<string, { color: string; bg: string }> = {
        paid:      { color: "FF16A34A", bg: "FFDCFCE7" },
        completed: { color: "FF16A34A", bg: "FFDCFCE7" },
        overdue:   { color: "FFDC2626", bg: "FFFEE2E2" },
        late:      { color: "FFDC2626", bg: "FFFEE2E2" },
      };

      students.forEach((s, idx) => {
        const remaining = Number(s.remaining_fee ?? 0);
        const statusKey = (s.status ?? "").toLowerCase();
        const sc = STATUS_COLORS[statusKey];
        addDataRow(ws, 5 + idx, [
          { value: s.full_name || "—" },
          { value: s.class_name || "—" },
          { value: s.phone || "—" },
          { value: Number(s.total_fee ?? 0),      numFmt: NUM_FMT_IQD },
          { value: Number(s.paid_fee ?? 0),        numFmt: NUM_FMT_IQD, color: "FF16A34A", bold: Number(s.paid_fee) > 0 },
          { value: Number(s.discount_value ?? 0),  numFmt: NUM_FMT_IQD, color: "FFD97706", bold: Number(s.discount_value) > 0 },
          {
            value: remaining, numFmt: NUM_FMT_IQD,
            color: remaining === 0 ? "FF16A34A" : "FFDC2626",
            bgArgb: remaining === 0 ? "FFDCFCE7" : "FFFEE2E2",
            bold: true,
          },
          { value: s.status || "—", color: sc?.color, bgArgb: sc?.bg },
        ], idx % 2 === 0);
      });

      const totRow = 5 + students.length;
      addTotalsRow(ws, totRow,
        `المجموع الكلي — ${students.length} طالب`,
        3,
        [
          students.reduce((acc, s) => acc + Number(s.total_fee ?? 0), 0),
          students.reduce((acc, s) => acc + Number(s.paid_fee ?? 0), 0),
          students.reduce((acc, s) => acc + Number(s.discount_value ?? 0), 0),
          students.reduce((acc, s) => acc + Number(s.remaining_fee ?? 0), 0),
        ],
        NUM_FMT_IQD,
        LAST_COL,
      );

      // merge label across name+class+phone
      ws.mergeCells(`A${totRow}:C${totRow}`);
      const totLabel = ws.getCell(`A${totRow}`);
      totLabel.fill      = solidFill("FF1B3A6B");
      totLabel.font      = { name: "Arial", size: 11, bold: true, color: { argb: "FFFFFFFF" } };
      totLabel.alignment = { horizontal: "center", vertical: "middle", readingOrder: "rtl" };

      await wb.xlsx.writeBuffer().then((buffer) => {
        const blob = new Blob([buffer], { type: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet" });
        const url  = URL.createObjectURL(blob);
        const a    = document.createElement("a");
        a.href     = url;
        a.download = `فواتير_${formatDate(new Date())}.xlsx`;
        a.click();
        URL.revokeObjectURL(url);
      });
    } catch (exportError) {
      setError(exportError instanceof Error ? exportError.message : "تعذر تصدير البيانات.");
    } finally {
      setExporting(false);
    }
  }, [resolvedSchoolId, quickFilter, filterSort, filterDir, search, filterClass, currentBranchId, runtimeBranding]);

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
