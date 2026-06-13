import { applyBranchScopeToQuery, type ResolvedBranchScope } from "@/lib/branch-scope";
import type { StudentStatus } from "@/types/student";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";
import { calculateStudentRemainingFee } from "@/lib/students/financials";

export type StudentsStatusTab = "active" | "transferred" | "suspended" | "deleted";

export type StudentListRow = {
  id: string;
  school_id: string;
  auth_user_id: string | null;
  full_name: string;
  class_name: string;
  section: string | null;
  phone: string | null;
  address: string | null;
  total_fee: number;
  paid_fee: number;
  discount_value: number;
  remaining_fee: number;
  status: StudentStatus;
  created_at: string;
  updated_at: string | null;
};

export type StudentsListFilters = {
  page: number;
  pageSize: number;
  search: string;
  className: string;
  sectionName: string;
  status: StudentsStatusTab;
};

export type StudentsSummary = {
  totalStudents: number;
  activeStudents: number;
  transferredCount: number;
  totalFee: number;
  totalRemaining: number;
  totalPaid: number;
  transferredPaid: number;
  totalFeesWithTransferred: number;
};

export type StudentsMetaPayload = {
  summary: StudentsSummary;
  tabCounts: Record<StudentsStatusTab, number>;
  sectionOptions: string[];
};

const ACTIVE_TAB_STATUSES: StudentStatus[] = ["active", "graduated"];
const DEFAULT_PAGE_SIZE = 50;
const MAX_PAGE_SIZE = 100;

function normalizeTextParam(value: string | null, maxLength = 80) {
  return (value ?? "")
    .replace(/[\u0000-\u001F\u007F,()%]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, maxLength);
}

function normalizePageParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeStatusTab(value: string | null): StudentsStatusTab {
  switch (value) {
    case "transferred":
    case "suspended":
    case "deleted":
      return value;
    default:
      return "active";
  }
}

function normalizeNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

type StudentFilterOptions = {
  statusOverride?: StudentsStatusTab;
  includeSection?: boolean;
};

type StudentsFilterQueryLike = {
  in: (column: string, values: unknown[]) => StudentsFilterQueryLike;
  eq: (column: string, value: unknown) => StudentsFilterQueryLike;
  or: (filters: string) => StudentsFilterQueryLike;
};

function applyStudentFilters<TQuery>(query: TQuery, filters: StudentsListFilters, options: StudentFilterOptions = {}): TQuery {
  const status = options.statusOverride ?? filters.status;
  let nextQuery = query as unknown as StudentsFilterQueryLike;

  if (status === "active") {
    nextQuery = nextQuery.in("status", ACTIVE_TAB_STATUSES);
  } else {
    nextQuery = nextQuery.eq("status", status);
  }

  if (filters.className) {
    nextQuery = nextQuery.eq("class_name", filters.className);
  }

  if (options.includeSection !== false && filters.sectionName) {
    nextQuery = nextQuery.eq("section", filters.sectionName);
  }

  if (filters.search) {
    nextQuery = nextQuery.or(buildSafeOrFilter(["full_name", "class_name"], filters.search));
  }

  return nextQuery as unknown as TQuery;
}

async function resolveStudentFeesFromClassFees(
  actorSupabase: RouteSupabaseClient,
  students: Array<Record<string, unknown>>,
  schoolId: string,
  branchScope?: ResolvedBranchScope,
): Promise<Map<string, number>> {
  // Get unique class names from students
  const classNames = Array.from(
    new Set(
      students
        .map((s) => String(s.class_name ?? ""))
        .filter((c) => c.length > 0)
    )
  );

  if (classNames.length === 0) {
    return new Map();
  }

  // Fetch class_fees for these classes, scoped to branch when available
  let query = actorSupabase
    .from("class_fees")
    .select("class_name, total_fee")
    .eq("school_id", schoolId)
    .in("class_name", classNames);

  if (branchScope?.branchId) {
    query = query.eq("branch_id", branchScope.branchId);
  } else if (branchScope && branchScope.branchIds.length > 0) {
    query = query.in("branch_id", branchScope.branchIds);
  }

  const { data: classFees } = await query;

  // Build map of class_name -> total_fee
  const feeMap = new Map<string, number>();
  (classFees ?? []).forEach((cf: any) => {
    if (cf.class_name && typeof cf.total_fee === "number") {
      feeMap.set(String(cf.class_name), cf.total_fee);
    }
  });

  return feeMap;
}

function normalizeStudentRows(
  rows: Array<Record<string, unknown>>,
  classFeesByClassName?: Map<string, number>
): StudentListRow[] {
  return (rows ?? []).map((row) => {
    const className = String(row.class_name ?? "");
    // Resolve fee: prefer class_fees, fallback to student.total_fee if > 0, else 0
    const classFeeTotal = classFeesByClassName?.get(className);
    const studentTotal = normalizeNumber(row.total_fee);
    const totalFee = classFeeTotal ?? (studentTotal > 0 ? studentTotal : 0);

    const paidFee = normalizeNumber(row.paid_fee);
    const discountValue = normalizeNumber(row.discount_value);

    const remainingFee = calculateStudentRemainingFee({
      total_fee: totalFee,
      paid_fee: paidFee,
      discount_value: discountValue,
    });

    return {
      id: String(row.id),
      school_id: String(row.school_id ?? ""),
      auth_user_id: typeof row.auth_user_id === "string" ? row.auth_user_id : null,
      full_name: String(row.full_name ?? ""),
      class_name: className,
      section: typeof row.section === "string" && row.section.trim() ? row.section : null,
      phone: typeof row.phone === "string" && row.phone.trim() ? row.phone : null,
      address: typeof row.address === "string" && row.address.trim() ? row.address : null,
      total_fee: totalFee,
      paid_fee: paidFee,
      discount_value: discountValue,
      remaining_fee: remainingFee,
      status: (row.status ?? "active") as StudentStatus,
      created_at: typeof row.created_at === "string" ? row.created_at : new Date().toISOString(),
      updated_at: typeof row.updated_at === "string" ? row.updated_at : null,
    };
  });
}

