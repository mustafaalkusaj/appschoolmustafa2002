import { applyBranchScopeToQuery, type ResolvedBranchScope } from "@/lib/branch-scope";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import {
  buildSchoolCacheTag,
  invalidateSchoolCacheDomains,
  rememberWithTtl,
} from "@/lib/server-cache";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export type ExpensesListFilters = {
  page: number;
  pageSize: number;
  search: string;
  expenseTypeId: string | null;
  fromDate: string | null;
  toDate: string | null;
};

export type ExpenseSummary = {
  schoolTotalCount: number;
  schoolTotalAmount: number;
  schoolTodayAmount: number;
  filteredTotalCount: number;
  filteredTotalAmount: number;
};

export type ExpenseRow = {
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

export type ExpenseTypeOverviewRow = {
  id: string;
  school_id: string;
  name: string;
  notes: string | null;
  usage_count: number;
  usage_total: number;
};

type ExpenseSummaryRpcRecord = {
  school_total_count?: unknown;
  school_total_amount?: unknown;
  school_today_amount?: unknown;
  filtered_total_count?: unknown;
  filtered_total_amount?: unknown;
};

type ExpenseTypeRpcRecord = {
  id?: unknown;
  school_id?: unknown;
  name?: unknown;
  notes?: unknown;
  usage_count?: unknown;
  usage_total?: unknown;
};

const EXPENSE_SELECT =
  "id, school_id, expense_type_id, amount, expense_date, recipient, receipt_number, notes, created_at, expense_types(name)";

function normalizeMetricNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeExpenseRelation(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeExpenseRelation(value[0] ?? null);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const relation = value as { name?: unknown };
  return {
    name: typeof relation.name === "string" ? relation.name : null,
  };
}

function normalizeExpenseRow(row: Record<string, unknown>): ExpenseRow {
  return {
    id: String(row.id),
    school_id: String(row.school_id),
    expense_type_id: typeof row.expense_type_id === "string" ? row.expense_type_id : null,
    amount: normalizeMetricNumber(row.amount),
    expense_date: typeof row.expense_date === "string" ? row.expense_date : "",
    recipient: typeof row.recipient === "string" ? row.recipient : null,
    receipt_number: typeof row.receipt_number === "string" ? row.receipt_number : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    expense_types: normalizeExpenseRelation(row.expense_types),
  };
}

type ExpensesFilterQueryLike = {
  eq: (column: string, value: unknown) => ExpensesFilterQueryLike;
  gte: (column: string, value: unknown) => ExpensesFilterQueryLike;
  lte: (column: string, value: unknown) => ExpensesFilterQueryLike;
  or: (filters: string) => ExpensesFilterQueryLike;
  order: (column: string, options?: { ascending?: boolean }) => ExpensesFilterQueryLike;
};

function applyExpensesFilters<TQuery>(
  query: TQuery,
  filters: Pick<ExpensesListFilters, "search" | "expenseTypeId" | "fromDate" | "toDate">,
): TQuery {
  let nextQuery = query as unknown as ExpensesFilterQueryLike;

  if (filters.expenseTypeId) {
    nextQuery = nextQuery.eq("expense_type_id", filters.expenseTypeId);
  }

  if (filters.fromDate) {
    nextQuery = nextQuery.gte("expense_date", filters.fromDate);
  }

  if (filters.toDate) {
    nextQuery = nextQuery.lte("expense_date", filters.toDate);
  }

  if (filters.search) {
    nextQuery = nextQuery.or(buildSafeOrFilter(["recipient", "receipt_number", "notes"], filters.search));
  }

  nextQuery = nextQuery.order("expense_date", { ascending: false }).order("created_at", { ascending: false });
  return nextQuery as unknown as TQuery;
}

async function fetchExpenseSummaryViaRpc(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  filters: Pick<ExpensesListFilters, "search" | "expenseTypeId" | "fromDate" | "toDate">,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (actorSupabase.rpc as any)("school_expenses_summary", {
    p_school_id: schoolId,
    p_search: filters.search,
    p_expense_type_id: filters.expenseTypeId,
    p_from_date: filters.fromDate,
    p_to_date: filters.toDate,
  });

  if (error) {
    throw error;
  }

  const record = (Array.isArray(data) ? data[0] : data) as unknown as ExpenseSummaryRpcRecord | null;
  if (!record || typeof record !== "object") {
    return null;
  }

  return {
    schoolTotalCount: normalizeMetricNumber(record.school_total_count),
    schoolTotalAmount: normalizeMetricNumber(record.school_total_amount),
    schoolTodayAmount: normalizeMetricNumber(record.school_today_amount),
    filteredTotalCount: normalizeMetricNumber(record.filtered_total_count),
    filteredTotalAmount: normalizeMetricNumber(record.filtered_total_amount),
  } satisfies ExpenseSummary;
}

async function fetchExpenseSummaryFallback(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: Pick<ExpensesListFilters, "search" | "expenseTypeId" | "fromDate" | "toDate">,
) {
  const today = new Date().toISOString().slice(0, 10);
  const schoolRowsPromise = applyBranchScopeToQuery(
    actorSupabase
      .from("expenses")
      .select("amount, expense_date")
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    branchScope,
  );

  const filteredRowsPromise = applyExpensesFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select("amount, expense_date", { count: "exact" })
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    filters,
  );

  const [{ data: schoolRows, error: schoolError }, { data: filteredRows, error: filteredError, count }] =
    await Promise.all([schoolRowsPromise, filteredRowsPromise]);

  if (schoolError) {
    throw schoolError;
  }

  if (filteredError) {
    throw filteredError;
  }

  const schoolExpenses = (schoolRows ?? []) as Array<{ amount?: unknown; expense_date?: unknown }>;
  const filteredExpenses = (filteredRows ?? []) as Array<{ amount?: unknown; expense_date?: unknown }>;

  return {
    schoolTotalCount: schoolExpenses.length,
    schoolTotalAmount: schoolExpenses.reduce((sum, row) => sum + normalizeMetricNumber(row.amount), 0),
    schoolTodayAmount: schoolExpenses.reduce((sum, row) => {
      return sum + (row.expense_date === today ? normalizeMetricNumber(row.amount) : 0);
    }, 0),
    filteredTotalCount: typeof count === "number" ? count : filteredExpenses.length,
    filteredTotalAmount: filteredExpenses.reduce((sum, row) => sum + normalizeMetricNumber(row.amount), 0),
  } satisfies ExpenseSummary;
}

