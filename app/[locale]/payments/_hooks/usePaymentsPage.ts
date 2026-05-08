"use client";

import { useCallback, useEffect, useState, useMemo } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { buildStyledReceiptHtml } from "@/lib/print/receipt-styled";
import { resolveSchoolIdForProfile } from "@/lib/school/context";

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
    (p: Payment, student: Student) => {
      const effectiveFee = Math.max((student.total_fee ?? 0) - (student.discount_value ?? 0), 0);
      const remaining = Math.max(effectiveFee - (student.paid_fee ?? 0), 0);
      const logoUrl = runtimeBranding.logoUrl;
      void (async () => {
        // Convert logo to base64 so it loads correctly inside the print iframe
        let resolvedLogoUrl: string | null = null;
        if (logoUrl) {
          try {
            const res = await fetch(logoUrl);
            if (res.ok) {
              const blob = await res.blob();
              resolvedLogoUrl = await new Promise<string>((resolve, reject) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve(reader.result as string);
                reader.onerror = reject;
                reader.readAsDataURL(blob);
              });
            }
          } catch {
            // fall back to direct URL
            resolvedLogoUrl = logoUrl;
          }
        }
        printHtmlDocument(
          buildStyledReceiptHtml({
            schoolName: runtimeBranding.schoolName,
            logoUrl: resolvedLogoUrl,
            branchName: runtimeBranding.branchName,
            primaryColor: runtimeBranding.primaryColor,
            receiptNumber: p.receipt_number || "",
            amount: Number(p.amount) || 0,
            paymentMethod: p.payment_method as string,
            date: p.created_at,
            notes: p.notes,
            studentName: student.full_name || "",
            className: student.class_name || "",
            totalFee: student.total_fee ?? 0,
            discountValue: student.discount_value ?? 0,
            remainingFee: remaining,
            isEnglish,
            backgroundImageUrl: runtimeBranding.receiptBgUrl,
          })
        );
      })();
    },
    [isEnglish, runtimeBranding]
  );

  const printStatement = useCallback(
    (student: Student, payments: Payment[]) => {
      const methodMap = { cash: isEnglish ? "Cash" : "نقداً", bank_transfer: isEnglish ? "Bank transfer" : "تحويل بنكي", check: isEnglish ? "Check" : "شيك" } as Record<string, string>;
      const effectiveFee = Math.max((student.total_fee ?? 0) - (student.discount_value ?? 0), 0);
      const totalPaid = payments.reduce((s, p) => s + (Number(p.amount) || 0), 0);
      const remaining = Math.max(effectiveFee - totalPaid, 0);
      const rows = payments.map((p, i) => `
        <tr>
          <td>${i + 1}</td>
          <td>${formatDate(p.created_at)}</td>
          <td>د.ع ${formatNumber(p.amount || 0)}</td>
          <td>${escapeHtml(methodMap[p.payment_method as string] || p.payment_method || "—")}</td>
          <td>${escapeHtml(p.receipt_number || "—")}</td>
          <td>${escapeHtml(p.notes || "—")}</td>
        </tr>
      `).join("");
      printHtmlDocument(
        wrapPrintDocument({
          title: isEnglish ? "Account Statement" : "كشف حساب",
          subtitle: escapeHtml(student.full_name),
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
                  <div class="print-value">${escapeHtml(student.full_name || "—")}</div>
                </div>
                <div>
                  <span class="print-label">${isEnglish ? "Class" : "الصف"}</span>
                  <div class="print-value">${escapeHtml(student.class_name || "—")}</div>
                </div>
                ${runtimeBranding.branchName ? `<div>
                  <span class="print-label">${isEnglish ? "Branch" : "الفرع"}</span>
                  <div class="print-value">${escapeHtml(runtimeBranding.branchName)}</div>
                </div>` : ""}
              </div>
            </div>
            <div class="print-panel" style="margin-bottom:16px">
              <div class="print-grid">
                <div>
                  <span class="print-label">${isEnglish ? "Total fee" : "المبلغ الكلي"}</span>
                  <div class="print-value">د.ع ${formatNumber(student.total_fee ?? 0)}</div>
                </div>
                ${(student.discount_value ?? 0) > 0 ? `<div>
                  <span class="print-label">${isEnglish ? "Discount" : "التخفيض"}</span>
                  <div class="print-value" style="color:#d97706">د.ع ${formatNumber(student.discount_value ?? 0)}</div>
                </div>` : ""}
                <div>
                  <span class="print-label">${isEnglish ? "Total paid" : "إجمالي المدفوع"}</span>
                  <div class="print-value" style="color:#16a34a">د.ع ${formatNumber(totalPaid)}</div>
                </div>
                <div>
                  <span class="print-label">${isEnglish ? "Remaining" : "المتبقي"}</span>
                  <div class="print-value" style="color:${remaining <= 0 ? "#16a34a" : "#dc2626"}">د.ع ${formatNumber(remaining)}</div>
                </div>
              </div>
            </div>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${isEnglish ? "Date" : "التاريخ"}</th>
                  <th>${isEnglish ? "Amount" : "المبلغ"}</th>
                  <th>${isEnglish ? "Method" : "طريقة الدفع"}</th>
                  <th>${isEnglish ? "Receipt no." : "رقم الإيصال"}</th>
                  <th>${isEnglish ? "Notes" : "ملاحظات"}</th>
                </tr>
              </thead>
              <tbody>
                ${rows || `<tr><td colspan="6" style="text-align:center;color:var(--print-muted)">${isEnglish ? "No payments recorded." : "لا توجد دفعات مسجلة."}</td></tr>`}
              </tbody>
            </table>
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
        format: "excel",
      });
      if (search) params.set("search", search);
      if (filterClass) params.set("className", filterClass);
      if (currentBranchId) params.set("branchId", currentBranchId);

      const { fetchWithAuthorizedSession } = await import("@/lib/authorized-api");
      const response = await fetchWithAuthorizedSession(`/api/web/payments/export?${params.toString()}`);

      if (!response.ok) {
        const json = await response.json().catch(() => ({})) as { error?: { message?: string } };
        throw new Error(json?.error?.message || "تعذر تحميل بيانات التصدير.");
      }

      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      const dateStr = new Date().toLocaleDateString("ar-IQ").replace(/\//g, "_");
      a.href = url;
      a.download = `فواتير_اقساط_الطلاب_${dateStr}.xlsx`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
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
    printStatement,
    handleArchiveExport,
    handleDeletePayment,
    handlePaymentSubmit,
    openPaymentForStudent,
    updateStudentFinancials,
  }), [canAddPayments, canDeletePayments, schoolScope, resolvedSchoolId, success, error, searchInput, setSearchInput, exporting, quickFilter, setQuickFilter, filterClass, setFilterClass, filterSort, setFilterSort, filterDir, setFilterDir, metaHook, studentsHook, paymentOpsHook, archiveOpsHook, selectedStudent, setSelectedStudent, showDetail, setShowDetail, openStudentDetail, handleExportExcel, printReceipt, printStatement, handleArchiveExport, handleDeletePayment, handlePaymentSubmit, openPaymentForStudent, updateStudentFinancials]);
}
