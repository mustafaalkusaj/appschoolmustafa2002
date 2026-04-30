import { isMissingTableError } from "@/lib/admin-infrastructure";
import { applyBranchScopeToQuery, type ResolvedBranchScope } from "@/lib/branch-scope";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";
import { buildResolvedStudentFinancials } from "@/lib/students/financials";

export type PaymentsQuickFilter =
  | "all"
  | "no_invoice"
  | "collected"
  | "discounted"
  | "transferred"
  | "graduated"
  | "suspended"
  | "deleted";

export type PaymentsSortKey = "name" | "remaining" | "total";
export type PaymentsSortDir = "asc" | "desc";

export type PaymentStudentRecord = {
  id: string;
  school_id: string;
  full_name: string;
  class_name: string | null;
  section: string | null;
  phone: string | null;
  address: string | null;
  total_fee: number;
  paid_fee: number;
  discount_value: number;
  remaining_fee: number;
  status: string | null;
};

export type PaymentsListFilters = {
  page: number;
  pageSize: number;
  search: string;
  className: string;
  quickFilter: PaymentsQuickFilter;
  sort: PaymentsSortKey;
  dir: PaymentsSortDir;
};

export type PaymentsSummary = {
  totalStudents: number;
  totalFee: number;
  totalPaid: number;
  totalRemaining: number;
  collectedCount: number;
};

export type PaymentsMetaPayload = {
  summary: PaymentsSummary;
  classOptions: string[];
  paymentYears: number[];
  totalPaymentCount: number;
  archives: PaymentArchive[];
  archiveNotice: string;
};

export type PaymentArchive = {
  id: string;
  school_id: string;
  archive_year: number;
  archive_date: string;
  total_students: number | null;
  total_payments: number | null;
  total_amount: number | null;
  data: unknown | null;
};

type PaymentsSummaryRpcRecord = {
  total_students?: unknown;
  total_fee?: unknown;
  total_paid?: unknown;
  total_remaining?: unknown;
  collected_count?: unknown;
  total_payment_count?: unknown;
  payment_years?: unknown;
};

type PaymentsPageRpcRecord = PaymentStudentRecord & {
  payment_count?: unknown;
  total_count?: unknown;
};

const STUDENT_LIST_SELECT =
  "id, school_id, full_name, class_name, section, phone, address, total_fee, paid_fee, discount_value, remaining_fee, status";
const DEFAULT_PAGE_SIZE = 25;
const MAX_PAGE_SIZE = 100;
const QUERY_BATCH_SIZE = 1000;

function isMissingPaymentsSummaryFunction(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "42883" || error?.message?.includes("school_payments_summary") || false;
}

function isMissingPaymentsStudentsPageFunction(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "42883" || error?.message?.includes("school_payment_students_page") || false;
}

function isMissingReportsSummaryFunction(error: { code?: string | null; message?: string | null } | null | undefined) {
  return error?.code === "42883" || error?.message?.includes("school_reports_summary") || false;
}

function normalizeTextParam(value: string | null) {
  return value?.trim() ?? "";
}

