"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchJsonWithAuthorizedSession, fetchWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber, formatDate } from "@/lib/formatting";
import { translateLegacyText } from "@/lib/legacy-locale";
import { getLocaleFromPath } from "@/lib/locale-routing";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { useRuntimeBranding } from "@/hooks/brand";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { usePathname } from "next/navigation";
import { Search, RefreshCw, Download, Plus, FileText, Tags, Trash2, Edit2, X, Printer, Loader2, CalendarDays, Archive } from "@/lib/icons";
import { motion, AnimatePresence, useMotionValue, useTransform, animate as motionAnimate } from "framer-motion";
import { useArchiveMode } from "@/hooks/useArchiveMode";
import { DatePicker } from "@/components/ui/date-picker";
import { useCurrency } from "@/hooks/useCurrency";

const DEFAULT_EXPENSE_DATE = new Date().toISOString().split("T")[0];
const EXPENSES_PAGE_SIZE = 20;
const EXPENSE_EXPORT_PAGE_SIZE = 100;

type ExpenseRow = {
  id: string;
  school_id: string;
  expense_type_id: string | null;
  amount: number;
  expense_date: string;
  recipient: string | null;
  receipt_number: string | null;
  notes: string | null;
  receipt_image_url: string | null;
  created_at: string | null;
  expense_types: { name: string | null } | null;
};

type ExpenseTypeRow = {
  id: string;
  school_id: string;
  name: string;
  notes: string | null;
  usage_count: number;
  usage_total: number;
};

type ExpenseSummary = {
  schoolTotalCount: number;
  schoolTotalAmount: number;
  schoolTodayAmount: number;
  filteredTotalCount: number;
  filteredTotalAmount: number;
};

type ExpensesListResponse = {
  ok?: boolean;
  rows?: ExpenseRow[];
  summary?: ExpenseSummary;
  totalCount?: number;
  totalPages?: number;
  page?: number;
  error?: { message?: string };
};

type ExpenseTypesResponse = {
  ok?: boolean;
  rows?: ExpenseTypeRow[];
  error?: { message?: string };
};

type ExpenseMutationResponse = {
  ok?: boolean;
  expense?: ExpenseRow;
  expenseType?: ExpenseTypeRow;
  deletedExpenseId?: string;
  deletedTypeId?: string;
  error?: { message?: string };
};

const EMPTY_EXPENSE_SUMMARY: ExpenseSummary = {
  schoolTotalCount: 0,
  schoolTotalAmount: 0,
  schoolTodayAmount: 0,
  filteredTotalCount: 0,
  filteredTotalAmount: 0,
};

function getApiErrorMessage(payload: { error?: { message?: string } } | null | undefined, fallback: string) {
  return typeof payload?.error?.message === "string" && payload.error.message.trim()
    ? payload.error.message
    : fallback;
}

function buildExpensesUrl(path: string, params: Record<string, string | number | null | undefined>) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value === null || value === undefined || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });
  return `${path}?${searchParams.toString()}`;
}

function tx(value: string, locale: "ar" | "en") {
  return translateLegacyText(value, locale);
}

function formatCurrencyWithSymbol(value: number, symbol: string) {
  return `${symbol} ${formatNumber(value)}`;
}

function formatPageLabel(page: number, totalPages: number, locale: "ar" | "en") {
  return locale === "en" ? `Page ${page} of ${totalPages}` : `صفحة ${page} من ${totalPages}`;
}

function formatRecordCount(count: number, locale: "ar" | "en") {
  return locale === "en" ? `${formatNumber(count)} records` : `${formatNumber(count)} سجل`;
}

function formatUsageCount(count: number, locale: "ar" | "en") {
  return locale === "en" ? `${formatNumber(count)} uses` : `${formatNumber(count)} استخدام`;
}

function AnimatedNumber({ value }: { value: number }) {
  const motionVal = useMotionValue(0);
  const rounded = useTransform(motionVal, (v) => Math.round(v));
  const [display, setDisplay] = useState(0);
  useEffect(() => { const u = rounded.on("change", setDisplay); return u; }, [rounded]);
  useEffect(() => { const c = motionAnimate(motionVal, value, { duration: 0.7, ease: "easeOut" }); return c.stop; }, [value, motionVal]);
  return <span>{display}</span>;
}

