import { buildResolvedStudentFinancials, calculateStudentPaidPercentage } from "@/lib/students/financials";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";

// Branch names that are administrative placeholders and must be excluded from display.
// Their data is still counted in school-level totals.
const EXCLUDED_DISPLAY_NAMES = new Set([
  "الفرع الرئيسي",
  "الفرع الافتراضي",
  "الفرع الاداري",
  "main branch",
  "main",
  "root",
  "root branch",
  "default branch",
]);

function isExcludedBranch(name: string | null | undefined): boolean {
  if (!name) return false;
  const t = name.trim();
  return EXCLUDED_DISPLAY_NAMES.has(t) || EXCLUDED_DISPLAY_NAMES.has(t.toLowerCase());
}

export type SchoolManagerBranchRecord = {
  id: string;
  name: string | null;
  logo_url: string | null;
};

export type SchoolManagerStudentRecord = {
  branch_id: string | null;
  class_name: string | null;
  total_fee: number | null;
  paid_fee: number | null;
  remaining_fee: number | null;
  discount_value: number | null;
  status: string | null;
};

export type SchoolManagerExpenseRecord = {
  branch_id: string | null;
  amount: number | null;
};

export type SchoolManagerClassFeeRecord = {
  branch_id: string | null;
  class_name: string;
  total_fee: number;
};

export type SchoolManagerBranchSummary = {
  branchId: string | null;
  branchName: string;
  logoUrl: string | null;
  studentsCount: number;
  totalFeesBeforeDiscount: number;
  totalDiscount: number;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  paidPercentage: number;
};

export type SchoolManagerTotals = {
  studentsCount: number;
  totalFeesBeforeDiscount: number;
  totalDiscount: number;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  totalRemaining: number;
  totalExpenses: number;
  paidPercentage: number;
};

export type SchoolManagerOverview = {
  branches: SchoolManagerBranchSummary[];
  totals: SchoolManagerTotals;
  analysis: {
    strongestCollectionBranch: SchoolManagerBranchSummary | null;
    highestRemainingBranch: SchoolManagerBranchSummary | null;
    highestExpenseBranch: SchoolManagerBranchSummary | null;
  };
  warnings: string[];
};