export async function resolveExpensesPage(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: ExpensesListFilters,
) {
  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize - 1;

  const pagedRowsPromise = applyExpensesFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("expenses")
        .select(EXPENSE_SELECT, { count: "exact" })
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    filters,
  ).range(from, to);

  const summaryPromise = (async () => {
    if (branchScope.branchIds.length === 0) {
      try {
        const rpcSummary = await fetchExpenseSummaryViaRpc(actorSupabase, schoolId, filters);
        if (rpcSummary) {
          return rpcSummary;
        }
        return fetchExpenseSummaryFallback(actorSupabase, schoolId, branchScope, filters);
      } catch (error) {
        if (
          typeof error === "object" &&
          error !== null &&
          "message" in error &&
          typeof error.message === "string" &&
          error.message.includes("school_expenses_summary")
        ) {
          return fetchExpenseSummaryFallback(actorSupabase, schoolId, branchScope, filters);
        }

        if (
          typeof error === "object" &&
          error !== null &&
          "code" in error &&
          error.code === "42883"
        ) {
          return fetchExpenseSummaryFallback(actorSupabase, schoolId, branchScope, filters);
        }

        throw error;
      }
    }

    return fetchExpenseSummaryFallback(actorSupabase, schoolId, branchScope, filters);
  })();

  const [{ data, error, count }, summary] = await Promise.all([pagedRowsPromise, summaryPromise]);
  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map(normalizeExpenseRow);
  const totalCount = typeof count === "number" ? count : summary.filteredTotalCount;

  return {
    rows,
    summary: {
      ...summary,
      filteredTotalCount: totalCount,
    } satisfies ExpenseSummary,
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

async function fetchExpenseTypesOverviewViaRpc(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  search: string,
) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { data, error } = await (actorSupabase.rpc as any)("school_expense_types_overview", {
    p_school_id: schoolId,
    p_search: search,
  });

  if (error) {
    throw error;
  }

  return ((data ?? []) as ExpenseTypeRpcRecord[]).map((row) => ({
    id: String(row.id ?? ""),
    school_id: String(row.school_id ?? schoolId),
    name: typeof row.name === "string" ? row.name : "",
    notes: typeof row.notes === "string" ? row.notes : null,
    usage_count: normalizeMetricNumber(row.usage_count),
    usage_total: normalizeMetricNumber(row.usage_total),
  }));
}

