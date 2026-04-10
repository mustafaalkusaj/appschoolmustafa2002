"use client";

import { useCallback, useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

import { usePaymentsMeta } from "./usePaymentsMeta";
import { useStudentsPage } from "./useStudentsPage";
import { usePaymentOperations } from "./usePaymentOperations";
import { useArchiveOperations } from "./useArchiveOperations";

import { Student, Payment, PaymentArchive, SEARCH_DEBOUNCE_MS } from "../_types";

export function usePaymentsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile, can } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const canAddPayments = can("add_payments");
  const canDeletePayments = can("delete_payments");

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

  // Hooks
  const metaHook = usePaymentsMeta(resolvedSchoolId);
  const studentsHook = useStudentsPage(
    resolvedSchoolId,
    quickFilter,
    filterClass,
    filterSort,
    filterDir,
    search
  );

  const onSuccess = useCallback((msg: string) => {
    setSuccess(msg);
    setTimeout(() => setSuccess(""), 3000);
  }, []);

  const printReceipt = useCallback(
    (p: Payment, student: Student) => {
      printHtmlDocument(
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
            <div class="print-panel" style="margin-bottom:16px">
              <div class="print-grid">
                <div>
                  <span class="print-label">${isEnglish ? "Student name" : "اسم الطالب"}</span>
                  <div class="print-value">${escapeHtml(student?.full_name || "—")}</div>
                </div>
                <div>
                  <span class="print-label">${isEnglish ? "Class" : "الصف"}</span>
                  <div class="print-value">${escapeHtml(student?.class_name || "—")}</div>
                </div>
                <div>
                  <span class="print-label">${isEnglish ? "Payment method" : "طريقة الدفع"}</span>
                  <div class="print-value">${escapeHtml(({ cash: isEnglish ? "Cash" : "نقداً", bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي", check: isEnglish ? "Check" : "شيك" } as Record<string, string>)[p.payment_method as string] || p.payment_method || "—")}</div>
                </div>
                <div>
                  <span class="print-label">${isEnglish ? "Date" : "التاريخ"}</span>
                  <div class="print-value">${formatDate(p.created_at)}</div>
                </div>
              </div>
            </div>
            <div class="print-panel" style="text-align:center;background:linear-gradient(135deg,var(--print-surface),#ffffff)">
              <span class="print-label">${isEnglish ? "Amount received" : "المبلغ المستلم"}</span>
              <div class="print-value" style="font-size:32px">د.ع ${formatNumber(p.amount || 0)}</div>
              <div class="print-note" style="margin-top:12px">${isEnglish ? "Receipt generated by the school management system." : "تم إنشاء الإيصال من نظام إدارة المدرسة."}</div>
            </div>
            ${p.notes ? `<div class="print-panel" style="margin-top:16px"><span class="print-label">${isEnglish ? "Notes" : "ملاحظات"}</span><div class="print-value" style="font-size:15px;font-weight:700">${escapeHtml(p.notes)}</div></div>` : ""}
            <div style="margin-top:16px;text-align:center;color:var(--print-muted);font-size:13px">${isEnglish ? "Thank you" : "شكراً لكم"}</div>
          `,
          autoPrint: false,
        })
      );
    },
    [isEnglish, runtimeBranding]
  );

  const paymentOpsHook = usePaymentOperations(
    resolvedSchoolId,
    canAddPayments,
    canDeletePayments,
    onSuccess,
    setError,
    printReceipt
  );

  const archiveOpsHook = useArchiveOperations(
    resolvedSchoolId,
    canDeletePayments,
    onSuccess,
    setError
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
  }, [resolvedSchoolId, quickFilter, filterSort, filterDir, search, filterClass]);

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
      if (!selectedStudent) return;
      await paymentOpsHook.deletePayment(
        paymentId,
        selectedStudent.id,
        updateStudentFinancials,
        metaHook.refreshMeta,
        metaHook.decrementPaymentCount
      );
      studentsHook.updatePaymentCount(selectedStudent.id, -1);
    },
    [selectedStudent, paymentOpsHook, studentsHook, metaHook, updateStudentFinancials]
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

  return {
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
  };
}
