"use client";
import { useCallback, useDeferredValue, useEffect, useState } from "react";
import { fetchJsonWithAuthorizedSession, withJsonHeaders } from "@/lib/authorized-api";
import { formatNumber, formatDate } from "@/lib/formatting";
import { AppIcon } from "@/components/AppIcon";
import { AppSidebar } from "@/components/AppSidebar";
import { ConfirmDialog } from "@/components/ConfirmDialog";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import { SchoolScopeBanner, SchoolScopeEmptyState } from "@/components/SchoolScopeBanner";
import { useSchoolScope } from "@/hooks/useSchoolScope";
import { useRole } from "@/hooks/useRole";
import { loadXLSX } from "@/lib/xlsx-loader";
import { resolveSchoolIdForProfile } from "@/lib/school/context";

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
  const [typesLoading, setTypesLoading] = useState(true);
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

  return (
    <ProtectedRoute roles={["super_admin", "admin"]}>
      <div className="layout">
        <AppSidebar currentPath="/expenses" showFloatingToggle />

        <div className="main">
          <div className="content app-shell-content">
            {success && <div className="ok">{success}</div>}
            {error && <div className="err">{error}</div>}
            <SchoolScopeBanner scope={schoolScope} showSelector={false} />
            {schoolScope.shouldBlockContent ? (
              <SchoolScopeEmptyState
                scope={schoolScope}
                title="المصروفات"
                description="لن يتم تحميل فواتير المصروفات أو أنواعها قبل اختيار مدرسة صريحة لهذا القسم."
              />
            ) : (
              <>
                <div className="stats" style={{ display: "grid", gridTemplateColumns: "repeat(4, 1fr)", gap: ".7rem", marginBottom: "1rem" }}>
                  {([
                    ["💰", "إجمالي المصروفات", `د.ع ${formatNumber(totalAll)}`, "#EDE8FA"],
                    ["📋", "عدد السجلات", formatNumber(expenseSummary.schoolTotalCount), "#DBEAFE"],
                    ["🏷️", "أنواع المصروفات", formatNumber(expenseTypes.length), "#D1FAE5"],
                    ["📅", "مصاريف اليوم", `د.ع ${formatNumber(expenseSummary.schoolTodayAmount)}`, "#FEF3C7"],
                  ] as Array<[string, string, string, string]>).map(([ico, l, v, bg], i) => (
                    <div className="sc" key={i} style={{ background: "white", borderRadius: 12, padding: ".8rem 1rem", display: "flex", alignItems: "center", gap: ".8rem", boxShadow: "0 2px 8px rgba(108, 74, 182, 0.07)" }}>
                      <div className="sc-ico" style={{ width: 40, height: 40, borderRadius: 11, display: "flex", alignItems: "center", justifyCenter: "center", flexShrink: 0, fontSize: "1.2rem", background: bg }}>
                        <AppIcon token={ico} size={18} />
                      </div>
                      <div><div className="sc-label" style={{ fontSize: ".7rem", color: "var(--gray)" }}>{l}</div><div className="sc-val" style={{ fontSize: ".9rem", fontWeight: 800 }}>{v}</div></div>
                    </div>
                  ))}
                </div>

                <div className="actions-section" style={{ background: "white", borderRadius: 14, padding: "1rem 1.2rem", marginBottom: "1rem", boxShadow: "0 2px 8px rgba(108, 74, 182, 0.06)" }}>
                  <div className="actions-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: ".8rem" }}>
                    <div className="actions-title" style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: ".85rem", fontWeight: 800 }}>
                      <AppIcon token="⚙️" size={14} />
                      الإجراءات
                    </div>
                    <div className="actions-btns" style={{ display: "flex", gap: ".6rem" }}>
                      <button className="btn-excel" style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".55rem 1rem", background: "#D1FAE5", color: "#065F46", border: "1.5px solid #6EE7B7", borderRadius: 9, fontWeight: 700, cursor: "pointer" }} onClick={activeTab === "invoices" ? exportExcel : exportTypesExcel}>
                        <AppIcon token="⬇️" size={14} />
                        تحميل إكسل
                      </button>
                      <button className="btn-add" style={{ display: "flex", alignItems: "center", gap: ".4rem", padding: ".55rem 1rem", background: "linear-gradient(135deg, var(--p3), var(--p2))", color: "white", border: "none", borderRadius: 9, fontWeight: 700, cursor: "pointer" }} onClick={() => {
                        if (activeTab === "invoices") { setEditExpense(null); setForm({ expense_type_id: "", amount: "", expense_date: new Date().toISOString().split("T")[0], recipient: "", receipt_number: "", notes: "" }); setShowExpenseForm(true); }
                        else { setEditType(null); setTypeForm({ name: "", notes: "" }); setShowTypeForm(true); }
                      }}>
                        + {activeTab === "invoices" ? "إضافة مصروف" : "إضافة نوع"}
                      </button>
                    </div>
                  </div>

                  {activeTab === "invoices" && (
                    <div>
                      <div className="filter-title" style={{ fontSize: ".82rem", fontWeight: 700, color: "var(--p2)", marginBottom: ".7rem", display: "flex", alignItems: "center", gap: ".3rem" }}><AppIcon token="🔍" size={13} /> تصفية</div>
                      <div className="filter-grid" style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: ".7rem" }}>
                        <div className="fg-item" style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                          <label className="fg-label" style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--gray)" }}>من تاريخ</label>
                          <input type="date" className="fi" style={{ padding: ".5rem .8rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".8rem" }} value={filterFrom} onChange={e => setFilterFrom(e.target.value)} />
                        </div>
                        <div className="fg-item" style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                          <label className="fg-label" style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--gray)" }}>إلى تاريخ</label>
                          <input type="date" className="fi" style={{ padding: ".5rem .8rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".8rem" }} value={filterTo} onChange={e => setFilterTo(e.target.value)} />
                        </div>
                        <div className="fg-item" style={{ display: "flex", flexDirection: "column", gap: ".25rem" }}>
                          <label className="fg-label" style={{ fontSize: ".72rem", fontWeight: 600, color: "var(--gray)" }}>نوع المصروف</label>
                          <select className="fi" style={{ padding: ".5rem .8rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".8rem" }} value={expenseTypeFilter} onChange={e => setExpenseTypeFilter(e.target.value)}>
                            <option value="">الكل</option>
                            {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                          </select>
                        </div>
                      </div>
                    </div>
                  )}
                </div>

                <div className="page-tabs" style={{ display: "flex", gap: ".5rem", marginBottom: "1rem" }}>
                  <button className={`page-tab${activeTab === "invoices" ? " active" : ""}`} style={{ padding: ".55rem 1.2rem", borderRadius: 20, cursor: "pointer", fontSize: ".82rem", fontWeight: 700, border: "none", transition: "all .2s" }} onClick={() => setActiveTab("invoices")}>
                    <AppIcon token="📋" size={14} />
                    المصروفات
                    <span style={{ background: "rgba(255,255,255,0.25)", padding: ".1rem .5rem", borderRadius: 10, fontSize: ".72rem" }}>{expenseSummary.schoolTotalCount}</span>
                  </button>
                  <button className={`page-tab${activeTab === "types" ? " active" : ""}`} style={{ padding: ".55rem 1.2rem", borderRadius: 20, cursor: "pointer", fontSize: ".82rem", fontWeight: 700, border: "none", transition: "all .2s" }} onClick={() => setActiveTab("types")}>
                    <AppIcon token="🏷️" size={14} />
                    أنواع المصروفات
                    <span style={{ background: "rgba(255,255,255,0.25)", padding: ".1rem .5rem", borderRadius: 10, fontSize: ".72rem" }}>{expenseTypes.length}</span>
                  </button>
                </div>

                {activeTab === "invoices" && (
                  <div className="tbl-wrap" style={{ background: "white", borderRadius: 13, overflow: "hidden", boxShadow: "0 2px 8px rgba(108, 74, 182, 0.06)" }}>
                    <div className="tbl-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: "13px 13px 0 0", padding: ".8rem 1.2rem", borderBottom: "1px solid rgba(108, 74, 182, 0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        <span className="tbl-count" style={{ display: "inline-flex", alignItems: "center", background: "var(--p3)", color: "white", borderRadius: 20, padding: ".15rem .65rem", fontSize: ".75rem", fontWeight: 700 }}>{expenseTotalCount} السجلات</span>
                        <span className="tbl-title" style={{ fontSize: ".88rem", fontWeight: 800 }}>المصروفات</span>
                      </div>
                      <button className="btn-refresh" style={{ width: 34, height: 34, background: "#F0EEFF", color: "var(--p3)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={fetchAll}>↺</button>
                    </div>
                    <div className="tbl-srch" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".7rem 1.2rem", borderBottom: "1px solid rgba(108, 74, 182, 0.05)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--gray)", flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      <input placeholder="بحث..." style={{ flex: 1, padding: ".5rem .8rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".8rem" }} value={search} onChange={e => setSearch(e.target.value)} />
                    </div>
                    {expensesLoading ? <div className="spin" /> : expenses.length === 0 ? (
                      <div className="empty" style={{ textAlign: "center", padding: "3rem", color: "var(--gray)", fontSize: ".85rem" }}>لا توجد مصروفات حالياً، اضغط على إضافة مصروف</div>
                    ) : (
                      <>
                        <table style={{ width: "100%", borderCollapse: "collapse" }}>
                          <thead style={{ background: "#F8F6FF" }}>
                            <tr>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>#</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>نوع المصروف</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>المبلغ</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>التاريخ</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>مستلم الفاتورة</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>رقم الإيصال</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>ملاحظة</th>
                              <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>الإجراءات</th>
                            </tr>
                          </thead>
                          <tbody>
                            {expenses.map((e, i) => (
                              <tr key={e.id}>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}><span className="num-badge" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, background: "var(--p3)", color: "white", fontSize: ".75rem", fontWeight: 800 }}>{Math.max(1, expenseTotalCount - ((expensePage - 1) * EXPENSES_PAGE_SIZE + i))}</span></td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}>
                                  <span className="badge" style={{ display: "inline-block", padding: ".18rem .55rem", borderRadius: 20, fontSize: ".66rem", fontWeight: 700, background: "#EDE8FA", color: "var(--p3)" }}>
                                    {e.expense_types?.name || "—"}
                                  </span>
                                </td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", fontWeight: 800, color: "#EF4444" }}>د.ع {formatNumber(e.amount)}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", color: "var(--gray)", fontSize: ".75rem" }}>{formatDate(e.expense_date)}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", color: "var(--gray)" }}>{e.recipient || "—"}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", color: "var(--p3)", fontWeight: 600, fontSize: ".75rem" }}>{e.receipt_number || "—"}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", color: "var(--gray)", fontSize: ".75rem", maxWidth: 160, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{e.notes || "—"}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}>
                                  <div style={{ display: "flex", gap: ".3rem" }}>
                                    <button className="btn-edit-row" style={{ width: 28, height: 28, background: "#DBEAFE", color: "#1E40AF", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem" }} onClick={() => openEditExpense(e)}><AppIcon token="✏️" size={14} /></button>
                                    <button className="btn-del-row" style={{ width: 28, height: 28, background: "#FEE2E2", color: "#EF4444", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem" }} onClick={() => setPendingDelete({ type: "expense", id: e.id })}><AppIcon token="🗑️" size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                        <div className="total-bar" style={{ background: "linear-gradient(135deg, var(--p3), var(--p2))", borderRadius: "0 0 13px 13px", padding: ".7rem 1.2rem", display: "flex", alignItems: "center", justifyContent: "space-between", color: "white" }}>
                          <span className="total-label" style={{ fontSize: ".8rem", fontWeight: 600, opacity: .85 }}>إجمالي النتائج المطابقة ({formatNumber(expenseTotalCount)} سجل)</span>
                          <span className="total-val" style={{ fontSize: ".95rem", fontWeight: 900 }}>د.ع {formatNumber(totalFiltered)}</span>
                        </div>
                        <div className="pager" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "1rem", padding: ".85rem 1.2rem", background: "white", borderTop: "1px solid rgba(108, 74, 182, 0.08)" }}>
                          <span className="pager-meta" style={{ fontSize: ".78rem", color: "var(--gray)" }}>صفحة {formatNumber(expensePage)} من {formatNumber(expenseTotalPages)}</span>
                          <div className="pager-actions" style={{ display: "flex", gap: ".5rem" }}>
                            <button className="pager-btn" style={{ padding: ".5rem .85rem", border: "none", borderRadius: 10, background: "#F3F4F6", color: "var(--dark)", fontWeight: 700, cursor: "pointer" }} onClick={() => setExpensePage((current) => Math.max(1, current - 1))} disabled={expensePage <= 1}>
                              السابق
                            </button>
                            <button className="pager-btn" style={{ padding: ".5rem .85rem", border: "none", borderRadius: 10, background: "#F3F4F6", color: "var(--dark)", fontWeight: 700, cursor: "pointer" }} onClick={() => setExpensePage((current) => Math.min(expenseTotalPages, current + 1))} disabled={expensePage >= expenseTotalPages}>
                              التالي
                            </button>
                          </div>
                        </div>
                      </>
                    )}
                  </div>
                )}

                {activeTab === "types" && (
                  <div className="tbl-wrap" style={{ background: "white", borderRadius: 13, overflow: "hidden", boxShadow: "0 2px 8px rgba(108, 74, 182, 0.06)" }}>
                    <div className="tbl-header" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", background: "white", borderRadius: "13px 13px 0 0", padding: ".8rem 1.2rem", borderBottom: "1px solid rgba(108, 74, 182, 0.06)" }}>
                      <div style={{ display: "flex", alignItems: "center", gap: ".6rem" }}>
                        <span className="tbl-count" style={{ display: "inline-flex", alignItems: "center", background: "var(--p3)", color: "white", borderRadius: 20, padding: ".15rem .65rem", fontSize: ".75rem", fontWeight: 700 }}>{filteredTypes.length} السجلات</span>
                        <span className="tbl-title" style={{ fontSize: ".88rem", fontWeight: 800 }}>أنواع المصروفات</span>
                      </div>
                      <button className="btn-refresh" style={{ width: 34, height: 34, background: "#F0EEFF", color: "var(--p3)", border: "none", borderRadius: 9, cursor: "pointer", fontSize: "1rem", display: "flex", alignItems: "center", justifyContent: "center" }} onClick={fetchAll}>↺</button>
                    </div>
                    <div className="tbl-srch" style={{ display: "flex", alignItems: "center", gap: ".5rem", padding: ".7rem 1.2rem", borderBottom: "1px solid rgba(108, 74, 182, 0.05)" }}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: "var(--gray)", flexShrink: 0 }}><circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" /></svg>
                      <input placeholder="بحث..." style={{ flex: 1, padding: ".5rem .8rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".8rem" }} value={typeSearch} onChange={e => setTypeSearch(e.target.value)} />
                    </div>
                    {typesLoading ? <div className="spin" /> : filteredTypes.length === 0 ? (
                      <div className="empty" style={{ textAlign: "center", padding: "3rem", color: "var(--gray)", fontSize: ".85rem" }}>لا توجد أنواع حالياً، اضغط على إضافة نوع</div>
                    ) : (
                      <table style={{ width: "100%", borderCollapse: "collapse" }}>
                        <thead style={{ background: "#F8F6FF" }}>
                          <tr>
                            <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>#</th>
                            <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>الاسم</th>
                            <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>ملاحظات</th>
                            <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>عدد الاستخدامات</th>
                            <th style={{ padding: ".6rem .9rem", fontSize: ".72rem", fontWeight: 700, color: "var(--p2)", textAlign: "left", borderBottom: "1px solid rgba(108, 74, 182, 0.08)" }}>الإجراءات</th>
                          </tr>
                        </thead>
                        <tbody>
                          {filteredTypes.map((t, i) => {
                            return (
                              <tr key={t.id}>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}><span className="num-badge" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", width: 28, height: 28, borderRadius: 8, background: "var(--p3)", color: "white", fontSize: ".75rem", fontWeight: 800 }}>{i + 1}</span></td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", fontWeight: 700 }}>{t.name}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)", color: "var(--gray)", fontSize: ".75rem" }}>{t.notes || "—"}</td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}>
                                  <div style={{ fontSize: ".78rem" }}>
                                    <span className="badge" style={{ display: "inline-block", padding: ".18rem .55rem", borderRadius: 20, fontSize: ".66rem", fontWeight: 700, background: "#DBEAFE", color: "#1E40AF", marginLeft: ".3rem" }}>{formatNumber(t.usage_count)} مرة</span>
                                    {t.usage_count > 0 && <span style={{ color: "var(--gray)" }}>· د.ع {formatNumber(t.usage_total)}</span>}
                                  </div>
                                </td>
                                <td style={{ padding: ".6rem .9rem", borderBottom: "1px solid rgba(108, 74, 182, 0.04)" }}>
                                  <div style={{ display: "flex", gap: ".3rem" }}>
                                    <button className="btn-edit-row" style={{ width: 28, height: 28, background: "#DBEAFE", color: "#1E40AF", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem" }} onClick={() => openEditType(t)}><AppIcon token="✏️" size={14} /></button>
                                    <button className="btn-del-row" style={{ width: 28, height: 28, background: "#FEE2E2", color: "#EF4444", border: "none", borderRadius: 7, cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", fontSize: ".82rem" }} onClick={() => setPendingDelete({ type: "type", id: t.id })}><AppIcon token="🗑️" size={14} /></button>
                                  </div>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL: إضافة/تعديل مصروف */}
      {showExpenseForm && (
        <div className="overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowExpenseForm(false) }}>
          <div className="modal" style={{ background: "white", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 500, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)" }}>
            <div className="mh" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
              <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: "1rem", fontWeight: 800 }}>
                <AppIcon token={editExpense ? "✏️" : "💸"} size={16} />
                {editExpense ? "تعديل المصروف" : "إضافة مصروف جديد"}
              </div>
              <button className="mc" style={{ width: 30, height: 30, borderRadius: 7, background: "#F3F4F6", border: "none", cursor: "pointer", fontSize: "1rem" }} onClick={() => setShowExpenseForm(false)}><AppIcon token="✕" size={14} /></button>
            </div>
            <form onSubmit={handleSaveExpense}>
              <div className="fg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                <div className="ff full" style={{ display: "flex", flexDirection: "column", gap: ".32rem", gridColumn: "1 / -1" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>نوع المصروف *</label>
                  <select className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} required value={form.expense_type_id} onChange={e => setForm({ ...form, expense_type_id: e.target.value })}>
                    <option value="">اختر نوع المصروف...</option>
                    {expenseTypes.map(t => <option key={t.id} value={t.id}>{t.name}</option>)}
                  </select>
                </div>
                <div className="ff" style={{ display: "flex", flexDirection: "column", gap: ".32rem" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>المبلغ (د.ع) *</label>
                  <input className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} type="number" required placeholder="0" value={form.amount} onChange={e => setForm({ ...form, amount: e.target.value })} />
                </div>
                <div className="ff" style={{ display: "flex", flexDirection: "column", gap: ".32rem" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>التاريخ *</label>
                  <input className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} type="date" required value={form.expense_date} onChange={e => setForm({ ...form, expense_date: e.target.value })} />
                </div>
                <div className="ff" style={{ display: "flex", flexDirection: "column", gap: ".32rem" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>مستلم الفاتورة <span className="opt" style={{ fontSize: ".68rem", color: "var(--gray)", fontWeight: 400 }}>(اختياري)</span></label>
                  <input className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} placeholder="اسم المستلم..." value={form.recipient} onChange={e => setForm({ ...form, recipient: e.target.value })} />
                </div>
                <div className="ff" style={{ display: "flex", flexDirection: "column", gap: ".32rem" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>رقم الإيصال <span className="opt" style={{ fontSize: ".68rem", color: "var(--gray)", fontWeight: 400 }}>(اختياري)</span></label>
                  <input className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} placeholder="رقم الإيصال..." value={form.receipt_number} onChange={e => setForm({ ...form, receipt_number: e.target.value })} />
                </div>
                <div className="ff full" style={{ display: "flex", flexDirection: "column", gap: ".32rem", gridColumn: "1 / -1" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>ملاحظة <span className="opt" style={{ fontSize: ".68rem", color: "var(--gray)", fontWeight: 400 }}>(اختياري)</span></label>
                  <textarea className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%", resize: "none" }} rows={3} placeholder="أي ملاحظات..." value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} />
                </div>
              </div>
              <div className="fa" style={{ display: "flex", gap: ".7rem", marginTop: "1.1rem" }}>
                <button type="submit" className="bs" style={{ flex: 1, padding: ".75rem", background: "linear-gradient(135deg, var(--p3), var(--p2))", color: "white", border: "none", borderRadius: 11, fontWeight: 700, cursor: "pointer" }} disabled={saving}>{saving ? "جارٍ الحفظ..." : (editExpense ? "حفظ التعديلات" : "إضافة مصروف")}</button>
                <button type="button" className="bc" style={{ padding: ".75rem 1.2rem", background: "#F3F4F6", color: "var(--gray)", border: "none", borderRadius: 11, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowExpenseForm(false)}>إلغاء</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: إضافة/تعديل نوع */}
      {showTypeForm && (
        <div className="overlay" style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,0.4)", zIndex: 100, display: "flex", alignItems: "center", justifyContent: "center", backdropFilter: "blur(4px)" }} onClick={e => { if (e.target === e.currentTarget) setShowTypeForm(false) }}>
          <div className="modal" style={{ background: "white", borderRadius: 18, padding: "1.6rem", width: "100%", maxWidth: 420, maxHeight: "90vh", overflowY: "auto", boxShadow: "0 20px 60px rgba(0, 0, 0, 0.2)" }}>
            <div className="mh" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: "1.2rem" }}>
              <div className="mt" style={{ display: "flex", alignItems: "center", gap: ".35rem", fontSize: "1rem", fontWeight: 800 }}>
                <AppIcon token={editType ? "✏️" : "🏷️"} size={16} />
                {editType ? "تعديل النوع" : "إضافة نوع مصروف"}
              </div>
              <button className="mc" style={{ width: 30, height: 30, borderRadius: 7, background: "#F3F4F6", border: "none", cursor: "pointer", fontSize: "1rem" }} onClick={() => setShowTypeForm(false)}><AppIcon token="✕" size={14} /></button>
            </div>
            <form onSubmit={handleSaveType}>
              <div className="fg" style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: ".8rem" }}>
                <div className="ff full" style={{ display: "flex", flexDirection: "column", gap: ".32rem", gridColumn: "1 / -1" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>اسم النوع *</label>
                  <input className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%" }} required placeholder="مثال: مصاريف صيانة" value={typeForm.name} onChange={e => setTypeForm({ ...typeForm, name: e.target.value })} />
                </div>
                <div className="ff full" style={{ display: "flex", flexDirection: "column", gap: ".32rem", gridColumn: "1 / -1" }}>
                  <label className="fl" style={{ fontSize: ".76rem", fontWeight: 600 }}>ملاحظات <span className="opt" style={{ fontSize: ".68rem", color: "var(--gray)", fontWeight: 400 }}>(اختياري)</span></label>
                  <textarea className="fis" style={{ padding: ".65rem .85rem", background: "var(--field-bg)", border: "1.5px solid var(--field-border)", borderRadius: 9, fontSize: ".82rem", width: "100%", resize: "none" }} rows={3} placeholder="أي ملاحظات..." value={typeForm.notes} onChange={e => setTypeForm({ ...typeForm, notes: e.target.value })} />
                </div>
              </div>
              <div className="fa" style={{ display: "flex", gap: ".7rem", marginTop: "1.1rem" }}>
                <button type="submit" className="bs" style={{ flex: 1, padding: ".75rem", background: "linear-gradient(135deg, var(--p3), var(--p2))", color: "white", border: "none", borderRadius: 11, fontWeight: 700, cursor: "pointer" }} disabled={savingType}>{savingType ? "جارٍ الحفظ..." : (editType ? "حفظ التعديلات" : "إضافة نوع")}</button>
                <button type="button" className="bc" style={{ padding: ".75rem 1.2rem", background: "#F3F4F6", color: "var(--gray)", border: "none", borderRadius: 11, fontWeight: 600, cursor: "pointer" }} onClick={() => setShowTypeForm(false)}>إلغاء</button>
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