function normalizePageParam(value: string | null, fallback: number) {
  const parsed = Number.parseInt(value ?? "", 10);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

function normalizeMetricNumber(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeIntegerArray(value: unknown) {
  if (!Array.isArray(value)) return [];

  return value
    .map((entry) => Number(entry))
    .filter((entry) => Number.isFinite(entry))
    .map((entry) => Math.trunc(entry));
}

function normalizeQuickFilter(value: string | null): PaymentsQuickFilter {
  switch (value) {
    case "no_invoice":
    case "collected":
    case "discounted":
    case "transferred":
    case "graduated":
    case "suspended":
    case "deleted":
      return value;
    default:
      return "all";
  }
}

function normalizeSortKey(value: string | null): PaymentsSortKey {
  switch (value) {
    case "remaining":
    case "total":
      return value;
    default:
      return "name";
  }
}

function normalizeSortDir(value: string | null): PaymentsSortDir {
  return value === "desc" ? "desc" : "asc";
}



function getClassOptionName(option: { name?: string | null; grade?: string | null }) {
  if (typeof option.name === "string" && option.name.trim()) return option.name.trim();
  if (typeof option.grade === "string" && option.grade.trim()) return option.grade.trim();
  return "";
}

type PaymentsStudentFilterQueryLike = {
  eq: (column: string, value: unknown) => PaymentsStudentFilterQueryLike;
  neq: (column: string, value: unknown) => PaymentsStudentFilterQueryLike;
  gt: (column: string, value: unknown) => PaymentsStudentFilterQueryLike;
  lte: (column: string, value: unknown) => PaymentsStudentFilterQueryLike;
  in: (column: string, values: unknown[]) => PaymentsStudentFilterQueryLike;
  or: (filters: string) => PaymentsStudentFilterQueryLike;
  order: (column: string, options?: { ascending?: boolean; nullsFirst?: boolean }) => PaymentsStudentFilterQueryLike;
};

function applyStudentFilters<TQuery>(query: TQuery, filters: PaymentsListFilters): TQuery {
  let nextQuery = query as unknown as PaymentsStudentFilterQueryLike;

  if (filters.quickFilter === "transferred") {
    nextQuery = nextQuery.eq("status", "transferred");
  } else if (filters.quickFilter === "deleted") {
    nextQuery = nextQuery.eq("status", "deleted");
  } else if (filters.quickFilter === "suspended") {
    nextQuery = nextQuery.eq("status", "suspended");
  } else if (filters.quickFilter === "graduated") {
    nextQuery = nextQuery.eq("status", "graduated");
  } else if (filters.quickFilter === "discounted") {
    nextQuery = nextQuery.gt("discount_value", 0);
  } else if (filters.quickFilter === "collected") {
    nextQuery = nextQuery.lte("remaining_fee", 0).gt("total_fee", 0);
  } else {
    nextQuery = nextQuery.neq("status", "deleted");
  }

  if (filters.className) {
    nextQuery = nextQuery.eq("class_name", filters.className);
  }

  if (filters.search) {
    nextQuery = nextQuery.or(buildSafeOrFilter(["full_name", "class_name"], filters.search));
  }

  if (filters.sort === "remaining") {
    nextQuery = nextQuery.order("remaining_fee", { ascending: filters.dir === "asc" });
  } else if (filters.sort === "total") {
    nextQuery = nextQuery.order("total_fee", { ascending: filters.dir === "asc" });
  } else {
    nextQuery = nextQuery.order("full_name", { ascending: filters.dir === "asc" });
  }

  nextQuery = nextQuery.order("full_name", { ascending: true });
  return nextQuery as unknown as TQuery;
}

async function fetchPaymentCountsByStudent(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  studentIds: string[],
) {
  if (studentIds.length === 0) return {};

  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("payments")
      .select("student_id")
      .eq("school_id", schoolId)
      .in("student_id", studentIds),
    branchScope,
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدادات الدفعات.");
  }

  return ((data ?? []) as Array<{ student_id: string | null }>).reduce<Record<string, number>>((acc, row) => {
    if (!row.student_id) return acc;
    acc[row.student_id] = (acc[row.student_id] ?? 0) + 1;
    return acc;
  }, {});
}

async function fetchSchoolPaymentStudentIds(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
) {
  const results: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("payments")
        .select("id, student_id")
        .eq("school_id", schoolId)
        .order("id", { ascending: true })
        .range(from, from + QUERY_BATCH_SIZE - 1),
      branchScope,
    );

    if (error) {
      throw new Error(error.message || "تعذر تحميل فهرس الدفعات.");
    }

    const batch = (data ?? []) as Array<{ student_id: string | null }>;
    results.push(
      ...batch
        .map((row) => row.student_id)
        .filter((value): value is string => typeof value === "string" && value.length > 0),
    );

    if (batch.length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  return Array.from(new Set(results));
}

async function fetchClassOptions(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
) {
  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("classes")
      .select("*")
      .eq("school_id", schoolId)
      .order("created_at", { ascending: true }),
    branchScope,
  );

  if (!error) {
    const values = Array.from(
      new Set(
        ((data ?? []) as Array<{ name?: string | null; grade?: string | null }>)
          .map((item) => getClassOptionName(item))
          .filter(Boolean),
      ),
    );
    if (values.length > 0) return values;
  }

  const fallback = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("class_name")
      .eq("school_id", schoolId)
      .neq("status", "deleted")
      .order("class_name", { ascending: true }),
    branchScope,
  );

  if (fallback.error) {
    return [];
  }

  return Array.from(
    new Set(
      ((fallback.data ?? []) as Array<{ class_name: string | null }>)
        .map((row) => (typeof row.class_name === "string" ? row.class_name.trim() : ""))
        .filter(Boolean),
    ),
  );
}

