import { buildResolvedStudentFinancials, calculateStudentPaidPercentage } from "@/lib/students/financials";
import type { RouteSupabaseClient } from "@/lib/managed-users/types";

// Branch names that are administrative placeholders and must be excluded from display.
const EXCLUDED_DISPLAY_NAMES = new Set([
  "الفرع الرئيسي",
  "الفرع الافتراضي",
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

export type SchoolManagerIncomeRecord = {
  branch_id: string | null;
  amount: number | null;
};

export type SchoolManagerClassFeeRecord = {
  branch_id: string | null;
  class_name: string;
  total_fee: number;
};

export type SchoolManagerTeacherRecord = {
  branch_id: string | null;
  subject: string | null;
};

export type SchoolManagerBranchSummary = {
  branchId: string | null;
  branchName: string;
  logoUrl: string | null;
  studentsCount: number;
  transferredCount: number;
  totalFeesBeforeDiscount: number;
  totalDiscount: number;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  transferredPaid: number;
  totalPaidWithTransferred: number;
  totalRemaining: number;
  totalExpenses: number;
  totalIncomes: number;
  paidPercentage: number;
  teachersCount: number;
  teachersBySubject: Array<{ subject: string; count: number }>;
  monthlyPayments: number[];
  monthlySalaries: number[];
  expenseBreakdown: Array<{ name: string; amount: number }>;
  teachersList: Array<{ name: string; subject: string }>;
  monthLabels: string[];
};

export type SchoolManagerTotals = {
  studentsCount: number;
  transferredCount: number;
  totalFeesBeforeDiscount: number;
  totalDiscount: number;
  totalFeesAfterDiscount: number;
  totalPaid: number;
  transferredPaid: number;
  totalPaidWithTransferred: number;
  totalRemaining: number;
  totalExpenses: number;
  totalIncomes: number;
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
  const s = String(status ?? "").toLowerCase();
  return s !== "deleted";
}

function isTransferredStudent(status: string | null | undefined) {
  return String(status ?? "").toLowerCase() === "transferred";
}

function buildEmptySummary(branchId: string | null, branchName: string, logoUrl: string | null = null): SchoolManagerBranchSummary {
  return {
    branchId,
    branchName,
    logoUrl,
    studentsCount: 0,
    transferredCount: 0,
    totalFeesBeforeDiscount: 0,
    totalDiscount: 0,
    totalFeesAfterDiscount: 0,
    totalPaid: 0,
    transferredPaid: 0,
    totalPaidWithTransferred: 0,
    totalRemaining: 0,
    totalExpenses: 0,
    totalIncomes: 0,
    paidPercentage: 0,
    teachersCount: 0,
    teachersBySubject: [],
    monthlyPayments: [],
    monthlySalaries: [],
    expenseBreakdown: [],
    teachersList: [],
    monthLabels: [],
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
    totalPaidWithTransferred: summary.totalPaid + summary.transferredPaid,
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

export type SchoolManagerPaymentRecord = {
  branch_id: string | null;
  amount: number | null;
  created_at: string | null;
};

export type SchoolManagerSalaryRecord = {
  branch_id: string | null;
  gross_salary: number | null;
  deductions: number | null;
  month: string | null;
};

export type SchoolManagerExpenseWithTypeRecord = {
  branch_id: string | null;
  amount: number | null;
  expense_types: { name: string } | null;
};

export type SchoolManagerTeacherFullRecord = {
  branch_id: string | null;
  subject: string | null;
  full_name: string | null;
};

export function buildSchoolManagerOverview(input: {
  branches: SchoolManagerBranchRecord[];
  students: SchoolManagerStudentRecord[];
  expenses: SchoolManagerExpenseRecord[];
  incomes: SchoolManagerIncomeRecord[];
  classFees: SchoolManagerClassFeeRecord[];
  teachers: SchoolManagerTeacherRecord[];
  monthlyPayments: SchoolManagerPaymentRecord[];
  monthlySalaries: SchoolManagerSalaryRecord[];
  expensesWithTypes: SchoolManagerExpenseWithTypeRecord[];
  teachersFull: SchoolManagerTeacherFullRecord[];
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

    if (isTransferredStudent(student.status)) {
      current.transferredCount += 1;
      current.transferredPaid += resolved.paid_fee;
    } else {
      current.studentsCount += 1;
      current.totalFeesBeforeDiscount += resolved.resolved_total_fee;
      current.totalDiscount += resolved.discount_value;
      current.totalPaid += resolved.paid_fee;
      current.totalRemaining += resolved.remaining_fee;
    }
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

  // Process incomes — skip incomes from excluded branches entirely
  let hasOrphanIncomes = false;
  for (const income of input.incomes) {
    const branchKey = income.branch_id ?? "__unassigned__";

    // Income belongs to an excluded branch → discard completely
    if (excludedBranchIdSet.has(branchKey)) continue;

    if (!summaries.has(branchKey)) {
      hasOrphanIncomes = true;
      summaries.set(
        branchKey,
        buildEmptySummary(income.branch_id ?? null, "سجلات غير مرتبطة بفرع"),
      );
    }

    const current = summaries.get(branchKey);
    if (!current) continue;
    current.totalIncomes += toAmount(income.amount);
  }

  // Process teachers — group by branch_id, then by subject
  // Build a map: branchId → Map<subject, count>
  const teacherSubjectMap = new Map<string, Map<string, number>>();
  for (const teacher of input.teachers) {
    const branchKey = teacher.branch_id ?? "__unassigned__";
    // Skip teachers from excluded branches
    if (excludedBranchIdSet.has(branchKey)) continue;
    if (!summaries.has(branchKey)) continue; // skip orphan/unknown branch teachers

    if (!teacherSubjectMap.has(branchKey)) {
      teacherSubjectMap.set(branchKey, new Map());
    }
    const subjectMap = teacherSubjectMap.get(branchKey)!;
    const subject = teacher.subject?.trim() || "غير محدد";
    subjectMap.set(subject, (subjectMap.get(subject) ?? 0) + 1);
  }

  // Apply teacher counts to summaries
  teacherSubjectMap.forEach((subjectMap, branchKey) => {
    const summary = summaries.get(branchKey);
    if (!summary) return;
    const teachersBySubject: Array<{ subject: string; count: number }> = [];
    subjectMap.forEach((count, subject) => {
      teachersBySubject.push({ subject, count });
    });
    teachersBySubject.sort((a, b) => b.count - a.count);
    summary.teachersCount = teachersBySubject.reduce((sum, s) => sum + s.count, 0);
    summary.teachersBySubject = teachersBySubject;
  });

  // Process teachers full list (name + subject)
  for (const teacher of input.teachersFull) {
    const branchKey = teacher.branch_id ?? "__unassigned__";
    if (excludedBranchIdSet.has(branchKey)) continue;
    const summary = summaries.get(branchKey);
    if (!summary) continue;
    if (teacher.full_name) {
      summary.teachersList.push({
        name: teacher.full_name,
        subject: teacher.subject?.trim() || "غير محدد",
      });
    }
  }

  // Process expense breakdown by type
  const expenseTypeMap = new Map<string, Map<string, number>>();
  for (const expense of input.expensesWithTypes) {
    const branchKey = expense.branch_id ?? "__unassigned__";
    if (excludedBranchIdSet.has(branchKey)) continue;
    if (!summaries.has(branchKey)) continue;
    if (!expenseTypeMap.has(branchKey)) expenseTypeMap.set(branchKey, new Map());
    const typeMap = expenseTypeMap.get(branchKey)!;
    const typeName = expense.expense_types?.name?.trim() || "أخرى";
    typeMap.set(typeName, (typeMap.get(typeName) ?? 0) + toAmount(expense.amount));
  }
  expenseTypeMap.forEach((typeMap, branchKey) => {
    const summary = summaries.get(branchKey);
    if (!summary) return;
    summary.expenseBreakdown = Array.from(typeMap.entries())
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  });

  // Process monthly payments — build 9-month window
  const ARABIC_MONTHS = ["يناير","فبراير","مارس","أبريل","مايو","يونيو","يوليو","أغسطس","سبتمبر","أكتوبر","نوفمبر","ديسمبر"];
  const nowDate = new Date();
  const windowMonths: string[] = [];
  const windowLabels: string[] = [];
  for (let i = 8; i >= 0; i--) {
    const d = new Date(nowDate.getFullYear(), nowDate.getMonth() - i, 1);
    windowMonths.push(`${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`);
    windowLabels.push(ARABIC_MONTHS[d.getMonth()]);
  }

  // Build monthly payment map per branch
  const monthlyPaymentMap = new Map<string, Map<string, number>>();
  for (const payment of input.monthlyPayments) {
    const branchKey = payment.branch_id ?? "__unassigned__";
    if (excludedBranchIdSet.has(branchKey)) continue;
    if (!summaries.has(branchKey)) continue;
    if (!payment.created_at) continue;
    const monthKey = payment.created_at.slice(0, 7); // "YYYY-MM"
    if (!windowMonths.includes(monthKey)) continue;
    if (!monthlyPaymentMap.has(branchKey)) monthlyPaymentMap.set(branchKey, new Map());
    const mMap = monthlyPaymentMap.get(branchKey)!;
    mMap.set(monthKey, (mMap.get(monthKey) ?? 0) + toAmount(payment.amount));
  }
  monthlyPaymentMap.forEach((mMap, branchKey) => {
    const summary = summaries.get(branchKey);
    if (!summary) return;
    summary.monthlyPayments = windowMonths.map(m => mMap.get(m) ?? 0);
    summary.monthLabels = windowLabels;
  });
  // For branches with no payment data, still set monthLabels
  branchOrder.forEach(id => {
    const summary = summaries.get(id);
    if (!summary) return;
    if (summary.monthLabels.length === 0) {
      summary.monthLabels = windowLabels;
      summary.monthlyPayments = windowMonths.map(() => 0);
    }
  });

  // Process monthly salaries
  const monthlySalaryMap = new Map<string, Map<string, number>>();
  for (const salary of input.monthlySalaries) {
    const branchKey = salary.branch_id ?? "__unassigned__";
    if (excludedBranchIdSet.has(branchKey)) continue;
    if (!summaries.has(branchKey)) continue;
    if (!salary.month) continue;
    const monthKey = salary.month.slice(0, 7);
    if (!monthlySalaryMap.has(branchKey)) monthlySalaryMap.set(branchKey, new Map());
    const mMap = monthlySalaryMap.get(branchKey)!;
    const net = toAmount(salary.gross_salary) - toAmount(salary.deductions);
    mMap.set(monthKey, (mMap.get(monthKey) ?? 0) + net);
  }
  monthlySalaryMap.forEach((mMap, branchKey) => {
    const summary = summaries.get(branchKey);
    if (!summary) return;
    summary.monthlySalaries = windowMonths.map(m => mMap.get(m) ?? 0);
  });
  branchOrder.forEach(id => {
    const summary = summaries.get(id);
    if (!summary) return;
    if (summary.monthlySalaries.length === 0) {
      summary.monthlySalaries = windowMonths.map(() => 0);
    }
  });

  if (hasOrphanStudents || hasOrphanExpenses || hasOrphanIncomes) {
    warnings.push(
      "توجد سجلات طلابية أو مالية غير مرتبطة بأي فرع محدد، ولم يتم احتسابها في الإجمالي.",
    );
  }

  // Display branches: only the non-excluded, named branches (in insertion order)
  const displayBranches = branchOrder
    .map((id) => summaries.get(id))
    .filter((b): b is SchoolManagerBranchSummary => Boolean(b))
    .map(finalizeSummary);

  // School totals: display branches + orphan records (but excluded branches are NOT counted)
  const allBranchesForTotals = [
    ...displayBranches,
    // Include orphan records ("__unassigned__") if they exist
    ...Array.from(summaries.values())
      .filter((b) => !branchOrder.includes(b.branchId || ""))
      .filter((b) => !excludedBranchIdSet.has(b.branchId || ""))
      .map(finalizeSummary),
  ];

  const totals = finalizeSummary(
    allBranchesForTotals.reduce<SchoolManagerBranchSummary>(
      (acc, branch) => ({
        branchId: null,
        branchName: "إجمالي المدرسة",
        logoUrl: null,
        studentsCount: acc.studentsCount + branch.studentsCount,
        transferredCount: acc.transferredCount + branch.transferredCount,
        totalFeesBeforeDiscount:
          acc.totalFeesBeforeDiscount + branch.totalFeesBeforeDiscount,
        totalDiscount: acc.totalDiscount + branch.totalDiscount,
        totalFeesAfterDiscount: 0,
        totalPaid: acc.totalPaid + branch.totalPaid,
        transferredPaid: acc.transferredPaid + branch.transferredPaid,
        totalPaidWithTransferred: 0,
        totalRemaining: acc.totalRemaining + branch.totalRemaining,
        totalExpenses: acc.totalExpenses + branch.totalExpenses,
        totalIncomes: acc.totalIncomes + branch.totalIncomes,
        paidPercentage: 0,
        teachersCount: acc.teachersCount + branch.teachersCount,
        teachersBySubject: [],
        monthlyPayments: [],
        monthlySalaries: [],
        expenseBreakdown: [],
        teachersList: [],
        monthLabels: [],
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
  // Fetch branches, students, expenses, incomes, class fees, and teachers in parallel
  // Branches are always fetched by school_id
  const [
    { data: branches, error: branchesError },
    { data: students, error: studentsError },
    { data: expenses, error: expensesError },
    { data: incomes, error: incomesError },
    { data: classFees, error: classFeesError },
    { data: teachers, error: teachersError },
    { data: monthlyPaymentsRaw, error: monthlyPaymentsError },
    { data: monthlySalariesRaw, error: monthlySalariesError },
    { data: expensesWithTypesRaw, error: expensesWithTypesError },
    { data: teachersFullRaw, error: teachersFullError },
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
      .from("incomes")
      .select("branch_id, amount")
      .eq("school_id", schoolId)
      .is("deleted_at", null),
    actorSupabase
      .from("class_fees")
      .select("branch_id, class_name, total_fee")
      .eq("school_id", schoolId),
    actorSupabase
      .from("teachers")
      .select("branch_id, subject")
      .eq("school_id", schoolId)
      .neq("status", "deleted"),
    // Monthly payments (last 9 months)
    actorSupabase
      .from("payments")
      .select("branch_id, amount, created_at")
      .eq("school_id", schoolId)
      .gte("created_at", (() => {
        const d = new Date();
        d.setMonth(d.getMonth() - 9);
        return d.toISOString();
      })())
      .is("deleted_at", null),
    // Monthly salaries (paid)
    actorSupabase
      .from("salaries")
      .select("branch_id, gross_salary, deductions, month")
      .eq("school_id", schoolId)
      .eq("is_paid", true),
    // Expenses with type names
    actorSupabase
      .from("expenses")
      .select("branch_id, amount, expense_types(name)")
      .eq("school_id", schoolId),
    // Teachers full list
    actorSupabase
      .from("teachers")
      .select("branch_id, subject, full_name")
      .eq("school_id", schoolId)
      .neq("status", "deleted"),
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
  // class_fees, incomes, and teachers errors are non-fatal — we degrade gracefully
  if (classFeesError) {
    console.warn("[resolveSchoolManagerOverview] class_fees query error:", classFeesError.message);
  }
  if (incomesError) {
    console.warn("[resolveSchoolManagerOverview] incomes query error:", incomesError.message);
  }
  if (teachersError) {
    console.warn("[resolveSchoolManagerOverview] teachers query error:", teachersError.message);
  }
  if (monthlyPaymentsError) {
    console.warn("[resolveSchoolManagerOverview] monthly_payments query error:", monthlyPaymentsError.message);
  }
  if (monthlySalariesError) {
    console.warn("[resolveSchoolManagerOverview] monthly_salaries query error:", monthlySalariesError.message);
  }
  if (expensesWithTypesError) {
    console.warn("[resolveSchoolManagerOverview] expenses_with_types query error:", expensesWithTypesError.message);
  }
  if (teachersFullError) {
    console.warn("[resolveSchoolManagerOverview] teachers_full query error:", teachersFullError.message);
  }

  return buildSchoolManagerOverview({
    branches: (branches ?? []) as SchoolManagerBranchRecord[],
    students: (students ?? []) as SchoolManagerStudentRecord[],
    expenses: (expenses ?? []) as SchoolManagerExpenseRecord[],
    incomes: (incomes ?? []) as SchoolManagerIncomeRecord[],
    classFees: (classFees ?? []) as SchoolManagerClassFeeRecord[],
    teachers: (teachers ?? []) as SchoolManagerTeacherRecord[],
    monthlyPayments: (monthlyPaymentsRaw ?? []) as SchoolManagerPaymentRecord[],
    monthlySalaries: (monthlySalariesRaw ?? []) as SchoolManagerSalaryRecord[],
    expensesWithTypes: (expensesWithTypesRaw ?? []) as unknown as SchoolManagerExpenseWithTypeRecord[],
    teachersFull: (teachersFullRaw ?? []) as SchoolManagerTeacherFullRecord[],
  });
}
