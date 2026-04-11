"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { formatDate, formatNumber } from "@/lib/formatting";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useRuntimeBranding } from "@/hooks/brand";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import { cn } from "@/lib/brand/brand-utils";
import { Download, Printer, TrendingUp, Users, CreditCard, Wallet, Briefcase, LayoutGrid, Loader2 } from "@/lib/icons";

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

export default function ReportsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("reports");
  const commonT = useTranslations("common");
  const dashboardT = useTranslations("dashboard");
  const isEnglish = locale === "en";
  const reportCopy = isEnglish
    ? {
        loadReportsFailed: "Failed to load reports.",
        loadDatasetFailed: "Failed to prepare the dataset.",
        loadComprehensiveFailed: "Failed to load the comprehensive report.",
        subtitle: "School-wide financial and operational analytics.",
        analyzing: "Analyzing data...",
        todayPayments: "Today's payments",
        recordCount: "Record count",
        totalAmount: "Total amount",
        expenseTypes: "Expense types",
        salaryRecords: "Salary records",
        netTotal: "Net total",
        monthlySalaryPayments: "Current month payouts",
        expensesMetric: "Expenses",
        salariesMetric: "Salaries",
        recordsSuffix: "records",
        studentsSheet: "Students",
        studentsFile: "students_report",
        studentName: "Name",
        className: "Class",
        status: "Status",
        totalFees: "Total fees",
        paid: "Paid",
        remaining: "Remaining",
        phone: "Phone",
        address: "Address",
        paymentsSheet: "Payments",
        paymentsFile: "payments_report",
        student: "Student",
        amount: "Amount",
        paymentMethod: "Payment method",
        date: "Date",
        receiptNumber: "Receipt number",
        notes: "Notes",
        expensesSheet: "Expenses",
        expensesFile: "expenses_report",
        type: "Type",
        recipient: "Recipient",
        salariesSheet: "Salaries",
        salariesFile: "salaries_report",
        teacher: "Teacher",
        subject: "Subject",
        month: "Month",
        gross: "Gross",
        deductions: "Deductions",
        net: "Net",
        paidAt: "Paid at",
        allFile: "full_report",
      }
    : {
        loadReportsFailed: "تعذر تحميل التقارير.",
        loadDatasetFailed: "تعذر تجهيز مجموعة البيانات.",
        loadComprehensiveFailed: "تعذر تحميل التقرير الشامل.",
        subtitle: "تحليل البيانات المالية والإحصائية الشاملة للمدرسة",
        analyzing: "جارٍ تحليل البيانات...",
        todayPayments: "دفعات اليوم",
        recordCount: "عدد السجلات",
        totalAmount: "إجمالي المبلغ",
        expenseTypes: "أنواع المصروفات",
        salaryRecords: "سجلات الرواتب",
        netTotal: "إجمالي الصافي",
        monthlySalaryPayments: "مدفوعات الشهر",
        expensesMetric: "المصروفات",
        salariesMetric: "الرواتب",
        recordsSuffix: "سجل",
        studentsSheet: "الطلاب",
        studentsFile: "تقرير_الطلاب",
        studentName: "الاسم",
        className: "الصف",
        status: "الحالة",
        totalFees: "إجمالي الرسوم",
        paid: "المدفوع",
        remaining: "المتبقي",
        phone: "الهاتف",
        address: "العنوان",
        paymentsSheet: "الحسابات",
        paymentsFile: "تقرير_الحسابات",
        student: "الطالب",
        amount: "المبلغ",
        paymentMethod: "طريقة الدفع",
        date: "التاريخ",
        receiptNumber: "رقم الإيصال",
        notes: "ملاحظات",
        expensesSheet: "المصروفات",
        expensesFile: "تقرير_المصروفات",
        type: "النوع",
        recipient: "المستلم",
        salariesSheet: "الرواتب",
        salariesFile: "تقرير_الرواتب",
        teacher: "الأستاذ",
        subject: "المادة",
        month: "الشهر",
        gross: "الإجمالي",
        deductions: "الخصومات",
        net: "الصافي",
        paidAt: "تاريخ الدفع",
        allFile: "تقرير_شامل",
      };
  const currency = commonT("currency");
  const { profile } = useRole();

  function paymentMethodLabel(method: string | null | undefined) {
    if (!method) return "—";
    try {
      return commonT(`paymentMethods.${method}`);
    } catch {
      return method;
    }
  }

  function studentStatusLabel(status: string | null | undefined) {
    if (!status) return "—";
    try {
      return commonT(`studentStatus.${status}`);
    } catch {
      return status;
    }
  }
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
        throw new Error(reportCopy.loadReportsFailed);
      }

      datasetCacheRef.current = {};
      setMetrics(payload?.metrics ?? EMPTY_REPORTS_METRICS);
    } catch {
      datasetCacheRef.current = {};
      setMetrics(EMPTY_REPORTS_METRICS);
    } finally {
      setLoading(false);
    }
  }, [profile, reportCopy.loadReportsFailed, schoolScope.selectedSchoolId]);

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
          throw new Error(payload?.error?.message || reportCopy.loadDatasetFailed);
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
    [getScopedSchoolId, reportCopy.loadDatasetFailed],
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
      return { students: [], payments: [], expenses: [], salaries: [] };
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

      if (!response.ok) throw new Error(reportCopy.loadComprehensiveFailed);

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
  }, [getScopedSchoolId, reportCopy.loadComprehensiveFailed]);

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
        [reportCopy.studentName]: item.full_name,
        [reportCopy.className]: item.class_name || "—",
        [reportCopy.status]: studentStatusLabel(item.status),
        [reportCopy.totalFees]: item.total_fee || 0,
        [reportCopy.paid]: item.paid_fee || 0,
        [reportCopy.remaining]: item.remaining_fee || 0,
        [reportCopy.phone]: item.phone || "",
        [reportCopy.address]: item.address || "",
      })),
      reportCopy.studentsSheet,
      reportCopy.studentsFile,
    );
  }

  async function exportPaymentsExcel() {
    const payments = await loadDataset("payments");
    await exportRows(
      payments.map((item) => ({
        [reportCopy.student]: item.students?.full_name || "—",
        [reportCopy.className]: item.students?.class_name || "—",
        [reportCopy.amount]: item.amount || 0,
        [reportCopy.paymentMethod]: paymentMethodLabel(item.payment_method),
        [reportCopy.date]: formatDate(item.created_at ?? ""),
        [reportCopy.receiptNumber]: item.receipt_number || "—",
        [reportCopy.notes]: item.notes || "",
      })),
      reportCopy.paymentsSheet,
      reportCopy.paymentsFile,
    );
  }

  async function exportExpensesExcel() {
    const expenses = await loadDataset("expenses");
    await exportRows(
      expenses.map((item) => ({
        [reportCopy.type]: item.expense_types?.name || "—",
        [reportCopy.amount]: item.amount || 0,
        [reportCopy.date]: formatDate(item.expense_date ?? ""),
        [reportCopy.recipient]: item.recipient || "—",
        [reportCopy.receiptNumber]: item.receipt_number || "—",
        [reportCopy.notes]: item.notes || "",
      })),
      reportCopy.expensesSheet,
      reportCopy.expensesFile,
    );
  }

  async function exportSalariesExcel() {
    const salaries = await loadDataset("salaries");
    await exportRows(
      salaries.map((item) => ({
        [reportCopy.teacher]: item.teachers?.full_name || "—",
        [reportCopy.subject]: item.teachers?.subject || "—",
        [reportCopy.month]: item.month || "—",
        [reportCopy.gross]: item.gross_salary || 0,
        [reportCopy.deductions]: item.deductions || 0,
        [reportCopy.net]: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
        [reportCopy.paidAt]: item.paid_at ? formatDate(item.paid_at) : "—",
      })),
      reportCopy.salariesSheet,
      reportCopy.salariesFile,
    );
  }

  async function exportAllExcel() {
    const XLSX = await loadXLSX();
    const { students, payments, expenses, salaries } = await loadAllDatasets();
    const wb = XLSX.utils.book_new();
    const sheets = [
      {
        name: reportCopy.studentsSheet,
        rows: students.map((item) => ({
          [reportCopy.studentName]: item.full_name,
          [reportCopy.className]: item.class_name || "—",
          [reportCopy.status]: studentStatusLabel(item.status),
          [reportCopy.totalFees]: item.total_fee || 0,
          [reportCopy.paid]: item.paid_fee || 0,
          [reportCopy.remaining]: item.remaining_fee || 0,
        })),
      },
      {
        name: reportCopy.paymentsSheet,
        rows: payments.map((item) => ({
          [reportCopy.student]: item.students?.full_name || "—",
          [reportCopy.amount]: item.amount || 0,
          [reportCopy.date]: formatDate(item.created_at ?? ""),
        })),
      },
      {
        name: reportCopy.expensesSheet,
        rows: expenses.map((item) => ({
          [reportCopy.type]: item.expense_types?.name || "—",
          [reportCopy.amount]: item.amount || 0,
          [reportCopy.date]: formatDate(item.expense_date ?? ""),
        })),
      },
      {
        name: reportCopy.salariesSheet,
        rows: salaries.map((item) => ({
          [reportCopy.teacher]: item.teachers?.full_name || "—",
          [reportCopy.month]: item.month || "—",
          [reportCopy.net]: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
          [reportCopy.paidAt.replaceAll(" ", "_")]: item.paid_at ? formatDate(item.paid_at) : "—",
        })),
      },
    ];

    sheets.forEach((sheet) => {
      if (sheet.rows.length > 0) {
        XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(sheet.rows), sheet.name);
      }
    });

    await XLSX.writeFile(wb, `${reportCopy.allFile}_${formatDate(new Date())}.xlsx`);
  }

  function printDocument(title: string, subtitle: string, bodyHtml: string) {
    printHtmlDocument(
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
          @page { size: A4 landscape; margin: 1cm; }
          table { font-size: 11px; }
          .totals{background:#f5f9ff;border-radius:18px;padding:1rem 1.1rem;display:flex;gap:1rem;flex-wrap:wrap}
          .total-item{font-size:.9rem}
          .total-label{color:#5f7388}
          .total-val{font-weight:900;color:var(--print-primary-deep)}
        `,
        autoPrint: false,
      }),
    );
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
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item.class_name || "—")}</td><td>${escapeHtml(studentStatusLabel(item.status))}</td><td>${currency} ${formatNumber(item.total_fee || 0)}</td><td>${currency} ${formatNumber(item.paid_fee || 0)}</td><td>${currency} ${formatNumber(item.remaining_fee || 0)}</td></tr>`,
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
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.students?.full_name || "—")}</td><td>${escapeHtml(item.students?.class_name || "—")}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${escapeHtml(paymentMethodLabel(item.payment_method))}</td><td>${formatDate(item.created_at ?? "")}</td></tr>`,
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
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.expense_types?.name || "—")}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${formatDate(item.expense_date ?? "")}</td><td>${escapeHtml(item.recipient || "—")}</td></tr>`,
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
                `<tr><td>${index + 1}</td><td>${escapeHtml(item.teachers?.full_name || "—")}</td><td>${escapeHtml(item.teachers?.subject || "—")}</td><td>${escapeHtml(item.month || "—")}</td><td>${currency} ${formatNumber(Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)))}</td><td>${item.paid_at ? formatDate(item.paid_at) : "—"}</td></tr>`,
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
          <div class="total-item"><span class="total-label">${isEnglish ? "Total fees" : "إجمالي الرسوم"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalFees)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Paid" : "المدفوع"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalPaid)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Remaining" : "المتبقي"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalRemaining)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Recorded payments" : "الحسابات المسجلة"}: </span><span class="total-val">${currency} ${formatNumber(metrics.paymentVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Net salaries" : "صافي الرواتب"}: </span><span class="total-val">${currency} ${formatNumber(metrics.salaryVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Expenses" : "المصروفات"}: </span><span class="total-val">${currency} ${formatNumber(metrics.expenseVolume)}</span></div>
          <div class="total-item"><span class="total-label">${isEnglish ? "Net balance" : "الصافي"}: </span><span class="total-val">${currency} ${formatNumber(metrics.netBalance)}</span></div>
        </div>
      `,
    );
  }

  const reportCards = [
    {
      id: "students",
      title: t("cards.students.title"),
      icon: Users,
      color: "text-[var(--info)]",
      bg: "bg-[var(--info)]/10",
      description: t("cards.students.description"),
      stats: [
        { label: dashboardT("stats.totalStudents"), value: formatNumber(metrics.studentsCount) },
        { label: commonT("studentStatus.active"), value: formatNumber(metrics.activeStudents) },
        { label: dashboardT("stats.totalFees"), value: `${commonT("currency")} ${formatNumber(metrics.totalFees)}` },
        { label: dashboardT("stats.remainingBalance"), value: `${commonT("currency")} ${formatNumber(metrics.totalRemaining)}` },
      ],
      onExcel: exportStudentsExcel,
      onPrint: printStudents,
    },
    {
      id: "payments",
      title: t("cards.payments.title"),
      icon: CreditCard,
      color: "text-[var(--success)]",
      bg: "bg-[var(--success)]/10",
      description: t("cards.payments.description"),
      stats: [
        { label: dashboardT("finance.paid"), value: formatNumber(metrics.paymentsCount) },
        { label: dashboardT("finance.collectedAmounts"), value: `${commonT("currency")} ${formatNumber(metrics.paymentVolume)}` },
        { label: reportCopy.todayPayments, value: formatNumber(metrics.todayPayments) },
      ],
      onExcel: exportPaymentsExcel,
      onPrint: printPayments,
    },
    {
      id: "expenses",
      title: t("cards.expenses.title"),
      icon: Wallet,
      color: "text-[var(--danger)]",
      bg: "bg-[var(--danger)]/10",
      description: t("cards.expenses.description"),
      stats: [
        { label: reportCopy.recordCount, value: formatNumber(metrics.expensesCount) },
        { label: reportCopy.totalAmount, value: `${currency} ${formatNumber(metrics.expenseVolume)}` },
        { label: reportCopy.expenseTypes, value: formatNumber(metrics.expenseTypeCount) },
      ],
      onExcel: exportExpensesExcel,
      onPrint: printExpenses,
    },
    {
      id: "salaries",
      title: t("cards.salaries.title"),
      icon: Briefcase,
      color: "text-[var(--primary)]",
      bg: "bg-[var(--primary)]/10",
      description: t("cards.salaries.description"),
      stats: [
        { label: reportCopy.salaryRecords, value: formatNumber(metrics.salariesCount) },
        { label: reportCopy.netTotal, value: `${currency} ${formatNumber(metrics.salaryVolume)}` },
        { label: reportCopy.monthlySalaryPayments, value: formatNumber(metrics.currentMonthSalaryCount) },
      ],
      onExcel: exportSalariesExcel,
      onPrint: printSalaries,
    },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/reports" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title={t("title")} 
            subtitle={reportCopy.subtitle}
            scope={schoolScope} 
            fixed 
          />

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)]">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={t("title")}
                    description={t("emptyState.description")}
                  />
                </div>
              ) : loading ? (
                <div className="flex flex-col items-center justify-center py-20 gap-4">
                  <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                  <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{reportCopy.analyzing}</span>
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Financial Balance Card */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--primary)] p-8 shadow-[0_32px_80px_-24px_rgba(var(--primary-rgb),0.4)] relative overflow-hidden text-white">
                    <div className="absolute top-0 end-0 p-8 opacity-10">
                      <TrendingUp size={160} />
                    </div>
                    
                    <div className="relative z-10">
                      <div className="flex items-center gap-2 mb-6">
                        <div className="h-8 w-8 rounded-lg bg-white/30 flex items-center justify-center">
                          <LayoutGrid size={18} />
                        </div>
                        <h2 className="text-lg font-black uppercase tracking-widest opacity-90">{t("summary.title")}</h2>
                      </div>

                      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                        {[
                          { label: t("summary.totalFees"), value: metrics.totalFees },
                          { label: t("summary.recordedPayments"), value: metrics.paymentVolume },
                          { label: t("summary.expenses"), value: metrics.expenseVolume },
                          { label: t("summary.netSalaries"), value: metrics.salaryVolume },
                        ].map((item, idx) => (
                          <div key={idx} className="space-y-1">
                            <div className="text-[10px] font-black uppercase tracking-widest opacity-70">{item.label}</div>
                            <div className="text-2xl font-black">{commonT("currency")} {formatNumber(item.value)}</div>
                          </div>
                        ))}
                      </div>

                      <div className="mt-10 pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between gap-6">
                        <div className="flex items-center gap-4">
                          <div className="text-sm font-bold opacity-80">{t("summary.netBalance")}</div>
                          <div className="text-3xl font-black bg-white/30 px-4 py-1 rounded-2xl">
                            {commonT("currency")} {formatNumber(metrics.netBalance)}
                          </div>
                        </div>
                        <div className="flex gap-3">
                          <button 
                            className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-white text-[var(--primary)] font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                            onClick={exportAllExcel}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === "all" ? <Loader2 size={18} className="animate-spin" /> : <Download size={18} />}
                            {t("exportAll")}
                          </button>
                          <button 
                            className="flex items-center gap-2 h-12 px-6 rounded-2xl bg-black/30 text-white border border-white/20 font-black transition-all hover:bg-black/40"
                            onClick={printSummary}
                          >
                            <Printer size={18} />
                            {t("printSummary")}
                          </button>
                        </div>
                      </div>
                    </div>
                  </section>

                  {/* Metrics Strip */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: dashboardT("nav.students"), value: metrics.studentsCount, icon: Users, color: "text-[var(--info)]", bg: "bg-[var(--info)]/10" },
                      { label: dashboardT("nav.payments"), value: metrics.paymentsCount, icon: CreditCard, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
                      { label: reportCopy.expensesMetric, value: metrics.expensesCount, icon: Wallet, color: "text-[var(--danger)]", bg: "bg-[var(--danger)]/10" },
                      { label: reportCopy.salariesMetric, value: metrics.salariesCount, icon: Briefcase, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10" },
                    ].map((card, i) => (
                      <div key={i} className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 shadow-[var(--card-shadow)] flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", card.bg, card.color)}>
                          <card.icon size={22} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                          <div className="text-base font-black text-[var(--text-primary)] mt-0.5">{formatNumber(card.value)} {reportCopy.recordsSuffix}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Detailed Reports Grid */}
                  <div className="grid gap-8 md:grid-cols-2">
                    {reportCards.map((card) => (
                      <section key={card.id} className="rounded-[40px] border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)] group">
                        <div className="flex items-start justify-between mb-6">
                          <div className="flex items-center gap-4">
                            <div className={cn("h-14 w-14 rounded-2xl flex items-center justify-center transition-transform group-hover:scale-110", card.bg, card.color)}>
                              <card.icon size={28} />
                            </div>
                            <div>
                              <h3 className={cn("text-lg font-black", card.color)}>{card.title}</h3>
                              <p className="text-xs text-[var(--text-muted)] font-bold">{card.description}</p>
                            </div>
                          </div>
                        </div>

                        <div className="grid gap-3 sm:grid-cols-2 mb-6">
                          {card.stats.map((stat, idx) => (
                            <div key={idx} className="p-3 rounded-xl bg-[var(--surface-muted)] border border-[var(--border)]">
                              <div className="text-[10px] font-black uppercase text-[var(--text-muted)]">{stat.label}</div>
                              <div className="text-sm font-black text-[var(--text-primary)] mt-0.5">{stat.value}</div>
                            </div>
                          ))}
                        </div>

                        <div className="flex gap-3 pt-4 border-t border-[var(--border)]">
                          <button 
                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-xs font-black transition-all hover:bg-[var(--success)]/20"
                            onClick={card.onExcel}
                            disabled={actionLoading !== null}
                          >
                            {actionLoading === card.id ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                            {t("excel")}
                          </button>
                          <button 
                            className="flex-1 flex items-center justify-center gap-2 h-11 rounded-xl bg-[var(--surface-muted)] text-[var(--text-secondary)] text-xs font-black transition-all hover:bg-[var(--border)]"
                            onClick={card.onPrint}
                            disabled={actionLoading !== null}
                          >
                            <Printer size={16} />
                            {t("print")}
                          </button>
                        </div>
                      </section>
                    ))}
                  </div>
                </div>
              ) }
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