async function fetchSummary(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
): Promise<PaymentsSummary> {
  const summary: PaymentsSummary = {
    totalStudents: 0,
    totalFee: 0,
    totalPaid: 0,
    totalRemaining: 0,
    collectedCount: 0,
  };

  // First, fetch all students to resolve class fees
  const allStudents: Array<Record<string, unknown>> = [];
  let from = 0;

  while (true) {
    const { data, error } = await applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select("id, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", schoolId)
        .order("id", { ascending: true })
        .range(from, from + QUERY_BATCH_SIZE - 1),
      branchScope,
    );

    if (error) {
      throw new Error(error.message || "تعذر تحميل ملخص المدفوعات.");
    }

    allStudents.push(...((data ?? []) as Array<Record<string, unknown>>));

    if ((data ?? []).length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  // Resolve class fees for all students
  const classFeeMap = await resolvePaymentFeesFromClassFees(actorSupabase, allStudents, schoolId);

  // Calculate summary with resolved fees
  allStudents.forEach((student: any) => {
    if (student.status === "deleted") {
      return;
    }

    const className = student.class_name;
    const classFeeTotal = className ? classFeeMap.get(className) : undefined;
    const studentTotal = Number(student.total_fee ?? 0);
    const totalFee = classFeeTotal ?? (studentTotal > 0 ? studentTotal : 0);
    const paidFee = Number(student.paid_fee ?? 0);
    const remainingFee = Math.max(
      totalFee - paidFee - Number(student.discount_value ?? 0),
      0,
    );

    summary.totalStudents += 1;
    summary.totalFee += totalFee;
    summary.totalPaid += paidFee;
    summary.totalRemaining += remainingFee;
    if (remainingFee <= 0 && totalFee > 0) {
      summary.collectedCount += 1;
    }
  });

  return summary;
}

async function fetchCollectedCount(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
) {
  const { data, error } = await applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select("id, class_name, total_fee, paid_fee, discount_value, status")
      .eq("school_id", schoolId)
      .neq("status", "deleted"),
    branchScope,
  );

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدد الفواتير المسددة.");
  }

  const students = (data ?? []) as Array<Record<string, unknown>>;
  const classFeeMap = await resolvePaymentFeesFromClassFees(actorSupabase, students, schoolId);

  return students.filter((student) => {
    const className = typeof student.class_name === "string" ? student.class_name : null;
    const classFeeTotal = className ? classFeeMap.get(className) : undefined;
    const studentTotal = normalizeMetricNumber(student.total_fee);
    const totalFee = classFeeTotal ?? (studentTotal > 0 ? studentTotal : 0);
    const paidFee = normalizeMetricNumber(student.paid_fee);
    const discountValue = normalizeMetricNumber(student.discount_value);
    const remainingFee = Math.max(totalFee - paidFee - discountValue, 0);
    return totalFee > 0 && remainingFee <= 0;
  }).length;
}

async function fetchSummaryViaRpc(actorSupabase: RouteSupabaseClient, schoolId: string) {
  const { data, error } = await actorSupabase.rpc("school_payments_summary", {
    p_school_id: schoolId,
  });

  if (error) {
    throw error;
  }

  const record = (Array.isArray(data) ? data[0] : data) as PaymentsSummaryRpcRecord | null;
  if (!record || typeof record !== "object") {
    return null;
  }

  return {
    summary: {
      totalStudents: normalizeMetricNumber(record.total_students),
      totalFee: normalizeMetricNumber(record.total_fee),
      totalPaid: normalizeMetricNumber(record.total_paid),
      totalRemaining: normalizeMetricNumber(record.total_remaining),
      collectedCount: normalizeMetricNumber(record.collected_count),
    } satisfies PaymentsSummary,
    totalPaymentCount: normalizeMetricNumber(record.total_payment_count),
    paymentYears: normalizeIntegerArray(record.payment_years),
  };
}