export default function ExpensesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const isEnglish = locale === "en";
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const copy = isEnglish
    ? {
        title: "Expenses",
        subtitle: "Manage operating expense records and categories",
        schoolScopeTitle: "Expenses",
        schoolScopeDescription: "Expense records and categories will not load until a school is selected for this section.",
        noSchoolRecord: "Could not resolve the school for this record.",
        noSchoolType: "Could not resolve the school for this category.",
        loadTypesError: "Could not load expense categories.",
        loadExpensesError: "Could not load expenses.",
        saveExpenseError: "Could not save the expense.",
        saveTypeError: "Could not save the category.",
        updateExpenseSuccess: "Expense updated successfully.",
        createExpenseSuccess: "Expense added successfully.",
        updateTypeSuccess: "Category updated successfully.",
        createTypeSuccess: "Category added successfully.",
        deleteExpenseError: "Could not delete the expense.",
        deleteExpenseSuccess: "Expense deleted successfully.",
        deleteTypeError: "Could not delete the category.",
        deleteTypeSuccess: "Category deleted successfully.",
        exportSchoolMissing: "Select a school before exporting.",
        exportError: "Could not export expenses.",
        exportTypesFile: "expense_categories.xlsx",
        exportSheet: "Expenses",
        exportTypesSheet: "Expense categories",
        exportFile: `expenses_${formatDate(new Date())}.xlsx`,
        exportRows: {
          type: "Type",
          amount: "Amount",
          date: "Date",
          recipient: "Recipient",
          receipt: "Receipt number",
          note: "Notes",
        },
        exportTypeRows: {
          name: "Name",
          notes: "Notes",
          usageCount: "Usage count",
          usageTotal: "Total usage",
        },
        pageTotal: "Page total:",
        searchPlaceholder: "Quick search...",
        noExpenses: "No expenses found yet.",
        refreshLabel: "Refresh",
        invoices: "Expenses",
        categories: "Categories",
        addExpense: "Add expense",
        addCategory: "Add category",
        expenseActions: "Expense actions",
        expensesList: "Expenses list",
        categoriesList: "Expense categories",
        loading: "Loading data...",
        cancel: "Cancel",
        selectType: "Select a type...",
        notesFallback: "No notes",
        deleteExpenseTitle: "Delete expense",
        deleteExpenseDescription: "This expense record will be removed from the current list.",
        deleteTypeTitle: "Delete expense category",
        deleteTypeDescription: "This expense category will be removed from the system.",
        confirmDelete: "Yes, delete",
      }
    : {
        title: "المصروفات",
        subtitle: "إدارة فواتير المصاريف التشغيلية وأنواعها",
        schoolScopeTitle: "المصروفات",
        schoolScopeDescription: "لن يتم تحميل فواتير المصروفات أو أنواعها قبل اختيار مدرسة صريحة لهذا القسم.",
        noSchoolRecord: "لا يمكن تحديد المدرسة لهذا السجل",
        noSchoolType: "لا يمكن تحديد المدرسة لهذا النوع",
        loadTypesError: "تعذر تحميل أنواع المصروفات.",
        loadExpensesError: "تعذر تحميل المصروفات.",
        saveExpenseError: "تعذر حفظ المصروف.",
        saveTypeError: "تعذر حفظ نوع المصروف.",
        updateExpenseSuccess: "تم تحديث المصروف ✓",
        createExpenseSuccess: "تمت إضافة المصروف ✓",
        updateTypeSuccess: "تم تحديث النوع ✓",
        createTypeSuccess: "تمت إضافة النوع ✓",
        deleteExpenseError: "تعذر حذف المصروف.",
        deleteExpenseSuccess: "تم حذف المصروف ✓",
        deleteTypeError: "تعذر حذف نوع المصروف.",
        deleteTypeSuccess: "تم حذف النوع ✓",
        exportSchoolMissing: "لا يمكن تحديد المدرسة قبل التصدير",
        exportError: "تعذر تصدير المصروفات.",
        exportTypesFile: "أنواع_المصاريف.xlsx",
        exportSheet: "المصاريف",
        exportTypesSheet: "أنواع المصروفات",
        exportFile: `مصاريف_${formatDate(new Date())}.xlsx`,
        exportRows: {
          type: "نوع المصروف",
          amount: "المبلغ",
          date: "التاريخ",
          recipient: "مستلم الفاتورة",
          receipt: "رقم الإيصال",
          note: "ملاحظة",
        },
        exportTypeRows: {
          name: "الاسم",
          notes: "ملاحظات",
          usageCount: "عدد الاستخدامات",
          usageTotal: "إجمالي الاستخدام",
        },
        pageTotal: "إجمالي الصفحة:",
        searchPlaceholder: "بحث سريع...",
        noExpenses: "لا توجد مصروفات حالياً",
        refreshLabel: "تحديث",
        invoices: "المصروفات",
        categories: "الأنواع",
        addExpense: "إضافة مصروف",
        addCategory: "إضافة نوع",
        expenseActions: "إجراءات المصروفات",
        expensesList: "قائمة المصروفات",
        categoriesList: "تصنيفات المصروفات",
        loading: "جارٍ تحميل البيانات...",
        cancel: "إلغاء",
        selectType: "اختر النوع...",
        notesFallback: "لا توجد ملاحظات",
        deleteExpenseTitle: "حذف المصروف",
        deleteExpenseDescription: "سيتم حذف سجل المصروف نهائياً من القائمة الحالية.",
        deleteTypeTitle: "حذف نوع المصروف",
        deleteTypeDescription: "سيتم حذف نوع المصروف المحدد من النظام.",
        confirmDelete: "نعم، احذف",
      };
  const currency = useCurrency();
  const archiveMode = useArchiveMode();

  useEffect(() => {
    if (archiveMode.isArchiveMode && archiveMode.archiveYear) {
      setFilterFrom(`${archiveMode.archiveYear}-01-01`);
      setFilterTo(`${archiveMode.archiveYear}-12-31`);
    }
  }, [archiveMode.isArchiveMode, archiveMode.archiveYear]);

  const [activeTab, setActiveTab] = useState<"invoices"|"types">("invoices");
  const [expenses, setExpenses] = useState<ExpenseRow[]>([]);
  const [expenseTypes, setExpenseTypes] = useState<ExpenseTypeRow[]>([]);
  const [expensesLoading, setExpensesLoading] = useState(true);
  const [, setTypesLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [expenseTypeFilter, setExpenseTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split("T")[0]);
  const deferredSearch = useDeferredValue(search);
  const [expensePage, setExpensePage] = useState(1);
  const [expenseTotalCount, setExpenseTotalCount] = useState(0);
  const [expenseTotalPages, setExpenseTotalPages] = useState(1);
  const [expenseSummary, setExpenseSummary] = useState<ExpenseSummary>(EMPTY_EXPENSE_SUMMARY);

  // Expense form
  const [showExpenseForm, setShowExpenseForm] = useState(false);
  const [editExpense, setEditExpense] = useState<ExpenseRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    expense_type_id: "",
    amount: "",
    expense_date: DEFAULT_EXPENSE_DATE,
    recipient: "",
    receipt_number: "",
    notes: "",
    receipt_image_url: null as string | null,
  });

  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [receiptUploadError, setReceiptUploadError] = useState("");

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editType, setEditType] = useState<ExpenseTypeRow | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", notes: "" });
  const [pendingDelete, setPendingDelete] = useState<{ type: "expense" | "type"; id: string } | null>(null);

  // Search for types
  const [typeSearch, setTypeSearch] = useState("");

  const resolveScopedSchoolId = useCallback(async () => {
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchExpenseTypes = useCallback(
    async (explicitSchoolId?: string | null, currentBranchId?: string | null) => {
      const scopedSchoolId = explicitSchoolId ?? (await resolveScopedSchoolId());
      if (!scopedSchoolId) {
        setExpenseTypes([]);
        setTypesLoading(false);
        return;
      }

      setTypesLoading(true);
      try {
        const params: Record<string, string | number | null | undefined> = {
          schoolId: scopedSchoolId,
        };
        if (currentBranchId) {
          params.branchId = currentBranchId;
        }
        const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseTypesResponse>(
          buildExpensesUrl("/api/web/expenses/types", params),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, copy.loadTypesError));
        }

        setExpenseTypes(payload?.rows ?? []);
      } catch (fetchError) {
        setExpenseTypes([]);
        setError(fetchError instanceof Error ? fetchError.message : copy.loadTypesError);
      } finally {
        setTypesLoading(false);
      }
    },
    [copy.loadTypesError, resolveScopedSchoolId],
  );

  const fetchExpenses = useCallback(
    async (explicitSchoolId?: string | null, currentBranchId?: string | null) => {
      const scopedSchoolId = explicitSchoolId ?? (await resolveScopedSchoolId());
      if (!scopedSchoolId) {
        setExpenses([]);
        setExpenseSummary(EMPTY_EXPENSE_SUMMARY);
        setExpenseTotalCount(0);
        setExpenseTotalPages(1);
        setExpensesLoading(false);
        return;
      }

      setExpensesLoading(true);
      try {
        const params: Record<string, string | number | null | undefined> = {
          schoolId: scopedSchoolId,
          page: expensePage,
          pageSize: EXPENSES_PAGE_SIZE,
          search: deferredSearch,
          expenseTypeId: expenseTypeFilter || null,
          fromDate: filterFrom || null,
          toDate: filterTo || null,
        };
        if (currentBranchId) {
          params.branchId = currentBranchId;
        }
        const { response, payload } = await fetchJsonWithAuthorizedSession<ExpensesListResponse>(
          buildExpensesUrl("/api/web/expenses", params),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, copy.loadExpensesError));
        }

        const nextTotalPages = payload?.totalPages ?? 1;
        if (expensePage > nextTotalPages && nextTotalPages >= 1) {
          setExpensePage(nextTotalPages);
          return;
        }

        setExpenses(payload?.rows ?? []);
        setExpenseSummary(payload?.summary ?? EMPTY_EXPENSE_SUMMARY);
        setExpenseTotalCount(payload?.totalCount ?? 0);
        setExpenseTotalPages(nextTotalPages);
      } catch (fetchError) {
        setExpenses([]);
        setExpenseSummary(EMPTY_EXPENSE_SUMMARY);
        setExpenseTotalCount(0);
        setExpenseTotalPages(1);
        setError(fetchError instanceof Error ? fetchError.message : copy.loadExpensesError);
      } finally {
        setExpensesLoading(false);
      }
    },
    [copy.loadExpensesError, deferredSearch, expensePage, expenseTypeFilter, filterFrom, filterTo, resolveScopedSchoolId],
  );

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setExpenses([]);
      setExpenseTypes([]);
      setExpenseSummary(EMPTY_EXPENSE_SUMMARY);
      setExpenseTotalCount(0);
      setExpenseTotalPages(1);
      setExpensesLoading(false);
      setTypesLoading(false);
      return;
    }

    await Promise.all([
      fetchExpenseTypes(scopedSchoolId, runtimeBranding.branchId),
      fetchExpenses(scopedSchoolId, runtimeBranding.branchId),
    ]);
  }, [fetchExpenseTypes, fetchExpenses, profile, resolveScopedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchExpenseTypes(undefined, runtimeBranding.branchId);
  }, [fetchExpenseTypes, profile, schoolScope.scopeLoading, runtimeBranding.branchId]);

  useEffect(() => {
    setExpensePage(1);
  }, [deferredSearch, expenseTypeFilter, filterFrom, filterTo, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchExpenses(undefined, runtimeBranding.branchId);
  }, [fetchExpenses, expensePage, profile, schoolScope.scopeLoading, runtimeBranding.branchId]);

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    const targetSchoolId = editExpense?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError(copy.noSchoolRecord);
      setSaving(false);
      return;
    }

    const payload: Record<string, any> = {
      school_id: targetSchoolId,
      expense_type_id: form.expense_type_id,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      recipient: form.recipient || null,
      receipt_number: form.receipt_number || null,
      notes: form.notes || null,
      receipt_image_url: form.receipt_image_url ?? null,
    };
    if (runtimeBranding.branchId) {
      payload.branch_id = runtimeBranding.branchId;
    }

    const requestUrl = editExpense ? `/api/web/expenses/${editExpense.id}` : "/api/web/expenses";
    const requestMethod = editExpense ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      requestUrl,
      {
        method: requestMethod,
        headers: withJsonHeaders(),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(responsePayload, copy.saveExpenseError));
    } else {
      setSuccess(editExpense ? copy.updateExpenseSuccess : copy.createExpenseSuccess);
      setShowExpenseForm(false); setEditExpense(null);
      setForm({ expense_type_id: "", amount: "", expense_date: DEFAULT_EXPENSE_DATE, recipient: "", receipt_number: "", notes: "", receipt_image_url: null });
      const shouldResetPage = !editExpense && expensePage !== 1;
      if (shouldResetPage) {
        setExpensePage(1);
      } else {
        await fetchExpenses(targetSchoolId, runtimeBranding.branchId);
      }
      await fetchExpenseTypes(targetSchoolId, runtimeBranding.branchId);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault(); setSavingType(true); setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    const targetSchoolId = editType?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError(copy.noSchoolType);
      setSavingType(false);
      return;
    }
    const payload: Record<string, any> = { school_id: targetSchoolId, name: typeForm.name, notes: typeForm.notes || null };
    if (runtimeBranding.branchId) {
      payload.branch_id = runtimeBranding.branchId;
    }
    const requestUrl = editType ? `/api/web/expenses/types/${editType.id}` : "/api/web/expenses/types";
    const requestMethod = editType ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      requestUrl,
      {
        method: requestMethod,
        headers: withJsonHeaders(),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(responsePayload, copy.saveTypeError));
    } else {
      setSuccess(editType ? copy.updateTypeSuccess : copy.createTypeSuccess);
      setShowTypeForm(false); setEditType(null);
      setTypeForm({ name: "", notes: "" });
      await fetchExpenseTypes(targetSchoolId, runtimeBranding.branchId);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSavingType(false);
  }

  async function deleteExpense(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError(copy.noSchoolRecord);
      return;
    }

    const deleteBody: Record<string, any> = { school_id: scopedSchoolId };
    if (runtimeBranding.branchId) {
      deleteBody.branch_id = runtimeBranding.branchId;
    }
    const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      `/api/web/expenses/${id}`,
      {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify(deleteBody),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(payload, copy.deleteExpenseError));
      return;
    }

    setSuccess(copy.deleteExpenseSuccess);
    await fetchExpenses(scopedSchoolId, runtimeBranding.branchId);
    await fetchExpenseTypes(scopedSchoolId, runtimeBranding.branchId);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteType(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError(copy.noSchoolRecord);
      return;
    }

    const deleteBody: Record<string, any> = { school_id: scopedSchoolId };
    if (runtimeBranding.branchId) {
      deleteBody.branch_id = runtimeBranding.branchId;
    }
    const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      `/api/web/expenses/types/${id}`,
      {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify(deleteBody),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(payload, copy.deleteTypeError));
      return;
    }

    setSuccess(copy.deleteTypeSuccess);
    await fetchExpenseTypes(scopedSchoolId, runtimeBranding.branchId);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (target.type === "expense") {
      await deleteExpense(target.id);
      return;
    }
    await deleteType(target.id);
  }

  function openEditExpense(exp: ExpenseRow) {
    setEditExpense(exp);
    setForm({
      expense_type_id: exp.expense_type_id || "",
      amount: exp.amount?.toString() || "",
      expense_date: exp.expense_date || DEFAULT_EXPENSE_DATE,
      recipient: exp.recipient || "",
      receipt_number: exp.receipt_number || "",
      notes: exp.notes || "",
      receipt_image_url: exp.receipt_image_url ?? null,
    });
    setShowExpenseForm(true);
  }

  const handleReceiptUploadExpense = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) return;
    setUploadingReceipt(true);
    setReceiptUploadError("");
    try {
      const fd = new FormData();
      fd.append("file", file);
      fd.append("schoolId", scopedSchoolId);
      const res = await fetchWithAuthorizedSession("/api/web/receipts/upload", { method: "POST", body: fd });
      const data = await res.json().catch(() => ({})) as { url?: string; error?: { message?: string } };
      if (!res.ok) throw new Error(data?.error?.message || tx("فشل الرفع", locale));
      setForm(f => ({ ...f, receipt_image_url: data.url ?? null }));
    } catch (err) {
      setReceiptUploadError(err instanceof Error ? err.message : tx("خطأ في رفع الصورة", locale));
    } finally {
      setUploadingReceipt(false);
      e.target.value = "";
    }
  };

  function openEditType(t: ExpenseTypeRow) {
    setEditType(t);
    setTypeForm({ name: t.name, notes: t.notes || "" });
    setShowTypeForm(true);
  }

  async function exportExcel() {
    const exportRows = await collectExportRows();
    if (!exportRows) return;

    const { downloadExcelExport } = await import("@/lib/excel-client");
    await downloadExcelExport({
      filename: copy.exportFile,
      sheets: [{
        name:  copy.exportSheet,
        title: copy.exportSheet,
        columns: [
          { header: "#",                      key: "index",     width: 6 },
          { header: copy.exportRows.type,     key: "type",      width: 22 },
          { header: copy.exportRows.amount,   key: "amount",    width: 16, numFmt: "#,##0", fixedColor: "red" as const },
          { header: copy.exportRows.date,     key: "date",      width: 14 },
          { header: copy.exportRows.recipient,key: "recipient", width: 20 },
          { header: copy.exportRows.receipt,  key: "receipt",   width: 20 },
          { header: copy.exportRows.note,     key: "note",      width: 24 },
        ],
        rows: exportRows.map((item, index) => ({
          index:     index + 1,
          type:      item.expense_types?.name || "—",
          amount:    item.amount,
          date:      item.expense_date,
          recipient: item.recipient || "—",
          receipt:   item.receipt_number || "—",
          note:      item.notes || "",
        })),
      }],
    });
  }

  async function exportTypesExcel() {
    const { downloadExcelExport } = await import("@/lib/excel-client");
    await downloadExcelExport({
      filename: copy.exportTypesFile,
      sheets: [{
        name:  copy.exportTypesSheet,
        title: copy.exportTypesSheet,
        columns: [
          { header: "#",                            key: "index",       width: 6 },
          { header: copy.exportTypeRows.name,       key: "name",        width: 24 },
          { header: copy.exportTypeRows.notes,      key: "notes",       width: 26 },
          { header: copy.exportTypeRows.usageCount, key: "usageCount",  width: 16 },
          { header: copy.exportTypeRows.usageTotal, key: "usageTotal",  width: 18, numFmt: "#,##0" },
        ],
        rows: expenseTypes.map((t, i) => ({
          index:      i + 1,
          name:       t.name,
          notes:      t.notes || "",
          usageCount: t.usage_count,
          usageTotal: t.usage_total,
        })),
      }],
    });
  }

  async function collectExportRows(): Promise<ExpenseRow[] | null> {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) { setError(copy.exportSchoolMissing); return null; }
    const exportRows: ExpenseRow[] = [];
    let page = 1, totalPages = 1;
    do {
      const params: Record<string, string | number | null | undefined> = {
        schoolId: scopedSchoolId, page, pageSize: EXPENSE_EXPORT_PAGE_SIZE,
        search: deferredSearch, expenseTypeId: expenseTypeFilter || null,
        fromDate: filterFrom || null, toDate: filterTo || null,
      };
      if (runtimeBranding.branchId) params.branchId = runtimeBranding.branchId;
      const { response, payload } = await fetchJsonWithAuthorizedSession<ExpensesListResponse>(
        buildExpensesUrl("/api/web/expenses", params),
      );
      if (!response.ok) { setError(getApiErrorMessage(payload, copy.exportError)); return null; }
      exportRows.push(...(payload?.rows ?? []));
      totalPages = payload?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return exportRows;
  }

  async function exportCsv() {
    const rows = activeTab === "invoices" ? await collectExportRows() : null;
    if (activeTab === "invoices") {
      if (!rows) return;
      const { exportToCSV } = await import("@/lib/export");
      exportToCSV(rows.map((item, i) => ({
        "#": i + 1,
        [copy.exportRows.type]: item.expense_types?.name || "—",
        [copy.exportRows.amount]: item.amount,
        [copy.exportRows.date]: item.expense_date,
        [copy.exportRows.recipient]: item.recipient || "—",
        [copy.exportRows.receipt]: item.receipt_number || "—",
        [copy.exportRows.note]: item.notes || "",
      })), "expenses");
    } else {
      const { exportToCSV } = await import("@/lib/export");
      exportToCSV(expenseTypes.map((t, i) => ({
        "#": i + 1,
        [copy.exportTypeRows.name]: t.name,
        [copy.exportTypeRows.notes]: t.notes || "",
        [copy.exportTypeRows.usageCount]: t.usage_count,
        [copy.exportTypeRows.usageTotal]: t.usage_total,
      })), "expense_types");
    }
  }

  async function exportPdf() {
    const { wrapPrintDocument, printHtmlDocument } = await import("@/lib/print/branding");
    if (activeTab === "invoices") {
      const rows = await collectExportRows();
      if (!rows) return;
      const html = wrapPrintDocument({
        title: copy.exportSheet,
        subtitle: `${rows.length} ${tx("سجل", locale)}`,
        bodyHtml: `<table><thead><tr><th>#</th><th>${copy.exportRows.type}</th><th>${copy.exportRows.amount}</th><th>${copy.exportRows.date}</th><th>${copy.exportRows.recipient}</th><th>${copy.exportRows.receipt}</th></tr></thead><tbody>${rows.map((item, i) => `<tr><td>${i + 1}</td><td>${item.expense_types?.name || "—"}</td><td>${currency} ${formatNumber(item.amount || 0)}</td><td>${item.expense_date}</td><td>${item.recipient || "—"}</td><td>${item.receipt_number || "—"}</td></tr>`).join("")}</tbody></table>`,
        branding: { schoolName: runtimeBranding.schoolName, logoUrl: runtimeBranding.logoUrl, locale },
        autoPrint: true,
      });
      printHtmlDocument(html);
    } else {
      const html = wrapPrintDocument({
        title: copy.exportTypesSheet,
        subtitle: `${expenseTypes.length} ${tx("نوع", locale)}`,
        bodyHtml: `<table><thead><tr><th>#</th><th>${copy.exportTypeRows.name}</th><th>${copy.exportTypeRows.notes}</th><th>${copy.exportTypeRows.usageCount}</th><th>${copy.exportTypeRows.usageTotal}</th></tr></thead><tbody>${expenseTypes.map((t, i) => `<tr><td>${i + 1}</td><td>${t.name}</td><td>${t.notes || "—"}</td><td>${t.usage_count}</td><td>${currency} ${formatNumber(t.usage_total || 0)}</td></tr>`).join("")}</tbody></table>`,
        branding: { schoolName: runtimeBranding.schoolName, logoUrl: runtimeBranding.logoUrl, locale },
        autoPrint: true,
      });
      printHtmlDocument(html);
    }
  }

  const filteredTypes = useMemo(() => expenseTypes.filter((t) => !typeSearch || t.name.includes(typeSearch)), [expenseTypes, typeSearch]);
  const totalFiltered = expenseSummary.filteredTotalAmount;
  const totalAll = expenseSummary.schoolTotalAmount;

  const inputClasses = "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

  const statsCards = [
    { label: tx("إجمالي المصروفات", locale), sublabel: tx("مجموع كل المصروفات", locale), value: expenseSummary.schoolTotalAmount, displayValue: formatCurrencyWithSymbol(expenseSummary.schoolTotalAmount, currency), icon: FileText, color: "var(--danger)" },
    { label: tx("أنواع المصروفات", locale), sublabel: tx("تصنيفات مختلفة", locale), value: expenseTypes.length, displayValue: null, icon: Tags, color: "var(--success)" },
    { label: tx("مصاريف اليوم", locale), sublabel: tx("إجمالي اليوم الحالي", locale), value: expenseSummary.schoolTodayAmount, displayValue: formatCurrencyWithSymbol(expenseSummary.schoolTodayAmount, currency), icon: CalendarDays, color: "var(--warning)" },
  ];

  const tabs: { id: "invoices" | "types"; label: string; icon: React.ElementType; color: string }[] = [
    { id: "invoices", label: `${copy.invoices} (${expenseSummary.schoolTotalCount})`, icon: FileText, color: "var(--primary)" },
    { id: "types",    label: `${copy.categories} (${expenseTypes.length})`,           icon: Tags,     color: "var(--success)" },
  ];

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-soft)]">
        <AppSidebar currentPath="/expenses" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={copy.title}
            subtitle={copy.subtitle}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="p-4 sm:p-6 space-y-6">

              <AnimatePresence>
                {success && (
                  <motion.div key="success" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--success)]/20 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold text-sm">
                    {success}
                  </motion.div>
                )}
                {error && (
                  <motion.div key="error" initial={{ opacity: 0, y: -10, scale: 0.97 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -8, scale: 0.97 }} transition={{ duration: 0.25 }}
                    className="rounded-2xl border border-[var(--danger)]/20 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold text-sm">
                    {error}
                  </motion.div>
                )}
              </AnimatePresence>

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {archiveMode.isArchiveMode && archiveMode.archiveData && (
                <div className="rounded-2xl flex items-center gap-3 px-5 py-3.5 border border-indigo-500/30"
                  style={{ background: "linear-gradient(135deg, #1e1b4b 0%, #312e81 60%, #1e1b4b 100%)" }}>
                  <div className="w-8 h-8 rounded-xl bg-white/10 flex items-center justify-center flex-shrink-0">
                    <Archive size={15} className="text-indigo-300" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] font-black text-indigo-400 uppercase tracking-widest">وضع الأرشيف — للقراءة فقط</p>
                    <p className="text-sm font-black text-white">عرض مصروفات سنة {archiveMode.archiveData.year} · يمكنك تصدير البيانات لكن لا يمكن تعديلها</p>
                  </div>
                  <button onClick={archiveMode.exitArchiveMode}
                    className="text-[11px] font-black text-indigo-300 hover:text-white px-3 py-1.5 rounded-lg bg-white/10 hover:bg-white/20 transition flex-shrink-0">
                    خروج
                  </button>
                </div>
              )}

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-8">
                  <SchoolScopeEmptyState scope={schoolScope} title={copy.schoolScopeTitle} description={copy.schoolScopeDescription} />
                </div>
              ) : (
                <div className="space-y-6">

                  {/* Hero Banner */}
                  <div
                    className="relative rounded-2xl overflow-hidden p-6 md:p-8"
                    style={{ background: "linear-gradient(135deg, var(--primary) 0%, color-mix(in srgb, var(--primary) 60%, var(--success)) 100%)" }}
                  >
                    <div className="absolute top-0 end-0 w-72 h-72 rounded-full opacity-[0.08] pointer-events-none" style={{ background: "white", transform: "translate(35%, -40%)" }} />
                    <div className="absolute bottom-0 start-12 w-48 h-48 rounded-full opacity-[0.06] pointer-events-none" style={{ background: "white", transform: "translateY(60%)" }} />
                    <div className="relative flex items-center justify-between gap-4">
                      <div>
                        <p className="text-white/60 text-xs font-medium mb-2 tracking-widest uppercase">
                          {isEnglish ? "Administration · Expenses" : "لوحة الإدارة · المصروفات"}
                        </p>
                        <h1 className="text-2xl md:text-3xl font-black text-white mb-1.5 leading-tight">
                          {isEnglish ? "Expenses" : "المصروفات"}
                        </h1>
                        <p className="text-white/70 text-sm">
                          {isEnglish ? "Manage operating expense records and categories" : "إدارة فواتير المصاريف التشغيلية وأنواعها"}
                        </p>
                      </div>
                      <div className="hidden md:flex items-center justify-center w-20 h-20 rounded-2xl flex-shrink-0" style={{ background: "rgba(255,255,255,0.15)", backdropFilter: "blur(8px)" }}>
                        <FileText size={38} className="text-white" />
                      </div>
                    </div>
                  </div>

                  {/* Stats Cards */}
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                    {statsCards.map((card, index) => {
                      const Icon = card.icon;
                      return (
                        <motion.div
                          key={card.label}
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: index * 0.08, duration: 0.4 }}
                          className="group relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-5 overflow-hidden hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 cursor-default"
                        >
                          <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none rounded-2xl"
                            style={{ background: `radial-gradient(ellipse at top right, color-mix(in srgb, ${card.color} 8%, transparent), transparent 70%)` }} />
                          <div className="relative flex flex-col gap-3">
                            <div className="flex items-start justify-between">
                              <div className="h-10 w-10 rounded-xl flex items-center justify-center transition-transform group-hover:scale-110"
                                style={{ background: `color-mix(in srgb, ${card.color} 12%, transparent)`, color: card.color }}>
                                <Icon size={20} />
                              </div>
                              <span className="text-2xl font-black leading-none tabular-nums" style={{ color: card.color }}>
                                {card.displayValue ?? <AnimatedNumber value={card.value} />}
                              </span>
                            </div>
                            <div>
                              <div className="text-sm font-bold text-[var(--text-primary)]">{card.label}</div>
                              <div className="text-xs text-[var(--text-muted)] mt-0.5">{card.sublabel}</div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>

                  {/* Tab Bar */}
                  <div className="relative rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-1.5 flex gap-1">
                    {tabs.map((tab) => {
                      const Icon = tab.icon;
                      const isActive = activeTab === tab.id;
                      return (
                        <button
                          key={tab.id}
                          type="button"
                          onClick={() => setActiveTab(tab.id)}
                          className={cn(
                            "relative flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-xl text-sm font-semibold transition-colors duration-150 z-10",
                            isActive ? "text-white" : "text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:bg-[var(--surface-soft)]",
                          )}
                        >
                          {isActive && (
                            <motion.div layoutId="expenses-tab-pill" className="absolute inset-0 rounded-xl"
                              style={{ background: tab.color }} transition={{ type: "spring", stiffness: 400, damping: 30 }} />
                          )}
                          <span className="relative z-10 flex items-center gap-2">
                            <Icon size={15} />
                            <span className="hidden sm:inline">{tab.label}</span>
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Controls Card */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] p-4">
                    <div className="flex flex-wrap items-center justify-between gap-3">
                      {/* Filters - invoices only */}
                      {activeTab === "invoices" && (
                        <div className="flex flex-wrap items-end gap-3 flex-1">
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{tx("من تاريخ", locale)}</label>
                            <DatePicker value={filterFrom || undefined} onChange={(v) => setFilterFrom(v ?? "")} disabled={archiveMode.isArchiveMode} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{tx("إلى تاريخ", locale)}</label>
                            <DatePicker value={filterTo || undefined} onChange={(v) => setFilterTo(v ?? "")} disabled={archiveMode.isArchiveMode} />
                          </div>
                          <div className="flex flex-col gap-1">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{tx("نوع المصروف", locale)}</label>
                            <select className="h-9 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition" value={expenseTypeFilter} onChange={e => setExpenseTypeFilter(e.target.value)}>
                              <option value="">{tx("كل الأنواع", locale)}</option>
                              {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                      {activeTab === "types" && <div className="flex-1" />}

                      {/* Action buttons */}
                      <div className="flex items-center gap-2 flex-wrap flex-shrink-0">
                        <div className="flex items-center gap-0.5 p-1 rounded-2xl border border-[var(--border)]" style={{ background: "var(--surface-soft)" }}>
                          <button type="button" onClick={activeTab === "invoices" ? exportExcel : exportTypesExcel}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--success)] hover:shadow-sm">
                            <Download size={14} /><span className="hidden sm:inline">Excel</span>
                          </button>
                          <button type="button" onClick={exportCsv}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--primary)] hover:shadow-sm">
                            <Download size={14} /><span className="hidden sm:inline">CSV</span>
                          </button>
                          <button type="button" onClick={exportPdf}
                            className="inline-flex items-center gap-1.5 h-9 px-3 rounded-xl border-none text-xs font-bold text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--warning)] hover:shadow-sm">
                            <Printer size={14} /><span className="hidden sm:inline">PDF</span>
                          </button>
                          <button type="button" onClick={fetchAll}
                            className="inline-flex items-center justify-center h-9 w-9 rounded-xl border-none text-[var(--text-muted)] bg-transparent cursor-pointer transition-all hover:bg-[var(--card-bg)] hover:text-[var(--primary)] hover:shadow-sm">
                            <RefreshCw size={14} />
                          </button>
                        </div>
                        {!archiveMode.isArchiveMode && (
                          <motion.button
                            type="button"
                            whileHover={{ scale: 1.03 }} whileTap={{ scale: 0.97 }}
                            className="inline-flex items-center gap-2 h-10 px-5 rounded-xl border-none text-sm font-black text-white cursor-pointer"
                            style={{ background: activeTab === "invoices" ? "var(--primary)" : "var(--success)", boxShadow: activeTab === "invoices" ? "0 4px 18px color-mix(in srgb, var(--primary) 40%, transparent)" : "0 4px 18px color-mix(in srgb, var(--success) 40%, transparent)" }}
                            onClick={() => {
                              if (activeTab === "invoices") { setEditExpense(null); setForm({ expense_type_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], recipient: "", receipt_number: "", notes: "", receipt_image_url: null }); setShowExpenseForm(true); }
                              else { setEditType(null); setTypeForm({ name: "", notes: "" }); setShowTypeForm(true); }
                            }}
                          >
                            <Plus size={16} />
                            {activeTab === "invoices" ? copy.addExpense : copy.addCategory}
                          </motion.button>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Tab Content */}
                  <div className="rounded-2xl border border-[var(--border)] bg-[var(--card-bg)] overflow-hidden">
                    <AnimatePresence mode="wait">
                      <motion.div
                        key={activeTab}
                        initial={{ opacity: 0, y: 8 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -8 }}
                        transition={{ duration: 0.2, ease: "easeOut" }}
                        className="p-4 sm:p-6 space-y-4"
                      >
                        {/* Search bar */}
                        <div className="flex items-center justify-between gap-3">
                          <div className="relative flex-1 max-w-sm">
                            <Search size={15} className="absolute start-3 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                            <input
                              placeholder={copy.searchPlaceholder}
                              className="h-9 w-full rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] ps-9 pe-3 text-sm text-[var(--text-primary)] outline-none focus:border-[var(--primary)] transition"
                              value={activeTab === "invoices" ? search : typeSearch}
                              onChange={e => activeTab === "invoices" ? setSearch(e.target.value) : setTypeSearch(e.target.value)}
                            />
                          </div>
                          <span className="text-xs font-bold text-[var(--text-muted)]">
                            {formatRecordCount(activeTab === "invoices" ? expenseTotalCount : filteredTypes.length, locale)}
                          </span>
                        </div>

                        {/* Invoices tab */}
                        {activeTab === "invoices" && (
                          expensesLoading ? (
                            <div className="flex flex-col items-center justify-center py-20 gap-4">
                              <motion.div className="h-10 w-10 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full"
                                animate={{ rotate: 360 }} transition={{ duration: 0.9, repeat: Infinity, ease: "linear" }} />
                              <span className="text-xs font-black text-[var(--text-muted)] uppercase tracking-widest">{copy.loading}</span>
                            </div>
                          ) : expenses.length === 0 ? (
                            <div className="py-20 text-center text-[var(--text-secondary)] font-bold">{copy.noExpenses}</div>
                          ) : (
                            <>
                              <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                                <table className="w-full text-start border-collapse">
                                  <thead>
                                    <tr className="bg-[var(--surface-soft)]">
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">#</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("النوع", locale)}</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("المبلغ", locale)}</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("التاريخ", locale)}</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("المستلم", locale)}</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("الإيصال", locale)}</th>
                                      <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("الإجراءات", locale)}</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-[var(--border)]">
                                    {expenses.map((e, i) => (
                                      <tr key={e.id} className="hover:bg-[var(--surface-soft)] transition-colors">
                                        <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                          {Math.max(1, expenseTotalCount - ((expensePage - 1) * EXPENSES_PAGE_SIZE + i))}
                                        </td>
                                        <td className="p-4">
                                          <span className="px-2.5 py-1 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] text-[11px] font-black">
                                            {e.expense_types?.name || "—"}
                                          </span>
                                        </td>
                                        <td className="p-4 text-sm font-black text-[var(--danger)]">{formatCurrencyWithSymbol(e.amount, currency)}</td>
                                        <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">{formatDate(e.expense_date)}</td>
                                        <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">{e.recipient || "—"}</td>
                                        <td className="p-4 text-xs font-black text-[var(--primary)] uppercase">{e.receipt_number || "—"}</td>
                                        <td className="p-4">
                                          {!archiveMode.isArchiveMode && (
                                            <div className="flex gap-2">
                                              <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] hover:bg-[var(--primary)]/20 transition-colors" onClick={() => openEditExpense(e)}>
                                                <Edit2 size={14} />
                                              </button>
                                              <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--danger)]/10 text-[var(--danger)] hover:bg-[var(--danger)]/20 transition-colors" onClick={() => setPendingDelete({ type: "expense", id: e.id })}>
                                                <Trash2 size={14} />
                                              </button>
                                            </div>
                                          )}
                                        </td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                              {/* Pagination */}
                              <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
                                <div className="flex items-center gap-2 px-4 py-2 rounded-xl bg-[var(--danger)]/10 text-[var(--danger)]">
                                  <span className="text-xs font-black opacity-70">{copy.pageTotal}</span>
                                  <span className="text-sm font-black">{formatCurrencyWithSymbol(totalFiltered, currency)}</span>
                                </div>
                                <div className="flex items-center gap-2">
                                  <button className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black disabled:opacity-40 hover:bg-[var(--card-bg)] transition-colors" onClick={() => setExpensePage(c => Math.max(1, c - 1))} disabled={expensePage <= 1}>{tx("السابق", locale)}</button>
                                  <span className="text-xs font-bold text-[var(--text-secondary)]">{formatPageLabel(expensePage, expenseTotalPages, locale)}</span>
                                  <button className="h-9 px-4 rounded-xl border border-[var(--border)] bg-[var(--surface-soft)] text-xs font-black disabled:opacity-40 hover:bg-[var(--card-bg)] transition-colors" onClick={() => setExpensePage(c => Math.min(expenseTotalPages, c + 1))} disabled={expensePage >= expenseTotalPages}>{tx("التالي", locale)}</button>
                                </div>
                              </div>
                            </>
                          )
                        )}

                        {/* Types tab */}
                        {activeTab === "types" && (
                          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                            {filteredTypes.map((t) => (
                              <div key={t.id} className="group p-5 rounded-2xl border border-[var(--border)] bg-[var(--surface-soft)] hover:shadow-[var(--shadow-md)] hover:-translate-y-0.5 transition-all duration-200 space-y-3">
                                <div className="flex items-start justify-between">
                                  <div className="space-y-0.5">
                                    <h3 className="font-black text-[var(--text-primary)]">{t.name}</h3>
                                    <p className="text-xs text-[var(--text-muted)] line-clamp-1">{t.notes || copy.notesFallback}</p>
                                  </div>
                                  <div className="flex gap-1">
                                    {!archiveMode.isArchiveMode && (<>
                                    <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--primary)]/10 hover:text-[var(--primary)] text-[var(--text-muted)] transition-colors" onClick={() => openEditType(t)}>
                                      <Edit2 size={14} />
                                    </button>
                                    <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--danger)]/10 hover:text-[var(--danger)] text-[var(--text-muted)] transition-colors" onClick={() => setPendingDelete({ type: "type", id: t.id })}>
                                      <Trash2 size={14} />
                                    </button>
                                    </>)}
                                  </div>
                                </div>
                                <div className="flex items-center justify-between pt-3 border-t border-[var(--border)]">
                                  <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{formatUsageCount(t.usage_count, locale)}</div>
                                  <div className="text-sm font-black text-[var(--success)]">{formatCurrencyWithSymbol(t.usage_total, currency)}</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </motion.div>
                    </AnimatePresence>
                  </div>

                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODALS */}
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20" onClick={e => { if (e.target === e.currentTarget) setShowExpenseForm(false) }}>
          <div className="w-full max-w-lg bg-[var(--surface-strong)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{editExpense ? tx("تعديل المصروف", locale) : tx("إضافة مصروف جديد", locale)}</h3>
              </div>
              <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]" onClick={() => setShowExpenseForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="form-expense-type" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("نوع المصروف", locale)} *</label>
                <select id="form-expense-type" className={inputClasses} required value={form.expense_type_id} onChange={e => setForm({ ...form, expense_type_id: e.target.value })}>
                  <option value="">{copy.selectType}</option>
                  {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="form-amount" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("المبلغ (د.ع) *", locale)}</label>
                  <input id="form-amount" className={inputClasses} type="number" required placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-date" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("التاريخ", locale)} *</label>
                  <DatePicker value={form.expense_date || undefined} onChange={(v) => setForm({ ...form, expense_date: v ?? "" })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="form-recipient" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("مستلم الفاتورة", locale)}</label>
                  <input id="form-recipient" className={inputClasses} placeholder={tx("اسم المستلم...", locale)} value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-receipt" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("رقم الإيصال", locale)}</label>
                  <input id="form-receipt" className={inputClasses} placeholder={tx("رقم الإيصال...", locale)} value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("صورة الإيصال", locale)}</label>
                {form.receipt_image_url ? (
                  <div className="relative inline-block mb-1">
                    <img src={form.receipt_image_url} alt="receipt" className="h-20 rounded-xl object-cover border border-[var(--border)]" />
                    <button type="button" onClick={() => setForm(f => ({ ...f, receipt_image_url: null }))} className="absolute -top-2 -end-2 h-5 w-5 rounded-full bg-[var(--danger)] text-white text-xs flex items-center justify-center leading-none">×</button>
                  </div>
                ) : null}
                <label className="flex items-center gap-2 cursor-pointer h-10 px-3 rounded-xl border border-dashed border-[var(--border)] bg-[var(--surface-soft)] text-sm text-[var(--text-muted)] hover:border-[var(--primary)] hover:text-[var(--primary)] transition-colors w-full">
                  {uploadingReceipt ? <><Loader2 size={14} className="animate-spin" /><span>{tx("جاري الرفع...", locale)}</span></> : <span>{form.receipt_image_url ? tx("تغيير الصورة", locale) : tx("رفع صورة الإيصال", locale)}</span>}
                  <input type="file" accept="image/jpeg,image/png,image/webp" className="hidden" onChange={handleReceiptUploadExpense} disabled={uploadingReceipt} />
                </label>
                {receiptUploadError && <p className="text-xs text-[var(--danger)] mt-1">{receiptUploadError}</p>}
              </div>
              <div className="space-y-1.5">
                <label htmlFor="form-notes" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("ملاحظات إضافية", locale)}</label>
                <textarea id="form-notes" className={cn(inputClasses, "h-24 resize-none")} placeholder={tx("أي ملاحظات...", locale)} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={saving || uploadingReceipt}>
                  {saving ? tx("جارٍ الحفظ...", locale) : (editExpense ? tx("تعديل السجل", locale) : tx("إضافة السجل", locale))}
                </button>
                <button type="button" className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black" onClick={() => setShowExpenseForm(false)}>{copy.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTypeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20" onClick={e => { if (e.target === e.currentTarget) setShowTypeForm(false) }}>
          <div className="w-full max-w-md bg-[var(--surface-strong)] rounded-2xl shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                  <Tags size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{editType ? tx("تعديل النوع", locale) : tx("إضافة نوع جديد", locale)}</h3>
              </div>
              <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]" onClick={() => setShowTypeForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveType} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="form-type-name" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("اسم التصنيف *", locale)}</label>
                <input id="form-type-name" className={inputClasses} required placeholder={tx("مثال: صيانة، قرطاسية...", locale)} value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="form-type-notes" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("وصف أو ملاحظات", locale)}</label>
                <textarea id="form-type-notes" className={cn(inputClasses, "h-24 resize-none")} placeholder={tx("اختياري...", locale)} value={typeForm.notes} onChange={e => setTypeForm({ ...typeForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--success)] text-white rounded-2xl font-black shadow-lg shadow-[var(--success)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={savingType}>
                  {savingType ? tx("جارٍ الحفظ...", locale) : (editType ? tx("حفظ التغييرات", locale) : tx("إضافة نوع", locale))}
                </button>
                <button type="button" className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black" onClick={() => setShowTypeForm(false)}>{copy.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === "expense" ? copy.deleteExpenseTitle : copy.deleteTypeTitle}
        description={pendingDelete?.type === "expense" ? copy.deleteExpenseDescription : copy.deleteTypeDescription}
        confirmLabel={copy.confirmDelete}
        cancelLabel={copy.cancel}
        tone="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
  </ProtectedRoute>
);
}
