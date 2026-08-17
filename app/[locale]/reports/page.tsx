"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
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
import { getLocaleFromPath } from "@/lib/locale-routing";
import { printHtmlDocument, wrapPrintDocument, escapeHtml } from "@/lib/print/branding";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { fetchJsonWithAuthorizedSession } from "@/lib/authorized-api";
import {
  Download, Printer, TrendingUp, Users, CreditCard, Wallet, Briefcase, Banknote,
  Loader2, Archive, GraduationCap,
} from "@/lib/icons";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import { motion, useMotionValue, useTransform, animate as motionAnimate } from "framer-motion";
import { FinancialDashboard } from "./_components/FinancialDashboard";
import { PrintableReports } from "./_components/PrintableReports";
import { DEFAULT_EXCEL_THEME_ID, DEFAULT_EXCEL_STYLE } from "@/lib/excel-themes";
import type { ExcelThemeId, ExcelStyleSettings } from "@/lib/excel-themes";

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => { const u = rounded.on("change", setDisplay); return u; }, [rounded]);
  useEffect(() => { const c = motionAnimate(motionVal, value, { duration: 0.7, ease: "easeOut" }); return c.stop; }, [value, motionVal]);
  return <span>{display}</span>;
}

// ─── Types ────────────────────────────────────────────────────────────────────

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

type IncomeRow = {
  id: string;
  amount: number | null;
  income_date: string | null;
  source: string | null;
  receipt_number: string | null;
  notes: string | null;
  income_types?: { name: string | null } | null;
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
  netRevenue: number;
  netPayments: number;
  totalBalance: number;
  salaryByMonth: Array<{ month: string; total: number }>;
  currentStudentsTotalFees: number;
  currentStudentsCollected: number;
  currentStudentsDiscounts: number;
  currentStudentsRemaining: number;
  transferredStudentsTotalFees: number;
  transferredStudentsCollected: number;
  transferredStudentsDiscounts: number;
  transferredStudentsRemaining: number;
  incomesCount: number;
  otherRevenueTotal: number;
  expensesByType: Array<{ name: string; total: number }>;
};

type DatasetType = "students" | "payments" | "expenses" | "salaries" | "incomes" | "all";

type TeacherAttendanceSummaryRow = {
  teacher_id: string;
  name: string;
  subject: string | null;
  present: number;
  absent: number;
  late: number;
  excused: number;
  holiday: number;
  total_days: number;
};