async function fetchExpenseTypesOverviewFallback(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  search: string,
) {
  const { data: types, error: typesError } = await actorSupabase
    .from("expense_types")
    .select("id, school_id, name, notes")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (typesError) {
    throw typesError;
  }

  const { data: expenses, error: expensesError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("expenses")
      .select("expense_type_id, amount")
      .eq("school_id", schoolId)
      // Exclude soft-deleted rows so the Types tab usage totals match the list.
      .is("deleted_at", null),
    branchScope,
  );

  if (expensesError) {
    throw expensesError;
  }

  const searchValue = search.trim().toLowerCase();
  const totalsByType = new Map<string, { count: number; total: number }>();

  ((expenses ?? []) as Array<{ expense_type_id?: string | null; amount?: unknown }>).forEach((expense) => {
    if (!expense.expense_type_id) {
      return;
    }

    const current = totalsByType.get(expense.expense_type_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += normalizeMetricNumber(expense.amount);
    totalsByType.set(expense.expense_type_id, current);
  });

  return ((types ?? []) as Array<Record<string, unknown>>)
    .filter((row) => {
      if (!searchValue) {
        return true;
      }

      return String(row.name ?? "")
        .toLowerCase()
        .includes(searchValue);
    })
    .map((row) => {
      const usage = totalsByType.get(String(row.id)) ?? { count: 0, total: 0 };
      return {
        id: String(row.id),
        school_id: String(row.school_id ?? schoolId),
        name: String(row.name ?? ""),
        notes: typeof row.notes === "string" ? row.notes : null,
        usage_count: usage.count,
        usage_total: usage.total,
      } satisfies ExpenseTypeOverviewRow;
    });
}

export async function resolveExpenseTypesOverview(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  search: string,
) {
  const cacheKey = `expenses-types:${schoolId}:${branchScope.cacheKeySuffix}:${search.trim().toLowerCase()}`;
  return rememberWithTtl(
    cacheKey,
    30_000,
    async () => {
      if (branchScope.branchIds.length === 0) {
        try {
          return await fetchExpenseTypesOverviewViaRpc(actorSupabase, schoolId, search);
        } catch (error) {
          if (
            typeof error === "object" &&
            error !== null &&
            "code" in error &&
            error.code === "42883"
          ) {
            return fetchExpenseTypesOverviewFallback(actorSupabase, schoolId, branchScope, search);
          }

          if (
            typeof error === "object" &&
            error !== null &&
            "message" in error &&
            typeof error.message === "string" &&
            error.message.includes("school_expense_types_overview")
          ) {
            return fetchExpenseTypesOverviewFallback(actorSupabase, schoolId, branchScope, search);
          }

          throw error;
        }
      }

      return fetchExpenseTypesOverviewFallback(actorSupabase, schoolId, branchScope, search);
    },
    {
      tags: [buildSchoolCacheTag(schoolId, "expenses-types")],
    },
  );
}

export function invalidateExpenseRelatedCaches(schoolId: string) {
  invalidateSchoolCacheDomains(schoolId, [
    "expenses-types",
    "reports-overview",
  ]);
}
