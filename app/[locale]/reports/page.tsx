"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { formatDate, formatNumber } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";

type StudentRow = {
  id: string;
  full_name: string;
  class_name: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  remaining_fee: number | null;
  status: string | null;
  phone: string | null;
  address: string | null;
};

type PaymentRow = {
  id: string;
  amount: number | null;
  created_at: string | null;
  payment_method: string | null;
  receipt_number: string | null;
  notes: string | null;
  students?: { full_name: string | null; class_name: string | null } | null;
};

type ExpenseRow = {
  id: string;
  amount: number | null;
  expense_date: string | null;
  recipient: string | null;
  receipt_number: string | null;
  notes: string | null;
  expense_types?: { name: string | null } | null;
};

type SalaryRow = {
  id: string;
  gross_salary: number | null;
  deductions: number | null;
  month: string | null;
  paid_at: string | null;
  is_paid: boolean | null;
  teachers?: { full_name: string | null; subject: string | null } | null;
};

type ReportsMetrics = {
  studentsCount: number;
  activeStudents: number;
  totalFees: number;
  totalPaid: number;
  totalRemaining: number;
  paymentsCount: number;
  paymentVolume: number;
  todayPayments: number;
  expensesCount: number;
  expenseVolume: number;
  expenseTypeCount: number;
  salariesCount: number;
  salaryVolume: number;
  currentMonthSalaryCount: number;
  netBalance: number;
};

type DatasetType = "students" | "payments" | "expenses" | "salaries" | "all";

const EMPTY_REPORTS_METRICS: ReportsMetrics = {
  studentsCount: 0,
  activeStudents: 0,
  totalFees: 0,
  totalPaid: 0,
  totalRemaining: 0,
  paymentsCount: 0,
  paymentVolume: 0,
  todayPayments: 0,
  expensesCount: 0,
  expenseVolume: 0,
  expenseTypeCount: 0,
  salariesCount: 0,
  salaryVolume: 0,
  currentMonthSalaryCount: 0,
  netBalance: 0,
};

function paymentMethodLabel(method: string | null | undefined) {
  return (
    {
      cash: "نقداً",
      bank_transfer: "تحويل بنكي",
      check: "شيك",
    } as Record<string, string>
  )[method || ""] || method || "—";
}

function studentStatusLabel(status: string | null | undefined) {
  return (
    {
      active: "نشط",
      transferred: "منقول",
      suspended: "موقوف",
      graduated: "متخرج",
      withdrawn: "منسحب",
      archived: "مؤرشف",
      deleted: "محذوف",
    } as Record<string, string>
  )[status || ""] || status || "—";
}

