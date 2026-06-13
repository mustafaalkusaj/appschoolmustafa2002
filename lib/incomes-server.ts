import { applyBranchScopeToQuery, type ResolvedBranchScope } from "@/lib/branch-scope";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import {
  buildSchoolCacheTag,
  invalidateSchoolCacheDomains,
  rememberWithTtl,
} from "@/lib/server-cache";
import { createRouteSupabaseClient } from "@/lib/supabase-server";

type RouteSupabaseClient = Awaited<ReturnType<typeof createRouteSupabaseClient>>;

export type IncomesListFilters = {
  page: number;
  pageSize: number;
  search: string;
  incomeTypeId: string | null;
  fromDate: string | null;
  toDate: string | null;
};

export type IncomeSummary = {
  schoolTotalCount: number;
  schoolTotalAmount: number;
  schoolTodayAmount: number;
  filteredTotalCount: number;
  filteredTotalAmount: number;
};

export type IncomeRow = {
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

export type IncomeTypeOverviewRow = {
  id: string;
  school_id: string;
  name: string;
  notes: string | null;
  usage_count: number;
  usage_total: number;
};

const INCOME_SELECT =
  "id, school_id, income_type_id, amount, income_date, source, receipt_number, notes, created_at, income_types(name)";

function normalizeMetricNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIncomeRelation(value: unknown) {
  if (Array.isArray(value)) {
    return normalizeIncomeRelation(value[0] ?? null);
  }

  if (!value || typeof value !== "object") {
    return null;
  }

  const relation = value as { name?: unknown };
  return {
    name: typeof relation.name === "string" ? relation.name : null,
  };
}

function normalizeIncomeRow(row: Record<string, unknown>): IncomeRow {
  return {
    id: String(row.id),
    school_id: String(row.school_id),
    income_type_id: typeof row.income_type_id === "string" ? row.income_type_id : null,
    amount: normalizeMetricNumber(row.amount),
    income_date: typeof row.income_date === "string" ? row.income_date : "",
    source: typeof row.source === "string" ? row.source : null,
    receipt_number: typeof row.receipt_number === "string" ? row.receipt_number : null,
    notes: typeof row.notes === "string" ? row.notes : null,
    created_at: typeof row.created_at === "string" ? row.created_at : null,
    income_types: normalizeIncomeRelation(row.income_types),
  };
}

type IncomesFilterQueryLike = {
  eq: (column: string, value: unknown) => IncomesFilterQueryLike;
  gte: (column: string, value: unknown) => IncomesFilterQueryLike;
  lte: (column: string, value: unknown) => IncomesFilterQueryLike;
  or: (filters: string) => IncomesFilterQueryLike;
  order: (column: string, options?: { ascending?: boolean }) => IncomesFilterQueryLike;
};

function applyIncomesFilters<TQuery>(
  query: TQuery,
  filters: Pick<IncomesListFilters, "search" | "incomeTypeId" | "fromDate" | "toDate">,
): TQuery {
  let nextQuery = query as unknown as IncomesFilterQueryLike;

  if (filters.incomeTypeId) {
    nextQuery = nextQuery.eq("income_type_id", filters.incomeTypeId);
  }

  if (filters.fromDate) {
    nextQuery = nextQuery.gte("income_date", filters.fromDate);
  }

  if (filters.toDate) {
    nextQuery = nextQuery.lte("income_date", filters.toDate);
  }

  if (filters.search) {
    nextQuery = nextQuery.or(buildSafeOrFilter(["source", "receipt_number", "notes"], filters.search));
  }

  nextQuery = nextQuery.order("income_date", { ascending: false }).order("created_at", { ascending: false });
  return nextQuery as unknown as TQuery;
}

async function fetchIncomeSummaryFallback(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: Pick<IncomesListFilters, "search" | "incomeTypeId" | "fromDate" | "toDate">,
) {
  const today = new Date().toISOString().slice(0, 10);
  const schoolRowsPromise = applyBranchScopeToQuery(
    actorSupabase
      .from("incomes")
      .select("amount, income_date")
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    branchScope,
  );

  const filteredRowsPromise = applyIncomesFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .select("amount, income_date", { count: "exact" })
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

  const schoolIncomes = (schoolRows ?? []) as Array<{ amount?: unknown; income_date?: unknown }>;
  const filteredIncomes = (filteredRows ?? []) as Array<{ amount?: unknown; income_date?: unknown }>;

  return {
    schoolTotalCount: schoolIncomes.length,
    schoolTotalAmount: schoolIncomes.reduce((sum, row) => sum + normalizeMetricNumber(row.amount), 0),
    schoolTodayAmount: schoolIncomes.reduce((sum, row) => {
      return sum + (row.income_date === today ? normalizeMetricNumber(row.amount) : 0);
    }, 0),
    filteredTotalCount: typeof count === "number" ? count : filteredIncomes.length,
    filteredTotalAmount: filteredIncomes.reduce((sum, row) => sum + normalizeMetricNumber(row.amount), 0),
  } satisfies IncomeSummary;
}

export async function resolveIncomesPage(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: IncomesListFilters,
) {
  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize - 1;

  const pagedRowsPromise = applyIncomesFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("incomes")
        .select(INCOME_SELECT, { count: "exact" })
        .eq("school_id", schoolId)
        .is("deleted_at", null),
      branchScope,
    ),
    filters,
  ).range(from, to);

  const summaryPromise = fetchIncomeSummaryFallback(actorSupabase, schoolId, branchScope, filters);

  const [{ data, error, count }, summary] = await Promise.all([pagedRowsPromise, summaryPromise]);
  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as Array<Record<string, unknown>>).map(normalizeIncomeRow);
  const totalCount = typeof count === "number" ? count : summary.filteredTotalCount;

  return {
    rows,
    summary: {
      ...summary,
      filteredTotalCount: totalCount,
    } satisfies IncomeSummary,
    page: filters.page,
    pageSize: filters.pageSize,
    totalCount,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

async function fetchIncomeTypesOverviewFallback(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  search: string,
) {
  const { data: types, error: typesError } = await actorSupabase
    .from("income_types")
    .select("id, school_id, name, notes")
    .eq("school_id", schoolId)
    .is("deleted_at", null)
    .order("name", { ascending: true });

  if (typesError) {
    throw typesError;
  }

  const { data: incomes, error: incomesError } = await applyBranchScopeToQuery(
    actorSupabase
      .from("incomes")
      .select("income_type_id, amount")
      .eq("school_id", schoolId)
      // Exclude soft-deleted rows so the Types tab usage totals match the list
      // and summary (every other incomes read already filters deleted_at).
      .is("deleted_at", null),
    branchScope,
  );

  if (incomesError) {
    throw incomesError;
  }

  const searchValue = search.trim().toLowerCase();
  const totalsByType = new Map<string, { count: number; total: number }>();

  ((incomes ?? []) as Array<{ income_type_id?: string | null; amount?: unknown }>).forEach((income) => {
    if (!income.income_type_id) {
      return;
    }

    const current = totalsByType.get(income.income_type_id) ?? { count: 0, total: 0 };
    current.count += 1;
    current.total += normalizeMetricNumber(income.amount);
    totalsByType.set(income.income_type_id, current);
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
      } satisfies IncomeTypeOverviewRow;
    });
}

export async function resolveIncomeTypesOverview(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  search: string,
) {
  const cacheKey = `incomes-types:${schoolId}:${branchScope.cacheKeySuffix}:${search.trim().toLowerCase()}`;
  return rememberWithTtl(
    cacheKey,
    30_000,
    async () => {
      return fetchIncomeTypesOverviewFallback(actorSupabase, schoolId, branchScope, search);
    },
    {
      tags: [buildSchoolCacheTag(schoolId, "incomes-types")],
    },
  );
}

export function invalidateIncomeRelatedCaches(schoolId: string) {
  invalidateSchoolCacheDomains(schoolId, [
    "incomes-types",
    "reports-overview",
  ]);
}