const EMPTY_REPORTS_METRICS: ReportsMetrics = {
  studentsCount: 0, activeStudents: 0, totalFees: 0, totalPaid: 0, totalRemaining: 0,
  paymentsCount: 0, paymentVolume: 0, todayPayments: 0,
  expensesCount: 0, expenseVolume: 0, expenseTypeCount: 0,
  salariesCount: 0, salaryVolume: 0, currentMonthSalaryCount: 0, netBalance: 0,
  netRevenue: 0, netPayments: 0, totalBalance: 0,
  salaryByMonth: [],
  currentStudentsTotalFees: 0, currentStudentsCollected: 0, currentStudentsDiscounts: 0, currentStudentsRemaining: 0,
  transferredStudentsTotalFees: 0, transferredStudentsCollected: 0, transferredStudentsDiscounts: 0, transferredStudentsRemaining: 0,
  incomesCount: 0, otherRevenueTotal: 0,
  expensesByType: [],
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function ReportsPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname);
  const t = useTranslations("reports");
  const commonT = useTranslations("common");
  const dashboardT = useTranslations("dashboard");
  const isEnglish = locale === "en";

  const reportCopy = useMemo(() => isEnglish
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
        incomesSheet: "Incomes",
        incomesFile: "incomes_report",
        incomeType: "Type",
        source: "Source",
        incomeDate: "Date",
        incomesMetric: "Incomes",
        incomeRecords: "Income records",
        incomeTotalAmount: "Total amount",
        allFile: "full_report",
        collectionRate: "Collection rate",
        expenseRatio: "Expense ratio",
        expensesVsSalaries: "Expenses vs salaries",
        todayPaymentsDesc: "Payments recorded today",
        collectedOutOf: (paid: string, total: string) => `${paid} of ${total}`,
        ofCollected: (amount: string) => `${amount} of collected`,
        detailedReports: "Detailed exportable reports",
        archiveModeLabel: "Archive mode",
        archiveModeNote: (year: string | number) =>
          `You are viewing the ${year} archive · report metrics show the current year · payments and students are filtered to the selected year`,
        archiveExit: "Exit",
        partialDataTitle: "Some figures could not be loaded",
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
        incomesSheet: "الإيرادات",
        incomesFile: "تقرير_الإيرادات",
        incomeType: "النوع",
        source: "المصدر",
        incomeDate: "التاريخ",
        incomesMetric: "الإيرادات",
        incomeRecords: "سجلات الإيرادات",
        incomeTotalAmount: "إجمالي المبلغ",
        allFile: "تقرير_شامل",
        collectionRate: "نسبة التحصيل",
        expenseRatio: "نسبة المصاريف",
        expensesVsSalaries: "المصاريف مقابل الرواتب",
        todayPaymentsDesc: "عدد الدفعات المسجّلة اليوم",
        collectedOutOf: (paid: string, total: string) => `${paid} من أصل ${total}`,
        ofCollected: (amount: string) => `${amount} من المستحصل`,
        detailedReports: "تقارير تفصيلية قابلة للتصدير",
        archiveModeLabel: "وضع الأرشيف",
        archiveModeNote: (year: string | number) =>
          `أنت في وضع أرشيف سنة ${year} · بيانات التقارير تعرض السنة الحالية · المدفوعات والطلاب مفلترة للسنة المختارة`,
        archiveExit: "خروج",
        partialDataTitle: "تعذر تحميل بعض الأرقام",
      }, [isEnglish]);

  const currency = commonT("currency");
  const { profile } = useRole();
  const archiveMode = useArchiveMode();

  const paymentMethodLabel = useCallback((method: string | null | undefined) => {
    if (!method) return "—";
    try { return commonT(`paymentMethods.${method}`); } catch { return method; }
  }, [commonT]);

  const studentStatusLabel = useCallback((status: string | null | undefined) => {
    if (!status) return "—";
    try { return commonT(`studentStatus.${status}`); } catch { return status; }
  }, [commonT]);

  const runtimeBranding = useRuntimeBranding();
  const schoolScope = useSchoolScope(profile);
  const datasetCacheRef = useRef<{
    students?: StudentRow[];
    payments?: PaymentRow[];
    expenses?: ExpenseRow[];
    salaries?: SalaryRow[];
    incomes?: IncomeRow[];
  }>({});

  // ── Core state ──────────────────────────────────────────────────────────────
  const [metrics, setMetrics] = useState<ReportsMetrics>(EMPTY_REPORTS_METRICS);
  const [loading, setLoading] = useState(true);
  const [fetchError, setFetchError] = useState<string | null>(null);
  // The overview endpoint answers 200 with a `warnings` array when one of its
  // queries fails. Dropping it on the floor is how expenses silently rendered
  // as 0 for every school.
  const [warnings, setWarnings] = useState<string[]>([]);
  const [actionLoading, setActionLoading] = useState<DatasetType | null>(null);

  // Teacher attendance
  const [teacherAttendanceData, setTeacherAttendanceData] = useState<TeacherAttendanceSummaryRow[]>([]);
  const [teacherAttendanceLoading, setTeacherAttendanceLoading] = useState(false);

  // ─── Read settings-page theme choices from localStorage ─────────────────────
  function getExcelThemeOpts(): { themeId: ExcelThemeId } & ExcelStyleSettings {
    if (typeof window === "undefined") return { themeId: DEFAULT_EXCEL_THEME_ID, ...DEFAULT_EXCEL_STYLE };
    const themeId = (localStorage.getItem("excel-theme") ?? DEFAULT_EXCEL_THEME_ID) as ExcelThemeId;
    try {
      const style = JSON.parse(localStorage.getItem("excel-style") ?? "{}") as Partial<ExcelStyleSettings>;
      return { themeId, ...DEFAULT_EXCEL_STYLE, ...style };
    } catch {
      return { themeId, ...DEFAULT_EXCEL_STYLE };
    }
  }

  function getPrintSettings(): { paperSize: string; watermark: string } {
    if (typeof window === "undefined") return { paperSize: "A4", watermark: "show" };
    try {
      const style = JSON.parse(localStorage.getItem("print-style") ?? "{}") as Record<string, string>;
      return { paperSize: style.paperSize ?? "A4", watermark: style.watermark ?? "show" };
    } catch {
      return { paperSize: "A4", watermark: "show" };
    }
  }

  // ─── Data fetching ────────────────────────────────────────────────────────────

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setLoading(true);
    setFetchError(null);
    setWarnings([]);
    try {
      const schoolId = await resolveSchoolIdForProfile(profile, {
        selectedSchoolId: schoolScope.selectedSchoolId,
      });
      if (!schoolId) {
        datasetCacheRef.current = {};
        setMetrics(EMPTY_REPORTS_METRICS);
        return;
      }
      const params = new URLSearchParams({ schoolId });
      if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ metrics?: ReportsMetrics; warnings?: string[]; error?: { message?: string } }>(
        `/api/web/reports/overview?${params.toString()}`,
      );
      if (!response.ok) {
        throw new Error((payload as { error?: { message?: string } })?.error?.message || reportCopy.loadReportsFailed);
      }
      datasetCacheRef.current = {};
      setMetrics(payload?.metrics ?? EMPTY_REPORTS_METRICS);
      setWarnings(Array.isArray(payload?.warnings) ? payload.warnings.filter(Boolean) : []);
    } catch (err) {
      datasetCacheRef.current = {};
      setMetrics(EMPTY_REPORTS_METRICS);
      setWarnings([]);
      setFetchError(err instanceof Error ? err.message : reportCopy.loadReportsFailed);
    } finally {
      setLoading(false);
    }
  }, [profile, reportCopy.loadReportsFailed, schoolScope.selectedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchAll();
  }, [fetchAll, profile, schoolScope.scopeLoading]);

  const getScopedSchoolId = useCallback(async () => {
    if (!profile) return null;
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const loadDataset = useCallback(
    async <T extends Exclude<DatasetType, "all">>(type: T): Promise<
      T extends "students" ? StudentRow[] :
      T extends "payments" ? PaymentRow[] :
      T extends "expenses" ? ExpenseRow[] :
      T extends "salaries" ? SalaryRow[] :
      T extends "incomes" ? IncomeRow[] :
      never
    > => {
      const cached = datasetCacheRef.current[type];
      if (cached) return cached as never;

      const schoolId = await getScopedSchoolId();
      if (!schoolId) return [] as never;

      setActionLoading(type);
      try {
        const params = new URLSearchParams({ schoolId, type });
        if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);

        const { response, payload } = await fetchJsonWithAuthorizedSession<{
          students?: StudentRow[];
          payments?: PaymentRow[];
          expenses?: ExpenseRow[];
          salaries?: SalaryRow[];
          incomes?: IncomeRow[];
          error?: { message?: string };
        }>(`/api/web/reports/dataset?${params.toString()}`);

        if (!response.ok) {
          throw new Error(payload?.error?.message || reportCopy.loadDatasetFailed);
        }

        const nextRows =
          type === "students" ? payload?.students ?? [] :
          type === "payments" ? payload?.payments ?? [] :
          type === "expenses" ? payload?.expenses ?? [] :
          type === "incomes"  ? payload?.incomes ?? [] :
          payload?.salaries ?? [];

        datasetCacheRef.current[type] = nextRows as never;
        return nextRows as never;
      } finally {
        setActionLoading((current) => (current === type ? null : current));
      }
    },
    [getScopedSchoolId, reportCopy.loadDatasetFailed, runtimeBranding.branchId],
  );

  const loadAllDatasets = useCallback(async () => {
    if (
      datasetCacheRef.current.students &&
      datasetCacheRef.current.payments &&
      datasetCacheRef.current.expenses &&
      datasetCacheRef.current.salaries &&
      datasetCacheRef.current.incomes
    ) {
      return {
        students: datasetCacheRef.current.students ?? [],
        payments: datasetCacheRef.current.payments ?? [],
        expenses: datasetCacheRef.current.expenses ?? [],
        salaries: datasetCacheRef.current.salaries ?? [],
        incomes:  datasetCacheRef.current.incomes  ?? [],
      };
    }
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return { students: [], payments: [], expenses: [], salaries: [], incomes: [] };

    setActionLoading("all");
    try {
      const params = new URLSearchParams({ schoolId, type: "all" });
      if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{
        students?: StudentRow[];
        payments?: PaymentRow[];
        expenses?: ExpenseRow[];
        salaries?: SalaryRow[];
        incomes?: IncomeRow[];
        error?: { message?: string };
      }>(`/api/web/reports/dataset?${params.toString()}`);
      if (!response.ok) throw new Error(reportCopy.loadComprehensiveFailed);
      datasetCacheRef.current = {
        students: payload?.students ?? [],
        payments: payload?.payments ?? [],
        expenses: payload?.expenses ?? [],
        salaries: payload?.salaries ?? [],
        incomes:  payload?.incomes  ?? [],
      };
      return {
        students: datasetCacheRef.current.students ?? [],
        payments: datasetCacheRef.current.payments ?? [],
        expenses: datasetCacheRef.current.expenses ?? [],
        salaries: datasetCacheRef.current.salaries ?? [],
        incomes:  datasetCacheRef.current.incomes  ?? [],
      };
    } finally {
      setActionLoading((current) => (current === "all" ? null : current));
    }
  }, [getScopedSchoolId, reportCopy.loadComprehensiveFailed, runtimeBranding.branchId]);


  // ─── Export functions ─────────────────────────────────────────────────────────

  const exportStudentsExcel = useCallback(async () => {
    try {
      const students = await loadDataset("students");
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `${reportCopy.studentsFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets: [{
          name: reportCopy.studentsSheet, title: reportCopy.studentsSheet,
          columns: [
            { header: reportCopy.studentName, key: "name",      width: 28 },
            { header: reportCopy.className,   key: "class",     width: 16 },
            { header: reportCopy.status,      key: "status",    width: 12 },
            { header: reportCopy.totalFees,   key: "total",     width: 18, numFmt: "#,##0" },
            { header: reportCopy.paid,        key: "paid",      width: 18, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.remaining,   key: "remaining", width: 18, numFmt: "#,##0", semanticColor: "remaining" as const },
            { header: reportCopy.phone,       key: "phone",     width: 16 },
            { header: reportCopy.address,     key: "address",   width: 22 },
          ],
          rows: students.map((item) => ({
            name: item.full_name, class: item.class_name || "—", status: studentStatusLabel(item.status),
            total: item.total_fee || 0, paid: item.paid_fee || 0, remaining: item.remaining_fee || 0,
            phone: item.phone || "", address: item.address || "",
          })),
        }],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, reportCopy, studentStatusLabel]);

  const exportPaymentsExcel = useCallback(async () => {
    try {
      const payments = await loadDataset("payments");
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `${reportCopy.paymentsFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets: [{
          name: reportCopy.paymentsSheet, title: reportCopy.paymentsSheet,
          columns: [
            { header: reportCopy.student,       key: "name",    width: 28 },
            { header: reportCopy.className,     key: "class",   width: 16 },
            { header: reportCopy.amount,        key: "amount",  width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.paymentMethod, key: "method",  width: 16 },
            { header: reportCopy.date,          key: "date",    width: 16 },
            { header: reportCopy.receiptNumber, key: "receipt", width: 22 },
            { header: reportCopy.notes,         key: "notes",   width: 22 },
          ],
          rows: payments.map((item) => ({
            name: item.students?.full_name || "—", class: item.students?.class_name || "—",
            amount: item.amount || 0, method: paymentMethodLabel(item.payment_method),
            date: formatDate(item.created_at ?? ""), receipt: item.receipt_number || "—", notes: item.notes || "",
          })),
        }],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, reportCopy, paymentMethodLabel]);

  const exportExpensesExcel = useCallback(async () => {
    try {
      const expenses = await loadDataset("expenses");
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `${reportCopy.expensesFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets: [{
          name: reportCopy.expensesSheet, title: reportCopy.expensesSheet,
          columns: [
            { header: reportCopy.type,          key: "type",      width: 20 },
            { header: reportCopy.amount,        key: "amount",    width: 16, numFmt: "#,##0", fixedColor: "red" as const },
            { header: reportCopy.date,          key: "date",      width: 16 },
            { header: reportCopy.recipient,     key: "recipient", width: 20 },
            { header: reportCopy.receiptNumber, key: "receipt",   width: 20 },
            { header: reportCopy.notes,         key: "notes",     width: 24 },
          ],
          rows: expenses.map((item) => ({
            type: item.expense_types?.name || "—", amount: item.amount || 0,
            date: formatDate(item.expense_date ?? ""), recipient: item.recipient || "—",
            receipt: item.receipt_number || "—", notes: item.notes || "",
          })),
        }],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, reportCopy]);

  const exportSalariesExcel = useCallback(async () => {
    try {
      const salaries = await loadDataset("salaries");
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `${reportCopy.salariesFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets: [{
          name: reportCopy.salariesSheet, title: reportCopy.salariesSheet,
          columns: [
            { header: reportCopy.teacher,    key: "teacher",    width: 24 },
            { header: reportCopy.subject,    key: "subject",    width: 16 },
            { header: reportCopy.month,      key: "month",      width: 14 },
            { header: reportCopy.gross,      key: "gross",      width: 16, numFmt: "#,##0" },
            { header: reportCopy.deductions, key: "deductions", width: 16, numFmt: "#,##0", fixedColor: "red" as const },
            { header: reportCopy.net,        key: "net",        width: 16, numFmt: "#,##0", fixedColor: "green" as const },
            { header: reportCopy.paidAt,     key: "paid_at",    width: 16 },
          ],
          rows: salaries.map((item) => ({
            teacher: item.teachers?.full_name || "—", subject: item.teachers?.subject || "—",
            month: item.month || "—", gross: item.gross_salary || 0, deductions: item.deductions || 0,
            net: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
            paid_at: item.paid_at ? formatDate(item.paid_at) : "—",
          })),
        }],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, reportCopy]);

  const exportIncomesExcel = useCallback(async () => {
    try {
      const incomes = await loadDataset("incomes");
      const { downloadExcelExport } = await import("@/lib/excel-client");
      await downloadExcelExport({
        filename: `${reportCopy.incomesFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets: [{
          name: reportCopy.incomesSheet, title: reportCopy.incomesSheet,
          columns: [
            { header: reportCopy.incomeType,    key: "type",    width: 20 },
            { header: reportCopy.amount,        key: "amount",  width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.incomeDate,    key: "date",    width: 16 },
            { header: reportCopy.source,        key: "source",  width: 20 },
            { header: reportCopy.receiptNumber, key: "receipt", width: 20 },
            { header: reportCopy.notes,         key: "notes",   width: 24 },
          ],
          rows: incomes.map((item) => ({
            type: item.income_types?.name || "—", amount: item.amount || 0,
            date: formatDate(item.income_date ?? ""), source: item.source || "—",
            receipt: item.receipt_number || "—", notes: item.notes || "",
          })),
        }],
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, reportCopy]);

  const exportAllExcel = useCallback(async () => {
    try {
      const { students, payments, expenses, salaries, incomes } = await loadAllDatasets();
      const { downloadExcelExport } = await import("@/lib/excel-client");
      const sheets = [
        {
          name: reportCopy.studentsSheet, title: reportCopy.studentsSheet,
          columns: [
            { header: reportCopy.studentName, key: "name",      width: 28 },
            { header: reportCopy.className,   key: "class",     width: 16 },
            { header: reportCopy.status,      key: "status",    width: 12 },
            { header: reportCopy.totalFees,   key: "total",     width: 18, numFmt: "#,##0" },
            { header: reportCopy.paid,        key: "paid",      width: 18, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.remaining,   key: "remaining", width: 18, numFmt: "#,##0", semanticColor: "remaining" as const },
            { header: reportCopy.phone,       key: "phone",     width: 16 },
            { header: reportCopy.address,     key: "address",   width: 22 },
          ],
          rows: students.map((item) => ({
            name: item.full_name, class: item.class_name || "—", status: studentStatusLabel(item.status),
            total: item.total_fee || 0, paid: item.paid_fee || 0, remaining: item.remaining_fee || 0,
            phone: item.phone || "", address: item.address || "",
          })),
        },
        {
          name: reportCopy.paymentsSheet, title: reportCopy.paymentsSheet,
          columns: [
            { header: reportCopy.student,       key: "name",    width: 28 },
            { header: reportCopy.className,     key: "class",   width: 16 },
            { header: reportCopy.amount,        key: "amount",  width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.paymentMethod, key: "method",  width: 16 },
            { header: reportCopy.date,          key: "date",    width: 16 },
            { header: reportCopy.receiptNumber, key: "receipt", width: 22 },
          ],
          rows: payments.map((item) => ({
            name: item.students?.full_name || "—", class: item.students?.class_name || "—",
            amount: item.amount || 0, method: paymentMethodLabel(item.payment_method),
            date: formatDate(item.created_at ?? ""), receipt: item.receipt_number || "—",
          })),
        },
        {
          name: reportCopy.expensesSheet, title: reportCopy.expensesSheet,
          columns: [
            { header: reportCopy.type,          key: "type",      width: 20 },
            { header: reportCopy.amount,        key: "amount",    width: 16, numFmt: "#,##0", fixedColor: "red" as const },
            { header: reportCopy.date,          key: "date",      width: 16 },
            { header: reportCopy.recipient,     key: "recipient", width: 20 },
            { header: reportCopy.receiptNumber, key: "receipt",   width: 20 },
          ],
          rows: expenses.map((item) => ({
            type: item.expense_types?.name || "—", amount: item.amount || 0,
            date: formatDate(item.expense_date ?? ""), recipient: item.recipient || "—",
            receipt: item.receipt_number || "—",
          })),
        },
        {
          name: reportCopy.salariesSheet, title: reportCopy.salariesSheet,
          columns: [
            { header: reportCopy.teacher,    key: "teacher",    width: 24 },
            { header: reportCopy.subject,    key: "subject",    width: 16 },
            { header: reportCopy.month,      key: "month",      width: 14 },
            { header: reportCopy.gross,      key: "gross",      width: 16, numFmt: "#,##0" },
            { header: reportCopy.deductions, key: "deductions", width: 16, numFmt: "#,##0", fixedColor: "red" as const },
            { header: reportCopy.net,        key: "net",        width: 16, numFmt: "#,##0", fixedColor: "green" as const },
            { header: reportCopy.paidAt,     key: "paid_at",    width: 16 },
          ],
          rows: salaries.map((item) => ({
            teacher: item.teachers?.full_name || "—", subject: item.teachers?.subject || "—",
            month: item.month || "—", gross: item.gross_salary || 0, deductions: item.deductions || 0,
            net: Math.max(0, (item.gross_salary || 0) - (item.deductions || 0)),
            paid_at: item.paid_at ? formatDate(item.paid_at) : "—",
          })),
        },
        {
          name: reportCopy.incomesSheet, title: reportCopy.incomesSheet,
          columns: [
            { header: reportCopy.incomeType,    key: "type",    width: 20 },
            { header: reportCopy.amount,        key: "amount",  width: 16, numFmt: "#,##0", semanticColor: "paid" as const },
            { header: reportCopy.incomeDate,    key: "date",    width: 16 },
            { header: reportCopy.source,        key: "source",  width: 20 },
            { header: reportCopy.receiptNumber, key: "receipt", width: 20 },
            { header: reportCopy.notes,         key: "notes",   width: 24 },
          ],
          rows: incomes.map((item) => ({
            type: item.income_types?.name || "—", amount: item.amount || 0,
            date: formatDate(item.income_date ?? ""), source: item.source || "—",
            receipt: item.receipt_number || "—", notes: item.notes || "",
          })),
        },
      ].filter((s) => s.rows.length > 0);

      if (!sheets.length) return;
      await downloadExcelExport({
        filename: `${reportCopy.allFile}_${formatDate(new Date())}.xlsx`,
        ...getExcelThemeOpts(),
        sheets,
      });
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadComprehensiveFailed);
    }
  }, [loadAllDatasets, reportCopy, studentStatusLabel, paymentMethodLabel]);

  // ─── Print functions ──────────────────────────────────────────────────────────

  const printDocument = useCallback((title: string, subtitle: string, bodyHtml: string) => {
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
        extraStyles: (() => {
          const ps = getPrintSettings();
          return `
            @page { size: ${ps.paperSize} landscape; margin: 1cm; }
            table { font-size: 11px; }
            .totals{background:#f5f9ff;border-radius:18px;padding:1rem 1.1rem;display:flex;gap:1rem;flex-wrap:wrap}
            .total-item{font-size:.9rem}
            .total-label{color:#5f7388}
            .total-val{font-weight:900;color:var(--print-primary-deep)}
            ${ps.watermark === "hide" ? ".watermark{display:none!important}" : ""}
          `;
        })(),
        autoPrint: false,
      }),
    );
  }, [runtimeBranding, isEnglish]);

  const printStudents = useCallback(async () => {
    try {
      const students = await loadDataset("students");
      printDocument(
        isEnglish ? "Students report" : "تقرير الطلاب",
        isEnglish ? `${students.length} students` : `${students.length} طالب`,
        `<table>
          <thead><tr><th>#</th><th>${isEnglish ? "Name" : "الاسم"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Status" : "الحالة"}</th><th>${isEnglish ? "Total fees" : "إجمالي الرسوم"}</th><th>${isEnglish ? "Paid" : "المدفوع"}</th><th>${isEnglish ? "Remaining" : "المتبقي"}</th></tr></thead>
          <tbody>${students.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(item.full_name)}</td><td>${escapeHtml(item.class_name || "—")}</td><td>${escapeHtml(studentStatusLabel(item.status))}</td><td>${currency} ${formatNumber(item.total_fee || 0)}</td><td>${currency} ${formatNumber(item.paid_fee || 0)}</td><td>${currency} ${formatNumber(item.remaining_fee || 0)}</td></tr>`
          ).join("")}</tbody>
        </table>`,
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, printDocument, isEnglish, currency, studentStatusLabel, reportCopy.loadDatasetFailed]);

  const printPayments = useCallback(async () => {
    try {
      const payments = await loadDataset("payments");
      printDocument(
        isEnglish ? "Payments report" : "تقرير الحسابات",
        isEnglish ? `${payments.length} payments` : `${payments.length} دفعة`,
        `<table>
          <thead><tr><th>#</th><th>${isEnglish ? "Student" : "الطالب"}</th><th>${isEnglish ? "Class" : "الصف"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Method" : "طريقة الدفع"}</th><th>${isEnglish ? "Date" : "التاريخ"}</th></tr></thead>
          <tbody>${payments.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(item.students?.full_name || "—")}</td><td>${escapeHtml(item.students?.class_name || "—")}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${escapeHtml(paymentMethodLabel(item.payment_method))}</td><td>${formatDate(item.created_at ?? "")}</td></tr>`
          ).join("")}</tbody>
        </table>`,
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, printDocument, isEnglish, currency, paymentMethodLabel, reportCopy.loadDatasetFailed]);

  const printExpenses = useCallback(async () => {
    try {
      const expenses = await loadDataset("expenses");
      printDocument(
        isEnglish ? "Expenses report" : "تقرير المصروفات",
        isEnglish ? `${expenses.length} expenses` : `${expenses.length} مصروف`,
        `<table>
          <thead><tr><th>#</th><th>${isEnglish ? "Type" : "النوع"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Recipient" : "المستلم"}</th></tr></thead>
          <tbody>${expenses.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(item.expense_types?.name || "—")}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${formatDate(item.expense_date ?? "")}</td><td>${escapeHtml(item.recipient || "—")}</td></tr>`
          ).join("")}</tbody>
        </table>`,
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, printDocument, isEnglish, currency, reportCopy.loadDatasetFailed]);

  const printSalaries = useCallback(async () => {
    try {
      const salaries = await loadDataset("salaries");
      printDocument(
        isEnglish ? "Salaries report" : "تقرير الرواتب",
        isEnglish ? `${salaries.length} salary records` : `${salaries.length} سجل راتب`,
        `<table>
          <thead><tr><th>#</th><th>${isEnglish ? "Teacher" : "الأستاذ"}</th><th>${isEnglish ? "Subject" : "المادة"}</th><th>${isEnglish ? "Month" : "الشهر"}</th><th>${isEnglish ? "Net" : "الصافي"}</th><th>${isEnglish ? "Paid at" : "تاريخ الدفع"}</th></tr></thead>
          <tbody>${salaries.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(item.teachers?.full_name || "—")}</td><td>${escapeHtml(item.teachers?.subject || "—")}</td><td>${escapeHtml(item.month || "—")}</td><td>${currency} ${formatNumber((item.gross_salary || 0) - (item.deductions || 0))}</td><td>${item.paid_at ? formatDate(item.paid_at) : "—"}</td></tr>`
          ).join("")}</tbody>
        </table>`,
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, printDocument, isEnglish, currency, reportCopy.loadDatasetFailed]);

  const printIncomes = useCallback(async () => {
    try {
      const incomes = await loadDataset("incomes");
      printDocument(
        isEnglish ? "Incomes report" : "تقرير الإيرادات",
        isEnglish ? `${incomes.length} income records` : `${incomes.length} سجل إيراد`,
        `<table>
          <thead><tr><th>#</th><th>${isEnglish ? "Type" : "النوع"}</th><th>${isEnglish ? "Amount" : "المبلغ"}</th><th>${isEnglish ? "Date" : "التاريخ"}</th><th>${isEnglish ? "Source" : "المصدر"}</th></tr></thead>
          <tbody>${incomes.map((item, i) =>
            `<tr><td>${i + 1}</td><td>${escapeHtml(item.income_types?.name || "—")}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${formatDate(item.income_date ?? "")}</td><td>${escapeHtml(item.source || "—")}</td></tr>`
          ).join("")}</tbody>
        </table>`,
      );
    } catch (err) {
      setFetchError(err instanceof Error ? err.message : reportCopy.loadDatasetFailed);
    }
  }, [loadDataset, printDocument, isEnglish, currency, reportCopy.loadDatasetFailed]);

  const printSummary = useCallback(() => {
    printDocument(
      isEnglish ? "Financial summary" : "الملخص المالي",
      isEnglish ? "School financial snapshot" : "ملخص مالي سريع للمدرسة",
      `<div class="totals">
        <div class="total-item"><span class="total-label">${isEnglish ? "Total fees" : "إجمالي الرسوم"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalFees)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "Collected" : "المبالغ المستحصلة"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalPaid)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "Remaining" : "المتبقي"}: </span><span class="total-val">${currency} ${formatNumber(metrics.totalRemaining)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "All revenue" : "جميع الواردات"}: </span><span class="total-val">${currency} ${formatNumber(metrics.otherRevenueTotal)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "Expenses" : "المصروفات"}: </span><span class="total-val">${currency} ${formatNumber(metrics.expenseVolume)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "Net salaries" : "صافي الرواتب"}: </span><span class="total-val">${currency} ${formatNumber(metrics.salaryVolume)}</span></div>
        <div class="total-item"><span class="total-label">${isEnglish ? "Transferred students revenue" : "إيراد الطلاب المنقولين"}: </span><span class="total-val">${currency} ${formatNumber(metrics.transferredStudentsCollected)}</span></div>
      </div>`,
    );
  }, [printDocument, metrics, isEnglish, currency]);

  // ─── Teacher attendance report ────────────────────────────────────────────────

  const fetchTeacherAttendance = useCallback(async () => {
    const schoolId = await getScopedSchoolId();
    if (!schoolId) return;
    setTeacherAttendanceLoading(true);
    try {
      const now = new Date();
      const params = new URLSearchParams({
        schoolId,
        year: String(now.getFullYear()),
        month: String(now.getMonth() + 1),
      });
      if (runtimeBranding.branchId) params.set("branchId", runtimeBranding.branchId);
      const { response, payload } = await fetchJsonWithAuthorizedSession<{ ok?: boolean; teachers?: TeacherAttendanceSummaryRow[] }>(
        `/api/web/teacher-attendance/summary?${params.toString()}`,
      );
      if (response.ok) setTeacherAttendanceData(payload?.teachers ?? []);
    } catch { /* silent */ } finally {
      setTeacherAttendanceLoading(false);
    }
  }, [getScopedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchTeacherAttendance();
  }, [fetchTeacherAttendance, profile, schoolScope.scopeLoading]);

  const printTeacherAttendance = useCallback(() => {
    const now = new Date();
    const monthLabel = now.toLocaleDateString("ar-IQ-u-nu-latn", { month: "long", year: "numeric" });
    printDocument(
      isEnglish ? "Teacher Attendance Report" : "تقرير حضور المعلمين",
      isEnglish ? monthLabel : monthLabel,
      `<table>
        <thead><tr>
          <th>#</th>
          <th>${isEnglish ? "Teacher" : "المعلم"}</th>
          <th>${isEnglish ? "Subject" : "المادة"}</th>
          <th>${isEnglish ? "Present" : "حاضر"}</th>
          <th>${isEnglish ? "Absent" : "غائب"}</th>
          <th>${isEnglish ? "Late" : "متأخر"}</th>
          <th>${isEnglish ? "Excused" : "معذور"}</th>
          <th>${isEnglish ? "Rate" : "نسبة الحضور"}</th>
        </tr></thead>
        <tbody>${teacherAttendanceData.map((row, i) => {
          const pct = row.total_days > 0 ? Math.round((row.present / row.total_days) * 100) : 0;
          return `<tr>
            <td>${i + 1}</td>
            <td>${escapeHtml(row.name)}</td>
            <td>${escapeHtml(row.subject ?? "—")}</td>
            <td>${row.present}</td>
            <td>${row.absent}</td>
            <td>${row.late}</td>
            <td>${row.excused}</td>
            <td>${pct}%</td>
          </tr>`;
        }).join("")}</tbody>
      </table>`,
    );
  }, [printDocument, teacherAttendanceData, isEnglish]);

  const exportTeacherAttendanceExcel = useCallback(async () => {
    const { downloadExcelExport } = await import("@/lib/excel-client");
    const now = new Date();
    const monthLabel = now.toLocaleDateString("ar-IQ-u-nu-latn", { month: "long" });
    await downloadExcelExport({
      filename: isEnglish ? `teacher_attendance_${now.getFullYear()}_${now.getMonth() + 1}` : `حضور_المعلمين_${monthLabel}_${now.getFullYear()}`,
      ...getExcelThemeOpts(),
      sheets: [{
        name: isEnglish ? "Teacher Attendance" : "حضور المعلمين",
        title: isEnglish ? "Teacher Attendance Report" : "تقرير حضور المعلمين",
        columns: [
          { header: isEnglish ? "Teacher" : "المعلم",          key: "name",    width: 24 },
          { header: isEnglish ? "Subject" : "المادة",          key: "subject", width: 16 },
          { header: isEnglish ? "Present" : "حاضر",           key: "present", width: 10 },
          { header: isEnglish ? "Absent" : "غائب",            key: "absent",  width: 10 },
          { header: isEnglish ? "Late" : "متأخر",             key: "late",    width: 10 },
          { header: isEnglish ? "Excused" : "معذور",          key: "excused", width: 10 },
          { header: isEnglish ? "Total days" : "الأيام",      key: "total",   width: 12 },
          { header: isEnglish ? "Rate" : "نسبة الحضور",       key: "rate",    width: 14 },
        ],
        rows: teacherAttendanceData.map((row) => ({
          name: row.name,
          subject: row.subject ?? "",
          present: row.present,
          absent: row.absent,
          late: row.late,
          excused: row.excused,
          total: row.total_days,
          rate: row.total_days > 0 ? `${Math.round((row.present / row.total_days) * 100)}%` : "—",
        })),
      }],
    });
  }, [teacherAttendanceData, isEnglish]);

  // ─── Content renderers ────────────────────────────────────────────────────────

  function renderWarnings() {
    if (warnings.length === 0) return null;
    return (
      <div className="rounded-2xl border border-[var(--warning)]/30 bg-[var(--warning)]/5 p-4 mb-4 flex items-start gap-3">
        <div className="h-9 w-9 rounded-xl bg-[var(--warning)]/10 flex items-center justify-center text-[var(--warning)] shrink-0">
          <span className="text-base font-black">!</span>
        </div>
        <div className="flex-1 min-w-0">
          <div className="text-sm font-black text-[var(--warning)]">{reportCopy.partialDataTitle}</div>
          <ul className="mt-1 space-y-0.5">
            {warnings.map((warning, i) => (
              <li key={i} className="text-xs font-bold text-[var(--text-muted)]">{warning}</li>
            ))}
          </ul>
        </div>
        <button
          className="shrink-0 h-9 px-4 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-black hover:bg-[var(--warning)]/20 transition-colors"
          onClick={() => void fetchAll()}
        >
          {isEnglish ? "Retry" : "إعادة المحاولة"}
        </button>
      </div>
    );
  }

  function renderSummaryTab() {
    const collectionRate = metrics.totalFees > 0 ? (metrics.totalPaid / metrics.totalFees) * 100 : 0;
    const collectionRateRounded = Math.round(collectionRate);
    const expenseRatio = metrics.totalPaid > 0 ? (metrics.expenseVolume / metrics.totalPaid) * 100 : 0;

    // KPI color helper (returns CSS variable string)
    const kpiColor = (val: number, threshHigh: number, threshMid: number, invertScale?: boolean) => {
      if (invertScale) {
        // lower = better (like expense ratio)
        return val <= threshHigh ? "var(--success)" : val <= threshMid ? "var(--warning)" : "var(--danger)";
      }
      // higher = better (like collection rate)
      return val >= threshHigh ? "var(--success)" : val >= threshMid ? "var(--warning)" : "var(--danger)";
    };

    const collColor = kpiColor(collectionRate, 80, 50);
    const expColor = kpiColor(expenseRatio, 40, 70, true);

    type ProgressBar = { label: string; pct: number; dual: boolean } | null;
    type ReportCard = {
      id: string;
      title: string;
      icon: React.ElementType;
      color: string;
      description: string;
      count: number;
      stats: { label: string; value: string; positive: boolean; negative: boolean }[];
      onExcel: () => void;
      onPrint: () => void;
      progressBar: ProgressBar;
    };

    const reportCards: ReportCard[] = [
      {
        id: "students",
        title: t("cards.students.title"),
        icon: Users,
        color: "var(--info)",
        description: t("cards.students.description"),
        count: metrics.studentsCount,
        stats: [
          { label: dashboardT("stats.totalStudents"),   value: formatNumber(metrics.studentsCount),                   positive: false, negative: false },
          { label: commonT("studentStatus.active"),      value: formatNumber(metrics.activeStudents),                  positive: true,  negative: false },
          { label: dashboardT("stats.totalFees"),        value: `${currency} ${formatNumber(metrics.totalFees)}`,      positive: false, negative: false },
          { label: dashboardT("stats.remainingBalance"), value: `${currency} ${formatNumber(metrics.totalRemaining)}`, positive: false, negative: true  },
        ],
        onExcel: exportStudentsExcel,
        onPrint: printStudents,
        progressBar: metrics.totalFees > 0
          ? { label: reportCopy.collectionRate, pct: (metrics.totalPaid / metrics.totalFees) * 100, dual: false }
          : null,
      },
      {
        id: "payments",
        title: t("cards.payments.title"),
        icon: CreditCard,
        color: "var(--success)",
        description: t("cards.payments.description"),
        count: metrics.paymentsCount,
        stats: [
          { label: dashboardT("finance.paid"),              value: formatNumber(metrics.paymentsCount),                         positive: false, negative: false },
          { label: dashboardT("finance.collectedAmounts"),   value: `${currency} ${formatNumber(metrics.paymentVolume)}`,        positive: true,  negative: false },
          { label: t("cards.payments.totalPaid"),           value: `${currency} ${formatNumber(metrics.totalPaid)}`,            positive: true,  negative: false },
          { label: t("cards.payments.remaining"),           value: `${currency} ${formatNumber(metrics.totalRemaining)}`,       positive: false, negative: true  },
        ],
        onExcel: exportPaymentsExcel,
        onPrint: printPayments,
        progressBar: null,
      },
      {
        id: "expenses",
        title: t("cards.expenses.title"),
        icon: Wallet,
        color: "var(--danger)",
        description: t("cards.expenses.description"),
        count: metrics.expensesCount,
        stats: [
          { label: reportCopy.recordCount,  value: formatNumber(metrics.expensesCount),                  positive: false, negative: false },
          { label: reportCopy.totalAmount,  value: `${currency} ${formatNumber(metrics.expenseVolume)}`, positive: false, negative: true  },
          { label: reportCopy.expenseTypes, value: formatNumber(metrics.expenseTypeCount),                positive: false, negative: false },
        ],
        onExcel: exportExpensesExcel,
        onPrint: printExpenses,
        progressBar: metrics.salaryVolume > 0
          ? {
              label: reportCopy.expensesVsSalaries,
              pct: (metrics.expenseVolume / (metrics.expenseVolume + metrics.salaryVolume)) * 100,
              dual: true,
            }
          : null,
      },
      {
        id: "salaries",
        title: t("cards.salaries.title"),
        icon: Briefcase,
        color: "var(--primary)",
        description: t("cards.salaries.description"),
        count: metrics.salariesCount,
        stats: [
          { label: reportCopy.salaryRecords,         value: formatNumber(metrics.salariesCount),                 positive: false, negative: false },
          { label: reportCopy.netTotal,              value: `${currency} ${formatNumber(metrics.salaryVolume)}`, positive: false, negative: false },
          { label: reportCopy.monthlySalaryPayments, value: formatNumber(metrics.currentMonthSalaryCount),       positive: false, negative: false },
        ],
        onExcel: exportSalariesExcel,
        onPrint: printSalaries,
        progressBar: null,
      },
      {
        id: "incomes",
        title: t("cards.incomes.title"),
        icon: Banknote,
        color: "var(--warning)",
        description: t("cards.incomes.description"),
        count: metrics.incomesCount,
        stats: [
          { label: reportCopy.incomeRecords,     value: formatNumber(metrics.incomesCount),                          positive: false, negative: false },
          { label: reportCopy.incomeTotalAmount, value: `${currency} ${formatNumber(metrics.otherRevenueTotal)}`,    positive: true,  negative: false },
        ],
        onExcel: exportIncomesExcel,
        onPrint: printIncomes,
        progressBar: null,
      },
      {
        id: "teacherAttendance",
        title: isEnglish ? "Teacher Attendance" : "حضور المعلمين",
        icon: GraduationCap,
        color: "color-mix(in srgb, var(--primary) 80%, var(--success))",
        description: isEnglish ? "Monthly attendance summary for all teachers." : "ملخص الحضور الشهري لجميع المعلمين.",
        count: teacherAttendanceData.length,
        stats: [
          {
            label: isEnglish ? "Teachers" : "المعلمون",
            value: formatNumber(teacherAttendanceData.length),
            positive: false,
            negative: false,
          },
          {
            label: isEnglish ? "Total present" : "مجموع الحضور",
            value: formatNumber(teacherAttendanceData.reduce((s, r) => s + r.present, 0)),
            positive: true,
            negative: false,
          },
          {
            label: isEnglish ? "Total absent" : "مجموع الغياب",
            value: formatNumber(teacherAttendanceData.reduce((s, r) => s + r.absent, 0)),
            positive: false,
            negative: true,
          },
          {
            label: isEnglish ? "Avg. rate" : "متوسط الحضور",
            value: (() => {
              const totalDays = teacherAttendanceData.reduce((s, r) => s + r.total_days, 0);
              const totalPresent = teacherAttendanceData.reduce((s, r) => s + r.present, 0);
              return totalDays > 0 ? `${Math.round((totalPresent / totalDays) * 100)}%` : "—";
            })(),
            positive: false,
            negative: false,
          },
        ],
        onExcel: exportTeacherAttendanceExcel,
        onPrint: printTeacherAttendance,
        progressBar: (() => {
          const totalDays = teacherAttendanceData.reduce((s, r) => s + r.total_days, 0);
          const totalPresent = teacherAttendanceData.reduce((s, r) => s + r.present, 0);
          return totalDays > 0
            ? { label: isEnglish ? "Attendance rate" : "نسبة الحضور", pct: (totalPresent / totalDays) * 100, dual: false }
            : null;
        })(),
      },
    ];

    return (
      <div className="space-y-6">

        {/* ── HERO CARD ── */}
        <motion.section
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="rounded-2xl overflow-hidden relative text-white"
          style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
        >
          {/* Dot mesh overlay */}
          <div className="absolute inset-0 opacity-[0.04] pointer-events-none"
            style={{ backgroundImage: "radial-gradient(circle, white 1px, transparent 1px)", backgroundSize: "22px 22px" }} />
          {/* Glow circles */}
          <div className="absolute -top-20 -end-20 w-80 h-80 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.12) 0%, transparent 70%)" }} />
          <div className="absolute -bottom-16 -start-10 w-56 h-56 rounded-full pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(255,255,255,0.07) 0%, transparent 70%)" }} />

          <div className="relative p-6 sm:p-8">
            {/* Header */}
            <div className="flex items-start justify-between gap-4 mb-7">
              <div className="flex-1 min-w-0">
                <p className="text-[10px] font-black tracking-[0.2em] uppercase mb-2" style={{ color: "rgba(255,255,255,0.75)" }}>
                  {isEnglish ? "Administration · Reports" : "لوحة الإدارة · التقارير"}
                </p>
                <h2 className="text-2xl md:text-3xl font-black leading-tight text-white">{t("summary.title")}</h2>
                <p className="text-sm mt-1.5" style={{ color: "rgba(255,255,255,0.85)" }}>{reportCopy.subtitle}</p>
              </div>
              <div className="flex flex-col items-end gap-2.5 shrink-0">
                <div className="hidden md:flex items-center justify-center w-14 h-14 rounded-2xl"
                  style={{ background: "rgba(255,255,255,0.12)", border: "1px solid rgba(255,255,255,0.2)", backdropFilter: "blur(12px)" }}>
                  <TrendingUp size={26} className="text-white" />
                </div>
              </div>
            </div>

            {/* Row 1: 4 primary metrics */}
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-4">
              {[
                { label: t("summary.totalFees"),  value: metrics.totalFees },
                { label: t("summary.totalPaid"),   value: metrics.totalPaid },
                { label: t("summary.remaining"),   value: metrics.totalRemaining },
                { label: t("summary.totalIncome"), value: metrics.otherRevenueTotal },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.2)", border: "1px solid rgba(255,255,255,0.3)", backdropFilter: "blur(10px)" }}>
                  <div className="text-[9px] font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: "rgba(255,255,255,0.75)" }}>{item.label}</div>
                  <div className="text-lg font-black leading-none tabular-nums">{currency} {formatNumber(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Row 2: 3 secondary metrics */}
            <div className="grid gap-3 grid-cols-3 mt-3">
              {[
                { label: t("summary.expenses"),           value: metrics.expenseVolume                },
                { label: t("summary.netSalaries"),        value: metrics.salaryVolume                 },
                { label: t("summary.transferredRevenue"), value: metrics.transferredStudentsCollected  },
              ].map((item, idx) => (
                <div key={idx} className="rounded-xl px-4 py-3.5"
                  style={{ background: "rgba(255,255,255,0.13)", border: "1px solid rgba(255,255,255,0.2)" }}>
                  <div className="text-[9px] font-black uppercase tracking-[0.15em] mb-1.5" style={{ color: "rgba(255,255,255,0.7)" }}>{item.label}</div>
                  <div className="text-sm font-black leading-none tabular-nums text-white">{currency} {formatNumber(item.value)}</div>
                </div>
              ))}
            </div>

            {/* Collection rate bar */}
            <div className="mt-6 pt-5" style={{ borderTop: "1px solid rgba(255,255,255,0.1)" }}>
              <div className="flex justify-between items-center mb-2.5">
                <span className="text-[10px] font-black uppercase tracking-widest" style={{ color: "rgba(255,255,255,0.8)" }}>{reportCopy.collectionRate}</span>
                <span className="text-sm font-black">{collectionRateRounded}%</span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.12)" }}>
                <motion.div
                  className="h-full rounded-full"
                  initial={{ width: 0 }}
                  animate={{ width: `${Math.min(collectionRateRounded, 100)}%` }}
                  transition={{ duration: 1.1, ease: "easeOut", delay: 0.4 }}
                  style={{ backgroundColor: collectionRateRounded >= 80 ? "var(--success)" : collectionRateRounded >= 50 ? "var(--warning)" : "var(--danger)" }}
                />
              </div>
            </div>

            {/* Buttons */}
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-black shadow-lg transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50"
                style={{ background: "rgba(255,255,255,0.94)", color: "var(--primary)" }}
                onClick={exportAllExcel}
                disabled={actionLoading !== null}
              >
                {actionLoading === "all" ? <Loader2 size={16} className="animate-spin" /> : <Download size={16} />}
                {t("exportAll")}
              </button>
              <button
                className="flex items-center gap-2 h-10 px-5 rounded-xl text-xs font-black transition-all active:scale-95"
                style={{ background: "rgba(255,255,255,0.1)", border: "1px solid rgba(255,255,255,0.2)", color: "white" }}
                onClick={printSummary}
              >
                <Printer size={16} />
                {t("printSummary")}
              </button>
            </div>
          </div>
        </motion.section>

        {/* ── KPI STRIP ── */}
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {[
            {
              label: reportCopy.collectionRate,
              value: `${collectionRateRounded}%`,
              rawValue: null as number | null,
              desc: reportCopy.collectedOutOf(
                `${currency} ${formatNumber(metrics.totalPaid)}`,
                `${currency} ${formatNumber(metrics.totalFees)}`,
              ),
              icon: TrendingUp,
              color: collColor,
              bar: collectionRate as number | null,
            },
            {
              label: reportCopy.expenseRatio,
              value: `${Math.round(Math.min(expenseRatio, 999))}%`,
              rawValue: null as number | null,
              desc: reportCopy.ofCollected(`${currency} ${formatNumber(metrics.expenseVolume)}`),
              icon: Wallet,
              color: expColor,
              bar: Math.min(expenseRatio, 100) as number | null,
            },
            {
              label: reportCopy.todayPayments,
              value: null as string | null,
              rawValue: metrics.todayPayments as number | null,
              desc: reportCopy.todayPaymentsDesc,
              icon: CreditCard,
              color: "var(--info)",
              bar: null as number | null,
            },
          ].map((kpi, i) => {
            const Icon = kpi.icon;
            return (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.08, duration: 0.4 }}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
              >
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                  style={{
                    background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${kpi.color} 8%, transparent), transparent 70%)`,
                  }}
                />
                <div className="relative flex flex-col gap-3">
                  <div className="flex items-start justify-between">
                    <div
                      className="h-10 w-10 rounded-xl flex items-center justify-center shrink-0"
                      style={{
                        background: `color-mix(in srgb, ${kpi.color} 12%, transparent)`,
                        color: kpi.color,
                      }}
                    >
                      <Icon size={20} />
                    </div>
                    <span
                      className="text-3xl font-black leading-none tabular-nums"
                      style={{ color: kpi.color }}
                    >
                      {kpi.rawValue !== null ? <AnimatedNumber value={kpi.rawValue} /> : kpi.value}
                    </span>
                  </div>
                  <div>
                    <div className="text-sm font-bold text-[var(--text-primary)]">{kpi.label}</div>
                    <div className="text-xs text-[var(--text-muted)] mt-0.5">{kpi.desc}</div>
                    {kpi.bar !== null && (
                      <div className="mt-2 h-1.5 bg-[var(--surface-soft)] rounded-full overflow-hidden">
                        <motion.div
                          className="h-full rounded-full"
                          initial={{ width: 0 }}
                          animate={{ width: `${Math.min(kpi.bar, 100)}%` }}
                          transition={{ duration: 0.9, ease: "easeOut", delay: i * 0.1 + 0.2 }}
                          style={{ backgroundColor: kpi.color }}
                        />
                      </div>
                    )}
                  </div>
                </div>
              </motion.div>
            );
          })}
        </div>

        {/* ── FINANCIAL DASHBOARD ── */}
        <FinancialDashboard metrics={metrics} currency={currency} />

        {/* ── SECTION HEADER ── */}
        <div className="flex items-center gap-3">
          <div className="h-px flex-1 bg-[var(--border)]" />
          <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--card-bg)] border border-[var(--border)] shrink-0">
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
            <span className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">
              {reportCopy.detailedReports}
            </span>
            <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: "var(--primary)" }} />
          </div>
          <div className="h-px flex-1 bg-[var(--border)]" />
        </div>

        {/* ── PRINTABLE PDF REPORTS ── */}
        <PrintableReports />

        {/* ── REPORT CARDS ── */}
        <div className="grid gap-5 md:grid-cols-2">
          {reportCards.map((card, index) => {
            const Icon = card.icon;
            const barColor = card.progressBar
              ? card.progressBar.pct >= 80 ? "var(--success)" : card.progressBar.pct >= 50 ? "var(--warning)" : "var(--danger)"
              : "var(--success)";
            return (
              <motion.section
                key={card.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.06, duration: 0.4 }}
                className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 flex flex-col"
              >
                {/* Hover glow */}
                <div
                  className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none"
                  style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${card.color} 8%, transparent), transparent 60%)` }}
                />

                {/* Colored top accent */}
                <div className="h-1 w-full shrink-0" style={{ background: card.color }} />

                {/* Header */}
                <div className="relative flex items-center gap-3 p-5 pb-4">
                  <div
                    className="h-12 w-12 rounded-2xl flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-110"
                    style={{ background: `color-mix(in srgb, ${card.color} 14%, transparent)`, color: card.color }}
                  >
                    <Icon size={24} />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <h3 className="text-base font-black text-[var(--text-primary)] leading-tight">{card.title}</h3>
                      <span
                        className="shrink-0 px-2 py-0.5 rounded-lg text-xs font-black"
                        style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color }}
                      >
                        {formatNumber(card.count)} {isEnglish ? "rec" : "سجل"}
                      </span>
                    </div>
                    <p className="text-[10px] text-[var(--text-muted)] mt-0.5 leading-relaxed">{card.description}</p>
                  </div>
                </div>

                {/* Stats grid */}
                <div className="relative px-5 pb-4 flex-1">
                  <div className="grid grid-cols-2 gap-2">
                    {card.stats.map((stat, idx) => (
                      <div
                        key={idx}
                        className="rounded-xl p-3"
                        style={{ background: `color-mix(in srgb, ${card.color} 5%, var(--surface-soft))` }}
                      >
                        <div className="text-[9px] font-black uppercase tracking-widest text-[var(--text-muted)] mb-1.5">{stat.label}</div>
                        <div
                          className="text-base font-black leading-tight tabular-nums"
                          style={{
                            color: stat.negative ? "var(--danger)" : stat.positive ? "var(--success)" : "var(--text-primary)",
                          }}
                        >
                          {stat.value}
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Progress bar */}
                  {card.progressBar && !card.progressBar.dual && (
                    <div className="mt-3 rounded-xl p-3" style={{ background: `color-mix(in srgb, ${barColor} 5%, var(--surface-soft))` }}>
                      <div className="flex justify-between text-[10px] font-black mb-2">
                        <span className="text-[var(--text-muted)]">{card.progressBar.label}</span>
                        <span style={{ color: barColor }}>{Math.round(card.progressBar.pct)}%</span>
                      </div>
                      <div className="h-2 bg-[var(--border)] rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all" style={{ width: `${Math.min(card.progressBar.pct, 100)}%`, backgroundColor: barColor }} />
                      </div>
                    </div>
                  )}
                  {card.progressBar?.dual && (
                    <div className="mt-3 rounded-xl p-3" style={{ background: "color-mix(in srgb, var(--danger) 5%, var(--surface-soft))" }}>
                      <div className="flex justify-between text-[10px] font-black mb-2">
                        <span className="text-[var(--text-muted)]">{card.progressBar.label}</span>
                        <div className="flex gap-3">
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--danger)" }} />
                            <span style={{ color: "var(--danger)" }}>{Math.round(card.progressBar.pct)}%</span>
                          </span>
                          <span className="flex items-center gap-1.5">
                            <span className="w-2 h-2 rounded-full inline-block" style={{ backgroundColor: "var(--primary)" }} />
                            <span style={{ color: "var(--primary)" }}>{Math.round(100 - card.progressBar.pct)}%</span>
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden flex">
                        <div className="h-full" style={{ width: `${card.progressBar.pct}%`, backgroundColor: "var(--danger)" }} />
                        <div className="h-full flex-1" style={{ backgroundColor: "var(--primary)" }} />
                      </div>
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="relative px-5 pb-5 pt-1 grid grid-cols-2 gap-2">
                  <button
                    className="flex items-center justify-center gap-2 h-10 rounded-xl text-[11px] font-black transition-all active:scale-95 disabled:opacity-50 border"
                    style={{
                      background: `color-mix(in srgb, var(--success) 10%, transparent)`,
                      color: "var(--success)",
                      borderColor: `color-mix(in srgb, var(--success) 20%, transparent)`,
                    }}
                    onClick={card.onExcel}
                    disabled={actionLoading !== null || teacherAttendanceLoading}
                  >
                    {actionLoading === card.id ? <Loader2 size={14} className="animate-spin" /> : <Download size={14} />}
                    {t("excel")}
                  </button>
                  <button
                    className="flex items-center justify-center gap-2 h-10 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-[var(--text-secondary)] text-[11px] font-black transition-all hover:bg-[var(--card-bg)] hover:text-[var(--text-primary)] active:scale-95 disabled:opacity-50"
                    onClick={card.onPrint}
                    disabled={actionLoading !== null || teacherAttendanceLoading}
                  >
                    <Printer size={14} />
                    {t("print")}
                  </button>
                </div>
              </motion.section>
            );
          })}
        </div>

      </div>
    );
  }

  // ─── Render ───────────────────────────────────────────────────────────────────

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/reports" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={t("title")}
            subtitle={reportCopy.subtitle}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6">
              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {archiveMode.isArchiveMode && archiveMode.archiveData && (
                <div className="rounded-2xl flex items-center gap-3 px-5 py-3.5 border border-indigo-500/30 mb-4"
                  style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)" }}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Archive size={15} className="text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">{reportCopy.archiveModeLabel}</p>
                    <p className="text-sm font-black text-white">{reportCopy.archiveModeNote(archiveMode.archiveData.year)}</p>
                  </div>
                  <button onClick={archiveMode.exitArchiveMode}
                    className="text-[11px] font-black text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                    {reportCopy.archiveExit}
                  </button>
                </div>
              )}

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8 shadow-[var(--card-shadow)] mt-4">
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
              ) : fetchError ? (
                <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/5 p-6 flex items-center gap-4 mt-4">
                  <div className="h-10 w-10 rounded-xl bg-[var(--danger)]/10 flex items-center justify-center text-[var(--danger)] shrink-0">
                    <span className="text-lg font-black">!</span>
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="text-sm font-black text-[var(--danger)]">{fetchError}</div>
                  </div>
                  <button
                    className="shrink-0 h-9 px-4 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)] text-xs font-black hover:bg-[var(--danger)]/20 transition-colors"
                    onClick={() => void fetchAll()}
                  >
                    {isEnglish ? "Retry" : "إعادة المحاولة"}
                  </button>
                </div>
              ) : (
                <div className="mt-4">
                  {renderWarnings()}
                  {renderSummaryTab()}
                </div>
              )}
            </div>
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}