export default function ReportsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const isEnglish = locale === "en";
  const { profile } = useRole();
  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const datasetCacheRef = useRef<{
    students?: StudentRow[];
    payments?: PaymentRow[];
    expenses?: ExpenseRow[];
    salaries?: SalaryRow[];
  }>({});
  const [metrics, setMetrics] = useState<ReportsMetrics>(EMPTY_REPORTS_METRICS);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<DatasetType | null>(null);

  const fetchAll = useCallback(async () => {
    if (!profile) return;

    setLoading(true);
    try {
      const schoolId = await resolveSchoolIdForProfile(profile, {
        selectedSchoolId: schoolScope.selectedSchoolId,
      });

      if (!schoolId) {
        datasetCacheRef.current = {};
        setMetrics(EMPTY_REPORTS_METRICS);
        return;
      }

      const { response, payload } = await fetchJsonWithAuthorizedSession<{ metrics?: ReportsMetrics }>(
        `/api/web/reports/overview?schoolId=${encodeURIComponent(schoolId)}`,
      );

      if (!response.ok) {
        throw new Error(
          payload && typeof payload === "object" && "error" in payload
            ? ((payload as { error?: { message?: string } }).error?.message || "تعذر تحميل التقارير.")
            : "تعذر تحميل التقارير.",
        );
      }

      datasetCacheRef.current = {};
      setMetrics(payload?.metrics ?? EMPTY_REPORTS_METRICS);
    } catch {
      datasetCacheRef.current = {};
      setMetrics(EMPTY_REPORTS_METRICS);
    } finally {
      setLoading(false);
    }
  }, [profile, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [fetchAll, profile, schoolScope.scopeLoading]);

  const getScopedSchoolId = useCallback(async () => {
    if (!profile) return null;
    return resolveSchoolIdForProfile(profile, {
      selectedSchoolId: schoolScope.selectedSchoolId,
    });
  }, [profile, schoolScope.selectedSchoolId]);

  const loadDataset = useCallback(
    async <T extends Exclude<DatasetType, "all">>(type: T): Promise<
      T extends "students" ? StudentRow[] :
      T extends "payments" ? PaymentRow[] :
      T extends "expenses" ? ExpenseRow[] :
      T extends "salaries" ? SalaryRow[] :
      never
    > => {
      const cached = datasetCacheRef.current[type];
      if (cached) return cached as never;

      const schoolId = await getScopedSchoolId();
      if (!schoolId) return [] as never;

      setActionLoading(type);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          students?: StudentRow[];
          payments?: PaymentRow[];
          expenses?: ExpenseRow[];
          salaries?: SalaryRow[];
          error?: { message?: string };
        }>(`/api/web/reports/dataset?schoolId=${encodeURIComponent(schoolId)}&type=${type}`);

        if (!response.ok) {
          throw new Error(payload?.error?.message || "تعذر تجهيز بيانات التقرير.");
        }

        const nextRows =
          type === "students"
            ? payload?.students ?? []
            : type === "payments"
              ? payload?.payments ?? []
              : type === "expenses"
                ? payload?.expenses ?? []
                : payload?.salaries ?? [];

        datasetCacheRef.current[type] = nextRows as never;
        return nextRows as never;
      } finally {
        setActionLoading((current) => (current === type ? null : current));
      }
    },
    [getScopedSchoolId],
  );

  const loadAllDatasets = useCallback(async () => {
    if (
      datasetCacheRef.current.students &&
      datasetCacheRef.current.payments &&
      datasetCacheRef.current.expenses &&
      datasetCacheRef.current.salaries
    ) {
      return {
        students: datasetCacheRef.current.students ?? [],
        payments: datasetCacheRef.current.payments ?? [],
        expenses: datasetCacheRef.current.expenses ?? [],
        salaries: datasetCacheRef.current.salaries ?? [],
      };
    }

    const schoolId = await getScopedSchoolId();
    if (!schoolId) {
      return {
        students: [] as StudentRow[],
        payments: [] as PaymentRow[],
        expenses: [] as ExpenseRow[],
        salaries: [] as SalaryRow[],
      };
    }

    setActionLoading("all");
    try {
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: StudentRow[];
        payments?: PaymentRow[];
        expenses?: ExpenseRow[];
        salaries?: SalaryRow[];
        error?: { message?: string };
      }>(`/api/web/reports/dataset?schoolId=${encodeURIComponent(schoolId)}&type=all`);

      if (!response.ok) {
        throw new Error(payload?.error?.message || "تعذر تجهيز التقرير الشامل.");
      }

      datasetCacheRef.current = {
        students: payload?.students ?? [],
        payments: payload?.payments ?? [],
        expenses: payload?.expenses ?? [],
        salaries: payload?.salaries ?? [],
      };

      return {
        students: datasetCacheRef.current.students ?? [],
        payments: datasetCacheRef.current.payments ?? [],
        expenses: datasetCacheRef.current.expenses ?? [],
        salaries: datasetCacheRef.current.salaries ?? [],
      };
    } finally {
      setActionLoading((current) => (current === "all" ? null : current));
    }
  }, [getScopedSchoolId]);

  async function exportRows(rows: Record<string, unknown>[], sheetName: string, fileName: string) {
    const XLSX = await loadXLSX();
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
    await XLSX.writeFile(wb, `${fileName}_${formatDate(new Date())}.xlsx`);
  }

  async function exportStudentsExcel() {
    const students = await loadDataset("students");
    await exportRows(
      students.map((item) => ({
        الاسم: item.full_name,
        الصف: item.class_name || "—",
        الحالة: studentStatusLabel(item.status),
        "إجمالي الرسوم": item.total_fee || 0,
        المدفوع: item.paid_fee || 0,
        المتبقي: item.remaining_fee || 0,
        الهاتف: item.phone || "",
        العنوان: item.address || "",
      })),
      "الطلاب",
      "تقرير_الطلاب",
    );
  }

  async function exportPaymentsExcel() {
    const payments = await loadDataset("payments");
    await exportRows(
      payments.map((item) => ({
        الطالب: item.students?.full_name || "—",
        الصف: item.students?.class_name || "—",
        المبلغ: item.amount || 0,
        "طريقة الدفع": paymentMethodLabel(item.payment_method),
        التاريخ: formatDate(item.created_at ?? ""),
        "رقم الإيصال": item.receipt_number || "—",
        ملاحظات: item.notes || "",
      })),
      "الحسابات",
      "تقرير_الحسابات",
    );
  }

  async function exportExpensesExcel() {
    const expenses = await loadDataset("expenses");
    await exportRows(
      expenses.map((item) => ({
        النوع: item.expense_types?.name || "—",
        المبلغ: item.amount || 0,
        التاريخ: formatDate(item.expense_date ?? ""),
        المستلم: item.recipient || "—",
        "رقم الإيصال": item.receipt_number || "—",
        ملاحظات: item.notes || "",
      })),
      "المصروفات",
      "تقرير_المصروفات",
    );
  }

  async function exportSalariesExcel() {
    const salaries = await loadDataset("salaries");
    await exportRows(
      salaries.map((item) => ({
        الأستاذ: item.teachers?.full_name || "—",
        المادة: item.teachers?.subject || "—",
        الشهر: item.month || "—",
        الإجمالي: item.gross_salary || 0,
        الخصومات: item.deductions || 0,
        الصافي: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
        "تاريخ الدفع": item.paid_at ? formatDate(item.paid_at) : "—",
      })),
      "الرواتب",
      "تقرير_الرواتب",
    );
  }

  async function exportAllExcel() {
    const XLSX = await loadXLSX();
    const { students, payments, expenses, salaries } = await loadAllDatasets();
    const wb = XLSX.utils.book_new();
    const sheets = [
      {
        name: "الطلاب",
        rows: students.map((item) => ({
          الاسم: item.full_name,
          الصف: item.class_name || "—",
          الحالة: studentStatusLabel(item.status),
          الرسوم: item.total_fee || 0,
          المدفوع: item.paid_fee || 0,
          المتبقي: item.remaining_fee || 0,
        })),
      },
      {
        name: "الحسابات",
        rows: payments.map((item) => ({
          الطالب: item.students?.full_name || "—",
          المبلغ: item.amount || 0,
          التاريخ: formatDate(item.created_at ?? ""),
        })),
      },
      {
        name: "المصروفات",
        rows: expenses.map((item) => ({
          النوع: item.expense_types?.name || "—",
          المبلغ: item.amount || 0,
          التاريخ: formatDate(item.expense_date ?? ""),
        })),
      },
      {
        name: "الرواتب",
        rows: salaries.map((item) => ({
          الأستاذ: item.teachers?.full_name || "—",
          الشهر: item.month || "—",
          الصافي: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
          تاريخ_الدفع: item.paid_at ? formatDate(item.paid_at) : "—",
        })),
      },
    ];

    sheets.forEach((sheet) => {
      if (sheet.rows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
      }
    });

    await XLSX.writeFile(wb, `تقرير_شامل_${formatDate(new Date())}.xlsx`);
  }

  function printDocument(title: string, subtitle: string, bodyHtml: string) {
    const win = window.open("", "_blank");
    if (!win) return;

    win.document.write(
      wrapPrintDocument({
        title,
        subtitle,
        bodyHtml,
        branding: {
          schoolName: runtimeBranding.schoolName,
          logoUrl: runtimeBranding.logoUrl,
          primaryColor: runtimeBranding.primaryColor,
          secondaryColor: runtimeBranding.secondaryColor,
          locale: isEnglish ? "en" : "ar",
        },
        extraStyles: `
          .totals{background:#f5f9ff;border-radius:18px;padding:1rem 1.1rem;display:flex;gap:1rem;flex-wrap:wrap}
          .total-item{font-size:.9rem}
          .total-label{color:#5f7388}
          .total-val{font-weight:900;color:var(--print-primary-deep)}
        `,
      }),
    );
    win.document.close();
  }

  async function printStudents() {
    const students = await loadDataset("students");
    printDocument(
      isEnglish ? "Students report" : "تقرير الطلاب",
      isEnglish ? `${students.length} students` : `${students.length} طالب`,
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Status" : "الحالة"}</th><th>${isEnglish ? "Total fees" : "إجمالي الرسوم"}</th><th>${isEnglish ? "Paid" : "المدفوع"}</th><th>${isEnglish ? "Remaining" : "المتبقي"}</th></tr></thead>
          <tbody>${students
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item.class_name || "—")}</td><td>${escapeHtml(studentStatusLabel(item.status))}</td><td>د.ع ${formatNumber(item.total_fee || 0)}</td><td>د.ع ${formatNumber(item.paid_fee || 0)}</td><td>د.ع ${formatNumber(item.remaining_fee || 0)}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  async function printPayments() {
    const payments = await loadDataset("payments");
    printDocument(
      isEnglish ? "Payments report" : "تقرير الحسابات",
      isEnglish ? `${payments.length} payments` : `${payments.length} دفعة`,
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Student" : "الطالب"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Method" : "طريقة الدفع"}</th><th>${isEnglish ? "Date" : "التاريخ"}</th></tr></thead>
          <tbody>${payments
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.students?.full_name || "—")}</td><td>${escapeHtml(item.students?.class_name || "—")}</td><td>د.ع ${formatNumber(item.amount || 0)}</td><td>${escapeHtml(paymentMethodLabel(item.payment_method))}</td><td>${formatDate(item.created_at ?? "")}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  async function printExpenses() {
    const expenses = await loadDataset("expenses");
    printDocument(
      isEnglish ? "Expenses report" : "تقرير المصروفات",
      isEnglish ? `${expenses.length} expenses` : `${expenses.length} مصروف`,
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Type" : "النوع"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Recipient" : "المستلم"}</th></tr></thead>
          <tbody>${expenses
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.expense_types?.name || "—")}</td><td>د.ع ${formatNumber(item.amount || 0)}</td><td>${formatDate(item.expense_date ?? "")}</td><td>${escapeHtml(item.recipient || "—")}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  async function printSalaries() {
    const salaries = await loadDataset("salaries");
    printDocument(
      isEnglish ? "Salaries report" : "تقرير الرواتب",
      isEnglish ? `${salaries.length} salary records` : `${salaries.length} سجل راتب`,
      `
        <table>
          <thead><tr><th>#</th><th>${isEnglish ? "Teacher" : "الأستاذ"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Month" : "الشهر"}</th><th>${isEnglish ? "Net" : "الصافي"}</th><th>${isEnglish ? "Paid at" : "تاريخ الدفع"}</th></tr></thead>
          <tbody>${salaries
            .map(
              (item, index) =>
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.teachers?.full_name || "—")}</td><td>${escapeHtml(item.teachers?.subject || "—")}</td><td>${escapeHtml(item.month || "—")}</td><td>د.ع ${formatNumber(Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)))}</td><td>${item.paid_at ? formatDate(item.paid_at) : "—"}</td></tr>`,
            )
            .join("")}</tbody>
        </table>
      `,
    );
  }

  function printSummary() {
    printDocument(
      isEnglish ? "Financial summary" : "الملخص المالي",
      isEnglish ? "School financial snapshot" : "ملخص مالي سريع للمدرسة",
      `
        <div class="totals">
          <div class="total-item"><span class="total-label">${isEnglish ? "Total fees" : "إجمالي الرسوم"}: </span><span class="total-val">د.ع ${formatNumber(metrics.totalFees)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Paid" : "المدفوع"}: </span><span class="total-val">د.ع ${formatNumber(metrics.totalPaid)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Remaining" : "المتبقي"}: </span><span class="total-val">د.ع ${formatNumber(metrics.totalRemaining)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Recorded payments" : "الحسابات المسجلة"}: </span><span class="total-val">د.ع ${formatNumber(metrics.paymentVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Net salaries" : "صافي الرواتب"}: </span><span class="total-val">د.ع ${formatNumber(metrics.salaryVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Expenses" : "المصروفات"}: </span><span class="total-val">د.ع ${formatNumber(metrics.expenseVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Net balance" : "الصافي"}: </span><span class="total-val">د.ع ${formatNumber(metrics.netBalance)}</span></div>
        </div>
      `,
    );
  }

  const reportCards = [
    {
      id: "students",
      title: "تقرير الطلاب",
      icon: "👥",
      color: "#6C4AB6",
      background: "#EDE8FA",
      description: "بيانات الطلاب والرسوم وحالة التسجيل الحالية.",
      stats: [
        { label: "إجمالي الطلاب", value: formatNumber(metrics.studentsCount) },
        { label: "الطلاب النشطون", value: formatNumber(metrics.activeStudents) },
        { label: "إجمالي الرسوم", value: `د.ع ${formatNumber(metrics.totalFees)}` },
        { label: "المتبقي", value: `د.ع ${formatNumber(metrics.totalRemaining)}` },
      ],
      onExcel: exportStudentsExcel,
      onPrint: printStudents,
    },
    {
      id: "payments",
      title: "تقرير الحسابات",
      icon: "💳",
      color: "#059669",
      background: "#D1FAE5",
      description: "سجل الدفعات والتحصيلات المرتبطة بالطلاب.",
      stats: [
        { label: "عدد الدفعات", value: formatNumber(metrics.paymentsCount) },
        { label: "إجمالي الحسابات", value: `د.ع ${formatNumber(metrics.paymentVolume)}` },
        { label: "دفعات اليوم", value: formatNumber(metrics.todayPayments) },
      ],
      onExcel: exportPaymentsExcel,
      onPrint: printPayments,
    },
    {
      id: "expenses",
      title: "تقرير المصروفات",
      icon: "💸",
      color: "#DC2626",
      background: "#FEE2E2",
      description: "المصروفات التشغيلية حسب النوع والتاريخ.",
      stats: [
        { label: "عدد السجلات", value: formatNumber(metrics.expensesCount) },
        { label: "إجمالي المصروفات", value: `د.ع ${formatNumber(metrics.expenseVolume)}` },
        { label: "أنواع المصروفات", value: formatNumber(metrics.expenseTypeCount) },
      ],
      onExcel: exportExpensesExcel,
      onPrint: printExpenses,
    },
    {
      id: "salaries",
      title: "تقرير الرواتب",
      icon: "💼",
      color: "#1D4ED8",
      background: "#DBEAFE",
      description: "رواتب الأساتذة الشهرية مع صافي الاستحقاق بعد الخصومات.",
      stats: [
        { label: "عدد السجلات", value: formatNumber(metrics.salariesCount) },
        { label: "إجمالي الصافي", value: `د.ع ${formatNumber(metrics.salaryVolume)}` },
        { label: "مدفوعات الشهر", value: formatNumber(metrics.currentMonthSalaryCount) },
      ],
      onExcel: exportSalariesExcel,
      onPrint: printSalaries,
    },
    {
      id: "summary",
      title: "الملخص المالي",
      icon: "📊",
      color: "#D97706",
      background: "#FEF3C7",
      description: "ملخص الإيرادات والمصروفات وصافي الحركة المالية.",
      stats: [
        { label: "المدفوع", value: `د.ع ${formatNumber(metrics.totalPaid)}` },
        { label: "الحسابات المسجلة", value: `د.ع ${formatNumber(metrics.paymentVolume)}` },
        { label: "صافي الرواتب", value: `د.ع ${formatNumber(metrics.salaryVolume)}` },
        { label: "الصافي", value: `د.ع ${formatNumber(metrics.netBalance)}` },
      ],
      onExcel: exportAllExcel,
      onPrint: printSummary,
    },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <>
        <style>{`
          .summary-strip{display:grid;grid-template-columns:repeat(4,1fr);gap:.6rem;margin-bottom:1rem}
          .strip-card{background:white;border-radius:11px;padding:.8rem .9rem;box-shadow:0 2px 8px rgba(108,74,182,0.07);text-align:center}
          .strip-label{font-size:.68rem;color:var(--gray);font-weight:600}
          .strip-val{font-size:.9rem;font-weight:900;color:var(--dark);margin-top:.15rem}
          .section-hdr{display:flex;align-items:center;justify-content:space-between;margin-bottom:.9rem;gap:.8rem;flex-wrap:wrap}
          .section-ttl{font-size:.95rem;font-weight:900;color:var(--dark)}
          .btn-main{display:flex;align-items:center;gap:.4rem;padding:.55rem 1rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;border:none;border-radius:9px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.8rem;font-weight:700;cursor:pointer}
          .reports-grid{display:grid;grid-template-columns:repeat(2,1fr);gap:1rem}
          .report-card{background:white;border-radius:16px;padding:1.2rem;box-shadow:0 3px 12px rgba(108,74,182,0.08);border:1px solid rgba(108,74,182,0.06)}
          .rc-header{display:flex;align-items:center;gap:.7rem;margin-bottom:.9rem}
          .rc-ico{width:44px;height:44px;border-radius:13px;display:flex;align-items:center;justify-content:center;flex-shrink:0}
          .rc-title{font-size:.9rem;font-weight:800}
          .rc-desc{font-size:.72rem;color:var(--gray);margin-top:.15rem;line-height:1.5}
          .rc-stats{display:grid;grid-template-columns:repeat(2,1fr);gap:.45rem;margin-bottom:.9rem}
          .rc-stat{background:#F8F6FF;border-radius:8px;padding:.45rem .6rem}
          .rc-stat-label{font-size:.64rem;color:var(--gray);font-weight:600}
          .rc-stat-val{font-size:.78rem;font-weight:800;color:var(--dark);margin-top:.1rem}
          .rc-actions{display:flex;gap:.5rem}
          .btn-excel,.btn-print{display:flex;align-items:center;gap:.3rem;padding:.45rem .8rem;border-radius:8px;font-family:var(--font-manrope),Segoe UI,sans-serif;font-size:.75rem;font-weight:700;cursor:pointer;flex:1;justify-content:center;border:1.5px solid transparent}
          .btn-excel{background:#D1FAE5;color:#065F46;border-color:#6EE7B7}
          .btn-print{background:#FEE2E2;color:#991B1B;border-color:#FCA5A5}
          .balance-card{border-radius:16px;padding:1.3rem 1.5rem;background:linear-gradient(135deg,var(--p3),var(--p2));color:white;box-shadow:0 6px 20px rgba(108,74,182,0.3);margin-bottom:1rem}
          .balance-title{font-size:.88rem;font-weight:700;opacity:.88;margin-bottom:.8rem}
          .balance-grid{display:grid;grid-template-columns:repeat(4,1fr);gap:.8rem}
          .balance-item{text-align:center}
          .balance-label{font-size:.72rem;opacity:.8;margin-bottom:.2rem}
          .balance-val{font-size:.95rem;font-weight:900}
          .spin{width:22px;height:22px;border:3px solid rgba(108,74,182,0.2);border-top-color:var(--p3);border-radius:50%;animation:sp .7s linear infinite;margin:3rem auto}
          @keyframes sp{to{transform:rotate(360deg)}}
          @media (max-width: 960px){
            .summary-strip,.balance-grid,.reports-grid{grid-template-columns:1fr 1fr}
          }
          @media (max-width: 640px){
            .summary-strip,.balance-grid,.reports-grid,.rc-stats{grid-template-columns:1fr}
          }
        `}</style>

        <div className="layout">
          <AppSidebar currentPath="/reports" showFloatingToggle />

          <div className="main">
            <div className="content app-shell-content">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />
              {schoolScope.shouldBlockContent ? (
                <SchoolScopeEmptyState
                  scope={schoolScope}
                  title="التقارير"
                  description="اختر مدرسة أولاً لعرض تقارير الطلاب والدفعات والمصروفات الخاصة بها."
                />
              ) : loading ? (
                <div className="spin" />
              ) : (
                <>
                  <div className="summary-strip">
                    {[
                      ["👥", "الطلاب", metrics.studentsCount],
                      ["💳", "الدفعات", metrics.paymentsCount],
                      ["💸", "المصروفات", metrics.expensesCount],
                      ["💼", "الرواتب", metrics.salariesCount],
                    ].map(([icon, label, value]) => (
                      <div className="strip-card" key={label}>
                        <div><AppIcon token={String(icon)} size={18} /></div>
                        <div className="strip-label">{label}</div>
                        <div className="strip-val">{formatNumber(Number(value))}</div>
                      </div>
                    ))}
                  </div>

                  <div className="balance-card">
                    <div className="balance-title">الملخص المالي الكلي</div>
                    <div className="balance-grid">
                      <div className="balance-item">
                        <div className="balance-label">إجمالي الرسوم</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.totalFees)}</div>
                      </div>
                      <div className="balance-item">
                        <div className="balance-label">الحسابات المسجلة</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.paymentVolume)}</div>
                      </div>
                      <div className="balance-item">
                        <div className="balance-label">المصروفات</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.expenseVolume)}</div>
                      </div>
                      <div className="balance-item">
                        <div className="balance-label">صافي الرواتب</div>
                        <div className="balance-val">د.ع {formatNumber(metrics.salaryVolume)}</div>
                      </div>
                    </div>
                  </div>

                  <div className="section-hdr">
                    <div className="section-ttl">التقارير التفصيلية</div>
                    <div style={{ display: "flex", gap: ".5rem", flexWrap: "wrap" }}>
                      <button className="btn-main" onClick={exportAllExcel} disabled={actionLoading !== null}>
                        <AppIcon token="📥" size={14} />
                        {actionLoading === "all" ? "جارٍ التحضير..." : "تصدير الكل إكسل"}
                      </button>
                      <button className="btn-main" style={{ background: "linear-gradient(135deg,#EF4444,#DC2626)" }} onClick={printSummary} disabled={actionLoading !== null}>
                        <AppIcon token="🖨️" size={14} />
                        طباعة الملخص
                      </button>
                    </div>
                  </div>

                  <div className="reports-grid">
                    {reportCards.map((card) => (
                      <div className="report-card" key={card.id}>
                        <div className="rc-header">
                          <div className="rc-ico" style={{ background: card.background }}>
                            <AppIcon token={card.icon} size={21} />
                          </div>
                          <div>
                            <div className="rc-title" style={{ color: card.color }}>{card.title}</div>
                            <div className="rc-desc">{card.description}</div>
                          </div>
                        </div>
                        <div className="rc-stats">
                          {card.stats.map((stat) => (
                            <div className="rc-stat" key={stat.label}>
                              <div className="rc-stat-label">{stat.label}</div>
                              <div className="rc-stat-val">{stat.value}</div>
                            </div>
                          ))}
                        </div>
                        <div className="rc-actions">
                          <button className="btn-excel" onClick={card.onExcel} disabled={actionLoading !== null}>
                            <AppIcon token="📊" size={13} />
                            {actionLoading === card.id ? "جارٍ التحضير..." : "إكسل"}
                          </button>
                          <button className="btn-print" onClick={card.onPrint} disabled={actionLoading !== null}>
                            <AppIcon token="🖨️" size={13} />
                            طباعة
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      </>
    </ProtectedRoute>
  );
}
