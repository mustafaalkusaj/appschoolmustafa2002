"use client";
import { useCallback, useDeferredValue, useEffect, useMemo, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
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
import { Search, RefreshCw, Download, Plus, FileText, Tags, Trash2, Edit2, X, Printer } from "@/lib/icons";

const DEFAULT_INCOME_DATE = new Date().toISOString().split("T")[0];
const INCOMES_PAGE_SIZE = 20;
const INCOME_EXPORT_PAGE_SIZE = 100;

type IncomeRow = {
  id: string;
  school_id: string;
  income_type_id: string | null;
  amount: number;
  income_date: string;
  source: string | null;
  receipt_number: string | null;
  notes: string | null;
  created_at: string | null;
  income_types: { name: string | null } | null;
};

type IncomeTypeRow = {
  id: string;
  school_id: string;
  name: string;
  notes: string | null;
  usage_count: number;
  usage_total: number;
};

type IncomeSummary = {
  schoolTotalCount: number;
  schoolTotalAmount: number;
  schoolTodayAmount: number;
  filteredTotalCount: number;
  filteredTotalAmount: number;
};

type IncomesListResponse = {
  ok?: boolean;
  rows?: IncomeRow[];
  summary?: IncomeSummary;
  totalCount?: number;
  totalPages?: number;
  page?: number;
  error?: { message?: string };
};

type IncomeTypesResponse = {
  ok?: boolean;
  rows?: IncomeTypeRow[];
  error?: { message?: string };
};

type IncomeMutationResponse = {
  ok?: boolean;
  income?: IncomeRow;
  incomeType?: IncomeTypeRow;
  deletedIncomeId?: string;
  deletedTypeId?: string;
  error?: { message?: string };
};

const EMPTY_INCOME_SUMMARY: IncomeSummary = {
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

function buildIncomesUrl(path: string, params: Record<string, string | number | null | undefined>) {
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

function formatCurrency(value: number, locale: "ar" | "en") {
  return locale === "en" ? `IQD ${formatNumber(value)}` : `د.ع ${formatNumber(value)}`;
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

export default function IncomesPage() {
  const pathname = usePathname();
  const locale = getLocaleFromPath(pathname) as "ar" | "en";
  const isEnglish = locale === "en";
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
  const runtimeBranding = useRuntimeBranding();
  const copy = isEnglish
    ? {
        title: "Incomes",
        subtitle: "Manage income records and categories",
        schoolScopeTitle: "Incomes",
        schoolScopeDescription: "Income records and categories will not load until a school is selected for this section.",
        noSchoolRecord: "Could not resolve the school for this record.",
        noSchoolType: "Could not resolve the school for this category.",
        loadTypesError: "Could not load income categories.",
        loadIncomesError: "Could not load incomes.",
        saveIncomeError: "Could not save the income.",
        saveTypeError: "Could not save the category.",
        updateIncomeSuccess: "Income updated successfully.",
        createIncomeSuccess: "Income added successfully.",
        updateTypeSuccess: "Category updated successfully.",
        createTypeSuccess: "Category added successfully.",
        deleteIncomeError: "Could not delete the income.",
        deleteIncomeSuccess: "Income deleted successfully.",
        deleteTypeError: "Could not delete the category.",
        deleteTypeSuccess: "Category deleted successfully.",
        exportSchoolMissing: "Select a school before exporting.",
        exportError: "Could not export incomes.",
        exportTypesFile: "income_categories.xlsx",
        exportSheet: "Incomes",
        exportTypesSheet: "Income categories",
        exportFile: `incomes_${formatDate(new Date())}.xlsx`,
        exportRows: {
          type: "Type",
          amount: "Amount",
          date: "Date",
          source: "Source",
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
        noIncomes: "No incomes found yet.",
        refreshLabel: "Refresh",
        invoices: "Incomes",
        categories: "Categories",
        addIncome: "Add income",
        addCategory: "Add category",
        incomeActions: "Income actions",
        incomesList: "Incomes list",
        categoriesList: "Income categories",
        loading: "Loading data...",
        cancel: "Cancel",
        selectType: "Select a type...",
        notesFallback: "No notes",
        deleteIncomeTitle: "Delete income",
        deleteIncomeDescription: "This income record will be removed from the current list.",
        deleteTypeTitle: "Delete income category",
        deleteTypeDescription: "This income category will be removed from the system.",
        confirmDelete: "Yes, delete",
      }
    : {
        title: "الإيرادات",
        subtitle: "إدارة سجلات الإيرادات وأنواعها",
        schoolScopeTitle: "الإيرادات",
        schoolScopeDescription: "لن يتم تحميل سجلات الإيرادات أو أنواعها قبل اختيار مدرسة صريحة لهذا القسم.",
        noSchoolRecord: "لا يمكن تحديد المدرسة لهذا السجل",
        noSchoolType: "لا يمكن تحديد المدرسة لهذا النوع",
        loadTypesError: "تعذر تحميل أنواع الإيرادات.",
        loadIncomesError: "تعذر تحميل الإيرادات.",
        saveIncomeError: "تعذر حفظ الإيراد.",
        saveTypeError: "تعذر حفظ نوع الإيراد.",
        updateIncomeSuccess: "تم تحديث الإيراد ✓",
        createIncomeSuccess: "تمت إضافة الإيراد ✓",
        updateTypeSuccess: "تم تحديث النوع ✓",
        createTypeSuccess: "تمت إضافة النوع ✓",
        deleteIncomeError: "تعذر حذف الإيراد.",
        deleteIncomeSuccess: "تم حذف الإيراد ✓",
        deleteTypeError: "تعذر حذف نوع الإيراد.",
        deleteTypeSuccess: "تم حذف النوع ✓",
        exportSchoolMissing: "لا يمكن تحديد المدرسة قبل التصدير",
        exportError: "تعذر تصدير الإيرادات.",
        exportTypesFile: "أنواع_الإيرادات.xlsx",
        exportSheet: "الإيرادات",
        exportTypesSheet: "أنواع الإيرادات",
        exportFile: `إيرادات_${formatDate(new Date())}.xlsx`,
        exportRows: {
          type: "نوع الإيراد",
          amount: "المبلغ",
          date: "التاريخ",
          source: "المصدر",
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
        noIncomes: "لا توجد إيرادات حالياً",
        refreshLabel: "تحديث",
        invoices: "الإيرادات",
        categories: "الأنواع",
        addIncome: "إضافة إيراد",
        addCategory: "إضافة نوع",
        incomeActions: "إجراءات الإيرادات",
        incomesList: "قائمة الإيرادات",
        categoriesList: "تصنيفات الإيرادات",
        loading: "جارٍ تحميل البيانات...",
        cancel: "إلغاء",
        selectType: "اختر النوع...",
        notesFallback: "لا توجد ملاحظات",
        deleteIncomeTitle: "حذف الإيراد",
        deleteIncomeDescription: "سيتم حذف سجل الإيراد نهائياً من القائمة الحالية.",
        deleteTypeTitle: "حذف نوع الإيراد",
        deleteTypeDescription: "سيتم حذف نوع الإيراد المحدد من النظام.",
        confirmDelete: "نعم، احذف",
      };
  const [activeTab, setActiveTab] = useState<"invoices"|"types">("invoices");
  const [incomes, setIncomes] = useState<IncomeRow[]>([]);
  const [incomeTypes, setIncomeTypes] = useState<IncomeTypeRow[]>([]);
  const [incomesLoading, setIncomesLoading] = useState(true);
  const [, setTypesLoading] = useState(true);
  const [success, setSuccess] = useState("");
  const [error, setError] = useState("");

  // Filters
  const [incomeTypeFilter, setIncomeTypeFilter] = useState("");
  const [search, setSearch] = useState("");
  const [filterFrom, setFilterFrom] = useState(() => {
    const d = new Date(); d.setDate(1);
    return d.toISOString().split("T")[0];
  });
  const [filterTo, setFilterTo] = useState(() => new Date().toISOString().split("T")[0]);
  const deferredSearch = useDeferredValue(search);
  const [incomePage, setIncomePage] = useState(1);
  const [incomeTotalCount, setIncomeTotalCount] = useState(0);
  const [incomeTotalPages, setIncomeTotalPages] = useState(1);
  const [incomeSummary, setIncomeSummary] = useState<IncomeSummary>(EMPTY_INCOME_SUMMARY);

  // Income form
  const [showIncomeForm, setShowIncomeForm] = useState(false);
  const [editIncome, setEditIncome] = useState<IncomeRow | null>(null);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({
    income_type_id: "",
    amount: "",
    income_date: DEFAULT_INCOME_DATE,
    source: "",
    receipt_number: "",
    notes: "",
  });

  // Type form
  const [showTypeForm, setShowTypeForm] = useState(false);
  const [editType, setEditType] = useState<IncomeTypeRow | null>(null);
  const [savingType, setSavingType] = useState(false);
  const [typeForm, setTypeForm] = useState({ name: "", notes: "" });
  const [pendingDelete, setPendingDelete] = useState<{ type: "income" | "type"; id: string } | null>(null);

  // Search for types
  const [typeSearch, setTypeSearch] = useState("");

  const resolveScopedSchoolId = useCallback(async () => {
    return resolveSchoolIdForProfile(profile, { selectedSchoolId: schoolScope.selectedSchoolId });
  }, [profile, schoolScope.selectedSchoolId]);

  const fetchIncomeTypes = useCallback(
    async (explicitSchoolId?: string | null, currentBranchId?: string | null) => {
      const scopedSchoolId = explicitSchoolId ?? (await resolveScopedSchoolId());
      if (!scopedSchoolId) {
        setIncomeTypes([]);
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
        const { response, payload } = await fetchJsonWithAuthorizedSession<IncomeTypesResponse>(
          buildIncomesUrl("/api/web/incomes/types", params),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, copy.loadTypesError));
        }

        setIncomeTypes(payload?.rows ?? []);
      } catch (fetchError) {
        setIncomeTypes([]);
        setError(fetchError instanceof Error ? fetchError.message : copy.loadTypesError);
      } finally {
        setTypesLoading(false);
      }
    },
    [copy.loadTypesError, resolveScopedSchoolId],
  );

  const fetchIncomes = useCallback(
    async (explicitSchoolId?: string | null, currentBranchId?: string | null) => {
      const scopedSchoolId = explicitSchoolId ?? (await resolveScopedSchoolId());
      if (!scopedSchoolId) {
        setIncomes([]);
        setIncomeSummary(EMPTY_INCOME_SUMMARY);
        setIncomeTotalCount(0);
        setIncomeTotalPages(1);
        setIncomesLoading(false);
        return;
      }

      setIncomesLoading(true);
      try {
        const params: Record<string, string | number | null | undefined> = {
          schoolId: scopedSchoolId,
          page: incomePage,
          pageSize: INCOMES_PAGE_SIZE,
          search: deferredSearch,
          incomeTypeId: incomeTypeFilter || null,
          fromDate: filterFrom || null,
          toDate: filterTo || null,
        };
        if (currentBranchId) {
          params.branchId = currentBranchId;
        }
        const { response, payload } = await fetchJsonWithAuthorizedSession<IncomesListResponse>(
          buildIncomesUrl("/api/web/incomes", params),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, copy.loadIncomesError));
        }

        const nextTotalPages = payload?.totalPages ?? 1;
        if (incomePage > nextTotalPages && nextTotalPages >= 1) {
          setIncomePage(nextTotalPages);
          return;
        }

        setIncomes(payload?.rows ?? []);
        setIncomeSummary(payload?.summary ?? EMPTY_INCOME_SUMMARY);
        setIncomeTotalCount(payload?.totalCount ?? 0);
        setIncomeTotalPages(nextTotalPages);
      } catch (fetchError) {
        setIncomes([]);
        setIncomeSummary(EMPTY_INCOME_SUMMARY);
        setIncomeTotalCount(0);
        setIncomeTotalPages(1);
        setError(fetchError instanceof Error ? fetchError.message : copy.loadIncomesError);
      } finally {
        setIncomesLoading(false);
      }
    },
    [copy.loadIncomesError, deferredSearch, incomePage, incomeTypeFilter, filterFrom, filterTo, resolveScopedSchoolId],
  );

  const fetchAll = useCallback(async () => {
    if (!profile) return;
    setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setIncomes([]);
      setIncomeTypes([]);
      setIncomeSummary(EMPTY_INCOME_SUMMARY);
      setIncomeTotalCount(0);
      setIncomeTotalPages(1);
      setIncomesLoading(false);
      setTypesLoading(false);
      return;
    }

    await Promise.all([
      fetchIncomeTypes(scopedSchoolId, runtimeBranding.branchId),
      fetchIncomes(scopedSchoolId, runtimeBranding.branchId),
    ]);
  }, [fetchIncomeTypes, fetchIncomes, profile, resolveScopedSchoolId, runtimeBranding.branchId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchIncomeTypes(undefined, runtimeBranding.branchId);
  }, [fetchIncomeTypes, profile, schoolScope.scopeLoading, runtimeBranding.branchId]);

  useEffect(() => {
    setIncomePage(1);
  }, [deferredSearch, incomeTypeFilter, filterFrom, filterTo, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchIncomes(undefined, runtimeBranding.branchId);
  }, [fetchIncomes, incomePage, profile, schoolScope.scopeLoading, runtimeBranding.branchId]);

  async function handleSaveIncome(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    const targetSchoolId = editIncome?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError(copy.noSchoolRecord);
      setSaving(false);
      return;
    }

    const payload: Record<string, any> = {
      school_id: targetSchoolId,
      income_type_id: form.income_type_id,
      amount: Number(form.amount),
      income_date: form.income_date,
      source: form.source || null,
      receipt_number: form.receipt_number || null,
      notes: form.notes || null,
    };
    if (runtimeBranding.branchId) {
      payload.branch_id = runtimeBranding.branchId;
    }

    const requestUrl = editIncome ? `/api/web/incomes/${editIncome.id}` : "/api/web/incomes";
    const requestMethod = editIncome ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<IncomeMutationResponse>(
      requestUrl,
      {
        method: requestMethod,
        headers: withJsonHeaders(),
        body: JSON.stringify(payload),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(responsePayload, copy.saveIncomeError));
    } else {
      setSuccess(editIncome ? copy.updateIncomeSuccess : copy.createIncomeSuccess);
      setShowIncomeForm(false); setEditIncome(null);
      setForm({ income_type_id: "", amount: "", income_date: DEFAULT_INCOME_DATE, source: "", receipt_number: "", notes: "" });
      const shouldResetPage = !editIncome && incomePage !== 1;
      if (shouldResetPage) {
        setIncomePage(1);
      } else {
        await fetchIncomes(targetSchoolId, runtimeBranding.branchId);
      }
      await fetchIncomeTypes(targetSchoolId, runtimeBranding.branchId);
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
    const requestUrl = editType ? `/api/web/incomes/types/${editType.id}` : "/api/web/incomes/types";
    const requestMethod = editType ? "PATCH" : "POST";
    const { response, payload: responsePayload } = await fetchJsonWithAuthorizedSession<IncomeMutationResponse>(
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
      await fetchIncomeTypes(targetSchoolId, runtimeBranding.branchId);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSavingType(false);
  }

  async function deleteIncome(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError(copy.noSchoolRecord);
      return;
    }

    const deleteBody: Record<string, any> = { school_id: scopedSchoolId };
    if (runtimeBranding.branchId) {
      deleteBody.branch_id = runtimeBranding.branchId;
    }
    const { response, payload } = await fetchJsonWithAuthorizedSession<IncomeMutationResponse>(
      `/api/web/incomes/${id}`,
      {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify(deleteBody),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(payload, copy.deleteIncomeError));
      return;
    }

    setSuccess(copy.deleteIncomeSuccess);
    await fetchIncomes(scopedSchoolId, runtimeBranding.branchId);
    await fetchIncomeTypes(scopedSchoolId, runtimeBranding.branchId);
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
    const { response, payload } = await fetchJsonWithAuthorizedSession<IncomeMutationResponse>(
      `/api/web/incomes/types/${id}`,
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
    await fetchIncomeTypes(scopedSchoolId, runtimeBranding.branchId);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function handleConfirmDelete() {
    if (!pendingDelete) return;
    const target = pendingDelete;
    setPendingDelete(null);
    if (target.type === "income") {
      await deleteIncome(target.id);
      return;
    }
    await deleteType(target.id);
  }

  function openEditIncome(inc: IncomeRow) {
    setEditIncome(inc);
    setForm({
      income_type_id: inc.income_type_id || "",
      amount: inc.amount?.toString() || "",
      income_date: inc.income_date || DEFAULT_INCOME_DATE,
      source: inc.source || "",
      receipt_number: inc.receipt_number || "",
      notes: inc.notes || "",
    });
    setShowIncomeForm(true);
  }

  function openEditType(t: IncomeTypeRow) {
    setEditType(t);
    setTypeForm({ name: t.name, notes: t.notes || "" });
    setShowTypeForm(true);
  }

  async function collectExportRows(): Promise<IncomeRow[] | null> {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) { setError(copy.exportSchoolMissing); return null; }
    const exportRows: IncomeRow[] = [];
    let page = 1, totalPages = 1;
    do {
      const params: Record<string, string | number | null | undefined> = {
        schoolId: scopedSchoolId, page, pageSize: INCOME_EXPORT_PAGE_SIZE,
        search: deferredSearch, incomeTypeId: incomeTypeFilter || null,
        fromDate: filterFrom || null, toDate: filterTo || null,
      };
      if (runtimeBranding.branchId) params.branchId = runtimeBranding.branchId;
      const { response, payload } = await fetchJsonWithAuthorizedSession<IncomesListResponse>(
        buildIncomesUrl("/api/web/incomes", params),
      );
      if (!response.ok) { setError(getApiErrorMessage(payload, copy.exportError)); return null; }
      exportRows.push(...(payload?.rows ?? []));
      totalPages = payload?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);
    return exportRows;
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
          { header: copy.exportRows.amount,   key: "amount",    width: 16, numFmt: "#,##0", fixedColor: "green" as const },
          { header: copy.exportRows.date,     key: "date",      width: 14 },
          { header: copy.exportRows.source,   key: "source",    width: 20 },
          { header: copy.exportRows.receipt,  key: "receipt",   width: 20 },
          { header: copy.exportRows.note,     key: "note",      width: 24 },
        ],
        rows: exportRows.map((item, index) => ({
          index:     index + 1,
          type:      item.income_types?.name || "—",
          amount:    item.amount,
          date:      item.income_date,
          source:    item.source || "—",
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
        rows: incomeTypes.map((t, i) => ({
          index:      i + 1,
          name:       t.name,
          notes:      t.notes || "",
          usageCount: t.usage_count,
          usageTotal: t.usage_total,
        })),
      }],
    });
  }

  async function exportCsv() {
    const rows = activeTab === "invoices" ? await collectExportRows() : null;
    if (activeTab === "invoices") {
      if (!rows) return;
      const { exportToCSV } = await import("@/lib/export");
      exportToCSV(rows.map((item, i) => ({
        "#": i + 1,
        [copy.exportRows.type]: item.income_types?.name || "—",
        [copy.exportRows.amount]: item.amount,
        [copy.exportRows.date]: item.income_date,
        [copy.exportRows.source]: item.source || "—",
        [copy.exportRows.receipt]: item.receipt_number || "—",
        [copy.exportRows.note]: item.notes || "",
      })), "incomes");
    } else {
      const { exportToCSV } = await import("@/lib/export");
      exportToCSV(incomeTypes.map((t, i) => ({
        "#": i + 1,
        [copy.exportTypeRows.name]: t.name,
        [copy.exportTypeRows.notes]: t.notes || "",
        [copy.exportTypeRows.usageCount]: t.usage_count,
        [copy.exportTypeRows.usageTotal]: t.usage_total,
      })), "income_types");
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
        bodyHtml: `<table><thead><tr><th>#</th><th>${copy.exportRows.type}</th><th>${copy.exportRows.amount}</th><th>${copy.exportRows.date}</th><th>${copy.exportRows.source}</th><th>${copy.exportRows.receipt}</th></tr></thead><tbody>${rows.map((item, i) => `<tr><td>${i + 1}</td><td>${item.income_types?.name || "—"}</td><td>${formatNumber(item.amount || 0)} IQD</td><td>${item.income_date}</td><td>${item.source || "—"}</td><td>${item.receipt_number || "—"}</td></tr>`).join("")}</tbody></table>`,
        branding: { schoolName: runtimeBranding.schoolName, logoUrl: runtimeBranding.logoUrl, locale },
        autoPrint: true,
      });
      printHtmlDocument(html);
    } else {
      const html = wrapPrintDocument({
        title: copy.exportTypesSheet,
        subtitle: `${incomeTypes.length} ${tx("نوع", locale)}`,
        bodyHtml: `<table><thead><tr><th>#</th><th>${copy.exportTypeRows.name}</th><th>${copy.exportTypeRows.notes}</th><th>${copy.exportTypeRows.usageCount}</th><th>${copy.exportTypeRows.usageTotal}</th></tr></thead><tbody>${incomeTypes.map((t, i) => `<tr><td>${i + 1}</td><td>${t.name}</td><td>${t.notes || "—"}</td><td>${t.usage_count}</td><td>${formatNumber(t.usage_total || 0)} IQD</td></tr>`).join("")}</tbody></table>`,
        branding: { schoolName: runtimeBranding.schoolName, logoUrl: runtimeBranding.logoUrl, locale },
        autoPrint: true,
      });
      printHtmlDocument(html);
    }
  }

  const filteredTypes = useMemo(() => incomeTypes.filter((t) => !typeSearch || t.name.includes(typeSearch)), [incomeTypes, typeSearch]);
  const totalFiltered = incomeSummary.filteredTotalAmount;
  const totalAll = incomeSummary.schoolTotalAmount;

  const inputClasses = "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/incomes" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar
            title={copy.title}
            subtitle={copy.subtitle}
            scope={schoolScope}
            fixed
          />

          <main className="app-shell-frame--with-fixed-topbar flex-1 overflow-y-auto custom-scrollbar">
            <div className="max-w-[1600px] mx-auto p-4 sm:p-6 lg:p-8 space-y-8">
              {success && (
                <div className="rounded-2xl border border-[var(--success)]/30 bg-[var(--success)]/10 p-4 text-[var(--success)] font-bold">
                  {success}
                </div>
              )}
              {error && (
                <div className="rounded-2xl border border-[var(--danger)]/30 bg-[var(--danger)]/10 p-4 text-[var(--danger)] font-bold">
                  {error}
                </div>
              )}

              <SchoolScopeBanner scope={schoolScope} showSelector={false} />

              {schoolScope.shouldBlockContent ? (
                <div className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                  <SchoolScopeEmptyState
                    scope={schoolScope}
                    title={copy.schoolScopeTitle}
                    description={copy.schoolScopeDescription}
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Hero Stats */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                      {[
                      { label: tx("إجمالي الإيرادات", locale), value: formatCurrency(totalAll, locale), icon: FileText, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
                      { label: tx("عدد السجلات", locale), value: formatNumber(incomeSummary.schoolTotalCount), icon: Search, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10" },
                      { label: tx("أنواع الإيرادات", locale), value: formatNumber(incomeTypes.length), icon: Tags, color: "text-[var(--info)]", bg: "bg-[var(--info)]/10" },
                      { label: tx("إيرادات اليوم", locale), value: formatCurrency(incomeSummary.schoolTodayAmount, locale), icon: RefreshCw, color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
                    ].map((card, i) => (
                      <div key={i} className="rounded-[24px] border border-[var(--border)] bg-[var(--surface-strong)] p-5 shadow-sm flex items-center gap-4">
                        <div className={cn("h-12 w-12 rounded-2xl flex items-center justify-center", card.bg, card.color)}>
                          <card.icon size={22} />
                        </div>
                        <div>
                          <div className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)]">{card.label}</div>
                          <div className="text-base font-black text-[var(--text-primary)] mt-0.5">{card.value}</div>
                        </div>
                      </div>
                    ))}
                  </div>

                  {/* Actions & Filters */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="flex flex-col gap-8">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <div className="h-8 w-8 rounded-lg bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                            <Plus size={18} />
                          </div>
                          <h2 className="text-lg font-black text-[var(--text-primary)]">{copy.incomeActions}</h2>
                        </div>
                        <div className="flex gap-2">
                          <button
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-xs font-black transition-all hover:bg-[var(--success)]/20"
                            onClick={activeTab === "invoices" ? exportExcel : exportTypesExcel}
                          >
                            <Download size={16} />
                            Excel
                          </button>
                          <button
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--info)]/10 text-[var(--info)] text-xs font-black transition-all hover:bg-[var(--info)]/20"
                            onClick={exportCsv}
                          >
                            <Download size={16} />
                            CSV
                          </button>
                          <button
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--warning)]/10 text-[var(--warning)] text-xs font-black transition-all hover:bg-[var(--warning)]/20"
                            onClick={exportPdf}
                          >
                            <Printer size={16} />
                            PDF
                          </button>
                          <button
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => {
                              if (activeTab === "invoices") { setEditIncome(null); setForm({ income_type_id: "", amount: "", income_date: new Date().toISOString().split("T")[0], source: "", receipt_number: "", notes: "" }); setShowIncomeForm(true); }
                              else { setEditType(null); setTypeForm({ name: "", notes: "" }); setShowTypeForm(true); }
                            }}
                          >
                            <Plus size={16} />
                            {activeTab === "invoices" ? copy.addIncome : copy.addCategory}
                          </button>
                        </div>
                      </div>

                      {activeTab === "invoices" && (
                        <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                          <div className="space-y-1.5">
                            <label htmlFor="filter-from" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("من تاريخ", locale)}</label>
                            <input id="filter-from" type="date" className={inputClasses} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="filter-to" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("إلى تاريخ", locale)}</label>
                            <input id="filter-to" type="date" className={inputClasses} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label htmlFor="income-type-filter" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("نوع الإيراد", locale)}</label>
                            <select id="income-type-filter" className={inputClasses} value={incomeTypeFilter} onChange={e => setIncomeTypeFilter(e.target.value)}>
                              <option value="">{tx("كل الأنواع", locale)}</option>
                              {incomeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                            </select>
                          </div>
                        </div>
                      )}
                    </div>
                  </section>

                  {/* Tabs */}
                  <div className="flex p-1 w-fit rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                    <button
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all",
                        activeTab === "invoices" ? "bg-[var(--surface-strong)] shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      )}
                      onClick={() => setActiveTab("invoices")}
                    >
                      <FileText size={14} />
                      {copy.invoices}
                      <span className="ms-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[10px]">{incomeSummary.schoolTotalCount}</span>
                    </button>
                    <button
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all",
                        activeTab === "types" ? "bg-[var(--surface-strong)] shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      )}
                      onClick={() => setActiveTab("types")}
                    >
                      <Tags size={14} />
                      {copy.categories}
                      <span className="ms-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[10px]">{incomeTypes.length}</span>
                    </button>
                  </div>

                  {/* Table Section */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider">{formatRecordCount(activeTab === "invoices" ? incomeTotalCount : filteredTypes.length, locale)}</span>
                          <h2 className="text-xl font-black text-[var(--text-primary)]">{activeTab === "invoices" ? copy.incomesList : copy.categoriesList}</h2>
                        </div>
                        <button aria-label={copy.refreshLabel} title={copy.refreshLabel} className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)] transition-all hover:bg-[var(--border)]" onClick={fetchAll}>
                          <RefreshCw size={18} />
                        </button>
                      </div>

                      <div className="relative">
                        <Search size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input
                          placeholder={copy.searchPlaceholder}
                          className={cn(inputClasses, "ps-11")}
                          value={activeTab === "invoices" ? search : typeSearch}
                          onChange={e => activeTab === "invoices" ? setSearch(e.target.value) : setTypeSearch(e.target.value)}
                        />
                      </div>

                      {incomesLoading && activeTab === "invoices" ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                          <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">{copy.loading}</span>
                        </div>
                      ) : activeTab === "invoices" && incomes.length === 0 ? (
                        <div className="py-20 text-center text-[var(--text-secondary)] font-bold">{copy.noIncomes}</div>
                      ) : activeTab === "invoices" ? (
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">#</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("النوع", locale)}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("المبلغ", locale)}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("التاريخ", locale)}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("المصدر", locale)}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("الإيصال", locale)}</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">{tx("الإجراءات", locale)}</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {incomes.map((e, i) => (
                                <tr key={e.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {Math.max(1, incomeTotalCount - ((incomePage - 1) * INCOMES_PAGE_SIZE + i))}
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-[var(--info)]/10 text-[var(--info)] text-[11px] font-black">
                                      {e.income_types?.name || "—"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-sm font-black text-[var(--success)]">
                                    {formatCurrency(e.amount, locale)}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {formatDate(e.income_date)}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {e.source || "—"}
                                  </td>
                                  <td className="p-4 text-xs font-black text-[var(--primary)] uppercase">
                                    {e.receipt_number || "—"}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--info)]/10 text-[var(--info)]" onClick={() => openEditIncome(e)}>
                                        <Edit2 size={14} />
                                      </button>
                                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]" onClick={() => setPendingDelete({ type: "income", id: e.id })}>
                                        <Trash2 size={14} />
                                      </button>
                                    </div>
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : null}

                      {/* Pagination or Footer Summary */}
                      {activeTab === "invoices" && incomes.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--success)]/10 text-[var(--success)]">
                            <span className="text-xs font-black uppercase tracking-wider opacity-70">{copy.pageTotal}</span>
                            <span className="text-sm font-black">{formatCurrency(totalFiltered, locale)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="h-10 px-4 rounded-xl bg-[var(--surface-muted)] text-xs font-black disabled:opacity-40" onClick={() => setIncomePage((current) => Math.max(1, current - 1))} disabled={incomePage <= 1}>{tx("السابق", locale)}</button>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">{formatPageLabel(incomePage, incomeTotalPages, locale)}</span>
                            <button className="h-10 px-4 rounded-xl bg-[var(--surface-muted)] text-xs font-black disabled:opacity-40" onClick={() => setIncomePage((current) => Math.min(incomeTotalPages, current + 1))} disabled={incomePage >= incomeTotalPages}>{tx("التالي", locale)}</button>
                          </div>
                        </div>
                      )}

                      {activeTab === "types" && (
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                          {filteredTypes.map((t) => (
                            <div key={t.id} className="p-5 rounded-[24px] border border-[var(--border)] bg-[var(--surface-muted)] space-y-4">
                              <div className="flex items-start justify-between">
                                <div className="space-y-1">
                                  <h3 className="font-black text-[var(--text-primary)]">{t.name}</h3>
                                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{t.notes || copy.notesFallback}</p>
                                </div>
                                <div className="flex gap-1">
                                  <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--border)] transition-colors" onClick={() => openEditType(t)}>
                                    <Edit2 size={14} className="text-[var(--info)]" />
                                  </button>
                                  <button className="h-8 w-8 flex items-center justify-center rounded-lg hover:bg-[var(--danger)]/10 transition-colors" onClick={() => setPendingDelete({ type: "type", id: t.id })}>
                                    <Trash2 size={14} className="text-[var(--danger)]" />
                                  </button>
                                </div>
                              </div>
                              <div className="flex items-center justify-between pt-4 border-t border-[var(--border)]">
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{formatUsageCount(t.usage_count, locale)}</div>
                                <div className="text-sm font-black text-[var(--success)]">{formatCurrency(t.usage_total, locale)}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </section>
                </div>
              )}
            </div>
          </main>
        </div>
      </div>

      {/* MODALS */}
      {showIncomeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20" onClick={e => { if (e.target === e.currentTarget) setShowIncomeForm(false) }}>
          <div className="w-full max-w-lg bg-[var(--surface-strong)] rounded-[32px] shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{editIncome ? tx("تعديل الإيراد", locale) : tx("إضافة إيراد جديد", locale)}</h3>
              </div>
              <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]" onClick={() => setShowIncomeForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveIncome} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label htmlFor="form-income-type" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("نوع الإيراد", locale)} *</label>
                <select id="form-income-type" className={inputClasses} required value={form.income_type_id} onChange={e => setForm({ ...form, income_type_id: e.target.value })}>
                  <option value="">{copy.selectType}</option>
                  {incomeTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="form-amount" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("المبلغ (د.ع) *", locale)}</label>
                  <input id="form-amount" className={inputClasses} type="number" required placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-date" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("التاريخ", locale)} *</label>
                  <input id="form-date" className={inputClasses} type="date" required value={form.income_date} onChange={e => setForm({ ...form, income_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label htmlFor="form-source" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("المصدر", locale)}</label>
                  <input id="form-source" className={inputClasses} placeholder={tx("مصدر الإيراد...", locale)} value={form.source} onChange={e => setForm({ ...form, source: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label htmlFor="form-receipt" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("رقم الإيصال", locale)}</label>
                  <input id="form-receipt" className={inputClasses} placeholder={tx("رقم الإيصال...", locale)} value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label htmlFor="form-notes" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("ملاحظات إضافية", locale)}</label>
                <textarea id="form-notes" className={cn(inputClasses, "h-24 resize-none")} placeholder={tx("أي ملاحظات...", locale)} value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={saving}>
                  {saving ? tx("جارٍ الحفظ...", locale) : (editIncome ? tx("تعديل السجل", locale) : tx("إضافة السجل", locale))}
                </button>
                <button type="button" className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black" onClick={() => setShowIncomeForm(false)}>{copy.cancel}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showTypeForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20" onClick={e => { if (e.target === e.currentTarget) setShowTypeForm(false) }}>
          <div className="w-full max-w-md bg-[var(--surface-strong)] rounded-[32px] shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
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
                <input id="form-type-name" className={inputClasses} required placeholder={tx("مثال: كافتيريا، نقل، تبرعات...", locale)} value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label htmlFor="form-type-notes" className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">{tx("وصف أو ملاحظات", locale)}</label>
                <textarea id="form-type-notes" className={cn(inputClasses, "h-24 resize-none")} placeholder={tx("اختياري...", locale)} value={typeForm.notes} onChange={e => setTypeForm({ ...typeForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={savingType}>
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
        title={pendingDelete?.type === "income" ? copy.deleteIncomeTitle : copy.deleteTypeTitle}
        description={pendingDelete?.type === "income" ? copy.deleteIncomeDescription : copy.deleteTypeDescription}
        confirmLabel={copy.confirmDelete}
        cancelLabel={copy.cancel}
        tone="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
  </ProtectedRoute>
);
}