function toAmount(value: unknown) {
  const parsed = Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function shouldCountStudent(status: string | null | undefined) {
  return String(status ?? "").toLowerCase() !== "deleted";
}

function buildEmptySummary(branchId: string | null, branchName: string, logoUrl: string | null = null): SchoolManagerBranchSummary {
  return {
    branchId,
    branchName,
    logoUrl,
    studentsCount: 0,
    totalFeesBeforeDiscount: 0,
    totalDiscount: 0,
    totalFeesAfterDiscount: 0,
    totalPaid: 0,
    totalRemaining: 0,
    totalExpenses: 0,
    paidPercentage: 0,
  };
}

function finalizeSummary(summary: SchoolManagerBranchSummary): SchoolManagerBranchSummary {
  const totalFeesAfterDiscount = Math.max(
    summary.totalFeesBeforeDiscount - summary.totalDiscount,
    0,
  );

  return {
    ...summary,
    totalFeesAfterDiscount,
    paidPercentage: calculateStudentPaidPercentage({
      total_fee: summary.totalFeesBeforeDiscount,
      paid_fee: summary.totalPaid,
      discount_value: summary.totalDiscount,
    }),
  };
}

function pickGreatestBranch(
  branches: SchoolManagerBranchSummary[],
  selector: (branch: SchoolManagerBranchSummary) => number,
) {
  const ranked = [...branches]
    .filter((branch) => selector(branch) > 0)
    .sort((left, right) => selector(right) - selector(left));

  return ranked[0] ?? null;
}

export function buildSchoolManagerOverview(input: {
  branches: SchoolManagerBranchRecord[];
  students: SchoolManagerStudentRecord[];
  expenses: SchoolManagerExpenseRecord[];
  classFees: SchoolManagerClassFeeRecord[];
}): SchoolManagerOverview {
  // Build class fee lookup: "branchId:className" → fee amount
  // Fallback key "null:className" for school-level class fees
  const classFeeMap = new Map<string, number>();
  for (const cf of input.classFees) {
    const key = `${cf.branch_id ?? "null"}:${cf.class_name.trim()}`;
    if (!classFeeMap.has(key)) {
      classFeeMap.set(key, toAmount(cf.total_fee));
    }
  }

  const summaries = new Map<string, SchoolManagerBranchSummary>();
  // Branch IDs that exist in DB but are excluded (placeholder/admin branches).
  // Students/expenses from these branches are silently discarded.
  const excludedBranchIdSet = new Set<string>();
  const branchOrder: string[] = [];
  const warnings: string[] = [];

  // Initialize summaries ONLY for non-excluded branches.
  // Excluded branches (الفرع الرئيسي, etc.) are completely ignored — no display, no totals.
  for (const branch of input.branches) {
    const branchId = branch.id;
    const name = branch.name?.trim() || "فرع غير مسمى";
    if (isExcludedBranch(branch.name)) {
      excludedBranchIdSet.add(branchId);
    } else {
      summaries.set(branchId, buildEmptySummary(branchId, name, branch.logo_url || null));
      branchOrder.push(branchId);
    }
  }

  // Process students — skip students from excluded branches entirely
  let hasOrphanStudents = false;
  for (const student of input.students) {
    if (!shouldCountStudent(student.status)) continue;

    const branchKey = student.branch_id ?? "__unassigned__";

    // Student belongs to an excluded branch → discard completely
    if (excludedBranchIdSet.has(branchKey)) continue;

    if (!summaries.has(branchKey)) {
      // Student belongs to a branch not in our list (deleted branch or truly orphaned)
      hasOrphanStudents = true;
      summaries.set(
        branchKey,
        buildEmptySummary(student.branch_id ?? null, "سجلات غير مرتبطة بفرع"),
      );
      // Orphan entries are NOT shown in UI (not in branchOrder for display)
    }

    const current = summaries.get(branchKey);
    if (!current) continue;

    // Resolve real fee: prefer class_fees when student.total_fee is 0 or null
    const className = student.class_name?.trim() ?? null;
    let classFeeTotal: number | null = null;

    if (className && student.branch_id) {
      const branchKey2 = `${student.branch_id}:${className}`;
      const schoolKey = `null:${className}`;
      classFeeTotal = classFeeMap.get(branchKey2) ?? classFeeMap.get(schoolKey) ?? null;
    }

    const resolved = buildResolvedStudentFinancials(
      {
        total_fee: student.total_fee,
        paid_fee: student.paid_fee,
        discount_value: student.discount_value,
      },
      classFeeTotal,
    );

    current.studentsCount += 1;
    current.totalFeesBeforeDiscount += resolved.resolved_total_fee;
    current.totalDiscount += resolved.discount_value;
    current.totalPaid += resolved.paid_fee;
    current.totalRemaining += resolved.remaining_fee;
  }

  // Process expenses — skip expenses from excluded branches entirely
  let hasOrphanExpenses = false;
  for (const expense of input.expenses) {
    const branchKey = expense.branch_id ?? "__unassigned__";

    // Expense belongs to an excluded branch → discard completely
    if (excludedBranchIdSet.has(branchKey)) continue;

    if (!summaries.has(branchKey)) {
      hasOrphanExpenses = true;
      summaries.set(
        branchKey,
        buildEmptySummary(expense.branch_id ?? null, "سجلات غير مرتبطة بفرع"),
      );
    }

    const current = summaries.get(branchKey);
    if (!current) continue;
    current.totalExpenses += toAmount(expense.amount);
  }

  if (hasOrphanStudents || hasOrphanExpenses) {
    warnings.push(
      "توجد سجلات طلابية أو مالية غير مرتبطة بأي فرع محدد، ولم يتم احتسابها في الإجمالي.",
    );
  }

  // Display branches: only the non-excluded, named branches (in insertion order)
  const displayBranches = branchOrder
    .map((id) => summaries.get(id))
    .filter((b): b is SchoolManagerBranchSummary => Boolean(b))
    .map(finalizeSummary);

  // School totals: ONLY display branches — excluded branches are NOT counted anywhere
  const totals = finalizeSummary(
    displayBranches.reduce<SchoolManagerBranchSummary>(
      (acc, branch) => ({
        branchId: null,
        branchName: "إجمالي المدرسة",
        logoUrl: null,
        studentsCount: acc.studentsCount + branch.studentsCount,
        totalFeesBeforeDiscount:
          acc.totalFeesBeforeDiscount + branch.totalFeesBeforeDiscount,
        totalDiscount: acc.totalDiscount + branch.totalDiscount,
        totalFeesAfterDiscount: 0,
        totalPaid: acc.totalPaid + branch.totalPaid,
        totalRemaining: acc.totalRemaining + branch.totalRemaining,
        totalExpenses: acc.totalExpenses + branch.totalExpenses,
        paidPercentage: 0,
      }),
      buildEmptySummary(null, "إجمالي المدرسة"),
    ),
  );

  return {
    branches: displayBranches,
    totals,
    analysis: {
      // Analysis only uses display branches (no excluded/orphan branches)
      strongestCollectionBranch: pickGreatestBranch(
        displayBranches,
        (b) => b.paidPercentage,
      ),
      highestRemainingBranch: pickGreatestBranch(
        displayBranches,
        (b) => b.totalRemaining,
      ),
      highestExpenseBranch: pickGreatestBranch(
        displayBranches,
        (b) => b.totalExpenses,
      ),
    },
    warnings,
  };
}

export async function resolveSchoolManagerOverview(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
): Promise<SchoolManagerOverview> {
  // Fetch branches, students, expenses, and class fees in parallel
  // Branches are always fetched by school_id
  const [
    { data: branches, error: branchesError },
    { data: students, error: studentsError },
    { data: expenses, error: expensesError },
    { data: classFees, error: classFeesError },
  ] = await Promise.all([
    actorSupabase
      .from("branches")
      .select("id, name, logo_url")
      .eq("school_id", schoolId)
      .order("name", { ascending: true }),
    actorSupabase
      .from("students")
      .select("branch_id, class_name, total_fee, paid_fee, remaining_fee, discount_value, status")
      .eq("school_id", schoolId)
      .neq("status", "deleted"),
    actorSupabase
      .from("expenses")
      .select("branch_id, amount")
      .eq("school_id", schoolId),
    actorSupabase
      .from("class_fees")
      .select("branch_id, class_name, total_fee")
      .eq("school_id", schoolId),
  ]);

  if (branchesError) {
    throw new Error(branchesError.message || "تعذر تحميل قائمة الفروع.");
  }
  if (studentsError) {
    throw new Error(studentsError.message || "تعذر تحميل بيانات الطلاب المالية.");
  }
  if (expensesError) {
    throw new Error(expensesError.message || "تعذر تحميل بيانات المصروفات.");
  }
  // class_fees errors are non-fatal — we degrade gracefully
  if (classFeesError) {
    console.warn("[resolveSchoolManagerOverview] class_fees query error:", classFeesError.message);
  }

  return buildSchoolManagerOverview({
    branches: (branches ?? []) as SchoolManagerBranchRecord[],
    students: (students ?? []) as SchoolManagerStudentRecord[],
    expenses: (expenses ?? []) as SchoolManagerExpenseRecord[],
    classFees: (classFees ?? []) as SchoolManagerClassFeeRecord[],
  });
}
