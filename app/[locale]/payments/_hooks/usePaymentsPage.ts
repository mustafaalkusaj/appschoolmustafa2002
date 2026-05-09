"use client";

import { useCallback, useEffect, useState, useMemo, useRef } from "react";
import { usePathname } from "next/navigation";
import { formatNumber, formatDate } from "@/lib/formatting";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { buildStyledReceiptHtml } from "@/lib/print/receipt-styled";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { normalizeArabicText } from "@/lib/normalization";

import { usePaymentsMeta } from "./usePaymentsMeta";
import { useStudentsPage } from "./useStudentsPage";
import { usePaymentOperations } from "./usePaymentOperations";
import { useArchiveOperations } from "./useArchiveOperations";

import { Student, Payment, PaymentArchive, SEARCH_DEBOUNCE_MS, PAGE_SIZE, EMPTY_SUMMARY, PaymentsSummary } from "../_types";
import { getArchiveStudents, getArchivePayments } from "./useArchiveOperations";

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
            textColor: runtimeBranding.textColor,
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
            receiptFooterText: runtimeBranding.receiptFooterText,
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

  // ── Archive mode ──────────────────────────────────────────────
  const [activeArchiveYear, setActiveArchiveYearState] = useState<number | null>(null);

  const activateArchiveYear = useCallback(
    async (year: number) => {
      const archive = metaHook.archives.find((a) => a.archive_year === year) ?? null;
      if (archive && (archive.data === null || archive.data === undefined)) {
        const loaded = await archiveOpsHook.loadArchiveData(archive);
        if (!loaded) return;
        metaHook.patchArchiveData(archive.id, loaded.data);
      }
      setActiveArchiveYearState(year);
      studentsHook.setPage(1);
    },
    [studentsHook, metaHook, archiveOpsHook]
  );

  const exitArchiveMode = useCallback(() => {
    setActiveArchiveYearState(null);
    studentsHook.setPage(1);
  }, [studentsHook]);

  // Reset archive mode if the archive disappears (e.g. school change)
  const prevResolvedSchoolId = useRef(resolvedSchoolId);
  useEffect(() => {
    if (prevResolvedSchoolId.current !== resolvedSchoolId) {
      prevResolvedSchoolId.current = resolvedSchoolId;
      setActiveArchiveYearState(null);
    }
  }, [resolvedSchoolId]);

  const activeArchive = useMemo(
    () => (activeArchiveYear !== null
      ? (metaHook.archives.find((a) => a.archive_year === activeArchiveYear) ?? null)
      : null),
    [activeArchiveYear, metaHook.archives]
  );

  // Raw students from archive
  const archiveStudentsRaw = useMemo(
    () => (activeArchive ? getArchiveStudents(activeArchive) : []),
    [activeArchive]
  );

  // Filtered + sorted archive students
  const archiveStudentsFiltered = useMemo<Student[]>(() => {
    if (!activeArchive) return [];
    let result = archiveStudentsRaw as Student[];

    if (search) {
      const q = normalizeArabicText(search);
      result = result.filter((s) => normalizeArabicText(s.full_name ?? "").includes(q));
    }

    if (filterClass) {
      result = result.filter((s) => s.class_name === filterClass);
    }

    switch (quickFilter) {
      case "no_invoice":  result = result.filter((s) => (s.paid_fee ?? 0) === 0); break;
      case "collected":   result = result.filter((s) => (s.remaining_fee ?? 0) <= 0); break;
      case "discounted":  result = result.filter((s) => (s.discount_value ?? 0) > 0); break;
      case "transferred": result = result.filter((s) => s.status === "transferred"); break;
      case "graduated":   result = result.filter((s) => s.status === "graduated"); break;
      case "suspended":   result = result.filter((s) => s.status === "suspended"); break;
      case "deleted":     result = result.filter((s) => s.status === "deleted"); break;
    }

    return [...result].sort((a, b) => {
      let cmp = 0;
      switch (filterSort) {
        case "class":     cmp = (a.class_name ?? "").localeCompare(b.class_name ?? ""); break;
        case "paid":      cmp = (a.paid_fee ?? 0) - (b.paid_fee ?? 0); break;
        case "remaining": cmp = (a.remaining_fee ?? 0) - (b.remaining_fee ?? 0); break;
        default:          cmp = (a.full_name ?? "").localeCompare(b.full_name ?? "");
      }
      return filterDir === "desc" ? -cmp : cmp;
    });
  }, [activeArchive, archiveStudentsRaw, search, filterClass, quickFilter, filterSort, filterDir]);

  // Paginated archive students
  const archiveStudentsPaged = useMemo<Student[]>(() => {
    const start = (studentsHook.page - 1) * PAGE_SIZE;
    return archiveStudentsFiltered.slice(start, start + PAGE_SIZE);
  }, [archiveStudentsFiltered, studentsHook.page]);

  // Payment counts from archive
  const archivePaymentCounts = useMemo<Record<string, number>>(() => {
    if (!activeArchive) return {};
    return getArchivePayments(activeArchive).reduce((acc, p) => {
      acc[p.student_id] = (acc[p.student_id] ?? 0) + 1;
      return acc;
    }, {} as Record<string, number>);
  }, [activeArchive]);

  // Summary from archive
  const archiveSummary = useMemo(() => {
    const empty = { totalStudents: 0, totalFee: 0, totalPaid: 0, totalRemaining: 0, collectedCount: 0 };
    if (!activeArchive) return empty;
    const students = archiveStudentsRaw as Student[];
    return {
      totalStudents: students.length,
      totalFee:       students.reduce<number>((s, st) => s + (Number(st.total_fee)     || 0), 0),
      totalPaid:      students.reduce<number>((s, st) => s + (Number(st.paid_fee)      || 0), 0),
      totalRemaining: students.reduce<number>((s, st) => s + (Number(st.remaining_fee) || 0), 0),
      collectedCount: students.filter((st) => (Number(st.remaining_fee) || 0) <= 0).length,
    };
  }, [activeArchive, archiveStudentsRaw]) as PaymentsSummary;

  // Classes from archive
  const archiveClasses = useMemo<string[]>(() => {
    if (!activeArchive) return [];
    return Array.from(new Set(archiveStudentsRaw.map((s) => s.class_name).filter((c): c is string => Boolean(c)))).sort();
  }, [activeArchive, archiveStudentsRaw]);

  // Effective data (archive mode overrides live data)
  const isArchiveMode = activeArchiveYear !== null;
  const effectiveSummary      = isArchiveMode ? archiveSummary       : metaHook.summary;
  const effectiveStudents     = isArchiveMode ? archiveStudentsPaged : studentsHook.students;
  const effectivePaymentCounts= isArchiveMode ? archivePaymentCounts : studentsHook.paymentCountsByStudent;
  const effectiveLoading      = isArchiveMode ? false                : studentsHook.loading;
  const effectiveTotalCount   = isArchiveMode ? archiveStudentsFiltered.length : studentsHook.totalCount;
  const effectiveTotalPages   = isArchiveMode ? Math.ceil(archiveStudentsFiltered.length / PAGE_SIZE) : studentsHook.totalPages;
  const effectiveClasses      = isArchiveMode ? archiveClasses       : metaHook.classes;

  // Handlers
  const openStudentDetail = useCallback(
    async (student: Student) => {
      setSelectedStudent(student);
      setShowDetail(true);
      await paymentOpsHook.loadStudentPayments(student.id);
    },
    [paymentOpsHook]
  );

  const openArchiveStudentDetail = useCallback(
    (student: Student) => {
      setSelectedStudent(student);
      setShowDetail(true);
      // Payments injected from archive data — no API call needed
    },
    []
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

    // Students hook (raw — use effective* below for rendering)
    studentsHook,

    // Payment operations hook
    paymentOpsHook,

    // Archive operations hook
    archiveOpsHook,

    // Archive mode
    isArchiveMode,
    activeArchiveYear,
    activeArchive,
    activateArchiveYear,
    exitArchiveMode,

    // Effective data — always use these for rendering
    effectiveSummary,
    effectiveStudents,
    effectivePaymentCounts,
    effectiveLoading,
    effectiveTotalCount,
    effectiveTotalPages,
    effectiveClasses,

    // Selected student
    selectedStudent,
    setSelectedStudent,
    showDetail,
    setShowDetail,

    // Handlers
    openStudentDetail,
    openArchiveStudentDetail,
    handleExportExcel,
    printReceipt,
    printStatement,
    handleArchiveExport,
    handleDeletePayment,
    handlePaymentSubmit,
    openPaymentForStudent,
    updateStudentFinancials,
  }), [canAddPayments, canDeletePayments, schoolScope, resolvedSchoolId, success, error, searchInput, setSearchInput, exporting, quickFilter, setQuickFilter, filterClass, setFilterClass, filterSort, setFilterSort, filterDir, setFilterDir, metaHook, studentsHook, paymentOpsHook, archiveOpsHook, isArchiveMode, activeArchiveYear, activeArchive, activateArchiveYear, exitArchiveMode, effectiveSummary, effectiveStudents, effectivePaymentCounts, effectiveLoading, effectiveTotalCount, effectiveTotalPages, effectiveClasses, selectedStudent, setSelectedStudent, showDetail, setShowDetail, openStudentDetail, openArchiveStudentDetail, handleExportExcel, printReceipt, printStatement, handleArchiveExport, handleDeletePayment, handlePaymentSubmit, openPaymentForStudent, updateStudentFinancials]);
}
