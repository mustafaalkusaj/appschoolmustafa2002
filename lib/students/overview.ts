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
  totalFee: number;
  totalRemaining: number;
};

export type StudentsMetaPayload = {
  summary: StudentsSummary;
  tabCounts: Record<StudentsStatusTab, number>;
  sectionOptions: string[];
};

const ACTIVE_TAB_STATUSES: StudentStatus[] = ["active", "graduated", "archived", "withdrawn"];
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

function normalizeStudentRows(rows: Array<Record<string, unknown>>): StudentListRow[] {
  return (rows ?? []).map((row) => {
    const totalFee = normalizeNumber(row.total_fee);
    const paidFee = normalizeNumber(row.paid_fee);
    const discountValue = normalizeNumber(row.discount_value);

    // Use stored value if exists, otherwise calculate using shared logic
    const remainingFee =
      row.remaining_fee !== null && row.remaining_fee !== undefined
        ? normalizeNumber(row.remaining_fee)
        : calculateStudentRemainingFee({
            total_fee: totalFee,
            paid_fee: paidFee,
            discount_value: discountValue,
          });

    return {
      id: String(row.id),
      school_id: String(row.school_id ?? ""),
      auth_user_id: typeof row.auth_user_id === "string" ? row.auth_user_id : null,
      full_name: String(row.full_name ?? ""),
      class_name: String(row.class_name ?? ""),
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
  filters: StudentsListFilters,
  status: StudentsStatusTab,
) {
  const { count, error } = await applyStudentFilters(
    actorSupabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    filters,
    { statusOverride: status },
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدادات الطلاب.");
  }

  return typeof count === "number" ? count : 0;
}

async function fetchSummary(actorSupabase: RouteSupabaseClient, schoolId: string, filters: StudentsListFilters): Promise<StudentsSummary> {
  const { data, error } = await applyStudentFilters(
    actorSupabase
      .from("students")
      .select("id, total_fee, paid_fee, remaining_fee, discount_value, status")
      .eq("school_id", schoolId),
    filters,
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل ملخص الطلاب.");
  }

  return normalizeStudentRows(data ?? []).reduce<StudentsSummary>(
    (acc, student) => {
      acc.totalStudents += 1;
      acc.totalFee += student.total_fee;
      acc.totalRemaining += student.remaining_fee;
      if (student.status === "active") {
        acc.activeStudents += 1;
      }
      return acc;
    },
    {
      totalStudents: 0,
      activeStudents: 0,
      totalFee: 0,
      totalRemaining: 0,
    },
  );
}

async function fetchSectionOptions(actorSupabase: RouteSupabaseClient, schoolId: string, filters: StudentsListFilters) {
  const { data, error } = await applyStudentFilters(
    actorSupabase.from("students").select("section").eq("school_id", schoolId),
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

export async function resolveStudentsListPage(actorSupabase: RouteSupabaseClient, schoolId: string, filters: StudentsListFilters) {
  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize - 1;

  const { data, count, error } = await applyStudentFilters(
    actorSupabase
      .from("students")
      .select(
        "id, school_id, auth_user_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, remaining_fee, status, created_at",
        { count: "exact" },
      )
      .eq("school_id", schoolId),
    filters,
  )
    .order("created_at", { ascending: false })
    .range(from, to);

  if (error) {
    throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
  }

  const rows = normalizeStudentRows(data ?? []);
  const totalCount = typeof count === "number" ? count : rows.length;

  return {
    students: rows,
    totalCount,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

export async function resolveStudentsMeta(actorSupabase: RouteSupabaseClient, schoolId: string, filters: StudentsListFilters): Promise<StudentsMetaPayload> {
  const [summary, sectionOptions, activeCount, transferredCount, suspendedCount, deletedCount] = await Promise.all([
    fetchSummary(actorSupabase, schoolId, filters),
    fetchSectionOptions(actorSupabase, schoolId, filters),
    countStudentsForTab(actorSupabase, schoolId, filters, "active"),
    countStudentsForTab(actorSupabase, schoolId, filters, "transferred"),
    countStudentsForTab(actorSupabase, schoolId, filters, "suspended"),
    countStudentsForTab(actorSupabase, schoolId, filters, "deleted"),
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
