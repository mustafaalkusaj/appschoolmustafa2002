import { calculateStudentPaidPercentage } from "@/lib/students/financials";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";

export type SchoolManagerBranchRecord = {
  id: string;
  name: string | null;
};

export type SchoolManagerStudentRecord = {
  branch_id: string | null;
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

export type SchoolManagerBranchSummary = {
  branchId: string | null;
  branchName: string;
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

function buildEmptySummary(branchId: string | null, branchName: string): SchoolManagerBranchSummary {
  return {
    branchId,
    branchName,
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
}): SchoolManagerOverview {
  const summaries = new Map<string, SchoolManagerBranchSummary>();
  const branchOrder: string[] = [];
  const warnings: string[] = [];

  input.branches.forEach((branch) => {
    const branchId = branch.id;
    branchOrder.push(branchId);
    summaries.set(branchId, buildEmptySummary(branchId, branch.name?.trim() || "فرع غير مسمى"));
  });

  let hasUnassignedStudentRecords = false;
  for (const student of input.students) {
    if (!shouldCountStudent(student.status)) {
      continue;
    }

    const branchKey = student.branch_id ?? "__unassigned__";
    if (!summaries.has(branchKey)) {
      hasUnassignedStudentRecords = true;
      summaries.set(branchKey, buildEmptySummary(null, "سجلات غير مرتبطة بفرع"));
      branchOrder.push(branchKey);
    }

    const current = summaries.get(branchKey);
    if (!current) {
      continue;
    }

    current.studentsCount += 1;
    current.totalFeesBeforeDiscount += toAmount(student.total_fee);
    current.totalDiscount += toAmount(student.discount_value);
    current.totalPaid += toAmount(student.paid_fee);
    current.totalRemaining += toAmount(student.remaining_fee);
  }

  let hasUnassignedExpenseRecords = false;
  for (const expense of input.expenses) {
    const branchKey = expense.branch_id ?? "__unassigned__";
    if (!summaries.has(branchKey)) {
      hasUnassignedExpenseRecords = true;
      summaries.set(branchKey, buildEmptySummary(null, "سجلات غير مرتبطة بفرع"));
      branchOrder.push(branchKey);
    }

    const current = summaries.get(branchKey);
    if (!current) {
      continue;
    }

    current.totalExpenses += toAmount(expense.amount);
  }

  if (hasUnassignedStudentRecords || hasUnassignedExpenseRecords) {
    warnings.push("توجد سجلات مالية أو طلابية غير مرتبطة بفرع محدد، وتم إدراجها ضمن قسم مستقل حتى تبقى المجاميع صحيحة.");
  }

  const branchSummaries = branchOrder
    .map((branchId) => summaries.get(branchId))
    .filter((branch): branch is SchoolManagerBranchSummary => Boolean(branch))
    .map(finalizeSummary);

  const totals = finalizeSummary(
    branchSummaries.reduce<SchoolManagerBranchSummary>(
      (acc, branch) => ({
        branchId: null,
        branchName: "إجمالي المدرسة",
        studentsCount: acc.studentsCount + branch.studentsCount,
        totalFeesBeforeDiscount: acc.totalFeesBeforeDiscount + branch.totalFeesBeforeDiscount,
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
    branches: branchSummaries,
    totals,
    analysis: {
      strongestCollectionBranch: pickGreatestBranch(branchSummaries, (branch) => branch.paidPercentage),
      highestRemainingBranch: pickGreatestBranch(branchSummaries, (branch) => branch.totalRemaining),
      highestExpenseBranch: pickGreatestBranch(branchSummaries, (branch) => branch.totalExpenses),
    },
    warnings,
  };
}

export async function resolveSchoolManagerOverview(
  actorSupabase: RouteSupabaseClient,
  schoolId: string,
): Promise<SchoolManagerOverview> {
  // Step 1: Get the school's group_id to filter branches
  // schools table has a group_id that links to school_groups
  // branches use group_id to identify which school_group they belong to
  const { data: school, error: schoolError } = await actorSupabase
    .from("schools")
    .select("id, group_id")
    .eq("id", schoolId)
    .maybeSingle();

  if (schoolError || !school?.id) {
    throw new Error(schoolError?.message || "تعذر تحميل المدرسة الحالية.");
  }

  const groupId = school.group_id;

  // Step 2: Query branches using the group_id
  const [{ data: branches, error: branchesError }, { data: students, error: studentsError }, { data: expenses, error: expensesError }] =
    await Promise.all([
      groupId
        ? actorSupabase
            .from("branches")
            .select("id, name")
            .eq("group_id", groupId)
            .order("name", { ascending: true })
        : Promise.resolve({ data: [], error: null }),
      actorSupabase
        .from("students")
        .select("branch_id, total_fee, paid_fee, remaining_fee, discount_value, status")
        .eq("school_id", schoolId)
        .neq("status", "deleted"),
      actorSupabase
        .from("expenses")
        .select("branch_id, amount")
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

  return buildSchoolManagerOverview({
    branches: (branches ?? []) as SchoolManagerBranchRecord[],
    students: (students ?? []) as SchoolManagerStudentRecord[],
    expenses: (expenses ?? []) as SchoolManagerExpenseRecord[],
  });
}
