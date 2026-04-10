"use client";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppSidebar } from "@/components/AppSidebar";
import { AppShellTopbar } from "@/components/AppShellTopbar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school/context";
import { cn } from "@/lib/brand/brand-utils";
import { Search, RefreshCw, Download, Plus, FileText, Tags, Trash2, Edit2, X } from "@/lib/icons";

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

export default function ExpensesPage() {
  const { profile } = useRole();
  const schoolScope = useSchoolScope(profile);
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
  const [filterFrom, setFilterFrom] = useState("");
  const [filterTo, setFilterTo] = useState("");
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
  });

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
    async (explicitSchoolId?: string | null) => {
      const scopedSchoolId = explicitSchoolId ?? (await resolveScopedSchoolId());
      if (!scopedSchoolId) {
        setExpenseTypes([]);
        setTypesLoading(false);
        return;
      }

      setTypesLoading(true);
      try {
        const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseTypesResponse>(
          buildExpensesUrl("/api/web/expenses/types", {
            schoolId: scopedSchoolId,
          }),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "تعذر تحميل أنواع المصروفات."));
        }

        setExpenseTypes(payload?.rows ?? []);
      } catch (fetchError) {
        setExpenseTypes([]);
        setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل أنواع المصروفات.");
      } finally {
        setTypesLoading(false);
      }
    },
    [resolveScopedSchoolId],
  );

  const fetchExpenses = useCallback(
    async (explicitSchoolId?: string | null) => {
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
        const { response, payload } = await fetchJsonWithAuthorizedSession<ExpensesListResponse>(
          buildExpensesUrl("/api/web/expenses", {
            schoolId: scopedSchoolId,
            page: expensePage,
            pageSize: EXPENSES_PAGE_SIZE,
            search: deferredSearch,
            expenseTypeId: expenseTypeFilter || null,
            fromDate: filterFrom || null,
            toDate: filterTo || null,
          }),
        );

        if (!response.ok) {
          throw new Error(getApiErrorMessage(payload, "تعذر تحميل المصروفات."));
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
        setError(fetchError instanceof Error ? fetchError.message : "تعذر تحميل المصروفات.");
      } finally {
        setExpensesLoading(false);
      }
    },
    [deferredSearch, expensePage, expenseTypeFilter, filterFrom, filterTo, resolveScopedSchoolId],
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

    await Promise.all([fetchExpenseTypes(scopedSchoolId), fetchExpenses(scopedSchoolId)]);
  }, [fetchExpenseTypes, fetchExpenses, profile, resolveScopedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchExpenseTypes();
  }, [fetchExpenseTypes, profile, schoolScope.scopeLoading]);

  useEffect(() => {
    setExpensePage(1);
  }, [deferredSearch, expenseTypeFilter, filterFrom, filterTo, schoolScope.selectedSchoolId]);

  useEffect(() => {
    if (!profile || schoolScope.scopeLoading) return;
    void fetchExpenses();
  }, [fetchExpenses, expensePage, profile, schoolScope.scopeLoading]);

  async function handleSaveExpense(e: React.FormEvent) {
    e.preventDefault(); setSaving(true); setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    const targetSchoolId = editExpense?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا السجل");
      setSaving(false);
      return;
    }

    const payload = {
      school_id: targetSchoolId,
      expense_type_id: form.expense_type_id,
      amount: Number(form.amount),
      expense_date: form.expense_date,
      recipient: form.recipient || null,
      receipt_number: form.receipt_number || null,
      notes: form.notes || null,
    };

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
      setError(getApiErrorMessage(responsePayload, "تعذر حفظ المصروف."));
    } else {
      setSuccess(editExpense ? "تم تحديث المصروف ✓" : "تمت إضافة المصروف ✓");
      setShowExpenseForm(false); setEditExpense(null);
      setForm({ expense_type_id: "", amount: "", expense_date: DEFAULT_EXPENSE_DATE, recipient: "", receipt_number: "", notes: "" });
      const shouldResetPage = !editExpense && expensePage !== 1;
      if (shouldResetPage) {
        setExpensePage(1);
      } else {
        await fetchExpenses(targetSchoolId);
      }
      await fetchExpenseTypes(targetSchoolId);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSaving(false);
  }

  async function handleSaveType(e: React.FormEvent) {
    e.preventDefault(); setSavingType(true); setError("");
    const scopedSchoolId = await resolveScopedSchoolId();
    const targetSchoolId = editType?.school_id || scopedSchoolId;
    if (!targetSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا النوع");
      setSavingType(false);
      return;
    }
    const payload = { school_id: targetSchoolId, name: typeForm.name, notes: typeForm.notes || null };
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
      setError(getApiErrorMessage(responsePayload, "تعذر حفظ نوع المصروف."));
    } else {
      setSuccess(editType ? "تم تحديث النوع ✓" : "تمت إضافة النوع ✓");
      setShowTypeForm(false); setEditType(null);
      setTypeForm({ name: "", notes: "" });
      await fetchExpenseTypes(targetSchoolId);
      setTimeout(() => setSuccess(""), 3000);
    }
    setSavingType(false);
  }

  async function deleteExpense(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا السجل");
      return;
    }

    const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      `/api/web/expenses/${id}`,
      {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: scopedSchoolId }),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(payload, "تعذر حذف المصروف."));
      return;
    }

    setSuccess("تم حذف المصروف ✓");
    await fetchExpenses(scopedSchoolId);
    await fetchExpenseTypes(scopedSchoolId);
    setTimeout(() => setSuccess(""), 3000);
  }

  async function deleteType(id: string) {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError("لا يمكن تحديد المدرسة لهذا السجل");
      return;
    }

    const { response, payload } = await fetchJsonWithAuthorizedSession<ExpenseMutationResponse>(
      `/api/web/expenses/types/${id}`,
      {
        method: "DELETE",
        headers: withJsonHeaders(),
        body: JSON.stringify({ school_id: scopedSchoolId }),
      },
    );

    if (!response.ok) {
      setError(getApiErrorMessage(payload, "تعذر حذف نوع المصروف."));
      return;
    }

    setSuccess("تم حذف النوع ✓");
    await fetchExpenseTypes(scopedSchoolId);
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
    });
    setShowExpenseForm(true);
  }

  function openEditType(t: ExpenseTypeRow) {
    setEditType(t);
    setTypeForm({ name: t.name, notes: t.notes || "" });
    setShowTypeForm(true);
  }

  async function exportExcel() {
    const scopedSchoolId = await resolveScopedSchoolId();
    if (!scopedSchoolId) {
      setError("لا يمكن تحديد المدرسة قبل التصدير");
      return;
    }

    const XLSX = await loadXLSX();
    const exportRows: ExpenseRow[] = [];
    let page = 1;
    let totalPages = 1;

    do {
      const { response, payload } = await fetchJsonWithAuthorizedSession<ExpensesListResponse>(
        buildExpensesUrl("/api/web/expenses", {
          schoolId: scopedSchoolId,
          page,
          pageSize: EXPENSE_EXPORT_PAGE_SIZE,
          search: deferredSearch,
          expenseTypeId: expenseTypeFilter || null,
          fromDate: filterFrom || null,
          toDate: filterTo || null,
        }),
      );

      if (!response.ok) {
        setError(getApiErrorMessage(payload, "تعذر تصدير المصروفات."));
        return;
      }

      exportRows.push(...(payload?.rows ?? []));
      totalPages = payload?.totalPages ?? 1;
      page += 1;
    } while (page <= totalPages);

    const rows = exportRows.map((item, index) => ({
      "#": index + 1,
      "نوع المصروف": item.expense_types?.name || "—",
      "المبلغ": item.amount,
      "التاريخ": item.expense_date,
      "مستلم الفاتورة": item.recipient || "—",
      "رقم الإيصال": item.receipt_number || "—",
      "ملاحظة": item.notes || "",
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "المصاريف");
    await XLSX.writeFile(wb, `مصاريف_${formatDate(new Date())}.xlsx`);
  }

  async function exportTypesExcel() {
    const XLSX = await loadXLSX();
    const rows = expenseTypes.map((t, i) => ({
      "#": i + 1,
      "الاسم": t.name,
      "ملاحظات": t.notes || "",
      "عدد الاستخدامات": t.usage_count,
      "إجمالي الاستخدام": t.usage_total,
    }));
    const ws = XLSX.utils.json_to_sheet(rows);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "أنواع المصروفات");
    await XLSX.writeFile(wb, `أنواع_المصاريف.xlsx`);
  }

  const filteredTypes = expenseTypes.filter((t) => !typeSearch || t.name.includes(typeSearch));
  const totalFiltered = expenseSummary.filteredTotalAmount;
  const totalAll = expenseSummary.schoolTotalAmount;

  const inputClasses = "h-11 rounded-xl border border-[var(--border)] bg-[var(--surface-strong)] px-4 py-2 text-sm text-[var(--text-primary)] outline-none transition focus:border-[var(--primary)] focus:ring-4 focus:ring-[var(--primary)]/10 w-full";

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="flex min-h-screen bg-[var(--surface-muted)]">
        <AppSidebar currentPath="/expenses" />

        <div className="flex-1 flex flex-col min-w-0">
          <AppShellTopbar 
            title="المصروفات" 
            subtitle="إدارة فواتير المصاريف التشغيلية وأنواعها" 
            scope={schoolScope} 
            fixed 
          />

          <main className="flex-1 pt-16 overflow-y-auto custom-scrollbar">
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
                    title="المصروفات"
                    description="لن يتم تحميل فواتير المصروفات أو أنواعها قبل اختيار مدرسة صريحة لهذا القسم."
                  />
                </div>
              ) : (
                <div className="space-y-8">
                  {/* Hero Stats */}
                  <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
                    {[
                      { label: "إجمالي المصروفات", value: `د.ع ${formatNumber(totalAll)}`, icon: FileText, color: "text-[var(--info)]", bg: "bg-[var(--info)]/10" },
                      { label: "عدد السجلات", value: formatNumber(expenseSummary.schoolTotalCount), icon: Search, color: "text-[var(--primary)]", bg: "bg-[var(--primary)]/10" },
                      { label: "أنواع المصروفات", value: formatNumber(expenseTypes.length), icon: Tags, color: "text-[var(--success)]", bg: "bg-[var(--success)]/10" },
                      { label: "مصاريف اليوم", value: `د.ع ${formatNumber(expenseSummary.schoolTodayAmount)}`, icon: RefreshCw, color: "text-[var(--warning)]", bg: "bg-[var(--warning)]/10" },
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
                          <h2 className="text-lg font-black text-[var(--text-primary)]">إجراءات المصروفات</h2>
                        </div>
                        <div className="flex gap-2">
                          <button 
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--success)]/10 text-[var(--success)] text-xs font-black transition-all hover:bg-[var(--success)]/20"
                            onClick={activeTab === "invoices" ? exportExcel : exportTypesExcel}
                          >
                            <Download size={16} />
                            تصدير إكسل
                          </button>
                          <button 
                            className="flex items-center gap-2 h-10 px-4 rounded-xl bg-[var(--primary)] text-white text-xs font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95"
                            onClick={() => {
                              if (activeTab === "invoices") { setEditExpense(null); setForm({ expense_type_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], recipient: "", receipt_number: "", notes: "" }); setShowExpenseForm(true); }
                              else { setEditType(null); setTypeForm({ name: "", notes: "" }); setShowTypeForm(true); }
                            }}
                          >
                            <Plus size={16} />
                            {activeTab === "invoices" ? "إضافة مصروف" : "إضافة نوع"}
                          </button>
                        </div>
                      </div>

                      {activeTab === "invoices" && (
                        <div className="grid gap-4 sm:grid-cols-3 p-4 rounded-2xl bg-[var(--surface-muted)] border border-[var(--border)]">
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">من تاريخ</label>
                            <input type="date" className={inputClasses} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">إلى تاريخ</label>
                            <input type="date" className={inputClasses} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                          </div>
                          <div className="space-y-1.5">
                            <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">نوع المصروف</label>
                            <select className={inputClasses} value={expenseTypeFilter} onChange={e => setExpenseTypeFilter(e.target.value)}>
                              <option value="">كل الأنواع</option>
                              {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
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
                      المصروفات
                      <span className="ms-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[10px]">{expenseSummary.schoolTotalCount}</span>
                    </button>
                    <button 
                      className={cn(
                        "flex items-center gap-2 px-6 py-2 rounded-xl text-xs font-black transition-all",
                        activeTab === "types" ? "bg-[var(--surface-strong)] shadow-sm text-[var(--primary)]" : "text-[var(--text-muted)] hover:text-[var(--text-secondary)]"
                      )} 
                      onClick={() => setActiveTab("types")}
                    >
                      <Tags size={14} />
                      الأنواع
                      <span className="ms-1 px-1.5 py-0.5 rounded-md bg-[var(--surface-muted)] text-[10px]">{expenseTypes.length}</span>
                    </button>
                  </div>

                  {/* Table Section */}
                  <section className="rounded-[40px] border border-[var(--border)] bg-[var(--surface-strong)] p-8 shadow-lg">
                    <div className="space-y-8">
                      <div className="flex items-center justify-between border-b border-[var(--border)] pb-6">
                        <div className="flex items-center gap-3">
                          <span className="px-3 py-1 rounded-full bg-[var(--primary)] text-white text-[10px] font-black uppercase tracking-wider">{activeTab === "invoices" ? expenseTotalCount : filteredTypes.length} سجل</span>
                          <h2 className="text-xl font-black text-[var(--text-primary)]">{activeTab === "invoices" ? "قائمة المصروفات" : "تصنيفات المصروفات"}</h2>
                        </div>
                        <button className="h-10 w-10 flex items-center justify-center rounded-xl bg-[var(--surface-muted)] text-[var(--primary)] transition-all hover:bg-[var(--border)]" onClick={fetchAll}>
                          <RefreshCw size={18} />
                        </button>
                      </div>

                      <div className="relative">
                        <Search size={16} className="absolute start-4 top-1/2 -translate-y-1/2 text-[var(--text-muted)]" />
                        <input 
                          placeholder="بحث سريع..." 
                          className={cn(inputClasses, "ps-11")}
                          value={activeTab === "invoices" ? search : typeSearch} 
                          onChange={e => activeTab === "invoices" ? setSearch(e.target.value) : setTypeSearch(e.target.value)} 
                        />
                      </div>

                      {expensesLoading && activeTab === "invoices" ? (
                        <div className="flex flex-col items-center justify-center py-20 gap-4">
                          <div className="h-12 w-12 border-4 border-[var(--primary)]/20 border-t-[var(--primary)] rounded-full animate-spin" />
                          <span className="text-sm font-black text-[var(--text-muted)] uppercase tracking-widest">جارٍ تحميل البيانات...</span>
                        </div>
                      ) : activeTab === "invoices" && expenses.length === 0 ? (
                        <div className="py-20 text-center text-[var(--text-secondary)] font-bold">لا توجد مصروفات حالياً</div>
                      ) : activeTab === "invoices" ? (
                        <div className="overflow-x-auto rounded-2xl border border-[var(--border)]">
                          <table className="w-full text-start border-collapse">
                            <thead>
                              <tr className="bg-[var(--surface-muted)] text-start">
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">#</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">النوع</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">المبلغ</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">التاريخ</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">المستلم</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">الإيصال</th>
                                <th className="p-4 text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)] text-start">إجراءات</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-[var(--border)]">
                              {expenses.map((e, i) => (
                                <tr key={e.id} className="hover:bg-[var(--surface-muted)]/50 transition-colors">
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {Math.max(1, expenseTotalCount - ((expensePage - 1) * EXPENSES_PAGE_SIZE + i))}
                                  </td>
                                  <td className="p-4">
                                    <span className="px-2.5 py-1 rounded-lg bg-[var(--info)]/10 text-[var(--info)] text-[11px] font-black">
                                      {e.expense_types?.name || "—"}
                                    </span>
                                  </td>
                                  <td className="p-4 text-sm font-black text-[var(--danger)]">
                                    د.ع {formatNumber(e.amount)}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {formatDate(e.expense_date)}
                                  </td>
                                  <td className="p-4 text-xs font-bold text-[var(--text-secondary)]">
                                    {e.recipient || "—"}
                                  </td>
                                  <td className="p-4 text-xs font-black text-[var(--primary)] uppercase">
                                    {e.receipt_number || "—"}
                                  </td>
                                  <td className="p-4">
                                    <div className="flex gap-2">
                                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--info)]/10 text-[var(--info)]" onClick={() => openEditExpense(e)}>
                                        <Edit2 size={14} />
                                      </button>
                                      <button className="h-8 w-8 flex items-center justify-center rounded-lg bg-[var(--danger)]/10 text-[var(--danger)]" onClick={() => setPendingDelete({ type: "expense", id: e.id })}>
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
                      {activeTab === "invoices" && expenses.length > 0 && (
                        <div className="flex flex-col sm:flex-row items-center justify-between gap-4 pt-4">
                          <div className="flex items-center gap-2 px-4 py-2 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)]">
                            <span className="text-xs font-black uppercase tracking-wider opacity-70">إجمالي الصفحة:</span>
                            <span className="text-sm font-black">د.ع {formatNumber(totalFiltered)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <button className="h-10 px-4 rounded-xl bg-[var(--surface-muted)] text-xs font-black disabled:opacity-40" onClick={() => setExpensePage((current) => Math.max(1, current - 1))} disabled={expensePage <= 1}>السابق</button>
                            <span className="text-xs font-bold text-[var(--text-secondary)]">صفحة {expensePage} من {expenseTotalPages}</span>
                            <button className="h-10 px-4 rounded-xl bg-[var(--surface-muted)] text-xs font-black disabled:opacity-40" onClick={() => setExpensePage((current) => Math.min(expenseTotalPages, current + 1))} disabled={expensePage >= expenseTotalPages}>التالي</button>
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
                                  <p className="text-xs text-[var(--text-secondary)] line-clamp-1">{t.notes || "لا توجد ملاحظات"}</p>
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
                                <div className="text-[10px] font-black uppercase tracking-widest text-[var(--text-muted)]">{t.usage_count} استخدام</div>
                                <div className="text-sm font-black text-[var(--primary)]">د.ع {formatNumber(t.usage_total)}</div>
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
      {showExpenseForm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-[var(--text-primary)]/20" onClick={e => { if (e.target === e.currentTarget) setShowExpenseForm(false) }}>
          <div className="w-full max-w-lg bg-[var(--surface-strong)] rounded-[32px] shadow-2xl border border-[var(--border)] overflow-hidden">
            <div className="px-8 py-6 border-b border-[var(--border)] flex items-center justify-between bg-[var(--surface-muted)]">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-2xl bg-[var(--primary)]/10 text-[var(--primary)] flex items-center justify-center">
                  <FileText size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{editExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}</h3>
              </div>
              <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]" onClick={() => setShowExpenseForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveExpense} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">نوع المصروف *</label>
                <select className={inputClasses} required value={form.expense_type_id} onChange={e => setForm({ ...form, expense_type_id: e.target.value })}>
                  <option value="">اختر النوع...</option>
                  {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">المبلغ (د.ع) *</label>
                  <input className={inputClasses} type="number" required placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">التاريخ *</label>
                  <input className={inputClasses} type="date" required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
              </div>
              <div className="grid gap-4 sm:grid-cols-2">
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">مستلم الفاتورة</label>
                  <input className={inputClasses} placeholder="اسم المستلم..." value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
                </div>
                <div className="space-y-1.5">
                  <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">رقم الإيصال</label>
                  <input className={inputClasses} placeholder="رقم الإيصال..." value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
                </div>
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">ملاحظات إضافية</label>
                <textarea className={cn(inputClasses, "h-24 resize-none")} placeholder="أي ملاحظات..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--primary)] text-white rounded-2xl font-black shadow-lg shadow-[var(--primary)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={saving}>
                  {saving ? "جارٍ الحفظ..." : (editExpense ? "تعديل السجل" : "إضافة السجل")}
                </button>
                <button type="button" className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black" onClick={() => setShowExpenseForm(false)}>إلغاء</button>
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
                <div className="h-10 w-10 rounded-2xl bg-[var(--success)]/10 text-[var(--success)] flex items-center justify-center">
                  <Tags size={20} />
                </div>
                <h3 className="text-lg font-black text-[var(--text-primary)]">{editType ? "تعديل النوع" : "إضافة نوع جديد"}</h3>
              </div>
              <button className="h-8 w-8 flex items-center justify-center rounded-full bg-[var(--surface-strong)] shadow-sm border border-[var(--border)]" onClick={() => setShowTypeForm(false)}>
                <X size={16} />
              </button>
            </div>
            <form onSubmit={handleSaveType} className="p-8 space-y-5">
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">اسم التصنيف *</label>
                <input className={inputClasses} required placeholder="مثال: صيانة، قرطاسية..." value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
              </div>
              <div className="space-y-1.5">
                <label className="text-[10px] font-black uppercase tracking-wider text-[var(--text-muted)] px-1">وصف أو ملاحظات</label>
                <textarea className={cn(inputClasses, "h-24 resize-none")} placeholder="اختياري..." value={typeForm.notes} onChange={e => setTypeForm({ ...typeForm, notes: e.target.value })} />
              </div>
              <div className="flex gap-3 pt-4">
                <button type="submit" className="flex-1 h-12 bg-[var(--success)] text-white rounded-2xl font-black shadow-lg shadow-[var(--success)]/20 transition-all hover:scale-[1.02] active:scale-95 disabled:opacity-50" disabled={savingType}>
                  {savingType ? "جارٍ الحفظ..." : (editType ? "حفظ التغييرات" : "إضافة النوع")}
                </button>
                <button type="button" className="px-8 h-12 bg-[var(--surface-muted)] text-[var(--text-secondary)] rounded-2xl font-black" onClick={() => setShowTypeForm(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      <ConfirmDialog
        open={Boolean(pendingDelete)}
        title={pendingDelete?.type === "expense" ? "حذف المصروف" : "حذف نوع المصروف"}
        description={pendingDelete?.type === "expense" ? "سيتم حذف سجل المصروف نهائياً من القائمة الحالية." : "سيتم حذف نوع المصروف المحدد من النظام."}
        confirmLabel="نعم، احذف"
        cancelLabel="إلغاء"
        tone="danger"
        onClose={() => setPendingDelete(null)}
        onConfirm={() => void handleConfirmDelete()}
      />
  </ProtectedRoute>
);
}