async function fetchSummaryViaReportsRpc(actorSupabase: RouteSupabaseClient, schoolId: string) {
  const currentMonth = new Date().toISOString().slice(0, 7);
  const todayDate = new Date().toISOString().slice(0, 10);

  const { data, error } = await actorSupabase.rpc("school_reports_summary", {
    p_school_id: schoolId,
    p_current_month: currentMonth,
    p_today: todayDate,
  });

  if (error) {
    throw error;
  }

  const record = Array.isArray(data) ? data[0] : data;
  if (!record || typeof record !== "object") {
    return null;
  }

  const source = record as Record<string, unknown>;
  return {
    summary: {
      totalStudents: normalizeMetricNumber(source.students_count),
      totalFee: normalizeMetricNumber(source.total_fees),
      totalPaid: normalizeMetricNumber(source.total_paid),
      totalRemaining: normalizeMetricNumber(source.total_remaining),
      collectedCount: 0,
    } satisfies PaymentsSummary,
    totalPaymentCount: normalizeMetricNumber(source.payments_count),
  };
}

function normalizeArchiveRows(rows: Array<Record<string, unknown>>): PaymentArchive[] {
  return (rows ?? []).map((row) => ({
    id: String(row.id),
    school_id: String(row.school_id ?? ""),
    archive_year: Math.trunc(Number(row.archive_year ?? 0)),
    archive_date: typeof row.archive_date === "string" ? row.archive_date : "",
    total_students: row.total_students === null || row.total_students === undefined ? null : Number(row.total_students ?? 0),
    total_payments: row.total_payments === null || row.total_payments === undefined ? null : Number(row.total_payments ?? 0),
    total_amount: row.total_amount === null || row.total_amount === undefined ? null : Number(row.total_amount ?? 0),
    data: typeof row.data === "undefined" ? null : (row.data as unknown),
  }));
}

async function fetchArchives(actorSupabase: RouteSupabaseClient, schoolId: string, branchScope: ResolvedBranchScope) {
  if (branchScope.branchIds.length > 0) {
    return {
      archives: [],
      archiveNotice: "الأرشيف السنوي الكامل متاح على مستوى المدرسة فقط، لذلك تم إخفاؤه داخل نطاق الفرع.",
    };
  }

  const { data, error } = await actorSupabase
    .from("account_archives")
    .select("id, school_id, archive_year, total_students, total_payments, total_amount, data, archive_date")
    .eq("school_id", schoolId)
    .order("archive_year", { ascending: false })
    .order("archive_date", { ascending: false });

  if (error) {
    return {
      archives: [],
      archiveNotice: isMissingTableError(error, "account_archives")
        ? "جدول الأرشيف السنوي غير موجود بعد. نفّذ ملف database_setup.sql في Supabase."
        : "تعذر تحميل الأرشيف السنوي للحسابات.",
    };
  }

  return {
    archives: normalizeArchiveRows((data ?? []) as Array<Record<string, unknown>>),
    archiveNotice: "",
  };
}