async function countStudentsForTab(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: StudentsListFilters,
  status: StudentsStatusTab,
) {
  const { count, error } = await applyStudentFilters(
    applyBranchScopeToQuery(
      actorSupabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
      branchScope,
    ),
    filters,
    { statusOverride: status },
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدادات الطلاب.");
  }

  return typeof count === "number" ? count : 0;
}

async function fetchSummary(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: StudentsListFilters,
): Promise<StudentsSummary> {
  const { data, error } = await applyStudentFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id, class_name, total_fee, paid_fee, discount_value, status")
        .eq("school_id", schoolId),
      branchScope,
    ),
    filters,
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل ملخص الطلاب.");
  }

  // Also fetch transferred students for combined stats
  const { data: transferredData } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, class_name, total_fee, paid_fee, discount_value, status")
      .eq("school_id", schoolId)
      .eq("status", "transferred"),
    branchScope,
  );

  // Resolve class fees for accurate total calculation
  const allRows = [...(data ?? []), ...(transferredData ?? [])] as Array<Record<string, unknown>>;
  const classFeeMap = await resolveStudentFeesFromClassFees(actorSupabase, allRows, schoolId, branchScope);

  const activeRows = normalizeStudentRows(data ?? [], classFeeMap);
  const transferredRows = normalizeStudentRows(transferredData ?? [], classFeeMap);

  const summary: StudentsSummary = {
    totalStudents: 0,
    activeStudents: 0,
    transferredCount: transferredRows.length,
    totalFee: 0,
    totalRemaining: 0,
    totalPaid: 0,
    transferredPaid: 0,
    totalFeesWithTransferred: 0,
  };

  for (const student of activeRows) {
    summary.totalStudents += 1;
    summary.totalFee += student.total_fee;
    summary.totalRemaining += student.remaining_fee;
    summary.totalPaid += student.paid_fee;
    if (student.status === "active") {
      summary.activeStudents += 1;
    }
  }

  for (const student of transferredRows) {
    summary.transferredPaid += student.paid_fee;
  }

  summary.totalStudents += summary.transferredCount;
  summary.totalFeesWithTransferred = summary.totalFee + summary.transferredPaid;

  return summary;
}

async function fetchSectionOptions(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: StudentsListFilters,
) {
  const { data, error } = await applyStudentFilters(
    applyBranchScopeToQuery(
      actorSupabase.from("students").select("section").eq("school_id", schoolId),
      branchScope,
    ),
    filters,
    { includeSection: false },
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل خيارات الشعب.");
  }

  return Array.from(
    new Set(
      ((data ?? []) as Array<{ section?: string | null }>)
        .map((row) => (typeof row.section === "string" ? row.section.trim() : ""))
        .filter(Boolean),
    ),
  ).sort((left, right) => left.localeCompare(right, "ar"));
}

export function parseStudentsListFilters(searchParams: URLSearchParams): StudentsListFilters {
  const page = normalizePageParam(searchParams.get("page"), 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, normalizePageParam(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE)),
  );

  return {
    page,
    pageSize,
    search: normalizeTextParam(searchParams.get("search")),
    className: normalizeTextParam(searchParams.get("className"), 60),
    sectionName: normalizeTextParam(searchParams.get("sectionName"), 20),
    status: normalizeStatusTab(searchParams.get("status")),
  };
}

export async function resolveStudentsListPage(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: StudentsListFilters,
) {
  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await applyStudentFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select(
          "id, school_id, auth_user_id, full_name, class_name, section, phone, phone2, address, total_fee, paid_fee, discount_value, status, created_at, registration_number, date_of_birth, parent_name, gender, photo_url, prev_school",
          { count: "exact" },
        )
        .eq("school_id", schoolId),
      branchScope,
    ),
    filters,
  )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
  }

  // Resolve class fees for the fetched students
  const classFeeMap = await resolveStudentFeesFromClassFees(actorSupabase, data ?? [], schoolId, branchScope);

  const rows = normalizeStudentRows(data ?? [], classFeeMap);
  const totalCount = typeof count === "number" ? count : rows.length;

  return {
    students: rows,
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

export async function resolveStudentsMeta(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: StudentsListFilters,
): Promise<StudentsMetaPayload> {
  const [summary, sectionOptions, activeCount, transferredCount, suspendedCount, deletedCount] = await Promise.all([
    fetchSummary(actorSupabase, schoolId, branchScope, filters),
    fetchSectionOptions(actorSupabase, schoolId, branchScope, filters),
    countStudentsForTab(actorSupabase, schoolId, branchScope, filters, "active"),
    countStudentsForTab(actorSupabase, schoolId, branchScope, filters, "transferred"),
    countStudentsForTab(actorSupabase, schoolId, branchScope, filters, "suspended"),
    countStudentsForTab(actorSupabase, schoolId, branchScope, filters, "deleted"),
  ]);

  return {
    summary,
    sectionOptions,
    tabCounts: {
      active: activeCount,
      transferred: transferredCount,
      suspended: suspendedCount,
      deleted: deletedCount,
    },
  };
}
