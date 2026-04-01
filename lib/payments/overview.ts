import { isMissingTableError } from "@/lib/admin-infrastructure";
import { buildSafeOrFilter } from "@/lib/supabase-query-helpers";

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
  archives: any[];
  archiveNotice: string;
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

function applyStudentFilters(query: any, filters: PaymentsListFilters) {
  let nextQuery = query;

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

  return nextQuery.order("full_name", { ascending: true });
}

async function fetchPaymentCountsByStudent(
  actorSupabase: any,
  schoolId: string,
  studentIds: string[],
) {
  if (studentIds.length === 0) return {};

  const { data, error } = await actorSupabase
    .from("payments")
    .select("student_id")
    .eq("school_id", schoolId)
    .in("student_id", studentIds);

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدادات الدفعات.");
  }

  return ((data ?? []) as Array<{ student_id: string | null }>).reduce<Record<string, number>>((acc, row) => {
    if (!row.student_id) return acc;
    acc[row.student_id] = (acc[row.student_id] ?? 0) + 1;
    return acc;
  }, {});
}

async function fetchSchoolPaymentStudentIds(actorSupabase: any, schoolId: string) {
  const results: string[] = [];
  let from = 0;

  while (true) {
    const { data, error } = await actorSupabase
      .from("payments")
      .select("id, student_id")
      .eq("school_id", schoolId)
      .order("id", { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

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

async function fetchClassOptions(actorSupabase: any, schoolId: string) {
  const { data, error } = await actorSupabase
    .from("classes")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: true });

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

  const fallback = await actorSupabase
    .from("students")
    .select("class_name")
    .eq("school_id", schoolId)
    .neq("status", "deleted")
    .order("class_name", { ascending: true });

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

async function fetchSummary(actorSupabase: any, schoolId: string): Promise<PaymentsSummary> {
  const summary: PaymentsSummary = {
    totalStudents: 0,
    totalFee: 0,
    totalPaid: 0,
    totalRemaining: 0,
    collectedCount: 0,
  };
  let from = 0;

  while (true) {
    const { data, error } = await actorSupabase
      .from("students")
      .select("id, total_fee, paid_fee, remaining_fee, status")
      .eq("school_id", schoolId)
      .order("id", { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

    if (error) {
      throw new Error(error.message || "تعذر تحميل ملخص المدفوعات.");
    }

    const batch = (data ?? []) as Array<{
      total_fee?: number | null;
      paid_fee?: number | null;
      remaining_fee?: number | null;
      status?: string | null;
    }>;

    batch.forEach((student) => {
      if (student.status === "deleted") {
        return;
      }

      const totalFee = Number(student.total_fee ?? 0);
      const paidFee = Number(student.paid_fee ?? 0);
      const remainingFee = Number(student.remaining_fee ?? 0);

      summary.totalStudents += 1;
      summary.totalFee += totalFee;
      summary.totalPaid += paidFee;
      summary.totalRemaining += remainingFee;
      if (remainingFee <= 0 && totalFee > 0) {
        summary.collectedCount += 1;
      }
    });

    if (batch.length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  return summary;
}

async function fetchCollectedCount(actorSupabase: any, schoolId: string) {
  const { count, error } = await actorSupabase
    .from("students")
    .select("id", { count: "exact", head: true })
    .eq("school_id", schoolId)
    .neq("status", "deleted")
    .lte("remaining_fee", 0)
    .gt("total_fee", 0);

  if (error) {
    throw new Error(error.message || "تعذر تحميل عدد الفواتير المسددة.");
  }

  return typeof count === "number" ? count : 0;
}

async function fetchSummaryViaRpc(actorSupabase: any, schoolId: string) {
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

async function fetchSummaryViaReportsRpc(actorSupabase: any, schoolId: string) {
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

async function fetchArchives(actorSupabase: any, schoolId: string) {
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
    archives: data ?? [],
    archiveNotice: "",
  };
}

async function fetchPaymentYears(actorSupabase: any, schoolId: string) {
  const years = new Set<number>();
  let from = 0;
  let totalPaymentCount = 0;
  let counted = false;

  while (true) {
    const { data, error, count } = await actorSupabase
      .from("payments")
      .select("id, created_at", { count: counted ? undefined : "exact" })
      .eq("school_id", schoolId)
      .order("id", { ascending: true })
      .range(from, from + QUERY_BATCH_SIZE - 1);

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

async function fetchStudentsPageViaRpc(actorSupabase: any, schoolId: string, filters: PaymentsListFilters) {
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

function buildStudentRowsPayload(rows: any[]) {
  return (rows ?? []) as PaymentStudentRecord[];
}

async function fetchAllFilteredStudents(actorSupabase: any, schoolId: string, filters: PaymentsListFilters) {
  const rows: PaymentStudentRecord[] = [];
  let from = 0;

  while (true) {
    const query = applyStudentFilters(
      actorSupabase.from("students").select(STUDENT_LIST_SELECT).eq("school_id", schoolId),
      filters,
    ).range(from, from + QUERY_BATCH_SIZE - 1);

    const { data, error } = await query;
    if (error) {
      throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
    }

    const batch = buildStudentRowsPayload(data ?? []);
    rows.push(...batch);

    if (batch.length < QUERY_BATCH_SIZE) {
      break;
    }

    from += QUERY_BATCH_SIZE;
  }

  return rows;
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

export async function resolvePaymentsMeta(actorSupabase: any, schoolId: string): Promise<PaymentsMetaPayload> {
  try {
    const rpcSummary = await fetchSummaryViaRpc(actorSupabase, schoolId);
    if (rpcSummary) {
      const [classOptions, archiveResult] = await Promise.all([
        fetchClassOptions(actorSupabase, schoolId),
        fetchArchives(actorSupabase, schoolId),
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
        fetchClassOptions(actorSupabase, schoolId),
        fetchArchives(actorSupabase, schoolId),
        fetchPaymentYears(actorSupabase, schoolId),
        fetchCollectedCount(actorSupabase, schoolId),
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

  const [summary, classOptions, archiveResult, paymentsResult] = await Promise.all([
    fetchSummary(actorSupabase, schoolId),
    fetchClassOptions(actorSupabase, schoolId),
    fetchArchives(actorSupabase, schoolId),
    fetchPaymentYears(actorSupabase, schoolId),
  ]);

  return {
    summary,
    classOptions,
    paymentYears: paymentsResult.paymentYears,
    totalPaymentCount: paymentsResult.totalPaymentCount,
    archives: archiveResult.archives,
    archiveNotice: [
      "ملخص المدفوعات يعمل حالياً بوضع التوافق البرمجي. طبّق migration الخاصة بدوال school_payments_summary و school_payment_students_page لتحسين الأداء.",
      paymentsResult.paymentNotice,
      archiveResult.archiveNotice,
    ]
      .filter(Boolean)
      .join(" "),
  };
}

export async function resolvePaymentsStudentsPage(
  actorSupabase: any,
  schoolId: string,
  filters: PaymentsListFilters,
) {
  try {
    return await fetchStudentsPageViaRpc(actorSupabase, schoolId, filters);
  } catch (error) {
    if (!isMissingPaymentsStudentsPageFunction(error as { code?: string | null; message?: string | null })) {
      throw new Error(error instanceof Error ? error.message : "تعذر تحميل قائمة الطلاب.");
    }
  }

  if (filters.quickFilter === "no_invoice") {
    const paymentStudentIds = await fetchSchoolPaymentStudentIds(actorSupabase, schoolId);
    const rows = (await fetchAllFilteredStudents(actorSupabase, schoolId, { ...filters, quickFilter: "all" })).filter(
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
    actorSupabase
      .from("students")
      .select(STUDENT_LIST_SELECT, { count: "exact" })
      .eq("school_id", schoolId),
    filters,
  ).range(from, to);

  const { data, count, error } = await query;

  if (error) {
    throw new Error(error.message || "تعذر تحميل قائمة الطلاب.");
  }

  const rows = buildStudentRowsPayload(data ?? []);
  const paymentCountsByStudent = await fetchPaymentCountsByStudent(
    actorSupabase,
    schoolId,
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

export async function searchPaymentStudents(actorSupabase: any, schoolId: string, search: string, limit = 8) {
  const normalizedSearch = search.trim();
  if (!normalizedSearch) return [];

  let query = actorSupabase
    .from("students")
    .select(STUDENT_LIST_SELECT)
    .eq("school_id", schoolId)
    .neq("status", "deleted")
    .order("full_name", { ascending: true })
    .limit(Math.max(1, Math.min(limit, 20)));

  const escaped = buildSafeOrFilter(["full_name", "class_name"], normalizedSearch);
  query = query.or(escaped);

  const { data, error } = await query;
  if (error) {
    throw new Error(error.message || "تعذر تحميل نتائج البحث.");
  }

  return buildStudentRowsPayload(data ?? []);
}

export async function exportPaymentStudents(
  actorSupabase: any,
  schoolId: string,
  filters: Omit<PaymentsListFilters, "page" | "pageSize">,
) {
  const exportFilters: PaymentsListFilters = {
    ...filters,
    page: 1,
    pageSize: MAX_PAGE_SIZE,
  };

  if (filters.quickFilter === "no_invoice") {
    const paymentStudentIds = await fetchSchoolPaymentStudentIds(actorSupabase, schoolId);
    const rows = await fetchAllFilteredStudents(actorSupabase, schoolId, { ...exportFilters, quickFilter: "all" });
    return rows.filter((student) => !paymentStudentIds.includes(student.id));
  }

  return fetchAllFilteredStudents(actorSupabase, schoolId, exportFilters);
}