async function fetchPaymentYears(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
) {
  const years = new Set<number>();
  let from = 0;
  let totalPaymentCount = 0;
  let counted = false;

  while (true) {
    const { data, error, count } = await applyBranchScopeToQuery(
      actorSupabase
        .from("payments")
        .select("id, created_at", { count: counted ? undefined : "exact" })
        .eq("school_id", schoolId)
        .order("id", { ascending: true })
        .range(from, from + QUERY_BATCH_SIZE - 1),
      branchScope,
    );

    if (error) {
      return {
        totalPaymentCount: 0,
        paymentYears: [],
        paymentNotice:
          error.message || "تعذر تحميل فهرس الدفعات الكامل، لذلك عُرضت القائمة بدون العدادات الزمنية.",
      };
    }

    if (!counted) {
      totalPaymentCount = typeof count === "number" ? count : 0;
      counted = true;
    }

    const batch = (data ?? []) as Array<{ created_at: string | null }>;
    batch.forEach((row) => {
      if (!row.created_at) return;
      const year = new Date(row.created_at).getFullYear();
      if (Number.isFinite(year)) {
        years.add(year);
      }
    });

    if (batch.length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  return {
    totalPaymentCount,
    paymentYears: Array.from(years).sort((left, right) => right - left),
    paymentNotice: "",
  };
}

async function fetchStudentsPageViaRpc(actorSupabase: RouteSupabaseClient, schoolId: string, filters: PaymentsListFilters) {
  const { data, error } = await actorSupabase.rpc("school_payment_students_page", {
    p_school_id: schoolId,
    p_search: filters.search,
    p_class_name: filters.className,
    p_quick_filter: filters.quickFilter,
    p_sort: filters.sort,
    p_dir: filters.dir,
    p_page: filters.page,
    p_page_size: filters.pageSize,
  });

  if (error) {
    throw error;
  }

  const rows = ((data ?? []) as PaymentsPageRpcRecord[]).map((row) => ({
    ...row,
    total_fee: Number(row.total_fee ?? 0),
    paid_fee: Number(row.paid_fee ?? 0),
    discount_value: Number(row.discount_value ?? 0),
    remaining_fee: Number(row.remaining_fee ?? 0),
  }));
  const totalCount = rows.length > 0 ? normalizeMetricNumber(rows[0]?.total_count) : 0;

  return {
    students: rows.map((row) => ({
      id: row.id,
      school_id: row.school_id,
      full_name: row.full_name,
      class_name: row.class_name,
      section: row.section,
      phone: row.phone,
      address: row.address,
      total_fee: row.total_fee,
      paid_fee: row.paid_fee,
      discount_value: row.discount_value,
      remaining_fee: row.remaining_fee,
      status: row.status,
    })),
    totalCount,
    paymentCountsByStudent: rows.reduce<Record<string, number>>((acc, row) => {
      acc[row.id] = normalizeMetricNumber(row.payment_count);
      return acc;
    }, {}),
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

async function resolvePaymentFeesFromClassFees(
  actorSupabase: RouteSupabaseClient,
  students: Array<Record<string, unknown>>,
  schoolId: string,
): Promise<Map<string, number>> {
  // Get unique class names from students
  const classNames = Array.from(
    new Set(
      students
        .map((s) => {
          const cn = s.class_name;
          return typeof cn === "string" ? cn : "";
        })
        .filter((c) => c.length > 0)
    )
  );

  if (classNames.length === 0) {
    return new Map();
  }

  // Fetch class_fees for these classes
  const { data: classFees } = await actorSupabase
    .from("class_fees")
    .select("class_name, total_fee")
    .eq("school_id", schoolId)
    .in("class_name", classNames);

  // Build map of class_name -> total_fee
  const feeMap = new Map<string, number>();
  (classFees ?? []).forEach((cf: any) => {
    if (cf.class_name && typeof cf.total_fee === "number") {
      feeMap.set(String(cf.class_name), cf.total_fee);
    }
  });

  return feeMap;
}

function buildStudentRowsPayload(
  rows: Array<Record<string, unknown>>,
  classFeesByClassName?: Map<string, number>
): PaymentStudentRecord[] {
  return (rows ?? []).map((row) => {
    const className = typeof row.class_name === "string" ? row.class_name : null;
    const classFeeTotal = className ? classFeesByClassName?.get(className) : undefined;
    const resolved = buildResolvedStudentFinancials(
      {
        total_fee: normalizeMetricNumber(row.total_fee),
        paid_fee: normalizeMetricNumber(row.paid_fee),
        discount_value: normalizeMetricNumber(row.discount_value),
      },
      classFeeTotal,
    );

    return {
      id: String(row.id),
      school_id: String(row.school_id ?? ""),
      full_name: String(row.full_name ?? ""),
      class_name: className,
      section: typeof row.section === "string" ? row.section : null,
      phone: typeof row.phone === "string" ? row.phone : null,
      address: typeof row.address === "string" ? row.address : null,
      total_fee: resolved.total_fee,
      paid_fee: resolved.paid_fee,
      discount_value: resolved.discount_value,
      remaining_fee: resolved.remaining_fee,
      status: typeof row.status === "string" ? row.status : null,
    };
  });
}

async function fetchAllFilteredStudents(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: PaymentsListFilters,
) {
  const rawRows: Array<Record<string, unknown>> = [];
  let from = 0;

  // Fetch all rows
  while (true) {
    const query = applyStudentFilters(
      applyBranchScopeToQuery(
        actorSupabase.from("students").select(STUDENT_LIST_SELECT).eq("school_id", schoolId),
        branchScope,
      ),
      filters,
    ).range(from, from + QUERY_BATCH_SIZE - 1);

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
    }

    rawRows.push(...((data ?? []) as Array<Record<string, unknown>>));

    if ((data ?? []).length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  // Resolve class fees for all fetched students
  const classFeeMap = await resolvePaymentFeesFromClassFees(actorSupabase, rawRows, schoolId);

  return buildStudentRowsPayload(rawRows, classFeeMap);
}

export function parsePaymentsListFilters(searchParams: URLSearchParams): PaymentsListFilters {
  const page = normalizePageParam(searchParams.get("page"), 1);
  const rawPageSize = normalizePageParam(searchParams.get("pageSize"), DEFAULT_PAGE_SIZE);

  return {
    page,
    pageSize: Math.min(MAX_PAGE_SIZE, Math.max(1, rawPageSize)),
    search: normalizeTextParam(searchParams.get("search")),
    className: normalizeTextParam(searchParams.get("className")),
    quickFilter: normalizeQuickFilter(searchParams.get("quickFilter")),
    sort: normalizeSortKey(searchParams.get("sort")),
    dir: normalizeSortDir(searchParams.get("dir")),
  };
}

export async function resolvePaymentsMeta(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
): Promise<PaymentsMetaPayload> {
  if (branchScope.branchIds.length === 0) {
    try {
      const rpcSummary = await fetchSummaryViaRpc(actorSupabase, schoolId);
      if (rpcSummary) {
        const [classOptions, archiveResult] = await Promise.all([
          fetchClassOptions(actorSupabase, schoolId, branchScope),
          fetchArchives(actorSupabase, schoolId, branchScope),
        ]);

        return {
          summary: rpcSummary.summary,
          classOptions,
          paymentYears: rpcSummary.paymentYears,
          totalPaymentCount: rpcSummary.totalPaymentCount,
          archives: archiveResult.archives,
          archiveNotice: archiveResult.archiveNotice,
        };
      }
    } catch (error) {
      if (!isMissingPaymentsSummaryFunction(error as { code?: string | null; message?: string | null })) {
        throw new Error(error instanceof Error ? error.message : "تعذر تحميل ملخص المدفوعات.");
      }
    }

    try {
      const reportsSummary = await fetchSummaryViaReportsRpc(actorSupabase, schoolId);
      if (reportsSummary) {
        const [classOptions, archiveResult, paymentsResult, collectedCount] = await Promise.all([
          fetchClassOptions(actorSupabase, schoolId, branchScope),
          fetchArchives(actorSupabase, schoolId, branchScope),
          fetchPaymentYears(actorSupabase, schoolId, branchScope),
          fetchCollectedCount(actorSupabase, schoolId, branchScope),
        ]);

        return {
          summary: {
            ...reportsSummary.summary,
            collectedCount,
          },
          classOptions,
          paymentYears: paymentsResult.paymentYears,
          totalPaymentCount: paymentsResult.totalPaymentCount || reportsSummary.totalPaymentCount,
          archives: archiveResult.archives,
          archiveNotice: archiveResult.archiveNotice,
        };
      }
    } catch (error) {
      if (!isMissingReportsSummaryFunction(error as { code?: string | null; message?: string | null })) {
        throw new Error(error instanceof Error ? error.message : "تعذر تحميل ملخص المدفوعات.");
      }
    }
  }

  const [summary, classOptions, archiveResult, paymentsResult] = await Promise.all([
    fetchSummary(actorSupabase, schoolId, branchScope),
    fetchClassOptions(actorSupabase, schoolId, branchScope),
    fetchArchives(actorSupabase, schoolId, branchScope),
    fetchPaymentYears(actorSupabase, schoolId, branchScope),
  ]);

  const compatibilityWarnings = [
    branchScope.branchIds.length > 0
      ? "تم تعطيل دوال المدرسة الواسعة تلقائياً داخل نطاق الفرع لمنع تسرب بيانات الفروع الأخرى."
      : "ملخص المدفوعات يعمل حالياً بوضع التوافق البرمجي. طبّق migration الخاصة بدوال school_payments_summary و school_payment_students_page لتحسين الأداء.",
    paymentsResult.paymentNotice,
    archiveResult.archiveNotice,
  ].filter(Boolean);

  return {
    summary,
    classOptions,
    paymentYears: paymentsResult.paymentYears,
    totalPaymentCount: paymentsResult.totalPaymentCount,
    archives: archiveResult.archives,
    archiveNotice: compatibilityWarnings.join(" "),
  };
}

export async function resolvePaymentsStudentsPage(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: PaymentsListFilters,
) {
  if (branchScope.branchIds.length === 0) {
    try {
      return await fetchStudentsPageViaRpc(actorSupabase, schoolId, filters);
    } catch (error) {
      if (!isMissingPaymentsStudentsPageFunction(error as { code?: string | null; message?: string | null })) {
        throw new Error(error instanceof Error ? error.message : "تعذر تحميل قائمة الطلاب.");
      }
    }
  }

  if (filters.quickFilter === "no_invoice") {
    const paymentStudentIds = await fetchSchoolPaymentStudentIds(actorSupabase, schoolId, branchScope);
    const rows = (await fetchAllFilteredStudents(actorSupabase, schoolId, branchScope, { ...filters, quickFilter: "all" })).filter(
      (student) => !paymentStudentIds.includes(student.id),
    );
    const start = Math.max(0, (filters.page - 1) * filters.pageSize);
    const end = start + filters.pageSize;
    const pageRows = rows.slice(start, end);

    return {
      students: pageRows,
      totalCount: rows.length,
      paymentCountsByStudent: {},
      page: filters.page,
      pageSize: filters.pageSize,
      totalPages: Math.max(1, Math.ceil(rows.length / filters.pageSize)),
    };
  }

  const from = Math.max(0, (filters.page - 1) * filters.pageSize);
  const to = from + filters.pageSize - 1;
  const query = applyStudentFilters(
    applyBranchScopeToQuery(
      actorSupabase
        .from("students")
        .select(STUDENT_LIST_SELECT, { count: "exact" })
        .eq("school_id", schoolId),
      branchScope,
    ),
    filters,
  ).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
  }

  // Resolve class fees for the fetched students
  const classFeeMap = await resolvePaymentFeesFromClassFees(actorSupabase, data ?? [], schoolId);

  const rows = buildStudentRowsPayload((data ?? []) as Array<Record<string, unknown>>, classFeeMap);
  const paymentCountsByStudent = await fetchPaymentCountsByStudent(
    actorSupabase,
    schoolId,
    branchScope,
    rows.map((student) => student.id),
  );
  const totalCount = typeof count === "number" ? count : rows.length;

  return {
    students: rows,
    totalCount,
    paymentCountsByStudent,
    page: filters.page,
    pageSize: filters.pageSize,
    totalPages: Math.max(1, Math.ceil(totalCount / filters.pageSize)),
  };
}

export async function searchPaymentStudents(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  search: string,
  limit = 8,
) {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) return [];

  let query = applyBranchScopeToQuery(
    actorSupabase
      .from("students")
      .select(STUDENT_LIST_SELECT)
      .eq("school_id", schoolId)
      .neq("status", "deleted"),
    branchScope,
  )
    .order("full_name", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 20)));

  const escaped = buildSafeOrFilter(["full_name", "class_name"], normalizedSearch);
  query = query.or(escaped);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "تعذر تحميل نتائج البحث.");
  }

  // Resolve class fees for search results
  const classFeeMap = await resolvePaymentFeesFromClassFees(actorSupabase, (data ?? []) as Array<Record<string, unknown>>, schoolId);

  return buildStudentRowsPayload((data ?? []) as Array<Record<string, unknown>>, classFeeMap);
}

export async function exportPaymentStudents(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
  branchScope: ResolvedBranchScope,
  filters: Omit<PaymentsListFilters, "page" | "pageSize">,
) {
  const exportFilters: PaymentsListFilters = {
    ...filters,
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  };

  if (filters.quickFilter === "no_invoice") {
    const paymentStudentIds = await fetchSchoolPaymentStudentIds(actorSupabase, schoolId, branchScope);
    const rows = await fetchAllFilteredStudents(actorSupabase, schoolId, branchScope, { ...exportFilters, quickFilter: "all" });
    return rows.filter((student) => !paymentStudentIds.includes(student.id));
  }

  return fetchAllFilteredStudents(actorSupabase, schoolId, branchScope, exportFilters);
}
